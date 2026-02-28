---
type: component
name: frontend
health: stable
dependencies:
  - "[[backend]]"
dependents: []
---

## Summary
React SPA (Vite + TypeScript + Tailwind CSS) serving the web UI for STS. Provides queue management, ticket CRUD, comment threads, notification feed, API key management, and per-user performance dashboards. Uses React Router v6 for routing. Recharts library used for data visualization in the performance dashboard.

## Interfaces
- Communicates with backend via `api/client.ts` fetch wrapper hitting `/api/*` endpoints.
- Auth via Discord OAuth flow → session cookie.
- Dev mode: sends `X-User-Id` header, shows user switcher.
- Production: served by nginx, which proxies `/api/*` to the backend.
- `PerformanceDashboard` component at `/queues/:queueId/performance/:userId` — stat cards, resolution quality bars, and stacked bar chart (Recharts). Accessible from Dashboard tab bar (chart icon) and QueueSettings member list (per-member chart icon).

## Health
Stable. Clean component organization. State management is local (useState/useCallback) — no global store.

## Limitations
- No offline support.
- No global state management — deep prop drilling in some areas.

## Caution Areas
- `src/api/client.ts` — centralized API client; 401 handling emits `session-expired` event.
- `src/auth/AuthContext.tsx` — auth state management; dev vs prod mode divergence.
- nginx config template (`nginx.conf.template`) — envsubst for PORT and BACKEND_HOST.
- E2E tests: `e2e/global-setup.ts` resets the database before each test run (drops tables, runs migrations, re-seeds). All E2E tests — new and existing — must pass on every change.

## Customer Impact
Primary web interface. Degradation means users can't manage tickets or queues from desktop.
