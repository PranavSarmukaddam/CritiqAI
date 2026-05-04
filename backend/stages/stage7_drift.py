"""
Stage 7 — Data Drift Detection
Detects distribution shifts between reference (training) and current (production) data
using KS tests, Population Stability Index, and basic statistics.
"""
import numpy as np
import pandas as pd
from scipy import stats


def run(df_ref: pd.DataFrame, df_cur: pd.DataFrame) -> dict:
    """
    Compare reference and current datasets for distribution drift.

    Args:
        df_ref: Reference/training DataFrame
        df_cur: Current/production DataFrame

    Returns:
        Dictionary with drift analysis results
    """
    # Find common numeric columns (exclude 'label' if present)
    ref_numeric = set(df_ref.select_dtypes(include=[np.number]).columns) - {"label"}
    cur_numeric = set(df_cur.select_dtypes(include=[np.number]).columns) - {"label"}
    common_cols = sorted(ref_numeric & cur_numeric)

    if not common_cols:
        return {
            "stage": 7,
            "name": "Data Drift Detection",
            "error": "No common numeric columns found between reference and current datasets",
            "flags": ["No overlapping numeric features to compare"],
            "risk_contribution": 50.0,
        }

    # Column-level drift analysis
    feature_drift = {}
    flags = []
    drift_count = 0

    for col in common_cols:
        ref_vals = df_ref[col].dropna().values
        cur_vals = df_cur[col].dropna().values

        if len(ref_vals) < 5 or len(cur_vals) < 5:
            continue

        # KS test
        ks_stat, ks_pval = stats.ks_2samp(ref_vals, cur_vals)

        # Population Stability Index (PSI)
        psi = _compute_psi(ref_vals, cur_vals)

        # Basic stats comparison
        ref_mean = float(np.mean(ref_vals))
        cur_mean = float(np.mean(cur_vals))
        ref_std = float(np.std(ref_vals))
        cur_std = float(np.std(cur_vals))
        mean_shift = abs(cur_mean - ref_mean) / (ref_std + 1e-10)

        # Drift severity
        drifted = ks_pval < 0.05
        severity = "none"
        if psi > 0.25 or ks_pval < 0.001:
            severity = "high"
        elif psi > 0.10 or ks_pval < 0.01:
            severity = "medium"
        elif drifted:
            severity = "low"

        if drifted:
            drift_count += 1

        feature_drift[col] = {
            "ks_statistic": round(float(ks_stat), 4),
            "ks_pvalue": round(float(ks_pval), 6),
            "psi": round(float(psi), 4),
            "ref_mean": round(ref_mean, 4),
            "cur_mean": round(cur_mean, 4),
            "ref_std": round(ref_std, 4),
            "cur_std": round(cur_std, 4),
            "mean_shift_zscore": round(mean_shift, 4),
            "drifted": bool(drifted),  # cast numpy bool_ to Python bool
            "severity": severity,
        }

        if severity == "high":
            flags.append(f"High drift in '{col}': PSI={psi:.3f}, KS p={ks_pval:.4f}")
        elif severity == "medium":
            flags.append(f"Medium drift in '{col}': PSI={psi:.3f}")

    # Summary stats
    total_features = len(feature_drift)
    drift_pct = round(drift_count / total_features * 100, 1) if total_features > 0 else 0

    # Label drift (if label exists in both)
    label_drift = None
    if "label" in df_ref.columns and "label" in df_cur.columns:
        ref_labels = df_ref["label"].value_counts(normalize=True).to_dict()
        cur_labels = df_cur["label"].value_counts(normalize=True).to_dict()
        label_drift = {
            "reference_distribution": {str(k): round(v, 4) for k, v in ref_labels.items()},
            "current_distribution": {str(k): round(v, 4) for k, v in cur_labels.items()},
        }
        # Check if label distribution shifted
        all_keys = set(ref_labels.keys()) | set(cur_labels.keys())
        max_label_shift = max(
            abs(ref_labels.get(k, 0) - cur_labels.get(k, 0)) for k in all_keys
        )
        label_drift["max_shift"] = round(float(max_label_shift), 4)
        if max_label_shift > 0.10:
            flags.append(f"Label distribution shifted by {max_label_shift:.1%}")

    # Overall drift score
    risk = _risk_score(feature_drift, drift_pct, flags)

    if drift_pct > 50:
        flags.insert(0, f"{drift_pct}% of features show statistically significant drift")

    return {
        "stage": 7,
        "name": "Data Drift Detection",
        "summary": {
            "total_features_compared": total_features,
            "features_drifted": drift_count,
            "drift_percentage": drift_pct,
            "reference_rows": len(df_ref),
            "current_rows": len(df_cur),
        },
        "feature_drift": feature_drift,
        "label_drift": label_drift,
        "flags": flags,
        "risk_contribution": risk,
    }


def _compute_psi(ref_vals, cur_vals, bins=10):
    """Compute Population Stability Index."""
    # Create bins from reference distribution
    breakpoints = np.percentile(ref_vals, np.linspace(0, 100, bins + 1))
    breakpoints = np.unique(breakpoints)
    if len(breakpoints) < 3:
        return 0.0

    ref_counts = np.histogram(ref_vals, bins=breakpoints)[0].astype(float)
    cur_counts = np.histogram(cur_vals, bins=breakpoints)[0].astype(float)

    # Avoid division by zero
    ref_pct = (ref_counts + 1) / (ref_counts.sum() + len(ref_counts))
    cur_pct = (cur_counts + 1) / (cur_counts.sum() + len(cur_counts))

    psi = float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))
    return max(psi, 0.0)


def _risk_score(feature_drift: dict, drift_pct: float, flags: list) -> float:
    """Calculate drift risk score."""
    score = 0.0

    # Count high/medium severity features
    high_count = sum(1 for f in feature_drift.values() if f["severity"] == "high")
    med_count = sum(1 for f in feature_drift.values() if f["severity"] == "medium")

    score += high_count * 15
    score += med_count * 8

    # Overall drift percentage penalty
    if drift_pct > 70:
        score += 30
    elif drift_pct > 50:
        score += 20
    elif drift_pct > 30:
        score += 10

    return round(min(score, 100), 2)
