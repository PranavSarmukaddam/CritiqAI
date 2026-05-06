<!-- # CritiqAI Full Context Handoff Prompt -->

Copy everything in this file into another AI if you want it to continue working on this project without needing prior context.

## Prompt To Give Another AI

You are helping with an existing codebase called CritiqAI. Assume I know nothing and explain every step clearly.

I am working in a Windows VS Code workspace at:

`G:\CritiqAI`   

This is a full-stack ML audit platform with a FastAPI backend and a React + Vite frontend. The app evaluates ML models through a staged governance pipeline and produces risk-scored audit reports.

Important goals:

1. Keep the project safe to publish publicly.
2. Avoid pushing secrets, local databases, build artifacts, or node_modules.
3. Keep documentation complete so a visitor understands the repo immediately.
4. Prefer simple, free deployment approaches.
5. Preserve all current features unless a change is explicitly requested.

Current repository state:

- The repo has already been pushed to GitHub.
- A MIT license file exists.
- Dockerfiles for separate frontend and backend deployments are available.
- The deployment target is separate services: frontend and backend on different hosts or platforms.
- The frontend production build currently succeeds.
- Docker itself was not installed in my local environment, so container runtime validation could not be executed here.

Do not ask me to restate the architecture unless it is truly required. Use the context below.

## Project Summary

CritiqAI audits ML classification and regression models. It combines:

- FastAPI backend analytics
- SQLite-based audit history persistence
- React frontend for upload, report, compare, history, and drift views
- PDF export of audit results
- Staged pipeline checks for data quality, performance, fairness, robustness, explainability, drift, and adversarial behavior

The application is intended to be simple enough for non-experts to run and understand.

## Repository Structure

- `backend/`: FastAPI app, audit engine, database layer, PDF generator, pipeline stages
- `frontend/`: React + Vite app, pages, components, static assets, build config
- `test_files/`: sample CSV/model files and test scripts
- `.claude/docs/`: architecture notes and project conventions
- Root docs: `README.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`

## What Each Area Does

### Backend

The backend is in `backend/` and exposes API endpoints for:

- demo audit runs
- upload-based audit runs
- comparing two models
- drift detection
- listing audit history
- retrieving audit details
- PDF export

The backend uses SQLite for audit history storage.

### Frontend

The frontend is a React single-page app with these routes:

- `/`: upload / landing page
- `/audit`: demo audit progress page
- `/report`: audit report page
- `/history`: audit history page
- `/compare`: compare two models
- `/drift`: drift detection

The app uses relative API calls such as `/audit/...` and `/audits/...` so the frontend can be reverse-proxied to the backend in production.

## Existing Deployment Setup

There are separate Dockerfiles for frontend and backend deployments.

Files available for that setup:

- `backend/Dockerfile` (Python 3.11 slim base, runs FastAPI on port 8000)
- `frontend/Dockerfile` (Node.js build stage + Nginx serving stage)
- `frontend/nginx.conf` (reverse proxy configuration)
- `DEPLOYMENT.md` (deployment guide)

The deployment approach:

- Frontend and backend are deployed as independent services
- Backend container runs FastAPI on port `8000` (internal or exposed depending on platform)
- Frontend is built as a static SPA and served by Nginx, with reverse proxy rules for API calls
- Each service can be deployed to different platforms (PaaS, VPS, container registries, etc.)

## Free Deployment Goal

The goal is to deploy frontend and backend as separate services for free or as close to free as possible.

Recommended free approaches:

**Option 1: PaaS (Easiest)**
- Frontend: Deploy to Vercel, Netlify, or GitHub Pages (free tier available)
- Backend: Deploy to Render, Railway, or Heroku (free tier available)
- Backend URL is set in frontend environment or API proxy settings

**Option 2: Separate VPS Instances**
1. Rent two small VPS instances (e.g., Oracle Cloud Always Free tier: 1 frontend, 1 backend)
2. On backend VPS:
   - Install Docker
   - Build and run the backend container on port `8000`
   - Expose the backend URL to the internet
3. On frontend VPS:
   - Install Docker or Node.js
   - Build the frontend with backend URL configured
   - Run Nginx to serve the built app on port `80`
4. Update frontend API calls to use the backend VPS URL

**Option 3: Single VPS with Separate Container Network (Optional)**
- Both containers on one VPS but in separate container processes
- Backend on port `8000`, frontend on port `80`
- Use a Docker bridge network or simple port exposure
- Not a traditional "single-server" setup; they are independently scalable

Important: Free cloud providers usually require account creation and billing info, even if the compute itself is free.

## Security Rules

Do not push or include:

- API keys
- access tokens
- passwords
- private certificates or keys
- `.env` files
- local databases with private content
- build artifacts like `frontend/dist`
- dependency folders like `frontend/node_modules`
- generated model binaries unless specifically needed

The repository already has `.gitignore` rules to exclude these items.

If you find secrets, replace them with placeholders and tell me to rotate them externally.

## Important File Rules And Conventions

- Use the current project style and keep changes minimal.
- Prefer direct file edits with `apply_patch`.
- Avoid adding unnecessary emojis.
- Keep documentation plain, clear, and practical.
- Preserve public routes and API contracts unless changing them is required.
- Do not revert unrelated user changes.

## Current Backend Details

The FastAPI app is in `backend/main.py`.

Key endpoints include:

- `GET /`
- `GET /audit/health`
- `POST /audit/demo`
- `POST /audit/upload`
- `POST /audit/compare`
- `POST /audit/drift`
- `GET /audits`
- `GET /audits/trend`
- `GET /audits/{audit_id}`
- `GET /audits/{audit_id}/pdf`

