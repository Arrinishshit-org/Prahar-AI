"""Intent prediction module for PraharAI production inference.

Loads a fine-tuned DistilBERT intent classifier and returns intent + confidence.
Designed for easy extension to batching, model versioning and multilingual models.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import torch
from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast


@dataclass(frozen=True)
class IntentPrediction:
    intent: str
    confidence: float

    def as_dict(self) -> Dict[str, float | str]:
        return {
            "intent": self.intent,
            "confidence": round(float(self.confidence), 4),
        }


class IntentPredictor:
    """Single-model inference wrapper.

    Current mode:
      - single-intent classification with confidence threshold fallback.

    Extensibility points:
      - predict_batch for future batching.
      - model_version metadata for model registry integration.
      - tokenizer/model swapping for multilingual checkpoints.
    """

    def __init__(
        self,
        model_dir: str | Path = "models/intent_classifier",
        confidence_threshold: float = 0.60,
        device: Optional[str] = None,
        model_version: Optional[str] = None,
    ) -> None:
        self.model_dir = Path(model_dir)
        self.confidence_threshold = float(confidence_threshold)
        self.model_version = model_version or self.model_dir.name
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))

        if not self.model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {self.model_dir}")

        self.labels = self._load_labels(self.model_dir)
        self.tokenizer = DistilBertTokenizerFast.from_pretrained(self.model_dir)
        self.model = DistilBertForSequenceClassification.from_pretrained(self.model_dir).to(
            self.device
        )
        self.model.eval()

    @staticmethod
    def _load_labels(model_dir: Path) -> List[str]:
        labels_path = model_dir / "labels.json"
        fallback_path = model_dir / "label_map.json"

        target = labels_path if labels_path.exists() else fallback_path
        if not target.exists():
            raise FileNotFoundError(f"Neither labels.json nor label_map.json exists in {model_dir}")

        with target.open("r", encoding="utf-8") as f:
            payload = json.load(f)

        # Expected shape: {"0": "scheme_search", ...}
        sorted_items = sorted(((int(k), v) for k, v in payload.items()), key=lambda it: it[0])
        labels = [name for _idx, name in sorted_items]
        if not labels:
            raise ValueError(f"No labels found in {target}")
        return labels

    def _predict_logits(self, texts: List[str]) -> torch.Tensor:
        enc = self.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=128,
            return_tensors="pt",
        )
        enc = {k: v.to(self.device) for k, v in enc.items()}

        with torch.no_grad():
            out = self.model(**enc)
            return out.logits

    def predict(self, text: str) -> Dict[str, float | str]:
        if not isinstance(text, str) or not text.strip():
            return {"intent": "unknown_intent", "confidence": 0.0}

        logits = self._predict_logits([text])
        probs = torch.softmax(logits, dim=-1)[0]

        confidence, pred_idx = torch.max(probs, dim=-1)
        predicted_intent = self.labels[int(pred_idx.item())]
        conf = float(confidence.item())

        if conf < self.confidence_threshold:
            predicted_intent = "unknown_intent"

        return IntentPrediction(intent=predicted_intent, confidence=conf).as_dict()

    def predict_batch(self, texts: List[str]) -> List[Dict[str, float | str]]:
        """Batch prediction hook for future throughput optimization."""
        if not texts:
            return []

        logits = self._predict_logits(texts)
        probs = torch.softmax(logits, dim=-1)
        confidences, indices = torch.max(probs, dim=-1)

        outputs: List[Dict[str, float | str]] = []
        for conf_t, idx_t in zip(confidences, indices):
            conf = float(conf_t.item())
            intent = self.labels[int(idx_t.item())]
            if conf < self.confidence_threshold:
                intent = "unknown_intent"
            outputs.append(IntentPrediction(intent=intent, confidence=conf).as_dict())

        return outputs
