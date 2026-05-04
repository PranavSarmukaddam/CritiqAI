"""
Stage 1 — Data Integrity & Distribution Analysis
"""
import pandas as pd
import numpy as np


def run(df: pd.DataFrame) -> dict:
    total_rows = len(df)
    total_cols = len(df.columns)

    # Missing values
    missing = df.isnull().sum()
    missing_pct = (missing / total_rows * 100).round(2)
    missing_report = {
        col: {"count": int(missing[col]), "pct": float(missing_pct[col])}
        for col in df.columns if missing[col] > 0
    }
    missing_pct_total = float(missing.sum() / (total_rows * total_cols) * 100)

    # Duplicates
    dup_count = int(df.duplicated().sum())

    # Feature distributions (numeric only)
    numeric = df.select_dtypes(include=[np.number])
    distributions = {}
    for col in numeric.columns:
        if col == "label":
            continue
        distributions[col] = {
            "mean": round(float(numeric[col].mean()), 4),
            "std": round(float(numeric[col].std()), 4),
            "min": round(float(numeric[col].min()), 4),
            "max": round(float(numeric[col].max()), 4),
            "skew": round(float(numeric[col].skew()), 4),
        }

    # Class balance
    class_balance = {}
    if "label" in df.columns:
        vc = df["label"].value_counts()
        class_balance = {str(k): int(v) for k, v in vc.items()}
        min_class = vc.min()
        max_class = vc.max()
        imbalance_ratio = round(float(min_class / max_class), 4)
    else:
        imbalance_ratio = None

    # Flags
    flags = []
    if missing_pct_total > 5:
        flags.append(f"High missing data: {missing_pct_total:.1f}% of all values are null")
    if dup_count > 0:
        flags.append(f"{dup_count} duplicate rows detected")
    if imbalance_ratio is not None and imbalance_ratio < 0.7:
        flags.append(f"Class imbalance detected (ratio {imbalance_ratio})")

    return {
        "stage": 1,
        "name": "Data Integrity & Distribution Analysis",
        "summary": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "missing_pct_total": round(missing_pct_total, 2),
            "duplicate_rows": dup_count,
            "imbalance_ratio": imbalance_ratio,
        },
        "missing_report": missing_report,
        "class_balance": class_balance,
        "distributions": distributions,
        "flags": flags,
        "risk_contribution": _risk_score(missing_pct_total, dup_count, imbalance_ratio),
    }


def _risk_score(missing_pct, dup_count, imbalance_ratio) -> float:
    score = 0.0

    # Missing data
    if missing_pct > 20:
        score += 30
    elif missing_pct > 15:
        score += 25
    elif missing_pct > 10:
        score += 18
    elif missing_pct > 5:
        score += 10

    # Duplicates
    if dup_count > 100:
        score += 18
    elif dup_count > 30:
        score += 10
    elif dup_count > 0:
        score += 5

    # Class imbalance — scenario_a has ratio≈0.11 (90/10), should hit the top tier
    if imbalance_ratio is not None:
        if imbalance_ratio < 0.15:
            score += 35   # extreme (e.g. 90/10)
        elif imbalance_ratio < 0.30:
            score += 22   # severe
        elif imbalance_ratio < 0.50:
            score += 14
        elif imbalance_ratio < 0.70:
            score += 7

    return round(min(score, 100), 2)

