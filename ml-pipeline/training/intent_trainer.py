"""
Intent Classifier Trainer

Fine-tunes a DistilBERT model for intent classification on PraharAI query data.
Reads training data produced by data_extractor.py and saves a trained model
to ml-pipeline/models/.
"""

import sys
import os
import json
import shutil
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Any

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
)
from sklearn.utils.class_weight import compute_class_weight


def resolve_training_device(requested_device: str) -> torch.device:
    """Resolve training device from CLI/env with dev/prod policy.

    Policy:
      - Production (`ENVIRONMENT=production`) auto-selects: GPU if available, otherwise CPU.
      - Development (`ENVIRONMENT=development`) requires GPU by default; fails fast if CUDA
        is unavailable unless TRAIN_REQUIRE_GPU_IN_DEV=false is set.

    Controls:
      - --device {auto,cuda,cpu}
      - ENVIRONMENT (default: development)
      - TRAIN_REQUIRE_GPU_IN_DEV (default: true)  — only applies in development
    """
    environment = str(os.getenv("ENVIRONMENT", "development")).strip().lower()
    in_production = environment in {"production", "prod"}
    require_gpu_in_dev = str(os.getenv("TRAIN_REQUIRE_GPU_IN_DEV", "true")).lower() in {
        "1",
        "true",
        "yes",
    }

    device_choice = requested_device.strip().lower()
    if device_choice not in {"auto", "cuda", "cpu"}:
        raise ValueError(f"Unsupported device '{requested_device}'. Choose one of: auto, cuda, cpu")

    # Explicit device override always honoured in both environments
    if device_choice == "cpu":
        return torch.device("cpu")

    if device_choice == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError(
                "--device=cuda requested but CUDA is not available. "
                "Install a CUDA-enabled PyTorch build or use --device=cpu."
            )
        return torch.device("cuda")

    # auto mode — policy differs by environment
    if torch.cuda.is_available():
        return torch.device("cuda")

    if in_production:
        # Production: gracefully fall back to CPU when no GPU is present
        print("ENVIRONMENT=production, no GPU detected -> falling back to CPU")
        return torch.device("cpu")

    # Development: require GPU unless explicitly opted out
    if require_gpu_in_dev:
        raise RuntimeError(
            "ENVIRONMENT=development requires GPU training, but CUDA is not available. "
            "Set TRAIN_REQUIRE_GPU_IN_DEV=false to allow CPU fallback for local debugging."
        )
    return torch.device("cpu")


# Intent labels — defined inline to avoid importing intent_classifier.py
# which pulls in heavy onnxruntime / torch at module level.
INTENT_LABELS = [
    "scheme_search",
    "eligibility_check",
    "application_info",
    "deadline_query",
    "profile_update",
    "general_question",
    "nudge_preferences",
    "unknown_intent",
]


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------


class IntentDataset(Dataset):
    """PyTorch dataset for intent classification."""

    def __init__(
        self,
        data: List[Dict[str, str]],
        tokenizer,
        max_length: int = 128,
    ):
        self.queries = [d["query"] for d in data]
        self.labels = [INTENT_LABELS.index(d["intent"]) for d in data]
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.queries)

    def __getitem__(self, idx):
        enc = self.tokenizer(
            self.queries[idx],
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt",
        )
        return {
            "input_ids": enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long),
        }


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------


def train_epoch(
    model,
    loader: DataLoader,
    optimizer,
    scheduler,
    device: torch.device,
    criterion=None,
) -> float:
    """Run one training epoch.

    Parameters
    ----------
    criterion:
        Optional weighted ``CrossEntropyLoss``. When provided the loss is
        computed from logits so all classes receive balanced gradient signal.
        When ``None`` the model's built-in (unweighted) loss is used.
    """
    model.train()
    total_loss = 0.0
    for batch in loader:
        optimizer.zero_grad()
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["labels"].to(device)

        if criterion is not None:
            # Don't pass labels to the model; compute loss manually with weights.
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = criterion(outputs.logits, labels)
        else:
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels,
            )
            loss = outputs.loss
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
        total_loss += loss.item()

    return total_loss / len(loader)


