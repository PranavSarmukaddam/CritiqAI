"""
Regenerates ALL .joblib test model files using the currently-installed
numpy/sklearn so there are no numpy._core or version-mismatch errors.
Run this once after any environment change.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import numpy as np
import pandas as pd
import joblib
from sklearn.datasets import make_classification, make_regression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression

OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.RandomState(42)

print("=" * 60)
print(f"numpy={np.__version__}  joblib={joblib.__version__}")
print("=" * 60)

# ── 1. test_dataset.csv / test_model.joblib (bad model — high risk) ──────────
print("\n[1/5] Generating bad model (high risk)...")
X, y = make_classification(
    n_samples=250, n_features=6, n_informative=2, n_redundant=2,
    weights=[0.80, 0.20], flip_y=0.10, random_state=99
)
df = pd.DataFrame(X, columns=['age_norm','income_norm','credit_score','debt_ratio','employment_years','loan_amount'])
df['label'] = y
mask1 = rng.choice([True, False], size=len(df), p=[0.12, 0.88])
mask2 = rng.choice([True, False], size=len(df), p=[0.08, 0.92])
df.loc[mask1, 'income_norm'] = np.nan
df.loc[mask2, 'credit_score'] = np.nan
dups = df.sample(20, random_state=1)
df = pd.concat([df, dups], ignore_index=True)
df.to_csv(os.path.join(OUT, 'test_dataset.csv'), index=False)
X_clean = df.drop('label', axis=1).fillna(df.drop('label', axis=1).mean())
bad_model = DecisionTreeClassifier(max_depth=2, random_state=99)
bad_model.fit(X_clean.values, df['label'].values)
joblib.dump(bad_model, os.path.join(OUT, 'test_model.joblib'))
print("   -> test_dataset.csv + test_model.joblib  OK")

# ── 2. scenario_a_high_risk ──────────────────────────────────────────────────
print("[2/5] Generating scenario A (high risk)...")
X, y = make_classification(
    n_samples=500, n_features=8, n_informative=2, n_redundant=4,
    weights=[0.85, 0.15], flip_y=0.15, random_state=11
)
df_a = pd.DataFrame(X, columns=[f'feat_{i}' for i in range(8)])
df_a['label'] = y
mask = rng.choice([True, False], size=len(df_a), p=[0.15, 0.85])
df_a.loc[mask, 'feat_0'] = np.nan
df_a.to_csv(os.path.join(OUT, 'scenario_a_high_risk.csv'), index=False)
X_a = df_a.drop('label', axis=1).fillna(df_a.drop('label', axis=1).mean())
model_a = DecisionTreeClassifier(max_depth=1, random_state=11)
model_a.fit(X_a.values, df_a['label'].values)
joblib.dump(model_a, os.path.join(OUT, 'scenario_a_high_risk.joblib'))
print("   -> scenario_a_high_risk  OK")

# ── 3. scenario_b_medium_risk ────────────────────────────────────────────────
print("[3/5] Generating scenario B (medium risk)...")
X, y = make_classification(
    n_samples=800, n_features=10, n_informative=5, n_redundant=3,
    weights=[0.65, 0.35], flip_y=0.05, random_state=22
)
df_b = pd.DataFrame(X, columns=[f'feat_{i}' for i in range(10)])
df_b['label'] = y
df_b.to_csv(os.path.join(OUT, 'scenario_b_medium_risk.csv'), index=False)
model_b = RandomForestClassifier(n_estimators=20, max_depth=4, random_state=22)
model_b.fit(df_b.drop('label', axis=1).values, df_b['label'].values)
joblib.dump(model_b, os.path.join(OUT, 'scenario_b_medium_risk.joblib'))
print("   -> scenario_b_medium_risk  OK")

# ── 4. scenario_c_fairness_violation ────────────────────────────────────────
print("[4/5] Generating scenario C (fairness violation)...")
X, y = make_classification(
    n_samples=600, n_features=8, n_informative=4, n_redundant=2,
    weights=[0.60, 0.40], random_state=33
)
df_c = pd.DataFrame(X, columns=[f'feat_{i}' for i in range(8)])
df_c['label'] = y
# Create biased group: low-valued feat_0 has labels flipped to skew the model
group_mask = df_c['feat_0'] < df_c['feat_0'].median()
flip_mask = group_mask & (df_c['label'] == 1)
df_c.loc[flip_mask, 'label'] = 0
df_c.to_csv(os.path.join(OUT, 'scenario_c_fairness_violation.csv'), index=False)
model_c = GradientBoostingClassifier(n_estimators=50, max_depth=3, random_state=33)
model_c.fit(df_c.drop('label', axis=1).values, df_c['label'].values)
joblib.dump(model_c, os.path.join(OUT, 'scenario_c_fairness_violation.joblib'))
print("   -> scenario_c_fairness_violation  OK")

# ── 5. test_multiclass + test_regression ────────────────────────────────────
print("[5/5] Generating multiclass + regression test files...")
# Multi-class
X_mc, y_mc = make_classification(
    n_samples=400, n_features=8, n_informative=5, n_redundant=2,
    n_classes=3, n_clusters_per_class=1, random_state=77
)
df_mc = pd.DataFrame(X_mc, columns=[f'feat_{i}' for i in range(8)])
df_mc['label'] = y_mc
df_mc.to_csv(os.path.join(OUT, 'test_multiclass.csv'), index=False)
mc_model = RandomForestClassifier(n_estimators=50, random_state=77)
mc_model.fit(X_mc, y_mc)
joblib.dump(mc_model, os.path.join(OUT, 'test_multiclass.joblib'))
print("   -> test_multiclass  OK")

# Regression
X_reg, y_reg = make_regression(
    n_samples=400, n_features=6, n_informative=4, noise=10.0, random_state=88
)
df_reg = pd.DataFrame(X_reg, columns=[f'feat_{i}' for i in range(6)])
df_reg['label'] = y_reg
df_reg.to_csv(os.path.join(OUT, 'test_regression.csv'), index=False)
from sklearn.ensemble import GradientBoostingRegressor
reg_model = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=88)
reg_model.fit(X_reg, y_reg)
joblib.dump(reg_model, os.path.join(OUT, 'test_regression.joblib'))
print("   -> test_regression  OK")

print("\n" + "=" * 60)
print("ALL model files regenerated successfully!")
print("=" * 60)
