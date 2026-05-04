import urllib.request
import json

req = urllib.request.Request('http://127.0.0.1:8000/audit/demo', method='POST')
try:
    r = urllib.request.urlopen(req)
    data = json.loads(r.read().decode())
    print("SUCCESS!")
    print("Audit ID:", data.get("audit_id"))
    print("Model:", data.get("model_name"))
    print("Risk Score:", data.get("summary", {}).get("composite_risk_score"))
    print("Risk Level:", data.get("summary", {}).get("risk_level"))
    print("Elapsed:", data.get("elapsed_seconds"), "s")
    print("Stages:", len(data.get("stages", [])))
except Exception as e:
    body = e.read().decode() if hasattr(e, 'read') else str(e)
    print("FAILED:", body)
