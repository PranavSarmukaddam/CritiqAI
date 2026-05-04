"""
Stage 5 — Risk Scoring & Governance Summary
Hybrid scoring: weighted average + max-pool boost + floor rules
"""

RISK_WEIGHTS = {
    "stage1": 0.15,   # Data quality
    "stage2": 0.30,   # Performance
    "stage3": 0.25,   # Fairness (raised — fairness issues are critical)
    "stage4": 0.15,   # Robustness
    "stage6": 0.15,   # Explainability
}

RISK_LEVELS = [
    (0,   12,  "Low",      "#22c55e", "Model meets governance standards. Minimal intervention needed."),
    (12,  40,  "Medium",   "#fbbf24", "Concerns detected. Review flagged items before production deployment."),
    (40,  65,  "High",     "#fb923c", "Significant risks found. Remediation required before deployment."),
    (65, 101,  "Critical", "#f87171", "Critical governance failures. Model must NOT be deployed."),
]


def run(s1: dict, s2: dict, s3: dict, s4: dict, s6: dict, model_name: str = "Unknown") -> dict:
    r1 = s1.get("risk_contribution", 0)
    r2 = s2.get("risk_contribution", 0)
    r3 = s3.get("risk_contribution", 0)
    r4 = s4.get("risk_contribution", 0)
    r6 = s6.get("risk_contribution", 0)

    # ──────────────────────────────────────────────────────
    # STEP 1: Weighted average (baseline)
    # ──────────────────────────────────────────────────────
    weighted = (
        r1 * RISK_WEIGHTS["stage1"] +
        r2 * RISK_WEIGHTS["stage2"] +
        r3 * RISK_WEIGHTS["stage3"] +
        r4 * RISK_WEIGHTS["stage4"] +
        r6 * RISK_WEIGHTS["stage6"]
    )

    # ──────────────────────────────────────────────────────
    # STEP 2: Max-pool boost — prevent one serious stage
    # score from being diluted by good scores elsewhere.
    # ──────────────────────────────────────────────────────
    stage_scores = [r1, r2, r3, r4, r6]
    max_stage = max(stage_scores)

    active_stages = sum(1 for s in stage_scores if s >= 5)

    # Blend: 55% weighted average + 45% max-stage score
    composite = 0.55 * weighted + 0.45 * max_stage

    # Breadth penalty
    if active_stages >= 2:
        composite += (active_stages - 1) * 5

    # ──────────────────────────────────────────────────────
    # STEP 3: Flag count escalation
    # ──────────────────────────────────────────────────────
    all_flags = (
        s1.get("flags", []) +
        s2.get("flags", []) +
        s3.get("flags", []) +
        s4.get("flags", []) +
        s6.get("flags", [])
    )
    flag_count = len(all_flags)
    if flag_count >= 6:
        composite += 12
    elif flag_count >= 4:
        composite += 7
    elif flag_count >= 2:
        composite += 3

    # ──────────────────────────────────────────────────────
    # STEP 4: FLOOR RULES — hard minimums
    # ──────────────────────────────────────────────────────
    metrics = s2.get("metrics", {})
    f1  = metrics.get("f1_score", 1.0)
    auc = metrics.get("roc_auc", 1.0)

    if f1 < 0.05 and (auc is None or auc < 0.57):
        composite = max(composite, 65.0)
    elif f1 < 0.20:
        composite = max(composite, 45.0)
    if auc is not None and auc < 0.57:
        composite = max(composite, 50.0)
    if r2 >= 60:
        composite = max(composite, 55.0)

    di = s3.get("disparate_impact_ratio")
    if di is not None:
        if di < 0.6:
            composite = max(composite, 55.0)
        elif di < 0.8:
            composite = max(composite, 30.0)

    if max_stage >= 50:
        composite = max(composite, 30.0)
    if flag_count >= 3 and max_stage >= 30:
        composite = max(composite, 20.0)
    if flag_count >= 2:
        composite = max(composite, 15.0)

    composite = round(min(composite, 100), 2)

    # Determine risk level
    level_label, level_color, level_desc = "Unknown", "#888", ""
    for lo, hi, label, color, desc in RISK_LEVELS:
        if lo <= composite < hi:
            level_label, level_color, level_desc = label, color, desc
            break

    recommendations = _recommendations(composite, all_flags, s1, s2, s3, s4, s6)

    return {
        "stage": 5,
        "name": "Risk Scoring & Governance Summary",
        "model_name": model_name,
        "composite_risk_score": composite,
        "risk_level": level_label,
        "risk_color": level_color,
        "risk_description": level_desc,
        "stage_scores": {
            "data_integrity": r1,
            "performance":    r2,
            "fairness":       r3,
            "robustness":     r4,
            "explainability": r6,
        },
        "total_flags": flag_count,
        "all_flags": all_flags,
        "recommendations": recommendations,
    }


def _recommendations(score, flags, s1, s2, s3, s4, s6) -> list:
    recs = []
    metrics = s2.get("metrics", {})
    f1  = metrics.get("f1_score", 1.0)
    auc = metrics.get("roc_auc",  1.0)

    if f1 is not None and f1 < 0.05:
        recs.append("Model predicts only one class and has near-zero F1. It is completely useless — retrain from scratch.")
    elif auc is not None and auc < 0.57:
        recs.append("Model ROC-AUC is near random (approx 0.5). It has no real predictive power — investigate features and training data.")
    elif metrics.get("accuracy", 1) < 0.80:
        recs.append("Retrain with more data or tune hyperparameters to improve accuracy.")

    if s1.get("summary", {}).get("missing_pct_total", 0) > 5:
        recs.append("Impute or remove columns with high missing value rates.")
    if s3.get("disparate_impact_ratio") and s3["disparate_impact_ratio"] < 0.8:
        recs.append("Apply fairness-aware training (reweighting, resampling) to reduce disparate impact.")
    if s4.get("bootstrap_stability", {}).get("std", 0) > 0.03:
        recs.append("Use ensemble methods or regularization to improve model stability.")
    low_noise = next((r for r in s4.get("noise_sensitivity", []) if r["noise_std"] == 0.05), {})
    if low_noise.get("metric_delta", 0) > 0.05:
        recs.append("Conduct adversarial robustness testing before deployment.")

    if s6.get("feature_importance"):
        max_importance = max(s6["feature_importance"].values())
        if max_importance > 0.7:
            recs.append("Model relies heavily on a single feature — add regularization or feature engineering to reduce over-reliance.")
    if s6.get("flags") and len(s6.get("flags", [])) > 0:
        recs.append("Review SHAP explanations to understand model decision boundaries and potential blind spots.")

    if score >= 65:
        recs.append("Do NOT deploy this model. Address all Critical and High flags first.")
    elif score >= 40:
        recs.append("Conditional deployment only with documented risk acceptance and close monitoring.")
    elif score >= 12:
        recs.append("Review flagged items and test on held-out data before production.")
    else:
        recs.append("Model is suitable for deployment with standard monitoring.")
    return recs
