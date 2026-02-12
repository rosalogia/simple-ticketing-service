# STS Frontend

React single-page application for the collaborative ticketing system.

## Setup

```bash
npm install
npm run dev
```

Opens at **http://localhost:5173**. Requires the backend running on port 8000 (Vite proxies `/api` requests automatically).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** for dev server and bundling
- **Tailwind CSS v4** via the Vite plugin (no `tailwind.config.js` needed)
- **DM Sans** + **JetBrains Mono** fonts (loaded from Google Fonts)

## Project Structure

```
frontend/src/
├── main.tsx                Entry point
├── App.tsx                 Root component (user state, view routing)
├── index.css               Tailwind imports + custom theme + animations
├── types.ts                TypeScript types mirroring backend schemas
├── api/
│   └── client.ts           Fetch wrapper with X-User-Id header injection
└── components/
    ├── Layout.tsx           App shell (header + content area)
    ├── UserSwitcher.tsx     User impersonation dropdown
    ├── Dashboard.tsx        Two-tab dashboard (Assigned to/by Me)
    ├── StatsWidgets.tsx     Summary stat cards
    ├── FilterSidebar.tsx    Search, status/priority checkboxes
    ├── TicketList.tsx       Ticket table with badges
    ├── TicketForm.tsx       Ticket creation modal
    ├── TicketDetail.tsx     Full ticket view with inline editing
    └── CommentThread.tsx    Comment list + add comment form
```

## Design Decisions

- **No React Router** — Simple `view` state in `App.tsx` switches between dashboard and ticket detail. Two views don't justify a routing library.
- **No state management library** — `useState` and `useEffect` only. The app is small enough that prop drilling is clearer than indirection.
- **Native `<datalist>` for CTI autocomplete** — Category, Type, and Item fields use the browser's built-in autocomplete. Simple, accessible, zero dependencies.
- **API proxy** — `vite.config.ts` proxies `/api/*` to `localhost:8000`, so the frontend makes same-origin requests. No CORS issues during development.

## How the User Switcher Works

The prototype has no authentication. Instead, a dropdown in the header lets you impersonate any user. When you switch users:

1. `setCurrentUserId(id)` updates the module-level variable in `api/client.ts`
2. Every subsequent `fetch` call includes the `X-User-Id` header with that value
3. The dashboard re-fetches to show the new user's tickets
