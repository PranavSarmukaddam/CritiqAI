"""
CritiqAI — Full API + Feature Verification Test
Tests every endpoint and feature end-to-end.
"""
import sys, os, json, time
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

BASE = "http://127.0.0.1:8000"
PASS = "✅"
FAIL = "❌"
results = []

def test(name, fn):
    try:
        result = fn()
        print(f"  {PASS} {name}: {result}")
        results.append((name, True, result))
    except Exception as e:
        print(f"  {FAIL} {name}: {e}")
        results.append((name, False, str(e)))

def get(path):
    return urlopen(f"{BASE}{path}", timeout=10)

def post(path, data=None, content_type="application/json"):
    req = Request(f"{BASE}{path}", data=data, method="POST")
    if content_type:
        req.add_header("Content-Type", content_type)
    return urlopen(req, timeout=60)

def json_get(path):
    return json.loads(get(path).read())

def json_post(path, data=None):
    return json.loads(post(path, data).read())


print("\n" + "="*55)
print("  CritiqAI — Full Feature Verification")
print("="*55)

# ── 1. Health Check ──────────────────────────────────────
print("\n[1] Health & API Status")
test("Root endpoint",      lambda: json_get("/")["status"])
test("Health endpoint",    lambda: json_get("/audit/health")["status"])
test("API docs reachable", lambda: f"HTTP {get('/docs').status}")

# ── 2. Demo Audit ────────────────────────────────────────
print("\n[2] Demo Audit (Binary Classification)")
demo_result = None
def run_demo():
    global demo_result
    r = json_post("/audit/demo")
    demo_result = r
    return f"risk={r['summary']['composite_risk_score']}, level={r['summary']['risk_level']}, task={r['task_type']}"
test("POST /audit/demo", run_demo)

if demo_result:
    test("Demo has task_type",    lambda: demo_result["task_type"])
    test("Demo has audit_id",     lambda: demo_result["audit_id"])
    test("Demo has stages",       lambda: f"{len(demo_result['stages'])} stages")
    test("Demo has summary",      lambda: f"flags={demo_result['summary']['total_flags']}")
    test("Demo has explainability", lambda: f"top_features={len(demo_result['explainability']['top_features'])}")
    test("Demo has adversarial",  lambda: f"sensitivity={len(demo_result['adversarial']['feature_sensitivity'])}")

