import sys, os, json
sys.path.insert(0, 'backend')
from urllib.request import urlopen, Request
from urllib.error import HTTPError

boundary = "CritiqDrift"
csv_path = r"backend/demo_data/demo_dataset.csv"
with open(csv_path, "rb") as f:
    csv_data = f.read()

def make_part(name, filename, content_type, data):
    header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode()
    return header + data

body = (
    make_part("reference_csv", "ref.csv", "text/csv", csv_data)
    + b"\r\n"
    + make_part("current_csv", "cur.csv", "text/csv", csv_data)
    + f"\r\n--{boundary}--\r\n".encode()
)

req = Request("http://127.0.0.1:8000/audit/drift", data=body)
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

try:
    r = urlopen(req, timeout=30)
    d = json.loads(r.read())
    print("OK:", d.get("summary"))
except HTTPError as e:
    body = e.read().decode()
    print("HTTP Error", e.code)
    print("Detail:", body)
