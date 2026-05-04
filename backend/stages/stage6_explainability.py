"""
Stage 6 — Model Explainability (SHAP Analysis)
Generates feature importance and local explanations using SHAP values.
"""
import numpy as np
import pandas as pd
from typing import Optional


def run(df: pd.DataFrame, model, task_type: str = "binary_classification", max_samples: int = 100) -> dict:  # noqa: C901
    """
    Generate SHAP-based explanations for the model.

    Args:
        df: DataFrame with features and 'label' column
        model: Trained sklearn-compatible model
        task_type: Type of ML task
        max_samples: Max samples for SHAP computation (for speed)

    Returns:
        Dictionary with feature importance and sample explanations
    """
    import shap
    import warnings
    warnings.filterwarnings('ignore', category=UserWarning)

    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values

    # Subsample for speed if needed
    if len(X) > max_samples:
        rng = np.random.RandomState(42)
        sample_idx = rng.choice(len(X), max_samples, replace=False)
        X_sample = X[sample_idx]
        y_sample = y[sample_idx]
    else:
        X_sample = X
        y_sample = y

    # Determine model type for SHAP
    model_type = _get_model_type(model)

    try:
        # Create SHAP explainer based on model type
        if model_type == "tree":
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)
            # TreeExplainer returns list for binary/multiclass classification
            if isinstance(shap_values, list):
                if task_type == "binary_classification":
                    shap_values = shap_values[1]  # Use positive class
                else:
                    shap_values = np.mean(np.abs(shap_values), axis=0)
        elif model_type == "linear":
            explainer = shap.LinearExplainer(model, X_sample)
            shap_values = explainer.shap_values(X_sample)
        else:
            # Fallback to KernelExplainer for any model
            # Use k-means to create background distribution
            background = shap.kmeans(X_sample, min(10, len(X_sample)))
            explainer = shap.KernelExplainer(model.predict, background)
            shap_values = explainer.shap_values(X_sample, nsamples=100)

        # Calculate feature importance (mean absolute SHAP value)
        feature_importance = _calculate_feature_importance(shap_values, feature_cols)

        # Identify top contributing features
        top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]

        # Generate sample explanations (for a few examples)
        sample_explanations = _generate_sample_explanations(
            X_sample, y_sample, shap_values, feature_cols, n_samples=min(5, len(X_sample)),
            task_type=task_type,
        )

        # Detect potential issues
        flags = _detect_issues(feature_importance, shap_values, feature_cols)

        # Risk contribution based on explanation quality
        risk_contribution = _risk_score(feature_importance, shap_values, feature_cols)

        return {
            "stage": 6,
            "name": "Model Explainability (SHAP)",
            "model_type": model_type,
            "samples_analyzed": len(X_sample),
            "feature_importance": feature_importance,
            "top_features": [{"feature": f, "importance": round(v, 4)} for f, v in top_features],
            "sample_explanations": sample_explanations,
            "summary_statistics": _calc_summary_stats(shap_values),
            "flags": flags,
            "risk_contribution": risk_contribution,
        }

    except Exception as e:
        # Graceful fallback if SHAP fails
        return {
            "stage": 6,
            "name": "Model Explainability (SHAP)",
            "model_type": model_type,
            "samples_analyzed": len(X_sample),
            "feature_importance": {},
            "top_features": [],
            "sample_explanations": [],
            "summary_statistics": {},
            "flags": [f"SHAP analysis failed: {str(e)}"],
            "risk_contribution": 10.0,  # Penalty for unexplainable models
        }


def _get_model_type(model) -> str:
    """Determine if model is tree-based, linear, or other."""
    model_name = type(model).__name__.lower()
    tree_models = ['randomforest', 'decisiontree', 'gradientboosting', 'xgboost', 'lightgbm', 'catboost']
    linear_models = ['logisticregression', 'lineardiscriminant', 'ridge', 'lasso', 'elasticnet', 'sgd']

    if any(tm in model_name for tm in tree_models):
        return "tree"
    elif any(lm in model_name for lm in linear_models):
        return "linear"
    else:
        return "other"


def _calculate_feature_importance(shap_values: np.ndarray, feature_names: list) -> dict:
    """Calculate mean absolute SHAP value for each feature."""
    mean_shap = np.abs(shap_values).mean(axis=0)
    # Normalize to sum to 1 (as percentages)
    total = np.sum(mean_shap)
    if total > 0:
        normalized = mean_shap / total
    else:
        normalized = mean_shap

    return {
        name: round(float(val), 4)
        for name, val in zip(feature_names, normalized)
    }


