# CritiqAI - ML Model Audit Platform

## Overview
CritiqAI audits ML classification models through a 6-stage pipeline, scoring risk from 0 (low) to 100 (critical). The platform combines FastAPI backend analytics with a React frontend.

## Tech Stack

**Backend**
- FastAPI + Uvicorn (Python)
- Pandas, NumPy, Scikit-learn for ML analysis
- Data integrity, fairness, robustness testing

**Frontend**
- React 18 + Vite
- React Router DOM
- CSS modules

**Structure**
```
backend/          FastAPI app, audit engine, 6 pipeline stages
frontend/         React app with pages and components
.claude/docs/     Additional documentation
test_files/       Sample models/data for testing
```

## Quick Start

**Development (Windows)**
```bash
start.bat              # Launches both services
```

**Manual**
```bash
# Backend
cd backend && pip install -r requirements.txt
python -m uvicorn main:app --reload    # http://localhost:8000

# Frontend
cd frontend && npm install
npm run dev                             # http://localhost:5173
```

## Pipeline Stages

| Stage | File | Purpose |
|-------|------|---------|
| 1 | `stages/stage1_data.py:8` | Data integrity checks |
| 2 | `stages/stage2_performance.py:13` | Performance metrics |
| 3 | `stages/stage3_bias.py:9` | Fairness/bias detection |
| 4 | `stages/stage4_robustness.py:9` | Robustness testing |
| 5 | `stages/stage5_risk.py:20` | Risk aggregation |
| 6 | `stages/stage6_explainability.py` | SHAP explainability |

Orchestration: `audit_engine.py:76-104`

## Key Endpoints

- `POST /audit/demo` - Run demo audit (`main.py:37-45`)
- `POST /audit/upload` - Upload CSV + model (`main.py:47-85`)
- `GET /docs` - OpenAPI documentation

## Frontend Routing

- `/` - Home with demo option (`App.jsx`)
- `/upload` - File upload with drag-drop (`Upload.jsx`)
- `/report` - Audit results display (`Report.jsx`)

Vite proxy config: `vite.config.js:6-10`

## Architecture Notes

- Each stage exports a `run()` function with consistent signature
- Risk scores capped at 100 using `_risk_score()` helpers
- Floor rules override weighted aggregation for critical issues
- Demo data auto-generates on first run via memoization
- Fixed random seeds (42) for reproducibility

## Additional Documentation

- [Architectural Patterns](.claude/docs/architectural_patterns.md) - Design patterns and conventions
