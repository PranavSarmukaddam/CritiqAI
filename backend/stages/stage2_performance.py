"""
Stage 2 — Performance Consistency Analysis
"""
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold


def run(df: pd.DataFrame, model, task_type: str = "binary_classification") -> dict:
    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values

    y_pred = model.predict(X)
    flags = []

    if task_type == "regression":
        mse = round(float(mean_squared_error(y, y_pred)), 4)
        rmse = round(float(np.sqrt(mse)), 4)
        mae = round(float(mean_absolute_error(y, y_pred)), 4)
        r2 = round(float(r2_score(y, y_pred)), 4)

        cv = KFold(n_splits=3, shuffle=True, random_state=42)
        rng = np.random.RandomState(42)
        cv_idx = rng.choice(len(X), min(200, len(X)), replace=False)
        cv_scores = cross_val_score(model, X[cv_idx], y[cv_idx], cv=cv, scoring="r2")
        cv_mean = round(float(cv_scores.mean()), 4)
        cv_std  = round(float(cv_scores.std()), 4)
        cv_list = [round(float(s), 4) for s in cv_scores]

        if r2 < 0.3:
            flags.append(f"Very low R² score ({r2:.4f}) — model explains little variance")
        elif r2 < 0.6:
            flags.append(f"Low R² score ({r2:.4f})")
        if cv_std > 0.15:
            flags.append(f"High CV variance in R² (std={cv_std:.4f}) — model may be unstable")

        return {
            "stage": 2,
            "name": "Performance Consistency Analysis",
            "task_type": task_type,
            "metrics": {
                "mse": mse,
                "rmse": rmse,
                "mae": mae,
                "r2": r2,
            },
            "cross_validation": {
                "fold_scores": cv_list,
                "mean": cv_mean,
                "std":  cv_std,
            },
            "confusion_matrix": None,
            "flags": flags,
            "risk_contribution": _risk_score_regression(r2, cv_std),
        }

    else:
        # Classification (binary or multiclass)
        is_multiclass = task_type == "multiclass_classification"
        avg_method = 'macro' if is_multiclass else 'binary'

        try:
            if is_multiclass:
                y_prob = model.predict_proba(X)
                auc = round(float(roc_auc_score(y, y_prob, multi_class='ovr')), 4)
            else:
                y_prob = model.predict_proba(X)[:, 1]
                auc = round(float(roc_auc_score(y, y_prob)), 4)
        except Exception:
            auc = None

        accuracy  = round(float(accuracy_score(y, y_pred)), 4)
        precision = round(float(precision_score(y, y_pred, average=avg_method, zero_division=0)), 4)
        recall    = round(float(recall_score(y, y_pred, average=avg_method, zero_division=0)), 4)
        f1        = round(float(f1_score(y, y_pred, average=avg_method, zero_division=0)), 4)

        cm = confusion_matrix(y, y_pred).tolist()

        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        rng = np.random.RandomState(42)
        cv_idx = rng.choice(len(X), min(200, len(X)), replace=False)
        cv_scores = cross_val_score(model, X[cv_idx], y[cv_idx], cv=cv, scoring="accuracy")
        cv_mean = round(float(cv_scores.mean()), 4)
        cv_std  = round(float(cv_scores.std()), 4)
        cv_list = [round(float(s), 4) for s in cv_scores]

        if accuracy < 0.70:
            flags.append(f"Low accuracy: {accuracy:.2%}")
        if f1 < 0.10:
            flags.append(f"Near-zero F1 score ({f1:.4f}) — model likely predicts only one class")
        if auc is not None and auc < 0.56:
            flags.append(f"ROC-AUC near random baseline ({auc:.4f} ≈ 0.5) — model has no predictive power")
        elif auc is not None and auc < 0.75:
            flags.append(f"Low ROC-AUC: {auc:.4f}")
        if cv_std > 0.05:
            flags.append(f"High CV variance (std={cv_std:.4f}) — model may be unstable")

        return {
            "stage": 2,
            "name": "Performance Consistency Analysis",
            "task_type": task_type,
            "metrics": {
                "accuracy":  accuracy,
                "precision": precision,
                "recall":    recall,
                "f1_score":  f1,
                "roc_auc":   auc,
            },
            "cross_validation": {
                "fold_scores": cv_list,
                "mean": cv_mean,
                "std":  cv_std,
            },
            "confusion_matrix": cm,
            "flags": flags,
            "risk_contribution": _risk_score_classification(accuracy, f1, cv_std, auc),
        }


def _risk_score_classification(accuracy: float, f1: float, cv_std: float, auc) -> float:
    score = 0.0
    if f1 < 0.05:
        score += 55
    elif f1 < 0.20:
        score += 40
    elif f1 < 0.40:
        score += 25
    elif f1 < 0.55:
        score += 10

    if auc is not None:
        if auc < 0.56:
            score += 35
        elif auc < 0.65:
            score += 20
        elif auc < 0.75:
            score += 10

    if accuracy < 0.60:
        score += 15
    elif accuracy < 0.70:
        score += 8

    if cv_std > 0.10:
        score += 15
    elif cv_std > 0.05:
        score += 7

    return round(min(score, 100), 2)


def _risk_score_regression(r2: float, cv_std: float) -> float:
    score = 0.0
    if r2 < 0.10:
        score += 60
    elif r2 < 0.30:
        score += 40
    elif r2 < 0.50:
        score += 20
    elif r2 < 0.70:
        score += 10

    if cv_std > 0.20:
        score += 15
    elif cv_std > 0.10:
        score += 7

    return round(min(score, 100), 2)
