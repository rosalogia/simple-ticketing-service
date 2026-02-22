# CLAUDE.md

## Project overview

STS (Simple Ticketing Service) — a ticketing system with a FastAPI backend, React web frontend, and React Native mobile app. Deployed on Railway with PostgreSQL.

## Development environment

- **Python**: Available via `uv` (e.g. `uv run pytest`, `uv run uvicorn`). Do not use `python` or `python3` directly.
- **PostgreSQL**: Available via the nix flake in this directory. Always develop and test against PostgreSQL, never SQLite — PostgreSQL is what's used in production.
- **Node/npm**: Used for frontend and mobile.

## Testing

- Always add unit tests and E2E tests where applicable when developing new features.
- **Backend tests**: `cd backend && uv run pytest tests/ -x`
- **E2E tests**: `cd frontend && npx playwright test`
- **Never mock in E2E tests** without having a discussion about it first. E2E tests should exercise the real stack end-to-end.

## Project structure

- `backend/` — FastAPI backend (Python, uv)
- `frontend/` — React web app (Vite, TypeScript)
- `mobile/` — React Native mobile app (TypeScript)
- `frontend/e2e/` — Playwright E2E tests
