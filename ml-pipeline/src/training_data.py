"""
training_data.py — Shared data-layer utilities for the ML training pipeline.

Provides:
  - Thread-safe JSONL append / load
  - Intent sample validation
  - Deterministic stratified train/val split
  - Manifest build & write helpers
"""

import hashlib
import json
import math
import threading
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_INTENT_FIELDS: Tuple[str, ...] = ("query", "intent")

VALID_INTENTS = frozenset(
    [
        "scheme_search",
        "eligibility_check",
        "application_info",
        "deadline_query",
        "profile_update",
        "general_question",
        "nudge_preferences",
    ]
)

# Module-level write lock — prevents concurrent FastAPI workers from
# interleaving lines when appending to the same JSONL file.
_JSONL_WRITE_LOCK = threading.Lock()

# Default path for the low-confidence review queue.
DEFAULT_REVIEW_QUEUE = "data/training/intent_review_queue.jsonl"

# ── JSONL helpers ─────────────────────────────────────────────────────────────


def append_jsonl(path: "str | Path", record: Dict[str, Any]) -> None:
    """Append *record* as a single JSON line to *path*.

    Creates parent directories and the file if they do not exist.
    Thread-safe: protected by a module-level lock.
    """
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False)
    with _JSONL_WRITE_LOCK:
        with file_path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")


def load_jsonl(path: "str | Path") -> List[Dict[str, Any]]:
    """Load all records from a JSONL file.

    Returns an empty list if the file does not exist.
    Silently skips blank lines or lines that fail to parse.
    """
    file_path = Path(path)
    if not file_path.exists():
        return []

    records: List[Dict[str, Any]] = []
    with file_path.open(encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


# ── Sample validation ─────────────────────────────────────────────────────────


def validate_intent_sample(record: Dict[str, Any]) -> Optional[str]:
    """Validate a single intent training sample.

    Returns None when the sample is valid, or a string describing
    the first validation error found.
    """
    for field in REQUIRED_INTENT_FIELDS:
        if not record.get(field):
            return f"Missing required field: '{field}'"

    query = record["query"]
    if not isinstance(query, str) or not query.strip():
        return "Field 'query' must be a non-empty string"

    intent = record["intent"]
    if intent not in VALID_INTENTS:
        return f"Unknown intent '{intent}'; valid values: {sorted(VALID_INTENTS)}"

    return None


def is_valid_intent_sample(record: Dict[str, Any]) -> bool:
    """Return True if the record passes all intent sample validation rules."""
    return validate_intent_sample(record) is None


# ── Deduplication ─────────────────────────────────────────────────────────────


def _sample_key(record: Dict[str, Any]) -> str:
    """Deterministic deduplication key derived from (query, intent)."""
    query = (record.get("query") or "").strip().lower()
    intent = (record.get("intent") or "").strip().lower()
    raw = f"{query}||{intent}"
    # MD5 is used here solely as a fast fingerprint, not for cryptographic purposes.
    return hashlib.md5(raw.encode()).hexdigest()  # noqa: S324


def deduplicate(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return *records* with duplicates removed (first-occurrence wins).

    Two records are considered duplicates when they share the same
    normalised (query, intent) pair.
    """
    seen: set = set()
    out: List[Dict[str, Any]] = []
    for rec in records:
        key = _sample_key(rec)
        if key not in seen:
            seen.add(key)
            out.append(rec)
    return out


# ── Train / val split ─────────────────────────────────────────────────────────


def train_val_split(
    records: List[Dict[str, Any]],
    val_fraction: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Deterministic stratified train/val split on the 'intent' field.

    Each intent class is represented in both splits proportionally.
    At least one training sample is kept per class to prevent empty
    training classes.

    Args:
        records:      Validated, deduplicated samples.
        val_fraction: Fraction to allocate to validation (clamped 0.05–0.40).
        seed:         Random seed for reproducibility.

    Returns:
        ``(train_records, val_records)``
    """
    if not records:
        return [], []

    import random

    val_fraction = max(0.05, min(0.40, val_fraction))
    rng = random.Random(seed)

    buckets: Dict[str, List[Dict]] = defaultdict(list)
    for rec in records:
        buckets[rec.get("intent", "__unknown__")].append(rec)

    train_out: List[Dict] = []
    val_out: List[Dict] = []

    for _intent_label, samples in buckets.items():
        shuffled = samples[:]
        rng.shuffle(shuffled)
        n_val = max(1, math.floor(len(shuffled) * val_fraction))
        # Ensure at least 1 training sample per class
        if len(shuffled) - n_val < 1:
            n_val = 0
        val_out.extend(shuffled[:n_val])
        train_out.extend(shuffled[n_val:])

    rng.shuffle(train_out)
    rng.shuffle(val_out)
    return train_out, val_out


# ── Manifest helpers ─────────────────────────────────────────────────────────


def build_manifest(
    train_records: List[Dict[str, Any]],
    val_records: List[Dict[str, Any]],
    source_files: Optional[List[str]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build a manifest dict summarising a merged dataset.

    Args:
        train_records: Training split samples.
        val_records:   Validation split samples.
        source_files:  List of files merged to produce this dataset.
        extra:         Any additional metadata to include verbatim.

    Returns:
        Manifest dict (not yet written to disk — call :func:`write_manifest`).
    """

    def intent_counts(recs: List[Dict]) -> Dict[str, int]:
        return dict(Counter(r.get("intent", "unknown") for r in recs))

    manifest: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_samples": len(train_records) + len(val_records),
        "train_samples": len(train_records),
        "val_samples": len(val_records),
        "train_intent_counts": intent_counts(train_records),
        "val_intent_counts": intent_counts(val_records),
        "source_files": source_files or [],
    }
    if extra:
        manifest.update(extra)
    return manifest


def write_manifest(manifest: Dict[str, Any], path: "str | Path") -> None:
    """Serialise *manifest* to *path* as pretty-printed JSON."""
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open("w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
