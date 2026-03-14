"""FastAPI inference server for PraharAI intent classification.

Run from this directory:
  uvicorn server:app --host 0.0.0.0 --port 8001
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict

from fastapi import FastAPI
from pydantic import BaseModel, Field

from intent_predictor import IntentPredictor


logger = logging.getLogger("intent_inference_server")
logging.basicConfig(level=logging.INFO)

APP_ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(os.getenv("INTENT_MODEL_DIR", str(APP_ROOT / "models" / "intent_classifier")))
LOG_DIR = APP_ROOT / "logs"
LOG_PATH = LOG_DIR / "intent_predictions.log"
CONFIDENCE_THRESHOLD = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.60"))

_predictor: IntentPredictor | None = None
_log_write_lock = Lock()


class PredictIntentRequest(BaseModel):
    text: str = Field(min_length=1)


class PredictIntentResponse(BaseModel):
    intent: str
    confidence: float


def _append_prediction_log(entry: Dict[str, object]) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False)
    with _log_write_lock:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


app = FastAPI(title="PraharAI Intent Inference Service", version="1.0.0")


@app.on_event("startup")
def startup() -> None:
    global _predictor
    _predictor = IntentPredictor(
        model_dir=MODEL_DIR,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )
    logger.info("Intent model loaded from %s on startup", MODEL_DIR)


@app.get("/health")
def health() -> Dict[str, object]:
    return {
        "status": "ok",
        "model_loaded": _predictor is not None,
        "model_dir": str(MODEL_DIR),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }


@app.post("/predict_intent", response_model=PredictIntentResponse)
def predict_intent(req: PredictIntentRequest) -> PredictIntentResponse:
    text = req.text.strip()

    if not _predictor:
        fallback = {"intent": "unknown_intent", "confidence": 0.0}
        _append_prediction_log(
            {
                "text": text,
                "intent": fallback["intent"],
                "confidence": fallback["confidence"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "model_not_loaded",
            }
        )
        return PredictIntentResponse(**fallback)

    try:
        result = _predictor.predict(text)
        _append_prediction_log(
            {
                "text": text,
                "intent": result["intent"],
                "confidence": result["confidence"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        return PredictIntentResponse(**result)
    except Exception as exc:
        logger.exception("Intent prediction failed")
        fallback = {"intent": "unknown_intent", "confidence": 0.0}
        _append_prediction_log(
            {
                "text": text,
                "intent": fallback["intent"],
                "confidence": fallback["confidence"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(exc),
            }
        )
        return PredictIntentResponse(**fallback)
