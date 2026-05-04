"""
Full end-to-end test of the CritiqAI audit pipeline with all test files.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from audit_engine import run_audit_from_files, run_demo_audit

BASE = os.path.dirname(os.path.abspath(__file__))

tests = [
    ("Demo Audit", None, None),
    ("Binary Classification (bad model)", "test_dataset.csv", "test_model.joblib"),
    ("Multi-class Classification", "test_multiclass.csv", "test_multiclass.joblib"),
    ("Regression", "test_regression.csv", "test_regression.joblib"),
    ("Scenario A: High Risk", "scenario_a_high_risk.csv", "scenario_a_high_risk.joblib"),
    ("Scenario B: Medium Risk", "scenario_b_medium_risk.csv", "scenario_b_medium_risk.joblib"),
    ("Scenario C: Fairness Violation", "scenario_c_fairness_violation.csv", "scenario_c_fairness_violation.joblib"),
]

print("=" * 65)
print("  CritiqAI Full Pipeline Test Suite")
print("=" * 65)

passed = 0
failed = 0
for name, csv, model in tests:
    try:
        if csv is None:
            r = run_demo_audit()
        else:
            r = run_audit_from_files(
                os.path.join(BASE, csv),
                os.path.join(BASE, model)
            )
        task = r.get("task_type", "?")
        risk = r["summary"]["composite_risk_score"]
        level = r["summary"]["risk_level"]
        flags = r["summary"]["total_flags"]
        print(f"  PASS | {name}")
        print(f"       | task={task}  risk={risk}/100  level={level}  flags={flags}")
        passed += 1
    except Exception as e:
        import traceback
        print(f"  FAIL | {name}")
        print(f"       | ERROR: {e}")
        traceback.print_exc()
        failed += 1

print("=" * 65)
print(f"  Results: {passed} passed, {failed} failed")
print("=" * 65)
