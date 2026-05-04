import sys, os
sys.path.insert(0, r'g:\CritiqAI\backend')

import pandas as pd
import joblib
from sklearn.impute import SimpleImputer
import numpy as np
from stages import stage1_data, stage2_performance, stage3_bias, stage4_robustness, stage5_risk, stage6_explainability

def test_pipeline(csv_file, model_file, name):
    print(f'\n========== {name} ==========')
    print('Loading data...')
    df = pd.read_csv(csv_file)
    print('Loading model...')
    model = joblib.load(model_file)

    # Impute NaNs so model.predict() won't crash
    feature_cols = [c for c in df.columns if c != 'label']
    X = df[feature_cols].values
    if np.isnan(X).any():
        imp = SimpleImputer(strategy='mean')
        df_clean = df.copy()
        df_clean[feature_cols] = imp.fit_transform(X)
    else:
        df_clean = df
    
    print('Running Stage 1...')
    s1 = stage1_data.run(df)
    print(f'Stage 1 risk: {s1.get("risk_contribution", 0)}')
    
    print('Running Stage 2...')
    s2 = stage2_performance.run(df_clean, model)
    print(f'Stage 2 risk: {s2.get("risk_contribution", 0)}')
    
    print('Running Stage 3...')
    s3 = stage3_bias.run(df_clean, model)
    print(f'Stage 3 risk: {s3.get("risk_contribution", 0)}')
    
    print('Running Stage 4...')
    s4 = stage4_robustness.run(df_clean, model)
    print(f'Stage 4 risk: {s4.get("risk_contribution", 0)}')
    
    print('Running Stage 6 (Explainability)...')
    s6 = stage6_explainability.run(df_clean, model)
    print(f'Stage 6 risk: {s6.get("risk_contribution", 0)}')
    
    print('Running Stage 5 (Risk)...')
    s5 = stage5_risk.run(s1, s2, s3, s4, s6)
    print(f'--> FINAL COMPOSITE: {s5.get("composite_risk_score", 0)} ({s5.get("risk_level", "Unknown")})')

test_pipeline('g:/CritiqAI/test_files/scenario_b_medium_risk.csv', 'g:/CritiqAI/test_files/scenario_b_medium_risk.joblib', 'Scenario B')
test_pipeline('g:/CritiqAI/test_files/scenario_c_fairness_violation.csv', 'g:/CritiqAI/test_files/scenario_c_fairness_violation.joblib', 'Scenario C')
