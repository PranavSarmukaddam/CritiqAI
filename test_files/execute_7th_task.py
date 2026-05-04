import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import pandas as pd
import numpy as np
from sklearn.datasets import make_classification, make_regression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import joblib

from audit_engine import run_audit_from_files

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

print("=== 7TH TASK: MULTI-CLASS & REGRESSION SUPPORT TEST ===")

# --- 1. Multi-class Classification ---
print("\n[1] Generating Multi-class Classification Dataset & Model...")
X_mc, y_mc = make_classification(
    n_samples=300, n_features=6, n_informative=4, n_classes=3,
    random_state=42
)
df_mc = pd.DataFrame(X_mc, columns=[f"feat_{i}" for i in range(6)])
df_mc['label'] = y_mc

mc_csv = os.path.join(OUT_DIR, "test_multiclass.csv")
mc_model_path = os.path.join(OUT_DIR, "test_multiclass.joblib")
df_mc.to_csv(mc_csv, index=False)

mc_model = RandomForestClassifier(n_estimators=30, random_state=42)
mc_model.fit(X_mc, y_mc)
joblib.dump(mc_model, mc_model_path)

print(f"Running audit on Multi-class model...")
mc_result = run_audit_from_files(mc_csv, mc_model_path)
mc_task_type = mc_result['stages'][1].get('name', 'N/A') # Stage 2 Performance
print(f"Audit completed successfully!")
print(f"Composite Risk: {mc_result['summary']['composite_risk_score']}")
print(f"Risk Level: {mc_result['summary']['risk_level']}")


# --- 2. Regression ---
print("\n[2] Generating Regression Dataset & Model...")
X_reg, y_reg = make_regression(
    n_samples=300, n_features=6, n_informative=4, noise=0.1,
    random_state=42
)
df_reg = pd.DataFrame(X_reg, columns=[f"feat_{i}" for i in range(6)])
df_reg['label'] = y_reg

reg_csv = os.path.join(OUT_DIR, "test_regression.csv")
reg_model_path = os.path.join(OUT_DIR, "test_regression.joblib")
df_reg.to_csv(reg_csv, index=False)

reg_model = RandomForestRegressor(n_estimators=30, random_state=42)
reg_model.fit(X_reg, y_reg)
joblib.dump(reg_model, reg_model_path)

print(f"Running audit on Regression model...")
reg_result = run_audit_from_files(reg_csv, reg_model_path)
print(f"Audit completed successfully!")
print(f"Composite Risk: {reg_result['summary']['composite_risk_score']}")
print(f"Risk Level: {reg_result['summary']['risk_level']}")

print("\n=== SUCCESS: 7th Task Execution Verified ===")
