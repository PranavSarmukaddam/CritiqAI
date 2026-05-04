# Single-Server Deployment (Docker)

This setup runs CritiqAI on one server with two containers:

- backend: FastAPI API on internal port 8000
- web: Nginx serving React build and proxying API routes

Public entry point is one URL:

- http://SERVER_IP:8080

## Why this setup

- One host, one exposed port
- Frontend and backend stay in sync
- SQLite is persisted to a Docker volume
- Easy start/stop with Docker Compose

## Prerequisites

- Docker Engine
- Docker Compose plugin

Verify:

```bash
docker --version
docker compose version
```

## Local smoke run

From repository root:

```bash
docker compose up -d --build
```

Open:

- App: http://localhost:8080
- API docs: http://localhost:8080/docs

Stop:

```bash
docker compose down
```

## Windows shortcut

Use:

```bat
deploy.bat
```

## Server deployment steps

1. Provision a Linux VM (free options include Oracle Cloud Always Free ARM/AMD or your own machine).
2. Install Docker and Compose.
3. Clone this repository.
4. Run:

```bash
docker compose up -d --build
```

5. Open firewall/security group for TCP 8080.
6. Visit http://SERVER_IP:8080.

## Persistent data

Audit history is stored in a Docker named volume:

- volume: critiqai_data
- DB path in backend container: /data/critiqai.db

## Production hardening

For internet-facing production, add:

- HTTPS via reverse proxy (for example Caddy or Nginx with certificates)
- Domain name
- Regular backups of Docker volume data
- Rate limiting and authentication if exposing publicly

## Feature compatibility notes

Current deployment supports existing app features:

- Demo and upload audit endpoints
- Compare and drift endpoints
- History and trend endpoints
- PDF export endpoint

If you add very large model uploads, increase nginx client_max_body_size in frontend/nginx.conf.
