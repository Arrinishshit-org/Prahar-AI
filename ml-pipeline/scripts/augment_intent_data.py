"""
augment_intent_data.py
──────────────────────
Template slot-filling augmentation for intent classification training.

Generates diverse paraphrases of each intent class by expanding
placeholder templates with lists of slot values.  The resulting
samples can be fed into build_intent_training_dataset.py as an
additional data source.

Intent classes produced are constrained to src/training_data.py VALID_INTENTS.

Output:
  data/training/intent_augmented.json   — list of {query, intent} dicts

Usage:
  python scripts/augment_intent_data.py [options]

Options:
  --out        PATH   Output file path  (default: data/training/intent_augmented.json)
    --max-per-class INT  Hard cap per intent class  (default: 250)
  --seed       INT    Random seed for reproducibility  (default: 42)
  --deduplicate       Remove exact duplicates (default: on)
  --no-deduplicate    Skip deduplication
"""

from __future__ import annotations

import argparse
import itertools
import json
import random
import sys
from pathlib import Path
from typing import Dict, Iterator, List, Tuple

_HERE = Path(__file__).resolve().parent
_ML_ROOT = _HERE.parent
sys.path.insert(0, str(_ML_ROOT / "src"))

from training_data import VALID_INTENTS  # noqa: E402  # type: ignore[import-not-found]

# ─────────────────────────────────────────────────────────────────────────────
# Slot value lists
# Templates use {slot_name} placeholders expanded by itertools.product.
# ─────────────────────────────────────────────────────────────────────────────

_CATEGORIES = [
    "agriculture",
    "education",
    "health",
    "housing",
    "employment",
    "women empowerment",
    "disability",
    "senior citizen",
    "youth",
    "skill development",
    "financial inclusion",
    "scholarship",
    "pension",
    "social welfare",
    "micro enterprise",
]

_STATES = [
    "Maharashtra",
    "Gujarat",
    "Rajasthan",
    "Tamil Nadu",
    "Karnataka",
    "Uttar Pradesh",
    "Bihar",
    "West Bengal",
    "Madhya Pradesh",
    "Odisha",
    "Andhra Pradesh",
    "Telangana",
    "Punjab",
    "Haryana",
    "Kerala",
]

_OCCUPATIONS = [
    "farmer",
    "student",
    "self-employed person",
    "daily wage worker",
    "small business owner",
    "artisan",
    "fisherman",
    "unemployed youth",
    "working woman",
    "differently-abled person",
    "senior citizen",
]

_AGES = ["25", "30", "40", "55", "65", "18", "22"]

_INCOMES = [
    "1 lakh per year",
    "2 lakhs per year",
    "50,000 per year",
    "below poverty line",
    "3 lakhs per year",
]

_BENEFITS = [
    "cash transfer",
    "subsidy",
    "free training",
    "loan",
    "insurance",
    "scholarship amount",
    "monthly pension",
]

_DOCUMENT_TYPES = [
    "Aadhaar card",
    "income certificate",
    "caste certificate",
    "bank passbook",
    "ration card",
    "land records",
]

_SCHEME_NAMES = [
    "PM Kisan Samman Nidhi",
    "PM Awas Yojana",
    "Ayushman Bharat",
    "Sukanya Samridhi Yojana",
    "e-Shram",
    "PMEGP",
    "PMSBY",
]

# ─────────────────────────────────────────────────────────────────────────────
# Template registry
# Each entry: (template_string, intent)
# ─────────────────────────────────────────────────────────────────────────────

_TEMPLATES: List[Tuple[str, str]] = []


def _t(intent: str, *templates: str) -> None:
    """Register one or more templates under an intent."""
    for tpl in templates:
        _TEMPLATES.append((tpl, intent))


# ── scheme_search ─────────────────────────────────────────────────────────────
_t(
    "scheme_search",
    "Show me {category} schemes available in {state}",
    "What {category} government schemes can I apply for?",
    "List schemes for {occupation} in {state}",
    "I am a {occupation}, which schemes can I benefit from?",
    "Are there any {category} schemes for people in {state}?",
    "Find government schemes for {occupation}",
    "What welfare schemes are available for {category}?",
    "Tell me about {category} schemes for {age} year olds",
    "Which central schemes are available for {occupation}?",
    "I need help finding {category} schemes in my state",
    "Government yojanas for {occupation}",
    "Sarkari yojana for {occupation} in {state}",
    "Schemes for people with income {income}",
    "Any {category} benefits I can get?",
    "Search {category} schemes under central government",
    "What schemes exist for people below poverty line in {state}?",
    "Can you suggest {category} schemes for families earning {income}?",
    "I want to know about {category} government programs",
    "Looking for subsidies for {occupation} in {state}",
    "List all {category} yojanas for {state}",
)

