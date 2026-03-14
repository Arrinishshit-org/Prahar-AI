"""
build_intent_training_dataset.py
─────────────────────────────────
Merge synthetic intent training data with live low-confidence samples
that have been reviewed, then write a clean dataset ready for retraining.

Sources merged (in priority order — later sources win on deduplication):
  1. data/training/intent_train.json   — original synthetic training samples
  2. data/training/intent_val.json     — original synthetic validation samples
  3. data/training/intent_review_queue.jsonl — live samples captured from low-
                                               confidence API classifications

Output:
  data/training/intent_train_merged.json
  data/training/intent_val_merged.json
  data/training/manifest_merged.json

The merged files can be fed directly into training/intent_trainer.py via
  --train-data data/training/intent_train_merged.json
  --val-data   data/training/intent_val_merged.json

Usage:
  python scripts/build_intent_training_dataset.py [options]

Options:
  --train-data   PATH   Synthetic train JSON             (default: see above)
  --val-data     PATH   Synthetic val JSON               (default: see above)
  --review-queue PATH   Live review JSONL                (default: see above)
  --out-dir      DIR    Output directory                 (default: data/training)
  --val-fraction FLOAT  Val fraction for re-split        (default: 0.15)
  --seed         INT    Random seed                      (default: 42)
  --reviewed-only       Only include JSONL records where reviewed=true
                        (default: include all records in the queue)
"""

import argparse
import json
import sys
from pathlib import Path

# Make sure we can import from ml-pipeline/src regardless of cwd.
_HERE = Path(__file__).resolve().parent
_ML_ROOT = _HERE.parent
sys.path.insert(0, str(_ML_ROOT / "src"))

from training_data import (  # noqa: E402
    build_manifest,
    deduplicate,
    is_valid_intent_sample,
    load_jsonl,
    train_val_split,
    write_manifest,
)


# ── Defaults ──────────────────────────────────────────────────────────────────

_DATA_DIR = _ML_ROOT / "data" / "training"

DEFAULT_TRAIN = str(_DATA_DIR / "intent_train.json")
DEFAULT_VAL = str(_DATA_DIR / "intent_val.json")
DEFAULT_QUEUE = str(_DATA_DIR / "intent_review_queue.jsonl")
DEFAULT_OUT_DIR = str(_DATA_DIR)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _load_json_list(path: str | Path) -> list:
    """Load a JSON file that contains a list; return [] if the file is absent."""
    p = Path(path)
    if not p.exists():
        return []
    with p.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError(f"{path}: expected a JSON array, got {type(data).__name__}")
    return data


def _write_json(records: list, path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Merge synthetic + reviewed intent data for retraining",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--train-data", default=DEFAULT_TRAIN)
    parser.add_argument("--val-data", default=DEFAULT_VAL)
    parser.add_argument("--review-queue", default=DEFAULT_QUEUE)
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--reviewed-only",
        action="store_true",
        help="Only include JSONL records where reviewed=true",
    )
    args = parser.parse_args()

    out_dir = Path(args.out_dir)

    # ── 1. Load sources ──────────────────────────────────────────────────────
    print("Loading sources...")
    train_synthetic = _load_json_list(args.train_data)
    val_synthetic = _load_json_list(args.val_data)
    queue_raw = load_jsonl(args.review_queue)

    print(f"  Synthetic train : {len(train_synthetic):>5}")
    print(f"  Synthetic val   : {len(val_synthetic):>5}")
    print(f"  Review queue    : {len(queue_raw):>5} (raw)")

    # ── 2. Filter queue ──────────────────────────────────────────────────────
    if args.reviewed_only:
        queue_filtered = [r for r in queue_raw if r.get("reviewed") is True]
        print(f"  After --reviewed-only filter: {len(queue_filtered)}")
    else:
        queue_filtered = queue_raw

    # ── 3. Combine & validate ────────────────────────────────────────────────
    # Combine all sources; synthetic data first so live data wins on dedup
    combined = train_synthetic + val_synthetic + queue_filtered

    valid: list = []
    skipped = 0
    for rec in combined:
        err = None
        # Normalise: queue records may have extra fields — keep them.
        sample = {"query": rec.get("query", ""), "intent": rec.get("intent", "")}
        # Propagate any extra annotation fields (reviewed, confidence, source, …)
        for k, v in rec.items():
            if k not in sample:
                sample[k] = v
        from training_data import validate_intent_sample  # already imported

        err = validate_intent_sample(sample)
        if err:
            skipped += 1
            continue
        valid.append(sample)

    print(f"\n  Valid samples   : {len(valid)}")
    if skipped:
        print(f"  Skipped (invalid): {skipped}")

    if not valid:
        print("ERROR: No valid samples after filtering. Aborting.", file=sys.stderr)
        return 1

    # ── 4. Deduplicate ───────────────────────────────────────────────────────
    deduped = deduplicate(valid)
    removed = len(valid) - len(deduped)
    print(f"  After dedup     : {len(deduped)} ({removed} duplicates removed)")

    # ── 5. Re-split ──────────────────────────────────────────────────────────
    train_out, val_out = train_val_split(deduped, val_fraction=args.val_fraction, seed=args.seed)
    print(f"\n  → Train split   : {len(train_out)}")
    print(f"  → Val split     : {len(val_out)}")

    # ── 6. Write outputs ─────────────────────────────────────────────────────
    train_path = out_dir / "intent_train_merged.json"
    val_path = out_dir / "intent_val_merged.json"
    manifest_path = out_dir / "manifest_merged.json"

    _write_json(train_out, train_path)
    _write_json(val_out, val_path)

    source_files = [args.train_data, args.val_data]
    if Path(args.review_queue).exists():
        source_files.append(args.review_queue)

    manifest = build_manifest(
        train_out,
        val_out,
        source_files=source_files,
        extra={
            "reviewed_only_filter": args.reviewed_only,
            "seed": args.seed,
            "val_fraction": args.val_fraction,
        },
    )
    write_manifest(manifest, manifest_path)

    print(f"\nWrote:")
    print(f"  {train_path}")
    print(f"  {val_path}")
    print(f"  {manifest_path}")
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
