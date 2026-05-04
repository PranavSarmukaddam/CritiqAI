"""
CritiqAI — Demo Data Generator
Generates a synthetic classification dataset + trains a RandomForest model.
This ensures the app works out-of-the-box with zero setup from the user.
"""
import os
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

DEMO_CSV = os.path.join(os.path.dirname(__file__), "demo_dataset.csv")
DEMO_MODEL = os.path.join(os.path.dirname(__file__), "demo_model.joblib")
MODEL_NAME = "RandomForest_CritiqAI_Demo"

_cached_df = None
_cached_model = None


def get_demo_data():
    global _cached_df, _cached_model

    if _cached_df is not None and _cached_model is not None:
        return _cached_df, _cached_model, MODEL_NAME

    # Load or generate
    if os.path.exists(DEMO_CSV) and os.path.exists(DEMO_MODEL):
        _cached_df = pd.read_csv(DEMO_CSV)
        _cached_model = joblib.load(DEMO_MODEL)
    else:
        _cached_df, _cached_model = _generate_and_save()

    return _cached_df, _cached_model, MODEL_NAME


def _generate_and_save():
    np.random.seed(42)

    # Create a slightly imbalanced dataset with noise
    X, y = make_classification(
        n_samples=1200,
        n_features=10,
        n_informative=6,
        n_redundant=2,
        n_clusters_per_class=2,
        weights=[0.60, 0.40],   # Slight class imbalance
        flip_y=0.05,            # 5% label noise
        random_state=42
    )

    # Introduce a few missing values (realistic scenario)
    X_df = pd.DataFrame(X, columns=[f"feature_{i}" for i in range(10)])
    rng = np.random.RandomState(99)
    for col in ["feature_2", "feature_7"]:
        mask = rng.rand(len(X_df)) < 0.04   # ~4% missing
        X_df.loc[mask, col] = np.nan

    # Add ~15 duplicate rows
    dup_rows = X_df.sample(15, random_state=7)
    dup_labels = pd.Series(y).iloc[dup_rows.index].values
    X_dup = pd.concat([X_df, dup_rows], ignore_index=True)
    y_full = np.concatenate([y, dup_labels])

    df = X_dup.copy()
    df["label"] = y_full

    # Save CSV
    df.to_csv(DEMO_CSV, index=False)

    # Train model on clean (non-NaN imputed) data
    from sklearn.impute import SimpleImputer
    imputer = SimpleImputer(strategy="mean")
    X_clean = imputer.fit_transform(X_dup.values)
    y_clean = y_full

    X_train, X_test, y_train, y_test = train_test_split(
        X_clean, y_clean, test_size=0.2, random_state=42, stratify=y_clean
    )
    model = RandomForestClassifier(
        n_estimators=80,
        max_depth=8,
        random_state=42
    )
    model.fit(X_train, y_train)
    joblib.dump(model, DEMO_MODEL)

    return df, model


if __name__ == "__main__":
    df, model, name = get_demo_data()
    print(f"Demo data ready: {len(df)} rows | Model: {name}")
