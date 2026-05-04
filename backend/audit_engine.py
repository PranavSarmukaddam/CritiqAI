"""
CritiqAI — Core Audit Engine
Orchestrates all stages and returns a unified audit result.
"""
import os, sys
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))

from stages import stage1_data, stage2_performance, stage3_bias, stage4_robustness, stage5_risk, stage6_explainability, stage8_adversarial
from demo_data.generate_demo import get_demo_data


def run_demo_audit() -> dict:
    """Run a full audit using the bundled demo dataset + model."""
    df, model, model_name = get_demo_data()
    import numpy as np
    from sklearn.impute import SimpleImputer
    
    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    if np.isnan(X).any():
        imputer = SimpleImputer(strategy="mean")
        X_clean = imputer.fit_transform(X)
        df_clean = df.copy()
        df_clean[feature_cols] = X_clean
    else:
        df_clean = df
        
    return _run_pipeline(df, df_clean, model, model_name)


def run_audit_from_files(csv_path: str, model_path: str) -> dict:
    """Run audit from user-supplied CSV + joblib/pickle model file."""
    import joblib, pickle
    import numpy as np
    from sklearn.impute import SimpleImputer

    # Load CSV
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        raise ValueError(f"Could not read CSV: {e}")

    # Must have a 'label' column
    if "label" not in df.columns:
        raise ValueError(
            "CSV must contain a 'label' column with binary class labels (0 or 1). "
            f"Columns found: {list(df.columns)}"
        )

    # Must have at least one feature column
    feature_cols = [c for c in df.columns if c != "label"]
    if not feature_cols:
        raise ValueError("CSV must have at least one feature column besides 'label'.")

    # Minimum rows
    if len(df) < 20:
        raise ValueError(f"CSV must have at least 20 rows. Got {len(df)}.")

    # Load model — try joblib first, then pickle
    try:
        model = joblib.load(model_path)
    except Exception:
        try:
            with open(model_path, "rb") as f:
                model = pickle.load(f)
        except Exception as e:
            raise ValueError(f"Could not load model file: {e}")

    # Verify model has predict()
    if not hasattr(model, "predict"):
        raise ValueError("Model must implement a predict() method (scikit-learn compatible).")

    # Impute NaNs in features so model.predict() doesn't crash
    X = df[feature_cols].values
    if np.isnan(X).any():
        imputer = SimpleImputer(strategy="mean")
        X_clean = imputer.fit_transform(X)
        df_clean = df.copy()
        df_clean[feature_cols] = X_clean
    else:
        df_clean = df

    model_name = os.path.splitext(os.path.basename(model_path))[0]
    return _run_pipeline(df, df_clean, model, model_name)


def detect_task_type(y: pd.Series) -> str:
    import numpy as np
    unique_vals = y.nunique()
    if unique_vals <= 2:
        return "binary_classification"
    elif pd.api.types.is_numeric_dtype(y):
        if pd.api.types.is_float_dtype(y) or unique_vals > 20:
            return "regression"
    return "multiclass_classification"

def _run_pipeline(df_raw: pd.DataFrame, df_clean: pd.DataFrame, model, model_name: str) -> dict:
    import time
    start = time.time()

    task_type = detect_task_type(df_clean["label"])

    # Stage 1 uses the RAW df to honestly report missing values, duplicates etc.
    s1 = stage1_data.run(df_raw)
    # Stages 2-8 use the CLEAN (imputed) df so model.predict() works reliably
    s2 = stage2_performance.run(df_clean, model, task_type)
    s3 = stage3_bias.run(df_clean, model, task_type)
    s4 = stage4_robustness.run(df_clean, model, task_type)
    s6 = stage6_explainability.run(df_clean, model, task_type)
    s8 = stage8_adversarial.run(df_clean, model, task_type)
    s5 = stage5_risk.run(s1, s2, s3, s4, s6, model_name=model_name)

    elapsed = round(time.time() - start, 2)

    return {
        "audit_id": f"critiq-{int(time.time())}",
        "model_name": model_name,
        "task_type": task_type,
        "elapsed_seconds": elapsed,
        "stages": [s1, s2, s3, s4, s6, s8, s5],
        "summary": {
            "composite_risk_score": s5["composite_risk_score"],
            "risk_level": s5["risk_level"],
            "risk_color": s5["risk_color"],
            "risk_description": s5["risk_description"],
            "total_flags": s5["total_flags"],
            "recommendations": s5["recommendations"],
            "stage_scores": s5["stage_scores"],
        },
        "explainability": {
            "feature_importance": s6.get("feature_importance", {}),
            "top_features": s6.get("top_features", []),
            "sample_explanations": s6.get("sample_explanations", []),
            "model_type": s6.get("model_type", "unknown"),
            "summary_statistics": s6.get("summary_statistics"),
            "samples_analyzed": s6.get("samples_analyzed"),
            "flags": s6.get("flags", []),
        },
        "adversarial": {
            "baseline_accuracy": s8.get("baseline_accuracy"),
            "feature_sensitivity": s8.get("feature_sensitivity", []),
            "boundary_samples": s8.get("boundary_samples", []),
            "flip_analysis": s8.get("flip_analysis", {}),
            "combined_attack": s8.get("combined_attack", []),
            "flags": s8.get("flags", []),
        },
    }
