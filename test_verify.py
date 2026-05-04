"""Quick test: upload multiclass + regression files to verify API."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from audit_engine import run_audit_from_files

# Test multiclass
print("=== MULTICLASS TEST ===")
try:
    result = run_audit_from_files(
        "test_files/test_multiclass.csv",
        "test_files/test_multiclass.joblib"
    )
    print(f"  Task type: {result['task_type']}")
    print(f"  Risk score: {result['summary']['composite_risk_score']}")
    print(f"  Risk level: {result['summary']['risk_level']}")
    s2 = result['stages'][1]
    print(f"  Metrics: {list(s2['metrics'].keys())}")
    cm = s2.get('confusion_matrix')
    if cm:
        print(f"  Confusion matrix shape: {len(cm)}x{len(cm[0])}")
    print("  OK!")
except Exception as e:
    print(f"  FAILED: {e}")
    import traceback; traceback.print_exc()

print()

# Test regression
print("=== REGRESSION TEST ===")
try:
    result = run_audit_from_files(
        "test_files/test_regression.csv",
        "test_files/test_regression.joblib"
    )
    print(f"  Task type: {result['task_type']}")
    print(f"  Risk score: {result['summary']['composite_risk_score']}")
    print(f"  Risk level: {result['summary']['risk_level']}")
    s2 = result['stages'][1]
    print(f"  Metrics: {s2['metrics']}")
    print(f"  Confusion matrix: {s2.get('confusion_matrix')}")
    # Check explainability sample explanations
    exp = result.get('explainability', {})
    samples = exp.get('sample_explanations', [])
    if samples:
        print(f"  Sample true_label type: {type(samples[0]['true_label'])}")
        print(f"  Sample true_label value: {samples[0]['true_label']}")
    print("  OK!")
except Exception as e:
    print(f"  FAILED: {e}")
    import traceback; traceback.print_exc()

print()

# Test PDF generation for multiclass
print("=== PDF TEST (multiclass) ===")
try:
    result = run_audit_from_files(
        "test_files/test_multiclass.csv",
        "test_files/test_multiclass.joblib"
    )
    from pdf_generator import generate_pdf_report
    import tempfile
    tmp = os.path.join(tempfile.gettempdir(), "test_mc.pdf")
    generate_pdf_report(result, tmp)
    print(f"  PDF size: {os.path.getsize(tmp)} bytes")
    print("  OK!")
except Exception as e:
    print(f"  FAILED: {e}")
    import traceback; traceback.print_exc()
