"""Quick debug script — runs the audit pipeline directly and prints stage outputs."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from audit_engine import run_audit_from_files

CSV   = os.path.join(os.path.dirname(__file__), 'test_dataset.csv')
MODEL = os.path.join(os.path.dirname(__file__), 'test_model.joblib')

result = run_audit_from_files(CSV, MODEL)

print("=== STAGE RISK CONTRIBUTIONS ===")
for s in result['stages']:
    rc = s.get('risk_contribution', 'MISSING')
    print(f"Stage {s['stage']} ({s['name']}): risk_contribution = {rc}, flags = {s.get('flags', [])}")

print("\n=== SUMMARY ===")
s = result['summary']
print(f"Composite risk score : {s['composite_risk_score']}")
print(f"Risk level           : {s['risk_level']}")
print(f"Total flags          : {s['total_flags']}")
print(f"Stage scores         : {s['stage_scores']}")
