"""
Stage 8 — Adversarial Attack Simulation
Goes beyond random noise: targeted feature perturbation, boundary probing,
sensitivity ranking, and flip analysis.
"""
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, mean_absolute_error


def run(df: pd.DataFrame, model, task_type: str = "binary_classification", max_samples: int = 200) -> dict:
    """
    Simulate adversarial attacks on the model.
    """
    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values
    
    is_regression = task_type == "regression"

    rng = np.random.RandomState(42)

    # Subsample for speed
    if len(X) > max_samples:
        idx = rng.choice(len(X), max_samples, replace=False)
        X = X[idx]
        y = y[idx]

    baseline_preds = model.predict(X)
    
    if is_regression:
        baseline_metric = float(mean_absolute_error(y, baseline_preds))
        # Define what a "significant change" is for regression (e.g. 20% of y std)
        y_std = np.std(y)
        sig_threshold = 0.2 * y_std if y_std > 0 else 0.1
    else:
        baseline_metric = float(accuracy_score(y, baseline_preds))
        sig_threshold = 0.0

    flags = []

    # ─── 1. Feature Sensitivity Ranking ──────────────────────────────────
    feature_sensitivity = []
    for i, col in enumerate(feature_cols):
        X_perturbed = X.copy()
        col_std = float(np.std(X[:, i]))
        if col_std < 1e-10:
            continue
        # Perturb by 1 std
        noise = rng.normal(0, col_std * 0.5, X.shape[0])
        X_perturbed[:, i] += noise
        perturbed_preds = model.predict(X_perturbed)
        
        if is_regression:
            pct_change = float(np.mean(np.abs(baseline_preds - perturbed_preds) > sig_threshold))
            perturbed_metric = float(mean_absolute_error(y, perturbed_preds))
            metric_delta = round(perturbed_metric - baseline_metric, 4)
        else:
            pct_change = float(np.mean(baseline_preds != perturbed_preds))
            perturbed_metric = float(accuracy_score(y, perturbed_preds))
            metric_delta = round(baseline_metric - perturbed_metric, 4)

        feature_sensitivity.append({
            "feature": col,
            "flip_rate": round(pct_change, 4), # For regression, this is "pct_significant_change"
            "accuracy_drop": metric_delta, # For regression, this is "error_increase"
            "perturbation_std": round(col_std * 0.5, 4),
        })

    # Sort by flip rate (most sensitive first)
    feature_sensitivity.sort(key=lambda x: x["flip_rate"], reverse=True)

    if feature_sensitivity and feature_sensitivity[0]["flip_rate"] > 0.15:
        flags.append(
            f"Feature '{feature_sensitivity[0]['feature']}' is highly sensitive — "
            f"{feature_sensitivity[0]['flip_rate']:.1%} predictions change significantly with small perturbation"
        )

    # ─── 2. Boundary Sample Analysis ────────────────────────────────────
    boundary_samples = []
    if not is_regression:
        has_proba = hasattr(model, "predict_proba")
        if has_proba:
            try:
                probas = model.predict_proba(X)
                if probas.shape[1] >= 2:
                    boundary_dist = np.abs(probas[:, 1] - 0.5)
                    boundary_idx = np.argsort(boundary_dist)[:10]
                    for idx in boundary_idx:
                        boundary_samples.append({
                            "sample_index": int(idx),
                            "true_label": int(y[idx]),
                            "predicted_label": int(baseline_preds[idx]),
                            "confidence": round(float(max(probas[idx])), 4),
                            "boundary_distance": round(float(boundary_dist[idx]), 4),
                        })
                    avg_boundary_dist = float(np.mean(boundary_dist[boundary_idx]))
                    if avg_boundary_dist < 0.05:
                        flags.append(
                            f"Many samples near decision boundary (avg distance {avg_boundary_dist:.3f}) — "
                            "model is uncertain on these inputs"
                        )
            except Exception:
                pass

    # ─── 3. Targeted Flip Attack ────────────────────────────────────────
    flip_analysis = _targeted_flip_attack(
        X, baseline_preds, model, feature_cols, rng, is_regression, sig_threshold, n_samples=min(50, len(X))
    )

    avg_flip_magnitude = np.mean([f["min_perturbation_magnitude"] for f in flip_analysis if f["flipped"]])
    flip_success_rate = sum(1 for f in flip_analysis if f["flipped"]) / len(flip_analysis) if flip_analysis else 0

    if flip_success_rate > 0.5:
        verb = "changed significantly" if is_regression else "flipped"
        flags.append(
            f"{flip_success_rate:.0%} of samples can be {verb} with small perturbations — "
            "model may be vulnerable to adversarial manipulation"
        )

    # ─── 4. Combined Attack (multi-feature) ─────────────────────────────
    combined_results = _combined_attack(X, y, baseline_preds, model, rng, is_regression, baseline_metric, sig_threshold)

    risk = _risk_score(feature_sensitivity, flip_success_rate, boundary_samples, combined_results)

    return {
        "stage": 8,
        "name": "Adversarial Attack Simulation",
        "baseline_accuracy": round(baseline_metric, 4),
        "feature_sensitivity": feature_sensitivity[:10],
        "boundary_samples": boundary_samples,
        "flip_analysis": {
            "samples_tested": len(flip_analysis),
            "samples_flipped": sum(1 for f in flip_analysis if f["flipped"]),
            "flip_success_rate": round(flip_success_rate, 4),
            "avg_flip_magnitude": round(float(avg_flip_magnitude), 4) if not np.isnan(avg_flip_magnitude) else None,
            "details": flip_analysis[:5],
        },
        "combined_attack": combined_results,
        "flags": flags,
        "risk_contribution": risk,
    }


