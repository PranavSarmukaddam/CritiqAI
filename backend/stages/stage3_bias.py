"""
Stage 3 — Bias & Fairness Detection
"""
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error


def run(df: pd.DataFrame, model, task_type: str = "binary_classification") -> dict:
    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values
    y_pred = model.predict(X)

    is_regression = task_type == "regression"
    is_multiclass = task_type == "multiclass_classification"

    # Proxy sensitive attribute: first feature column, split at median into Low/High
    sensitive_col = feature_cols[0] if feature_cols else None
    group_results = {}
    flags = []

    if not is_regression:
        unique_preds = np.unique(y_pred)
        degenerate = len(unique_preds) == 1
        if degenerate:
            flags.append(
                f"Model predicts only class {unique_preds[0]} for all samples — "
                "fairness analysis unreliable (no positive predictions)"
            )
        avg_method = 'macro' if is_multiclass else 'binary'
        overall_metric = float(accuracy_score(y, y_pred))
    else:
        degenerate = False
        overall_metric = float(mean_absolute_error(y, y_pred))

    if sensitive_col:
        median_val = df[sensitive_col].median()
        df_copy = df.copy()
        df_copy["_group"] = np.where(df[sensitive_col] > median_val, "High", "Low")
        df_copy["_pred"] = y_pred

        for group_name, group_df in df_copy.groupby("_group"):
            g_y    = group_df["label"].values
            g_pred = group_df["_pred"].values
            g_size = len(group_df)
            
            if is_regression:
                g_mae = round(float(mean_absolute_error(g_y, g_pred)), 4)
                gap = round(float(abs(g_mae - overall_metric)), 4)
                group_results[group_name] = {
                    "size": g_size,
                    "mae": g_mae,
                    "mae_gap_vs_overall": gap,
                }
                if gap > (overall_metric * 0.20): # 20% worse than overall
                    flags.append(
                        f"Group '{group_name}' has {(gap/overall_metric):.1%} MAE gap vs overall"
                    )
            else:
                g_acc  = round(float(accuracy_score(g_y, g_pred)), 4)
                g_f1   = 0.0 if degenerate else round(float(f1_score(g_y, g_pred, average=avg_method, zero_division=0)), 4)
                gap = round(float(g_acc - overall_metric), 4)
                group_results[group_name] = {
                    "size": g_size,
                    "accuracy": g_acc,
                    "f1_score": g_f1,
                    "accuracy_gap_vs_overall": gap,
                }
                if abs(gap) > 0.10:
                    flags.append(
                        f"Group '{group_name}' has {abs(gap):.1%} accuracy gap vs overall"
                    )

    # Disparate impact ratio
    disparity = None
    if len(group_results) == 2:
        if is_regression:
            metrics = [v["mae"] for v in group_results.values()]
            # For error, disparity is min_error / max_error (lower is worse disparity)
            disparity = round(float(min(metrics) / max(metrics)) if max(metrics) > 0 else 1.0, 4)
            if disparity < 0.8:
                flags.append(
                    f"Disparate error ratio {disparity:.4f} < 0.80 threshold (fairness violation)"
                )
        else:
            accs = [v["accuracy"] for v in group_results.values()]
            disparity = round(float(min(accs) / max(accs)) if max(accs) > 0 else 1.0, 4)
            if disparity < 0.8:
                flags.append(
                    f"Disparate impact ratio {disparity:.4f} < 0.80 threshold (fairness violation)"
                )

    return {
        "stage": 3,
        "name": "Bias & Fairness Detection",
        "sensitive_proxy": sensitive_col,
        "group_results": group_results,
        "disparate_impact_ratio": disparity,
        "flags": flags,
        "risk_contribution": _risk_score(disparity, flags, degenerate),
    }


def _risk_score(disparity, flags, degenerate: bool) -> float:
    score = 0.0

    if degenerate:
        score += 20

    if disparity is not None:
        if disparity < 0.6:
            score += 45
        elif disparity < 0.8:
            score += 28
        elif disparity < 0.9:
            score += 12

    score += len(flags) * 8
    return round(min(score, 100), 2)
