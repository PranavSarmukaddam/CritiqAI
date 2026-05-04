# Contributing to CritiqAI

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Setup

1. Clone the repository.
2. Install backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

3. Install frontend dependencies:

```powershell
cd frontend
npm install
```

## Running Locally

From repository root:

```bat
start.bat
```

Or run backend and frontend manually (see README.md).

## Development Guidelines

- Keep stage outputs backward-compatible where possible.
- Add or update tests when behavior changes.
- Keep commits focused and small.
- Avoid committing generated artifacts, local caches, or secrets.

## Pull Request Checklist

- Code builds and runs locally
- No sensitive data added
- README/docs updated if behavior or setup changed
- Tests/scripts relevant to change were run