def _targeted_flip_attack(X, baseline_preds, model, feature_cols, rng, is_regression, sig_threshold, n_samples=50):
    results = []
    sample_indices = rng.choice(len(X), min(n_samples, len(X)), replace=False)

    for idx in sample_indices:
        original = X[idx].copy()
        original_pred = baseline_preds[idx]
        flipped = False
        min_magnitude = float("inf")

        for scale in [0.01, 0.05, 0.10, 0.25, 0.50]:
            perturbation = rng.normal(0, scale, original.shape)
            x_perturbed = original + perturbation
            new_pred = model.predict(x_perturbed.reshape(1, -1))[0]

            if is_regression:
                if abs(new_pred - original_pred) > sig_threshold:
                    flipped = True
            else:
                if new_pred != original_pred:
                    flipped = True
                    
            if flipped:
                min_magnitude = float(np.linalg.norm(perturbation))
                break

        results.append({
            "sample_index": int(idx),
            "original_prediction": float(original_pred) if is_regression else int(original_pred),
            "flipped": flipped,
            "min_perturbation_magnitude": round(min_magnitude, 4) if flipped else None,
        })

    return results


def _combined_attack(X, y, baseline_preds, model, rng, is_regression, baseline_metric, sig_threshold):
    results = []

    for intensity in [0.05, 0.10, 0.20, 0.50]:
        X_attacked = X.copy()
        for j in range(X.shape[1]):
            col_std = float(np.std(X[:, j]))
            if col_std > 1e-10:
                noise = rng.normal(0, col_std * intensity, X.shape[0])
                X_attacked[:, j] += noise

        attacked_preds = model.predict(X_attacked)
        
        if is_regression:
            attacked_metric = float(mean_absolute_error(y, attacked_preds))
            metric_delta = round(attacked_metric - baseline_metric, 4)
            pct_change = float(np.mean(np.abs(baseline_preds - attacked_preds) > sig_threshold))
        else:
            attacked_metric = float(accuracy_score(y, attacked_preds))
            metric_delta = round(baseline_metric - attacked_metric, 4)
            pct_change = float(np.mean(baseline_preds != attacked_preds))

        results.append({
            "intensity": intensity,
            "accuracy": round(attacked_metric, 4),
            "accuracy_drop": metric_delta,
            "flip_rate": round(pct_change, 4),
        })

    return results


def _risk_score(feature_sensitivity, flip_success_rate, boundary_samples, combined_results) -> float:
    score = 0.0

    if feature_sensitivity:
        max_flip = feature_sensitivity[0]["flip_rate"]
        if max_flip > 0.30: score += 25
        elif max_flip > 0.15: score += 15
        elif max_flip > 0.05: score += 8

    if flip_success_rate > 0.70: score += 30
    elif flip_success_rate > 0.40: score += 20
    elif flip_success_rate > 0.20: score += 10

    if boundary_samples:
        avg_dist = np.mean([s["boundary_distance"] for s in boundary_samples])
        if avg_dist < 0.03: score += 20
        elif avg_dist < 0.10: score += 10

    if combined_results:
        low_intensity = next((r for r in combined_results if r["intensity"] == 0.10), None)
        # Note: accuracy_drop represents drop in acc or increase in error, so >0.15 is bad either way
        if low_intensity and low_intensity["accuracy_drop"] > 0.15: score += 20
        elif low_intensity and low_intensity["accuracy_drop"] > 0.05: score += 10

    return round(min(score, 100), 2)
