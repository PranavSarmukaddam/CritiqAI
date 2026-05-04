"""
CritiqAI — FastAPI Backend Entry Point
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import sys, os, shutil, tempfile

sys.path.insert(0, os.path.dirname(__file__))

from audit_engine import run_demo_audit, run_audit_from_files
from db import save_audit, list_audits, get_audit, delete_audit, get_audit_count, get_trend_data

app = FastAPI(
    title="CritiqAI — ML Model Audit API",
    description="Autonomous ML Model Audit Agent — Multi-Stage Governance Pipeline",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MODEL_EXTS = {".joblib", ".pkl", ".pickle"}
ALLOWED_CSV_EXTS   = {".csv"}


@app.get("/")
def root():
    return {"status": "ok", "message": "CritiqAI Audit API is running", "version": "2.0.0"}


@app.get("/audit/health")
def health_check():
    """Health check endpoint used by the frontend Navbar status indicator."""
    return {"status": "ok"}



@app.post("/audit/demo")
def audit_demo():
    """Run a full audit using the bundled demo dataset + model."""
    try:
        result = run_demo_audit()
        save_audit(result)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/audit/upload")
async def audit_upload(
    csv_file: UploadFile = File(..., description="Dataset CSV with a 'label' column"),
    model_file: UploadFile = File(..., description="Trained model (.joblib / .pkl)"),
):
    """
    Run a full audit on a user-supplied CSV dataset + serialised model file.
    The CSV must contain a 'label' column with binary class labels (0/1).
    The model must be serialised with joblib or pickle and implement predict() / predict_proba().
    """
    # Validate extensions
    csv_ext   = os.path.splitext(csv_file.filename or "")[1].lower()
    model_ext = os.path.splitext(model_file.filename or "")[1].lower()

    if csv_ext not in ALLOWED_CSV_EXTS:
        raise HTTPException(400, detail=f"Dataset must be a CSV file. Got: '{csv_file.filename}'")
    if model_ext not in ALLOWED_MODEL_EXTS:
        raise HTTPException(400, detail=f"Model must be .joblib or .pkl. Got: '{model_file.filename}'")

    # Save uploads to a temp dir
    tmp_dir = tempfile.mkdtemp(prefix="critiqai_")
    csv_path   = os.path.join(tmp_dir, "dataset.csv")
    model_path = os.path.join(tmp_dir, "model" + model_ext)

    try:
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(csv_file.file, f)
        with open(model_path, "wb") as f:
            shutil.copyfileobj(model_file.file, f)

        result = run_audit_from_files(csv_path, model_path)
        save_audit(result)
        return JSONResponse(content=result)

    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Audit failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ─── Model Comparison ───────────────────────────────────────────────────────
@app.post("/audit/compare")
async def audit_compare(
    csv_file: UploadFile = File(..., description="Dataset CSV with a 'label' column"),
    model_file_a: UploadFile = File(..., description="First model (.joblib / .pkl)"),
    model_file_b: UploadFile = File(..., description="Second model (.joblib / .pkl)"),
):
    """Compare two models against the same dataset."""
    csv_ext = os.path.splitext(csv_file.filename or "")[1].lower()
    if csv_ext not in ALLOWED_CSV_EXTS:
        raise HTTPException(400, detail=f"Dataset must be a CSV file. Got: '{csv_file.filename}'")

    for mf in [model_file_a, model_file_b]:
        ext = os.path.splitext(mf.filename or "")[1].lower()
        if ext not in ALLOWED_MODEL_EXTS:
            raise HTTPException(400, detail=f"Model must be .joblib or .pkl. Got: '{mf.filename}'")

    tmp_dir = tempfile.mkdtemp(prefix="critiqai_cmp_")
    csv_path = os.path.join(tmp_dir, "dataset.csv")
    model_a_ext = os.path.splitext(model_file_a.filename or "")[1].lower()
    model_b_ext = os.path.splitext(model_file_b.filename or "")[1].lower()
    model_a_path = os.path.join(tmp_dir, "model_a" + model_a_ext)
    model_b_path = os.path.join(tmp_dir, "model_b" + model_b_ext)

    try:
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(csv_file.file, f)
        with open(model_a_path, "wb") as f:
            shutil.copyfileobj(model_file_a.file, f)
        with open(model_b_path, "wb") as f:
            shutil.copyfileobj(model_file_b.file, f)

        result_a = run_audit_from_files(csv_path, model_a_path)
        result_b = run_audit_from_files(csv_path, model_b_path)

        save_audit(result_a)
        save_audit(result_b)

        # Build comparison summary
        comparison = _build_comparison(result_a, result_b)

        return JSONResponse(content={
            "model_a": result_a,
            "model_b": result_b,
            "comparison": comparison,
        })
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Compare failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _build_comparison(a: dict, b: dict) -> dict:
    """Build a delta comparison between two audit results."""
    sa = a.get("summary", {})
    sb = b.get("summary", {})
    s2a = a["stages"][1].get("metrics", {}) if len(a.get("stages", [])) > 1 else {}
    s2b = b["stages"][1].get("metrics", {}) if len(b.get("stages", [])) > 1 else {}

    def delta(va, vb):
        if va is None or vb is None:
            return None
        return round(vb - va, 4)

    metrics_comparison = {}
    for key in ["accuracy", "precision", "recall", "f1_score", "roc_auc"]:
        va = s2a.get(key)
        vb = s2b.get(key)
        metrics_comparison[key] = {
            "model_a": va,
            "model_b": vb,
            "delta": delta(va, vb),
            "better": "B" if (vb or 0) > (va or 0) else "A" if (va or 0) > (vb or 0) else "tie",
        }

    return {
        "risk_score": {
            "model_a": sa.get("composite_risk_score"),
            "model_b": sb.get("composite_risk_score"),
            "delta": delta(sa.get("composite_risk_score"), sb.get("composite_risk_score")),
            "better": "A" if (sa.get("composite_risk_score", 100)) < (sb.get("composite_risk_score", 100)) else "B",
        },
        "flags": {
            "model_a": sa.get("total_flags", 0),
            "model_b": sb.get("total_flags", 0),
        },
        "metrics": metrics_comparison,
        "winner": "A" if (sa.get("composite_risk_score", 100)) < (sb.get("composite_risk_score", 100)) else "B",
    }


# ─── Data Drift Detection ───────────────────────────────────────────────────
@app.post("/audit/drift")
async def audit_drift(
    reference_csv: UploadFile = File(..., description="Reference/training CSV"),
    current_csv: UploadFile = File(..., description="Current/production CSV"),
):
    """Detect data drift between reference and current datasets."""
    from stages.stage7_drift import run as run_drift

    for f in [reference_csv, current_csv]:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in ALLOWED_CSV_EXTS:
            raise HTTPException(400, detail=f"Files must be CSV. Got: '{f.filename}'")

    tmp_dir = tempfile.mkdtemp(prefix="critiqai_drift_")
    ref_path = os.path.join(tmp_dir, "reference.csv")
    cur_path = os.path.join(tmp_dir, "current.csv")

    try:
        import pandas as pd
        with open(ref_path, "wb") as f:
            shutil.copyfileobj(reference_csv.file, f)
        with open(cur_path, "wb") as f:
            shutil.copyfileobj(current_csv.file, f)

        df_ref = pd.read_csv(ref_path)
        df_cur = pd.read_csv(cur_path)

        result = run_drift(df_ref, df_cur)
        return JSONResponse(content=result)

    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Drift analysis failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ─── Audit History ───────────────────────────────────────────────────────────
@app.get("/audits")
def audits_list(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """List all saved audits (metadata only)."""
    audits = list_audits(limit=limit, offset=offset)
    total = get_audit_count()
    return {"audits": audits, "total": total}


@app.get("/audits/trend")
def audits_trend(limit: int = Query(20, ge=1, le=100)):
    """Get risk score trend data."""
    return {"trend": get_trend_data(limit=limit)}


@app.get("/audits/{audit_id}")
def audit_detail(audit_id: str):
    """Get full audit result by ID."""
    result = get_audit(audit_id)
    if not result:
        raise HTTPException(404, detail=f"Audit '{audit_id}' not found")
    return JSONResponse(content=result)
@app.get("/audits/{audit_id}/pdf")
def audit_pdf(audit_id: str):
    """Download full audit result as PDF."""
    from fastapi.responses import FileResponse
    from pdf_generator import generate_pdf_report
    
    result = get_audit(audit_id)
    if not result:
        raise HTTPException(404, detail=f"Audit '{audit_id}' not found")
        
    tmp_path = os.path.join(tempfile.gettempdir(), f"{audit_id}.pdf")
    try:
        generate_pdf_report(result, tmp_path)
        return FileResponse(tmp_path, media_type="application/pdf", filename=f"{audit_id}_report.pdf")
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to generate PDF: {str(e)}")


@app.delete("/audits/{audit_id}")
def audit_delete(audit_id: str):
    """Delete an audit by ID."""
    if delete_audit(audit_id):
        return {"deleted": True, "audit_id": audit_id}
    raise HTTPException(404, detail=f"Audit '{audit_id}' not found")


@app.post("/audit/status/{audit_id}")
def get_audit_status(audit_id: str):
    """Poll audit progress (simple GET, demo always returns complete)."""
    return {"audit_id": audit_id, "status": "complete"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
