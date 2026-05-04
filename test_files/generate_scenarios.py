"""
Standalone script — generates 3 test scenarios for CritiqAI.
Does NOT import the backend; only uses sklearn/pandas directly.
"""
import warnings
warnings.filterwarnings('ignore')

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import make_classification

OUT = r"g:\CritiqAI\test_files"
rng = np.random.default_rng(77)

# -------------------------------------------------------
# A - HIGH RISK: random classifier + severe data issues
# -------------------------------------------------------
print("[A] Generating HIGH RISK scenario...")
Xa, ya = make_classification(
    n_samples=300, n_features=6, n_informative=2,
    weights=[0.90, 0.10], flip_y=0.15, random_state=11
)
dfa = pd.DataFrame(Xa, columns=['f1','f2','f3','f4','f5','f6'])
dfa['label'] = ya
for col in ['f1','f3','f5']:
    m = rng.choice([True,False], size=len(dfa), p=[0.20,0.80])
    dfa.loc[m, col] = np.nan
dfa = pd.concat([dfa, dfa.sample(30, random_state=5)], ignore_index=True)
dfa.to_csv(os.path.join(OUT, 'scenario_a_high_risk.csv'), index=False)
Xa_c = dfa.drop('label',axis=1).fillna(dfa.drop('label',axis=1).mean())
mA = DummyClassifier(strategy='most_frequent', random_state=11)
mA.fit(Xa_c.values, dfa['label'].values)
joblib.dump(mA, os.path.join(OUT, 'scenario_a_high_risk.joblib'))
print("  Done: scenario_a_high_risk.csv + .joblib")

# -------------------------------------------------------
# B - MEDIUM RISK: underfitted LR + moderate data issues
# -------------------------------------------------------
print("[B] Generating MEDIUM RISK scenario...")
Xb, yb = make_classification(
    n_samples=400, n_features=8, n_informative=3,
    n_redundant=2, weights=[0.65, 0.35], flip_y=0.08, random_state=22
)
dfb = pd.DataFrame(Xb, columns=[f'feat_{i}' for i in range(8)])
dfb['label'] = yb
for col in ['feat_0','feat_4']:
    m = rng.choice([True,False], size=len(dfb), p=[0.08,0.92])
    dfb.loc[m, col] = np.nan
dfb = pd.concat([dfb, dfb.sample(10, random_state=9)], ignore_index=True)
dfb.to_csv(os.path.join(OUT, 'scenario_b_medium_risk.csv'), index=False)
Xb_c = dfb.drop('label',axis=1).fillna(dfb.drop('label',axis=1).mean())
mB = Pipeline([('sc', StandardScaler()), ('clf', LogisticRegression(C=0.01, max_iter=5, random_state=22))])
mB.fit(Xb_c.values, dfb['label'].values)
joblib.dump(mB, os.path.join(OUT, 'scenario_b_medium_risk.joblib'))
print("  Done: scenario_b_medium_risk.csv + .joblib")

# -------------------------------------------------------
# C - FAIRNESS VIOLATION: biased labels for one group
# -------------------------------------------------------
print("[C] Generating FAIRNESS VIOLATION scenario...")
Xc, yc = make_classification(
    n_samples=500, n_features=6, n_informative=4,
    weights=[0.55, 0.45], flip_y=0.03, random_state=33
)
dfc = pd.DataFrame(Xc, columns=['age','income','score','debt','emp_years','loan'])
dfc['label'] = yc
low_idx = dfc[dfc['age'] < dfc['age'].median()].index
flip_m = rng.choice([True,False], size=len(low_idx), p=[0.35, 0.65])
dfc.loc[low_idx[flip_m], 'label'] = 1 - dfc.loc[low_idx[flip_m], 'label']
m_c = rng.choice([True,False], size=len(dfc), p=[0.03, 0.97])
dfc.loc[m_c, 'income'] = np.nan
dfc.to_csv(os.path.join(OUT, 'scenario_c_fairness_violation.csv'), index=False)
Xc_c = dfc.drop('label',axis=1).fillna(dfc.drop('label',axis=1).mean())
mC = DecisionTreeClassifier(max_depth=4, random_state=33)
mC.fit(Xc_c.values, dfc['label'].values)
joblib.dump(mC, os.path.join(OUT, 'scenario_c_fairness_violation.joblib'))
print("  Done: scenario_c_fairness_violation.csv + .joblib")

print("\nAll 3 scenarios ready in g:\\CritiqAI\\test_files\\")