def evaluate(
    model,
    loader: DataLoader,
    device: torch.device,
) -> Dict[str, Any]:
    model.eval()
    all_preds: List[int] = []
    all_labels: List[int] = []
    total_loss = 0.0

    with torch.no_grad():
        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels,
            )
            total_loss += outputs.loss.item()
            preds = torch.argmax(outputs.logits, dim=-1)
            all_preds.extend(preds.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())

    accuracy = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels,
        all_preds,
        average="weighted",
        zero_division=0,
    )
    return {
        "loss": total_loss / max(len(loader), 1),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Fine-tune DistilBERT for intent classification")
    parser.add_argument(
        "--train-data",
        default="data/training/intent_train.json",
        help="Path to training JSON (default: data/training/intent_train.json)",
    )
    parser.add_argument(
        "--val-data",
        default="data/training/intent_val.json",
        help="Path to validation JSON (default: data/training/intent_val.json)",
    )
    parser.add_argument(
        "--model-name",
        default="distilbert-base-uncased",
        help="Pretrained model name (default: distilbert-base-uncased)",
    )
    parser.add_argument(
        "--output-dir",
        default="models/intent_classifier",
        help="Directory to save trained model (default: models/intent_classifier)",
    )
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument(
        "--patience",
        type=int,
        default=3,
        help="Early-stopping patience: stop if val F1 does not improve for this many epochs (0 = disabled)",
    )
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cuda", "cpu"],
        help=(
            "Training device policy (default: auto). "
            "In development auto requires CUDA by default; in production auto uses GPU if available, else CPU."
        ),
    )
    # Quality-gate arguments
    parser.add_argument(
        "--output-metrics",
        default=None,
        help="Path to write final validation metrics JSON (optional)",
    )
    parser.add_argument(
        "--min-accuracy",
        type=float,
        default=0.0,
        help="Minimum required validation accuracy (0.0 = disabled, default)",
    )
    parser.add_argument(
        "--min-f1",
        type=float,
        default=0.0,
        help="Minimum required weighted F1 on validation set (0.0 = disabled, default)",
    )

    args = parser.parse_args()

    # Reproducibility
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = resolve_training_device(args.device)
    print(f"\nDevice: {device}")

    # ── Load data ────────────────────────────────────────────────────────
    print(f"Loading training data from {args.train_data} ...")
    with open(args.train_data) as f:
        train_data = json.load(f)
    print(f"  {len(train_data)} training samples")

    val_data = []
    if os.path.exists(args.val_data):
        with open(args.val_data) as f:
            val_data = json.load(f)
        print(f"  {len(val_data)} validation samples")

    # ── Tokenizer & model ────────────────────────────────────────────────
    print(f"\nLoading {args.model_name} ...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=len(INTENT_LABELS),
    ).to(device)

    # ── Class-weighted loss ──────────────────────────────────────────────
    train_label_ids = [INTENT_LABELS.index(d["intent"]) for d in train_data]
    present_classes = np.array(sorted(set(train_label_ids)))
    raw_present_weights = compute_class_weight(
        class_weight="balanced",
        classes=present_classes,
        y=train_label_ids,
    )
    raw_weights = np.ones(len(INTENT_LABELS), dtype=np.float32)
    for class_idx, class_weight in zip(present_classes, raw_present_weights):
        raw_weights[int(class_idx)] = float(class_weight)
    weight_tensor = torch.tensor(raw_weights, dtype=torch.float32).to(device)
    criterion = torch.nn.CrossEntropyLoss(weight=weight_tensor)
    weight_summary = ", ".join(f"{lbl}={w:.2f}" for lbl, w in zip(INTENT_LABELS, raw_weights))
    print(f"  Class weights: {weight_summary}")

    # ── Datasets & loaders ───────────────────────────────────────────────
    train_ds = IntentDataset(train_data, tokenizer, args.max_length)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)

    val_loader = None
    if val_data:
        val_ds = IntentDataset(val_data, tokenizer, args.max_length)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    # ── Optimizer & scheduler ────────────────────────────────────────────
    total_steps = len(train_loader) * args.epochs
    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=int(total_steps * 0.1),
        num_training_steps=total_steps,
    )

    # Best-checkpoint directory (written next to output-dir)
    best_ckpt_dir = str(Path(args.output_dir).parent / "_intent_best_ckpt")

    # ── Training ─────────────────────────────────────────────────────────
    print(f"\nTraining for up to {args.epochs} epochs (early-stop patience={args.patience}) ...")
    print("-" * 60)

    best_f1 = 0.0
    epochs_without_improvement = 0
    history: List[Dict[str, Any]] = []

    for epoch in range(1, args.epochs + 1):
        train_loss = train_epoch(model, train_loader, optimizer, scheduler, device, criterion)
        row: Dict[str, Any] = {"epoch": epoch, "train_loss": train_loss}

        if val_loader:
            val_metrics = evaluate(model, val_loader, device)
            row.update({f"val_{k}": v for k, v in val_metrics.items()})

            improved = val_metrics["f1"] > best_f1
            marker = " ✓ best" if improved else ""
            print(
                f"  Epoch {epoch}/{args.epochs}  "
                f"train_loss={train_loss:.4f}  "
                f"val_loss={val_metrics['loss']:.4f}  "
                f"val_acc={val_metrics['accuracy']:.4f}  "
                f"val_f1={val_metrics['f1']:.4f}{marker}"
            )

            if improved:
                best_f1 = val_metrics["f1"]
                epochs_without_improvement = 0
                # Save best weights to a temporary checkpoint
                Path(best_ckpt_dir).mkdir(parents=True, exist_ok=True)
                model.save_pretrained(best_ckpt_dir)
                tokenizer.save_pretrained(best_ckpt_dir)
            else:
                epochs_without_improvement += 1
                if args.patience > 0 and epochs_without_improvement >= args.patience:
                    print(f"  Early stopping: no improvement for {args.patience} epochs.")
                    break
        else:
            print(f"  Epoch {epoch}/{args.epochs}  train_loss={train_loss:.4f}")

        history.append(row)

    print("-" * 60)

    # ── Save model (restore best checkpoint when available) ──────────────
    out = args.output_dir
    Path(out).mkdir(parents=True, exist_ok=True)

    if val_loader and Path(best_ckpt_dir).exists():
        print(f"\nRestoring best checkpoint (val_f1={best_f1:.4f}) ...")
        model = AutoModelForSequenceClassification.from_pretrained(
            best_ckpt_dir,
            num_labels=len(INTENT_LABELS),
        ).to(device)
        # Clean up temp checkpoint
        shutil.rmtree(best_ckpt_dir, ignore_errors=True)

    print(f"Saving model to {out}/ ...")
    model.save_pretrained(out)
    tokenizer.save_pretrained(out)

    # Save label mapping
    label_map = {idx: label for idx, label in enumerate(INTENT_LABELS)}
    with open(os.path.join(out, "label_map.json"), "w") as f:
        json.dump(label_map, f, indent=2)

    # Production inference artifact expected by the inference microservice.
    labels_path = os.path.join(out, "labels.json")
    with open(labels_path, "w") as f:
        json.dump(label_map, f, indent=2)

    # Save training history
    with open(os.path.join(out, "training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    # ── Final report ─────────────────────────────────────────────────────
    final_metrics: Dict[str, Any] = {}
    gate_passed = True

    if val_loader:
        final = evaluate(model, val_loader, device)
        final_metrics = final
        print(f"\nFinal Validation  acc={final['accuracy']:.4f}  f1={final['f1']:.4f}")

        # Detailed per-class report
        model.eval()
        preds, labels = [], []
        with torch.no_grad():
            for batch in val_loader:
                out_logits = model(
                    batch["input_ids"].to(device),
                    batch["attention_mask"].to(device),
                ).logits
                preds.extend(torch.argmax(out_logits, dim=-1).cpu().tolist())
                labels.extend(batch["labels"].tolist())

        print("\nPer-class report:")
        print(
            classification_report(
                labels,
                preds,
                target_names=INTENT_LABELS,
                zero_division=0,
            )
        )

        # ── Quality gates ─────────────────────────────────────────────
        failures: List[str] = []
        if args.min_accuracy > 0.0 and final["accuracy"] < args.min_accuracy:
            failures.append(f"accuracy {final['accuracy']:.4f} < required {args.min_accuracy:.4f}")
        if args.min_f1 > 0.0 and final["f1"] < args.min_f1:
            failures.append(f"f1 {final['f1']:.4f} < required {args.min_f1:.4f}")

        if failures:
            gate_passed = False
            print("\n[QUALITY GATE FAILED]")
            for msg in failures:
                print(f"  ✗ {msg}")
        else:
            if args.min_accuracy > 0.0 or args.min_f1 > 0.0:
                print("\n[QUALITY GATE PASSED]")

    # ── Write metrics JSON ────────────────────────────────────────────
    if args.output_metrics:
        metrics_payload: Dict[str, Any] = {
            **final_metrics,
            "gate_passed": gate_passed,
            "min_accuracy_required": args.min_accuracy,
            "min_f1_required": args.min_f1,
            "output_dir": args.output_dir,
            "epochs": args.epochs,
        }
        metrics_path = Path(args.output_metrics)
        metrics_path.parent.mkdir(parents=True, exist_ok=True)
        with open(metrics_path, "w") as mf:
            json.dump(metrics_payload, mf, indent=2)
        print(f"\nMetrics written to {metrics_path}")

    print("Done.\n")
    return 0 if gate_passed else 1


if __name__ == "__main__":
    sys.exit(main())
