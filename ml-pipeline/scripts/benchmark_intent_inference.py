"""Benchmark PraharAI intent inference latency.

Measures direct model latency (IntentPredictor) and optional HTTP latency against
/predict_intent. Outputs p50/p95/p99 and checks against a target threshold.

Examples:
  python scripts/benchmark_intent_inference.py --runs 300 --warmup 30
  python scripts/benchmark_intent_inference.py --http-url http://127.0.0.1:8001/predict_intent
"""

from __future__ import annotations

import argparse
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List

import requests
import torch

import sys

# Ensure ml-pipeline root is importable when running from scripts/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from inference.intent_predictor import IntentPredictor  # noqa: E402


@dataclass
class BenchmarkResult:
    label: str
    n: int
    mean_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = (len(ordered) - 1) * p
    f = int(k)
    c = min(f + 1, len(ordered) - 1)
    if f == c:
        return ordered[f]
    d0 = ordered[f] * (c - k)
    d1 = ordered[c] * (k - f)
    return d0 + d1


def summarize(label: str, samples_ms: List[float]) -> BenchmarkResult:
    return BenchmarkResult(
        label=label,
        n=len(samples_ms),
        mean_ms=statistics.mean(samples_ms),
        p50_ms=percentile(samples_ms, 0.50),
        p95_ms=percentile(samples_ms, 0.95),
        p99_ms=percentile(samples_ms, 0.99),
    )


def run_direct(
    predictor: IntentPredictor,
    query: str,
    warmup: int,
    runs: int,
) -> BenchmarkResult:
    for _ in range(max(0, warmup)):
        predictor.predict(query)

    samples_ms: List[float] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        predictor.predict(query)
        dt = (time.perf_counter() - t0) * 1000.0
        samples_ms.append(dt)

    return summarize("direct_model", samples_ms)


def run_http(
    http_url: str,
    query: str,
    warmup: int,
    runs: int,
    timeout_s: float,
) -> BenchmarkResult:
    payload = {"text": query}
    for _ in range(max(0, warmup)):
        requests.post(http_url, json=payload, timeout=timeout_s)

    samples_ms: List[float] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        r = requests.post(http_url, json=payload, timeout=timeout_s)
        r.raise_for_status()
        dt = (time.perf_counter() - t0) * 1000.0
        samples_ms.append(dt)

    return summarize("http_endpoint", samples_ms)


def print_result(result: BenchmarkResult, target_ms: float) -> None:
    meets = result.p95_ms <= target_ms
    print(f"\n[{result.label}]")
    print(f"  n={result.n}")
    print(f"  mean={result.mean_ms:.2f} ms")
    print(f"  p50={result.p50_ms:.2f} ms")
    print(f"  p95={result.p95_ms:.2f} ms")
    print(f"  p99={result.p99_ms:.2f} ms")
    print(f"  target(p95 <= {target_ms:.1f} ms): {'PASS' if meets else 'FAIL'}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark intent inference latency")
    parser.add_argument("--model-dir", default="models/intent_classifier")
    parser.add_argument(
        "--query", default="I am a student from Gujarat looking for scholarship schemes"
    )
    parser.add_argument("--warmup", type=int, default=25)
    parser.add_argument("--runs", type=int, default=200)
    parser.add_argument("--threshold", type=float, default=100.0, help="Target p95 latency in ms")
    parser.add_argument(
        "--http-url",
        default="",
        help="Optional endpoint for HTTP benchmark, e.g. http://127.0.0.1:8001/predict_intent",
    )
    parser.add_argument("--http-timeout", type=float, default=5.0)
    args = parser.parse_args()

    print("Intent inference benchmark")
    print(f"  model_dir: {args.model_dir}")
    print(f"  runs: {args.runs}, warmup: {args.warmup}")
    print(f"  torch_cuda_available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"  torch_cuda_device: {torch.cuda.get_device_name(0)}")

    predictor = IntentPredictor(model_dir=args.model_dir)
    direct = run_direct(predictor, args.query, args.warmup, args.runs)
    print_result(direct, args.threshold)

    if args.http_url:
        http_result = run_http(args.http_url, args.query, args.warmup, args.runs, args.http_timeout)
        print_result(http_result, args.threshold)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
