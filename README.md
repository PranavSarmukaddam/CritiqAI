# CritiqAI

CritiqAI is an ML model audit platform that evaluates classification and regression models through a staged governance pipeline. It combines a FastAPI backend with a React + Vite frontend to produce risk-scored audit reports.

## Features

- End-to-end audit workflow for demo and uploaded models
- Risk scoring from low to critical
- Stage-wise checks for data quality, performance, fairness, robustness, explainability, drift, and adversarial behavior
- Browser-based report UI with history and comparison views
- PDF report export endpoint

## Tech Stack

### Backend

- FastAPI
- Scikit-learn
- Pandas, NumPy, SciPy
- SHAP

### Frontend

- React 18
- Vite
- React Router
- Recharts

## Project Structure

- backend: FastAPI app, audit orchestration, pipeline stages
- frontend: React UI, pages, components, static assets
- test_files: test scripts and sample-generation utilities
- .claude/docs: architecture notes

## Pipeline Stages

1. Data integrity
2. Performance evaluation
3. Bias and fairness
4. Robustness under noise
5. Risk aggregation
6. Explainability
7. Drift analysis
8. Adversarial testing

## API Endpoints

- POST /audit/demo: Run a demo audit
- POST /audit/upload: Upload CSV + model for audit
- GET /docs: Interactive OpenAPI docs

## Local Development

### Option A (Windows quick start)

```bat
start.bat
```

### Option B (manual)

Backend:

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Default URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Single-Server Deployment

This repository includes a one-server Docker deployment that runs frontend and backend together.

Quick start:

```bash
docker compose up -d --build
```

Open:

- App: http://localhost:8080
- API docs: http://localhost:8080/docs

Windows shortcut:

```bat
deploy.bat
```

Full guide: DEPLOYMENT.md

## Testing and Validation

Sample and verification scripts are available in the repository root and in test_files.

## Documentation

- Architecture notes: .claude/docs/architectural_patterns.md

## Security and Contributions

- See SECURITY.md for reporting security issues.
- See CONTRIBUTING.md for contribution workflow.

## License

No license file is currently included. Add one before broad public reuse if needed.