# ── eligibility_check ─────────────────────────────────────────────────────────
_t(
    "eligibility_check",
    "Am I eligible for {scheme_name}?",
    "Can a {occupation} apply for {scheme_name}?",
    "What are the eligibility criteria for {scheme_name}?",
    "I am {age} years old with income {income}, do I qualify?",
    "Is a {occupation} from {state} eligible for {category} schemes?",
    "Check my eligibility for {category} government schemes",
    "Do I qualify for {scheme_name} as a {occupation}?",
    "Who is eligible for {scheme_name}?",
    "Can someone with {income} income get {category} benefits?",
    "I live in {state}, am I eligible for {scheme_name}?",
    "What income limit applies for {scheme_name}?",
    "Are {occupation}s eligible for {category} assistance?",
    "How do I know if I qualify for {scheme_name}?",
    "Eligibility conditions for {category} scheme in {state}",
    "Does age {age} meet the criteria for {scheme_name}?",
)

# ── application_info ──────────────────────────────────────────────────────────
_t(
    "application_info",
    "How do I apply for {scheme_name}?",
    "What is the process to apply for {category} schemes?",
    "Where can I submit my application for {scheme_name}?",
    "Steps to apply for {scheme_name} online",
    "How to register for {scheme_name}?",
    "Application link for {scheme_name}",
    "Can I apply for {scheme_name} offline?",
    "How to apply for {category} yojana in {state}?",
    "What is the last date to apply for {scheme_name}?",
    "Application form for {category} scheme",
    "Where to apply for {scheme_name} near me?",
    "Apply karne ki process kya hai {scheme_name} ke liye?",
    "Portal to apply for {category} government scheme",
    "I want to apply for {scheme_name}, what should I do?",
    "Application procedure for {occupation} schemes in {state}",
)

# ── deadline_query ────────────────────────────────────────────────────────────
_t(
    "deadline_query",
    "What is the last date to apply for {scheme_name}?",
    "When is the deadline for {scheme_name} application?",
    "Application deadline for {category} scheme in {state}",
    "By when should I submit documents for {scheme_name}?",
    "Last date for {occupation} to apply for {scheme_name}",
    "Deadline of {scheme_name} this year",
    "Can I still apply for {scheme_name} now?",
    "What is the closing date of {category} yojana?",
    "Submission last date for {scheme_name}",
    "When does registration close for {scheme_name}?",
    "Deadline check for {category} government scheme",
    "Is the application window for {scheme_name} still open?",
)

# ── general_question ──────────────────────────────────────────────────────────
_t(
    "general_question",
    "What benefits does {scheme_name} provide?",
    "How much {benefit} can I get from {scheme_name}?",
    "What is the {benefit} amount under {scheme_name}?",
    "What will I receive from {category} government scheme?",
    "Describe the benefits of {scheme_name}",
    "How much money do you get from {scheme_name}?",
    "Explain the coverage under {scheme_name}",
    "What kind of {benefit} is given in {category} yojana?",
    "Benefits list for {scheme_name}",
    "Is {benefit} included in {scheme_name}?",
    "What financial assistance does {scheme_name} offer?",
    "Total benefit amount under {scheme_name}",
    "Annual benefit from {scheme_name} for {occupation}",
)

# ── profile_update ────────────────────────────────────────────────────────────
_t(
    "profile_update",
    "Update my age to {age}",
    "My income is now {income}, please update profile",
    "Change my state to {state}",
    "Set my occupation to {occupation}",
    "Please update my profile details",
    "I moved to {state}, update my account",
    "Correct my annual income to {income}",
    "Edit my profile information",
    "Update my family and income details",
    "Profile update: I am a {occupation} from {state}",
    "Modify my user profile for better scheme matching",
    "Mera profile update kar do",
)

# ── nudge_preferences ─────────────────────────────────────────────────────────
_t(
    "nudge_preferences",
    "Send me reminders for scheme deadlines",
    "Do not send me frequent notifications",
    "Enable SMS alerts for new schemes",
    "Turn off scheme recommendation nudges",
    "Notify me only for {category} schemes",
    "Set reminder preference to weekly",
    "I want updates only when new {category} schemes launch",
    "Mute notification alerts for now",
    "Send me important alerts only",
    "Enable application deadline notifications",
    "Preference update: notifications in the evening",
    "Change my nudge settings",
)

# ── general_question (non-task-specific) ─────────────────────────────────────
_t(
    "general_question",
    "Hello, I need help",
    "Hi there",
    "What can you help me with?",
    "I have a question about government schemes",
    "Tell me about government welfare programs",
    "What is myscheme.gov.in?",
    "I am looking for government support",
    "Can you help me?",
    "Namaste, mujhe madad chahiye",
    "I don't know what schemes exist",
    "General query about yojanas",
    "Overview of government benefits in India",
    "I want to learn about central government schemes",
)