# ── 3. Upload Audit (Multiclass) ─────────────────────────
print("\n[3] Upload Audit — Multiclass Classification")
mc_result = None
def run_multiclass():
    global mc_result
    boundary = "----CritiqBoundary"
    csv_path = r"g:\CritiqAI\test_files\test_multiclass.csv"
    model_path = r"g:\CritiqAI\test_files\test_multiclass.joblib"
    with open(csv_path, "rb") as cf, open(model_path, "rb") as mf:
        csv_data = cf.read()
        model_data = mf.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"mc.csv\"\r\nContent-Type: text/csv\r\n\r\n".encode()
        + csv_data
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"model_file\"; filename=\"mc.joblib\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + model_data
        + f"\r\n--{boundary}--\r\n".encode()
    )
    req = Request(f"{BASE}/audit/upload", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    r = json.loads(urlopen(req, timeout=90).read())
    mc_result = r
    return f"task={r['task_type']}, risk={r['summary']['composite_risk_score']}"
test("POST /audit/upload (multiclass)", run_multiclass)

if mc_result:
    test("Multiclass task_type", lambda: mc_result["task_type"])
    test("Multiclass confusion matrix", lambda: f"{len(mc_result['stages'][1].get('confusion_matrix', []))}x{len((mc_result['stages'][1].get('confusion_matrix') or [[]])[0])}")
    test("Multiclass metrics keys",     lambda: list(mc_result["stages"][1]["metrics"].keys()))

# ── 4. Upload Audit (Regression) ─────────────────────────
print("\n[4] Upload Audit — Regression")
reg_result = None
def run_regression():
    global reg_result
    boundary = "----CritiqBoundary2"
    csv_path = r"g:\CritiqAI\test_files\test_regression.csv"
    model_path = r"g:\CritiqAI\test_files\test_regression.joblib"
    with open(csv_path, "rb") as cf, open(model_path, "rb") as mf:
        csv_data = cf.read()
        model_data = mf.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"reg.csv\"\r\nContent-Type: text/csv\r\n\r\n".encode()
        + csv_data
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"model_file\"; filename=\"reg.joblib\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + model_data
        + f"\r\n--{boundary}--\r\n".encode()
    )
    req = Request(f"{BASE}/audit/upload", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    r = json.loads(urlopen(req, timeout=90).read())
    reg_result = r
    return f"task={r['task_type']}, risk={r['summary']['composite_risk_score']}"
test("POST /audit/upload (regression)", run_regression)

if reg_result:
    test("Regression task_type",    lambda: reg_result["task_type"])
    test("Regression metrics (MSE, MAE, R2)", lambda: {k: v for k, v in reg_result["stages"][1]["metrics"].items()})
    test("Regression no confusion matrix",   lambda: "None" if reg_result["stages"][1].get("confusion_matrix") is None else "BUG: has matrix")
    test("Regression true_label is float",   lambda: type(reg_result["explainability"]["sample_explanations"][0]["true_label"]).__name__)

# ── 5. History / Audits DB ───────────────────────────────
print("\n[5] Audit History & Database")
audit_list = None
def get_history():
    global audit_list
    r = json_get("/audits")
    audit_list = r
    return f"total={r['total']} audits stored"
test("GET /audits",        get_history)
test("GET /audits/trend",  lambda: f"trend_points={len(json_get('/audits/trend')['trend'])}")

if audit_list and audit_list.get("audits"):
    aid = audit_list["audits"][0]["id"]
    test(f"GET /audits/{aid}", lambda: f"has_id={json_get(f'/audits/{aid}').get('audit_id', 'missing')}")

# ── 6. PDF Export ────────────────────────────────────────
print("\n[6] PDF Export")
if demo_result:
    aid = demo_result["audit_id"]
    def get_pdf():
        r = get(f"/audits/{aid}/pdf")
        content = r.read()
        if not content.startswith(b"%PDF"):
            raise Exception(f"Not a valid PDF! Got: {content[:30]}")
        return f"{len(content)} bytes, valid PDF header"
    test(f"GET /audits/{aid}/pdf", get_pdf)

# ── 7. Model Comparison ──────────────────────────────────
print("\n[7] Model Comparison")
def run_compare():
    boundary = "----CritiqCmp"
    csv_path = r"g:\CritiqAI\test_files\test_multiclass.csv"
    model_path = r"g:\CritiqAI\test_files\test_multiclass.joblib"
    with open(csv_path, "rb") as cf, open(model_path, "rb") as mf:
        csv_data = cf.read()
        model_data = mf.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"c.csv\"\r\nContent-Type: text/csv\r\n\r\n".encode()
        + csv_data
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"model_file_a\"; filename=\"a.joblib\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + model_data
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"model_file_b\"; filename=\"b.joblib\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + model_data
        + f"\r\n--{boundary}--\r\n".encode()
    )
    req = Request(f"{BASE}/audit/compare", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    r = json.loads(urlopen(req, timeout=120).read())
    return f"winner={r['comparison']['winner']}, models={r['model_a']['model_name']} vs {r['model_b']['model_name']}"
test("POST /audit/compare", run_compare)

# ── 8. Drift Detection ───────────────────────────────────
print("\n[8] Data Drift Detection")
def run_drift():
    boundary = "----CritiqDrift"
    csv_path = r"g:\CritiqAI\backend\demo_data\demo_dataset.csv"
    with open(csv_path, "rb") as f:
        csv_data = f.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"reference_csv\"; filename=\"ref.csv\"\r\nContent-Type: text/csv\r\n\r\n".encode()
        + csv_data
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"current_csv\"; filename=\"cur.csv\"\r\nContent-Type: text/csv\r\n\r\n".encode()
        + csv_data
        + f"\r\n--{boundary}--\r\n".encode()
    )
    req = Request(f"{BASE}/audit/drift", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    r = json.loads(urlopen(req, timeout=30).read())
    return f"features_drifted={r['summary']['features_drifted']}, drift%={r['summary']['drift_percentage']}"
test("POST /audit/drift", run_drift)

# ── 9. Delete Audit ──────────────────────────────────────
print("\n[9] Audit Delete")
if audit_list and audit_list.get("audits") and len(audit_list["audits"]) > 1:
    last_id = audit_list["audits"][-1]["id"]
    def delete_audit():
        req = Request(f"{BASE}/audits/{last_id}", method="DELETE")
        r = json.loads(urlopen(req, timeout=10).read())
        return r.get("message", "deleted")
    test(f"DELETE /audits/{last_id}", delete_audit)

# ── Summary ──────────────────────────────────────────────
print("\n" + "="*55)
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"  RESULT: {passed} passed, {failed} failed / {len(results)} total")
print("="*55)
if failed:
    print("\n  Failed tests:")
    for name, ok, msg in results:
        if not ok:
            print(f"    ❌ {name}: {msg}")
