"""
Regenerates test files with a deliberately imperfect model/dataset
so the CritiqAI audit produces non-zero interesting risk scores.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import numpy as np
import pandas as pd
import joblib
from sklearn.tree import DecisionTreeClassifier
from sklearn.datasets import make_classification

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Harder, messier dataset with high class imbalance + lots of missing values
X, y = make_classification(
    n_samples=250,
    n_features=6,
    n_informative=2,      # only 2 of 6 features are actually informative (hard task)
    n_redundant=2,
    weights=[0.80, 0.20], # 80/20 class imbalance -> will flag!
    flip_y=0.10,          # 10% label noise -> hurts accuracy
    random_state=99
)

df = pd.DataFrame(X, columns=[
    'age_norm', 'income_norm', 'credit_score',
    'debt_ratio', 'employment_years', 'loan_amount'
])
df['label'] = y

# Add ~12% missing values across two columns (above 5% threshold -> will flag!)
rng = np.random.default_rng(42)
mask1 = rng.choice([True, False], size=len(df), p=[0.12, 0.88])
mask2 = rng.choice([True, False], size=len(df), p=[0.08, 0.92])
df.loc[mask1, 'income_norm'] = np.nan
df.loc[mask2, 'credit_score'] = np.nan

# Add 20 exact duplicate rows (will flag!)
dups = df.sample(20, random_state=1)
df = pd.concat([df, dups], ignore_index=True)

csv_path   = os.path.join(OUT_DIR, 'test_dataset.csv')
model_path = os.path.join(OUT_DIR, 'test_model.joblib')

df.to_csv(csv_path, index=False)
print(f"[1/2] Saved dataset -> {csv_path} ({len(df)} rows, imbalance={round(y.sum()/len(y),2)})")

# Deliberately shallow/underfitted DecisionTree (will have low accuracy -> flags!)
X_clean = df.drop('label', axis=1).fillna(df.drop('label', axis=1).mean())
y_arr = df['label'].values
bad_model = DecisionTreeClassifier(max_depth=2, random_state=99)  # too shallow
bad_model.fit(X_clean.values, y_arr)
joblib.dump(bad_model, model_path)
print(f"[2/2] Saved model   -> {model_path}")
print("\nDone. This model should show meaningful risk scores in CritiqAI.")