# ─────────────────────────────────────────────────────────────────────────────
# Slot map — maps placeholder name → list of values
# ─────────────────────────────────────────────────────────────────────────────

_SLOT_MAP: Dict[str, List[str]] = {
    "category": _CATEGORIES,
    "state": _STATES,
    "occupation": _OCCUPATIONS,
    "age": _AGES,
    "income": _INCOMES,
    "benefit": _BENEFITS,
    "document_type": _DOCUMENT_TYPES,
    "scheme_name": _SCHEME_NAMES,
}


def _extract_slots(template: str) -> List[str]:
    """Return placeholder names used in *template*, in order of occurrence."""
    import re

    return re.findall(r"\{(\w+)\}", template)


def _expand_template(template: str, max_samples: int, rng: random.Random) -> Iterator[str]:
    """
    Expand a template by randomly sampling slot combinations.
    Yields up to *max_samples* filled strings without replacement
    (or with replacement when the combinatorial space is smaller).
    """
    slots = _extract_slots(template)
    if not slots:
        yield template
        return

    values = [_SLOT_MAP.get(slot, [slot]) for slot in slots]
    all_combos = list(itertools.product(*values))
    rng.shuffle(all_combos)

    for combo in all_combos[:max_samples]:
        filled = template
        for slot, val in zip(slots, combo):
            filled = filled.replace(f"{{{slot}}}", val, 1)
        yield filled


# ─────────────────────────────────────────────────────────────────────────────
# Main generation logic
# ─────────────────────────────────────────────────────────────────────────────


def generate_augmented_samples(
    max_per_class: int,
    seed: int,
    do_deduplicate: bool,
) -> List[Dict[str, str]]:
    """Generate augmented intent samples using template slot-filling."""
    rng = random.Random(seed)
    samples_by_intent: Dict[str, List[Dict[str, str]]] = {intent: [] for intent in VALID_INTENTS}

    # Group templates by intent
    by_intent: Dict[str, List[str]] = {intent: [] for intent in VALID_INTENTS}
    for tpl, intent in _TEMPLATES:
        if intent in by_intent:
            by_intent[intent].append(tpl)

    for intent, templates in by_intent.items():
        # Distribute the per-class budget evenly across templates
        budget_per_tpl = max(1, max_per_class // max(len(templates), 1))

        for tpl in templates:
            if len(samples_by_intent[intent]) >= max_per_class:
                break
            for query in _expand_template(tpl, budget_per_tpl, rng):
                if len(samples_by_intent[intent]) >= max_per_class:
                    break
                samples_by_intent[intent].append({"query": query, "intent": intent})

    all_samples: List[Dict[str, str]] = []
    for intent_samples in samples_by_intent.values():
        all_samples.extend(intent_samples)

    if do_deduplicate:
        seen: set[str] = set()
        deduped: List[Dict[str, str]] = []
        for s in all_samples:
            key = s["query"].lower().strip()
            if key not in seen:
                seen.add(key)
                deduped.append(s)
        all_samples = deduped

    rng.shuffle(all_samples)
    return all_samples


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate template-augmented intent training samples."
    )
    parser.add_argument(
        "--out",
        default=str(_ML_ROOT / "data" / "training" / "intent_augmented.json"),
        help="Output JSON file path",
    )
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=250,
        metavar="N",
        help="Max samples per intent class (default: 250)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed (default: 42)",
    )
    parser.add_argument(
        "--deduplicate",
        dest="deduplicate",
        action="store_true",
        default=True,
        help="Remove exact duplicate queries (default: on)",
    )
    parser.add_argument(
        "--no-deduplicate",
        dest="deduplicate",
        action="store_false",
        help="Skip deduplication",
    )
    args = parser.parse_args()

    samples = generate_augmented_samples(
        max_per_class=args.max_per_class,
        seed=args.seed,
        do_deduplicate=args.deduplicate,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(samples, fh, ensure_ascii=False, indent=2)

    # Print per-class breakdown
    by_intent: Dict[str, int] = {}
    for s in samples:
        by_intent[s["intent"]] = by_intent.get(s["intent"], 0) + 1

    print(f"[augment] Generated {len(samples)} samples → {out_path}")
    for intent, count in sorted(by_intent.items()):
        print(f"  {intent:<30s} {count:>4d}")

    missing_intents = sorted([intent for intent in VALID_INTENTS if by_intent.get(intent, 0) == 0])
    if missing_intents:
        print("[augment] WARNING: Missing classes:", ", ".join(missing_intents))
    else:
        print("[augment] Coverage OK: all VALID_INTENTS represented")

    return 0


if __name__ == "__main__":
    sys.exit(main())
