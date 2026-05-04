"""
Generates test files for CritiqAI upload testing.
Saves:
  - test_dataset.csv   (300 rows, 6 features + label column)
  - test_model.joblib  (trained RandomForest)
"""
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
import pandas as pd
import joblib
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Create synthetic dataset with slight imperfections
X, y = make_classification(
    n_samples=300, n_features=6, n_informative=4,
    n_redundant=1, weights=[0.55, 0.45], flip_y=0.04,
    random_state=7
)

df = pd.DataFrame(X, columns=[
    'age_norm', 'income_norm', 'credit_score',
    'debt_ratio', 'employment_years', 'loan_amount'
])
df['label'] = y  # must be named 'label', values 0 and 1

# Add a few missing values (realistic)
import numpy as np
rng = np.random.default_rng(42)
mask = rng.choice([True, False], size=len(df), p=[0.03, 0.97])
df.loc[mask, 'income_norm'] = np.nan

csv_path   = os.path.join(OUT_DIR, 'test_dataset.csv')
model_path = os.path.join(OUT_DIR, 'test_model.joblib')

df.to_csv(csv_path, index=False)
print(f"[1/2] Saved dataset  -> {csv_path}  ({len(df)} rows)")

# Train model on clean data (impute NaN before training)
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ('imputer', SimpleImputer(strategy='mean')),
    ('clf',     RandomForestClassifier(n_estimators=30, random_state=7))
])
X_arr = df.drop('label', axis=1).values
y_arr = df['label'].values
pipe.fit(X_arr, y_arr)
joblib.dump(pipe, model_path)
print(f"[2/2] Saved model    -> {model_path}")
print("\nDone! Upload these 2 files in CritiqAI.")