def _generate_sample_explanations(
    X: np.ndarray,
    y: np.ndarray,
    shap_values: np.ndarray,
    feature_names: list,
    n_samples: int = 5,
    task_type: str = "binary_classification",
) -> list:
    """Generate explanations for individual samples."""
    explanations = []

    # Pick diverse samples: highest/lowest prediction confidence
    shap_sums = np.sum(shap_values, axis=1)
    sorted_idx = np.argsort(shap_sums)

    # Pick samples from different parts of distribution
    indices = [
        sorted_idx[0],  # Most negative (lowest confidence)
        sorted_idx[len(sorted_idx) // 4],
        sorted_idx[len(sorted_idx) // 2],  # Middle
        sorted_idx[3 * len(sorted_idx) // 4],
        sorted_idx[-1],  # Most positive (highest confidence)
    ]
    indices = indices[:n_samples]

    is_regression = task_type == "regression"

    for idx in indices:
        feature_contributions = []
        for i, feat_name in enumerate(feature_names):
            shap_val = float(shap_values[idx, i])
            feature_value = float(X[idx, i])
            feature_contributions.append({
                "feature": feat_name,
                "value": round(feature_value, 4),
                "contribution": round(shap_val, 4),
                "direction": "increases" if shap_val > 0 else "decreases",
                "abs_contribution": round(abs(shap_val), 4),
            })

        # Sort by absolute contribution
        feature_contributions.sort(key=lambda x: x["abs_contribution"], reverse=True)

        true_label = round(float(y[idx]), 4) if is_regression else int(y[idx])

        explanations.append({
            "sample_index": int(idx),
            "true_label": true_label,
            "top_contributors": feature_contributions[:3],
            "base_value": round(float(np.mean(shap_values)), 4),
            "prediction_score": round(float(np.sum(shap_values[idx])), 4),
        })

    return explanations


def _calc_summary_stats(shap_values: np.ndarray) -> dict:
    """Calculate summary statistics for SHAP values."""
    abs_shap = np.abs(shap_values)
    return {
        "mean_abs_shap": round(float(np.mean(abs_shap)), 4),
        "max_abs_shap": round(float(np.max(abs_shap)), 4),
        "std_shap": round(float(np.std(shap_values)), 4),
        "sparsity": round(float(np.mean(abs_shap < 0.001)), 4),  # % of near-zero contributions
    }


def _detect_issues(feature_importance: dict, shap_values: np.ndarray, feature_names: list) -> list:
    """Detect potential explainability issues."""
    flags = []

    # Check for feature dominance (one feature explains everything)
    if feature_importance:
        max_importance = max(feature_importance.values())
        if max_importance > 0.7:
            dominant = max(feature_importance.items(), key=lambda x: x[1])[0]
            flags.append(f"Feature '{dominant}' dominates predictions ({max_importance:.1%} importance) - potential over-reliance")

    # Check for uniform importance (no feature stands out)
    if feature_importance and len(feature_importance) > 1:
        importances = list(feature_importance.values())
        cv = np.std(importances) / np.mean(importances) if np.mean(importances) > 0 else 0
        if cv < 0.1:
            flags.append("Features have near-uniform importance - model may be underfitting")

    # Check for high variance in explanations (unstable)
    abs_shap = np.abs(shap_values)
    row_sums = np.sum(abs_shap, axis=1)
    if np.std(row_sums) / np.mean(row_sums) > 0.5:
        flags.append("High variance in explanation strength - predictions may be inconsistent")

    return flags


def _risk_score(feature_importance: dict, shap_values: np.ndarray, feature_names: list) -> float:
    """Calculate risk based on explainability characteristics."""
    score = 0.0

    # Penalty for feature dominance (brittle model)
    if feature_importance:
        max_importance = max(feature_importance.values())
        if max_importance > 0.8:
            score += 25
        elif max_importance > 0.6:
            score += 15

    # Penalty for no clear signals
    if feature_importance:
        importances = list(feature_importance.values())
        if len(importances) > 1:
            cv = np.std(importances) / np.mean(importances) if np.mean(importances) > 0 else 0
            if cv < 0.1:
                score += 20

    # Penalty for high explanation variance
    abs_shap = np.abs(shap_values)
    row_sums = np.sum(abs_shap, axis=1)
    if np.mean(row_sums) > 0 and np.std(row_sums) / np.mean(row_sums) > 0.5:
        score += 15

    return round(min(score, 100), 2)
