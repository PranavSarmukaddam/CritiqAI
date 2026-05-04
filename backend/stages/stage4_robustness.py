"""
Stage 4 — Robustness & Stability Signals
"""
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, mean_absolute_error


def run(df: pd.DataFrame, model, task_type: str = "binary_classification") -> dict:
    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values

    is_regression = task_type == "regression"
    
    baseline_preds = model.predict(X)
    if is_regression:
        baseline_metric = float(mean_absolute_error(y, baseline_preds))
    else:
        baseline_metric = float(accuracy_score(y, baseline_preds))

    noise_levels = [0.01, 0.05, 0.10, 0.20, 0.50]
    noise_results = []
    flags = []

    rng = np.random.RandomState(42)
    for noise_std in noise_levels:
        noise = rng.normal(0, noise_std, X.shape)
        X_noisy = X + noise
        noisy_preds = model.predict(X_noisy)
        
        if is_regression:
            noisy_metric = round(float(mean_absolute_error(y, noisy_preds)), 4)
            metric_delta = round(float(noisy_metric - baseline_metric), 4) # increase in error
            # prediction drift for regression = mean absolute difference between baseline and noisy preds
            pred_drift = round(float(np.mean(np.abs(baseline_preds - noisy_preds))), 4)
            
            noise_results.append({
                "noise_std": noise_std,
                "metric": noisy_metric,
                "prediction_drift": pred_drift,
                "metric_delta": metric_delta,
            })
            
            # Flag if MAE increases by > 20% of baseline under small noise
            if metric_delta > (baseline_metric * 0.20) and noise_std <= 0.05 and baseline_metric > 0:
                flags.append(
                    f"Error increases by {(metric_delta/baseline_metric):.1%} under small noise (std={noise_std})"
                )
        else:
            noisy_metric = round(float(accuracy_score(y, noisy_preds)), 4)
            metric_delta = round(float(baseline_metric - noisy_metric), 4) # drop in accuracy
            pred_drift = round(float(np.mean(baseline_preds != noisy_preds)), 4)
            
            noise_results.append({
                "noise_std": noise_std,
                "metric": noisy_metric,
                "prediction_drift": pred_drift,
                "metric_delta": metric_delta,
            })
            
            if noisy_metric < baseline_metric - 0.10 and noise_std <= 0.05:
                flags.append(
                    f"Model degrades by {(metric_delta):.1%} under small noise (std={noise_std})"
                )

    # Prediction variance across bootstrap samples (5 iterations, 400 rows)
    boot_metrics = []
    sub_size = min(400, len(X))
    for i in range(5):
        rng2 = np.random.RandomState(i)
        idx = rng2.choice(sub_size, sub_size, replace=True)
        X_sub, y_sub = X[:sub_size], y[:sub_size]
        boot_pred = model.predict(X_sub[idx])
        if is_regression:
            boot_val = float(mean_absolute_error(y_sub[idx], boot_pred))
        else:
            boot_val = float(accuracy_score(y_sub[idx], boot_pred))
        boot_metrics.append(round(boot_val, 4))

    boot_std = round(float(np.std(boot_metrics)), 4)
    if is_regression:
        if boot_std > (baseline_metric * 0.15) and baseline_metric > 0:
            flags.append(f"High bootstrap variance in error (std={boot_std:.4f}) — model instability signal")
    else:
        if boot_std > 0.03:
            flags.append(f"High bootstrap variance in accuracy (std={boot_std:.4f}) — model instability signal")

    return {
        "stage": 4,
        "name": "Robustness & Stability Signals",
        "baseline_metric": round(baseline_metric, 4),
        "noise_sensitivity": noise_results,
        "bootstrap_stability": {
            "scores": boot_metrics,
            "mean": round(float(np.mean(boot_metrics)), 4),
            "std": boot_std,
        },
        "flags": flags,
        "risk_contribution": _risk_score(noise_results, boot_std, is_regression, baseline_metric),
    }


def _risk_score(noise_results, boot_std, is_regression, baseline_metric) -> float:
    score = 0.0
    for r in noise_results:
        if r["noise_std"] == 0.05:
            delta = r["metric_delta"]
            if is_regression:
                if baseline_metric > 0:
                    pct = delta / baseline_metric
                    if pct > 0.30: score += 30
                    elif pct > 0.20: score += 20
                    elif pct > 0.10: score += 10
            else:
                if delta > 0.15: score += 30
                elif delta > 0.10: score += 20
                elif delta > 0.05: score += 10

    if is_regression:
        if baseline_metric > 0:
            pct_std = boot_std / baseline_metric
            if pct_std > 0.20: score += 25
            elif pct_std > 0.10: score += 12
    else:
        if boot_std > 0.05: score += 25
        elif boot_std > 0.03: score += 12
        
    return round(min(score, 100), 2)
