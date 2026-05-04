import sys
sys.path.insert(0, 'g:/CritiqAI/backend')

from stages.stage2_performance import _risk_score as s2_score
from stages.stage1_data import _risk_score as s1_score
from stages.stage5_risk import run as s5_run, RISK_WEIGHTS

# ---- Scenario A: useless model with extreme imbalance ----
# Predicts all-majority class: accuracy=0.90, F1=0.0, AUC=0.5, 90/10 split
r2_a = s2_score(accuracy=0.90, f1=0.0,  cv_std=0.01, auc=0.50)
r1_a = s1_score(missing_pct=0,  dup_count=0, imbalance_ratio=0.11)

dummy_s2_a = {'metrics': {'f1_score': 0.0, 'roc_auc': 0.50}, 'risk_contribution': r2_a, 'flags': ['zero F1'], 'cross_validation': {'mean':0,'std':0}, 'stage':2, 'name':'perf'}
dummy_s1_a = {'risk_contribution': r1_a, 'flags': [], 'summary': {'total_rows':1000,'duplicate_rows':0,'missing_pct_total':0,'imbalance_ratio':0.11}, 'stage':1, 'name':'data'}
dummy_s3_a = {'risk_contribution': 20, 'flags': [], 'group_results': {}, 'disparate_impact_ratio': None, 'stage':3, 'name':'bias'}
dummy_s4_a = {'risk_contribution':  5, 'flags': [], 'noise_sensitivity': [], 'bootstrap_stability': {'std': 0.01}, 'stage':4, 'name':'rob'}
dummy_s6_a = {'risk_contribution': 10, 'flags': [], 'feature_importance': {}, 'top_features': [], 'sample_explanations': [], 'model_type': 'other', 'stage':6, 'name':'explainability'}
s5_a = s5_run(dummy_s1_a, dummy_s2_a, dummy_s3_a, dummy_s4_a, dummy_s6_a, 'scenario_a')

weighted = r1_a*RISK_WEIGHTS['stage1'] + r2_a*RISK_WEIGHTS['stage2'] + 20*RISK_WEIGHTS['stage3'] + 5*RISK_WEIGHTS['stage4'] + 10*RISK_WEIGHTS['stage6']
print(f'=== SCENARIO A (Expected HIGH or CRITICAL) ===')
print(f'  stage1={r1_a}  stage2={r2_a}  weighted_raw={weighted:.2f}')
print(f'  composite (after floor rules) = {s5_a["composite_risk_score"]}  => {s5_a["risk_level"]}')

# ---- Scenario B: decent model ----
r2_b = s2_score(accuracy=0.74, f1=0.71, cv_std=0.04, auc=0.80)
r1_b = s1_score(missing_pct=2,  dup_count=5, imbalance_ratio=0.48)
print(f'\n=== SCENARIO B (Expected MEDIUM) ===')
print(f'  stage1={r1_b}  stage2={r2_b}')
dummy_s2_b = {'metrics': {'f1_score': 0.71, 'roc_auc': 0.80}, 'risk_contribution': r2_b, 'flags': [], 'cross_validation': {'mean':0,'std':0}, 'stage':2, 'name':'perf'}
dummy_s1_b = {'risk_contribution': r1_b, 'flags': [], 'summary': {}, 'stage':1, 'name':'data'}
dummy_s3_b = {'risk_contribution': 10, 'flags': [], 'group_results': {}, 'disparate_impact_ratio': 0.85, 'stage':3, 'name':'bias'}
dummy_s4_b = {'risk_contribution': 8,  'flags': [], 'noise_sensitivity': [], 'bootstrap_stability': {'std': 0.02}, 'stage':4, 'name':'rob'}
dummy_s6_b = {'risk_contribution': 5, 'flags': [], 'feature_importance': {}, 'top_features': [], 'sample_explanations': [], 'model_type': 'tree', 'stage':6, 'name':'explainability'}
s5_b = s5_run(dummy_s1_b, dummy_s2_b, dummy_s3_b, dummy_s4_b, dummy_s6_b, 'scenario_b')
print(f'  composite = {s5_b["composite_risk_score"]}  => {s5_b["risk_level"]}')

# ---- Scenario C: good model, fairness violation ----
r2_c = s2_score(accuracy=0.89, f1=0.88, cv_std=0.02, auc=0.93)
r1_c = s1_score(missing_pct=0,  dup_count=0, imbalance_ratio=0.42)
print(f'\n=== SCENARIO C (Expected MEDIUM or HIGH due to fairness) ===')
print(f'  stage1={r1_c}  stage2={r2_c}')
dummy_s2_c = {'metrics': {'f1_score': 0.88, 'roc_auc': 0.93}, 'risk_contribution': r2_c, 'flags': [], 'cross_validation': {'mean':0,'std':0}, 'stage':2, 'name':'perf'}
dummy_s1_c = {'risk_contribution': r1_c, 'flags': [], 'summary': {}, 'stage':1, 'name':'data'}
dummy_s3_c = {'risk_contribution': 55, 'flags': ['Disparate impact 0.58'], 'group_results': {}, 'disparate_impact_ratio': 0.58, 'stage':3, 'name':'bias'}
dummy_s4_c = {'risk_contribution':  5, 'flags': [], 'noise_sensitivity': [], 'bootstrap_stability': {'std': 0.01}, 'stage':4, 'name':'rob'}
dummy_s6_c = {'risk_contribution': 0, 'flags': [], 'feature_importance': {}, 'top_features': [], 'sample_explanations': [], 'model_type': 'tree', 'stage':6, 'name':'explainability'}
s5_c = s5_run(dummy_s1_c, dummy_s2_c, dummy_s3_c, dummy_s4_c, dummy_s6_c, 'scenario_c')
print(f'  composite = {s5_c["composite_risk_score"]}  => {s5_c["risk_level"]}')
