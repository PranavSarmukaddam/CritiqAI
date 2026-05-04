@echo off
setlocal

echo [CritiqAI] Building and starting containers...
docker compose up -d --build
if %errorlevel% neq 0 (
  echo [CritiqAI] Deployment failed.
  exit /b %errorlevel%
)

echo [CritiqAI] Deployment complete.
echo App URL: http://localhost:8080
echo API Docs: http://localhost:8080/docs

echo.
echo Use "docker compose logs -f" to stream logs.
echo Use "docker compose down" to stop.