The SQLite database path can be overridden with the environment variable `CRITIQAI_DB_PATH`.

## Current Frontend Details

The frontend is in `frontend/` and uses Vite.

Important files include:

- `frontend/src/App.jsx`
- `frontend/src/pages/Upload.jsx`
- `frontend/src/pages/Report.jsx`
- `frontend/src/pages/History.jsx`
- `frontend/src/pages/Compare.jsx`
- `frontend/src/pages/Drift.jsx`
- `frontend/src/pages/AuditProgress.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/AuditVisualizer.jsx`

The frontend already uses relative fetch paths, so the reverse proxy can route requests without changing the UI code for production.

## Known Production Constraints

1. Large uploads may need a larger reverse-proxy body limit. The Nginx config already sets a higher `client_max_body_size`.
2. SQLite in a container should be stored on a volume for persistence.
3. Docker runtime validation could not be tested locally here because Docker was not installed.
4. The frontend production build has already been validated successfully.

## What To Do If Continuing Development

If you continue this project, a good order of work is:

1. Test both frontend and backend deployments on their target platforms.
2. Add HTTPS configuration for both services (PaaS usually handles this; VPS needs Let's Encrypt or similar).
3. Update frontend to read backend URL from environment variables for cross-deployment flexibility.
4. Decide whether SQLite persistence is adequate or move to managed database (PostgreSQL, etc.).
5. Add authentication/API key requirements if the deployment should not be public.
6. Set up CORS headers appropriately for separate domain deployments.

## Exact Local Commands

### Run the app locally in development

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

Windows quick start:

```bat
start.bat
```

### Run separate Docker containers locally

**Backend (in `backend/` directory):**

```bash
docker build -t critiqai-backend .
docker run -p 8000:8000 -v critiqai-db:/app/data critiqai-backend
```

API will be available at: `http://localhost:8000`
OpenAPI docs: `http://localhost:8000/docs`

**Frontend (in `frontend/` directory):**

```bash
docker build -t critiqai-frontend .
docker run -p 80:80 critiqai-frontend
```

App will be available at: `http://localhost`

### Deploy to PaaS platforms

**Backend to Render or Railway:**
1. Create a new service in the platform dashboard
2. Connect your GitHub repository
3. Set the build command: `pip install -r requirements.txt` (platform-specific)
4. Set the start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Configure environment variable: `CRITIQAI_DB_PATH=/app/data/critiqai.db` (or use platform storage)
6. Deploy — the backend URL will be provided

**Frontend to Vercel or Netlify:**
1. Create a new project in the platform dashboard
2. Connect your GitHub repository
3. Set the build command: `npm run build` (should be automatic)
4. Set the publish directory: `dist`
5. Add environment variable: `VITE_API_URL=https://YOUR-BACKEND-URL` (e.g., `https://myapp-backend.render.com`)
6. Deploy — the frontend URL will be provided
7. Update frontend code if needed to use the backend environment variable

**Important:** After deploying the backend, update the frontend environment variable with the actual backend URL before deploying the frontend.

### Stop Docker containers

```bash
docker stop <container-id>
```

## Documentation Files Already In Repo

- `README.md`: project overview and quick start
- `DEPLOYMENT.md`: single-server Docker deployment guide
- `CONTRIBUTING.md`: contribution workflow
- `SECURITY.md`: security reporting and secret handling
- `LICENSE`: MIT license

## What A Good Next AI Response Should Contain

If I paste this prompt into another AI, I want it to:

1. Explain the repo to a beginner.
2. Tell me exactly how to run it locally.
3. Tell me exactly how to deploy it for free on a single server.
4. Call out any missing production pieces like HTTPS, backups, or auth.
5. Not assume prior knowledge of Docker, FastAPI, React, or Nginx.
6. Warn me about any secrets or risky files before pushing publicly.

## Optional Follow-Up Tasks

If the AI is helping improve the repo further, useful follow-up tasks are:

1. Add HTTPS with a reverse proxy.
2. Add a production-ready domain setup guide.
3. Move from SQLite to Postgres if needed.
4. Add automated deployment instructions for a free cloud VM.
5. Add a license badge and repository status badge to `README.md`.

## Short Version For Quick Copy/Paste

If you want a shorter prompt, use this:

```text
You are helping with an existing Windows workspace repo at G:\CritiqAI called CritiqAI. It is a full-stack ML audit platform with a FastAPI backend and React + Vite frontend. The app has routes for upload, demo audit progress, report, history, compare, and drift. The backend uses SQLite for audit history and exposes /audit/*, /audits/*, and /audit/compare endpoints. The frontend uses relative fetch paths for API calls.

The repo includes Dockerfiles for separate backend and frontend deployments (backend/Dockerfile, frontend/Dockerfile, frontend/nginx.conf). The goal is to deploy frontend and backend as independent services on separate platforms or VPS instances. Options include: Vercel (frontend) + Render (backend), two separate VPS instances, or other PaaS combinations. Respect the .gitignore rules and do not push secrets, .env files, node_modules, dist, databases, or model binaries unless explicitly requested.

Assume I know nothing. Explain every step in detail. Preserve existing features unless a change is required. Frontend production build has already been validated, but Docker runtime validation could not be run locally because Docker was not installed. Tell me the exact next steps to deploy separate services, configure environment variables, set up CORS and API routing, and verify the integrated app.
```