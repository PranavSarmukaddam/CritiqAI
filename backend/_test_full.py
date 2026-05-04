"""Quick test of the full demo audit pipeline."""
import urllib.request
import json

req = urllib.request.Request('http://127.0.0.1:8000/audit/demo', method='POST')
try:
    r = urllib.request.urlopen(req, timeout=120)
    data = json.loads(r.read().decode())
    print("SUCCESS")
    print("Audit ID:", data.get("audit_id"))
    print("Risk Score:", data.get("summary", {}).get("composite_risk_score"))
    print("Risk Level:", data.get("summary", {}).get("risk_level"))
    print("Elapsed:", data.get("elapsed_seconds"), "seconds")
    print("Stages:", len(data.get("stages", [])))
    for s in data.get("stages", []):
        print(f"  Stage {s.get('stage', '?')}: {s.get('name', '?')} - Risk: {s.get('risk_contribution', '?')}")
    print("\nExplainability:", "feature_importance" in data.get("explainability", {}))
    print("Adversarial:", "feature_sensitivity" in data.get("adversarial", {}))
    print("Total flags:", data.get("summary", {}).get("total_flags"))
    recs = data.get("summary", {}).get("recommendations", [])
    print("Recommendations:", len(recs))
    for r in recs:
        print(f"  - {r}")
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print(e.read().decode()[:1000])
