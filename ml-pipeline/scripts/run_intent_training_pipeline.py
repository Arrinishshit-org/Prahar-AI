"""Run end-to-end intent data+training pipeline with trend reporting.

Pipeline steps:
1) Merge intent datasets (synthetic + augmented + unknown + review queue)
2) Train intent classifier with quality gates
3) Write run report + rolling dashboard JSON

Example:
  python scripts/run_intent_training_pipeline.py

  python scripts/run_intent_training_pipeline.py \
    --epochs 10 --batch-size 32 --min-accuracy 0.90 --min-f1 0.90
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
TRAINING_DIR = ROOT / "data" / "training"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run(cmd: List[str], env: Dict[str, str] | None = None) -> None:
    print(f"\n$ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=ROOT, check=True, env=env)


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _safe_counts(manifest: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "total_samples": int(manifest.get("total_samples", 0)),
        "train_samples": int(manifest.get("train_samples", 0)),
        "val_samples": int(manifest.get("val_samples", 0)),
        "train_intent_counts": manifest.get("train_intent_counts", {}),
        "val_intent_counts": manifest.get("val_intent_counts", {}),
    }


def _compute_delta(prev: Dict[str, Any] | None, cur: Dict[str, Any]) -> Dict[str, Any]:
    prev = prev or {}
    return {
        "accuracy_delta": round(
            float(cur.get("accuracy", 0.0)) - float(prev.get("accuracy", 0.0)), 6
        ),
        "f1_delta": round(float(cur.get("f1", 0.0)) - float(prev.get("f1", 0.0)), 6),
        "loss_delta": round(float(cur.get("loss", 0.0)) - float(prev.get("loss", 0.0)), 6),
    }


def _build_run_summary(
    metrics: Dict[str, Any],
    manifest: Dict[str, Any],
    min_accuracy: float,
    min_f1: float,
) -> Dict[str, Any]:
    return {
        "timestamp": _iso_now(),
        "metrics": {
            "accuracy": float(metrics.get("accuracy", 0.0)),
            "f1": float(metrics.get("f1", 0.0)),
            "precision": float(metrics.get("precision", 0.0)),
            "recall": float(metrics.get("recall", 0.0)),
            "loss": float(metrics.get("loss", 0.0)),
            "gate_passed": bool(metrics.get("gate_passed", False)),
            "min_accuracy_required": float(metrics.get("min_accuracy_required", min_accuracy)),
            "min_f1_required": float(metrics.get("min_f1_required", min_f1)),
            "epochs": int(metrics.get("epochs", 0)),
        },
        "dataset": _safe_counts(manifest),
    }


def _update_dashboard(
    run_summary: Dict[str, Any],
    dashboard_path: Path,
    history_path: Path,
    keep_last: int,
) -> None:
    history = _read_json(history_path, [])
    if not isinstance(history, list):
        history = []

    previous = history[-1]["metrics"] if history else None

    history.append(run_summary)
    if keep_last > 0:
        history = history[-keep_last:]

    latest = run_summary
    trend = (
        _compute_delta(previous, latest["metrics"])
        if previous
        else {
            "accuracy_delta": 0.0,
            "f1_delta": 0.0,
            "loss_delta": 0.0,
        }
    )

    dashboard = {
        "updated_at": _iso_now(),
        "latest": latest,
        "trend_vs_previous": trend,
        "history_length": len(history),
    }

    history_path.parent.mkdir(parents=True, exist_ok=True)
    with history_path.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    with dashboard_path.open("w", encoding="utf-8") as f:
        json.dump(dashboard, f, indent=2)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run intent retraining pipeline with dashboard output"
    )

    parser.add_argument("--python", default=sys.executable)

    # Dataset build knobs
    parser.add_argument("--reviewed-only", action="store_true")
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)

    # Training knobs
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")

    # Quality gates
    parser.add_argument("--min-accuracy", type=float, default=0.90)
    parser.add_argument("--min-f1", type=float, default=0.90)

    # Outputs
    parser.add_argument(
        "--metrics-out",
        default=str(TRAINING_DIR / "intent_metrics_latest.json"),
        help="Trainer metrics JSON output path",
    )
    parser.add_argument(
        "--dashboard-out",
        default=str(TRAINING_DIR / "intent_dashboard.json"),
        help="Single-file latest + trend dashboard path",
    )
    parser.add_argument(
        "--history-out",
        default=str(TRAINING_DIR / "intent_dashboard_history.json"),
        help="Rolling run history JSON path",
    )
    parser.add_argument("--keep-last", type=int, default=30)

    args = parser.parse_args()

    python = args.python
    metrics_out = Path(args.metrics_out)
    dashboard_out = Path(args.dashboard_out)
    history_out = Path(args.history_out)

    manifest_path = TRAINING_DIR / "manifest_merged.json"
    train_path = TRAINING_DIR / "intent_train_merged.json"
    val_path = TRAINING_DIR / "intent_val_merged.json"

    # Step 1: dataset merge
    build_cmd = [
        python,
        "scripts/build_intent_training_dataset.py",
        "--val-fraction",
        str(args.val_fraction),
        "--seed",
        str(args.seed),
    ]
    if args.reviewed_only:
        build_cmd.append("--reviewed-only")

    _run(build_cmd)

    # Step 2: training + gates
    train_cmd = [
        python,
        "training/intent_trainer.py",
        "--train-data",
        str(train_path),
        "--val-data",
        str(val_path),
        "--epochs",
        str(args.epochs),
        "--patience",
        str(args.patience),
        "--batch-size",
        str(args.batch_size),
        "--lr",
        str(args.lr),
        "--max-length",
        str(args.max_length),
        "--min-accuracy",
        str(args.min_accuracy),
        "--min-f1",
        str(args.min_f1),
        "--output-metrics",
        str(metrics_out),
        "--device",
        args.device,
    ]

    env = os.environ.copy()
    _run(train_cmd, env=env)

    # Step 3: report + dashboard
    metrics = _read_json(metrics_out, {})
    manifest = _read_json(manifest_path, {})

    run_summary = _build_run_summary(metrics, manifest, args.min_accuracy, args.min_f1)
    _update_dashboard(run_summary, dashboard_out, history_out, keep_last=args.keep_last)

    print("\nPipeline complete.")
    print(f"  Metrics:   {metrics_out}")
    print(f"  Dashboard: {dashboard_out}")
    print(f"  History:   {history_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
