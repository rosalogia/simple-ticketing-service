# STS - Collaborative Ticketing System

A collaborative ticketing system where users can assign tasks to each other. Unlike traditional ticketing systems, STS enables bidirectional task assignment — friends, teammates, or housemates can ticket each other for anything from reading recommendations to urgent favors.

Tickets are organized into **Queues** — shared spaces with role-based access control. Queues can be created manually or imported from a Discord server.

## Architecture

```
sts/
├── backend/          FastAPI + SQLAlchemy + Alembic
├── frontend/         React + Vite + Tailwind CSS + TypeScript
├── docker-compose.yml    Production deployment (PostgreSQL + nginx)
└── user-experience.org   Full product specification
```

The backend exposes a REST API at `/api/*`. The frontend is a single-page app that communicates with it. During development, Vite proxies `/api` requests to the backend server.

## Quick Start

First-time setup:

```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

Then start both servers:

```bash
./dev.sh              # starts backend (:8000) and frontend (:5173)
./dev.sh status       # check what's running
./dev.sh logs backend # tail backend logs (Ctrl+C to detach)
./dev.sh restart      # restart both servers
./dev.sh stop         # stop everything
```

Open **http://localhost:5173** in your browser.

In debug mode (the default), the app auto-creates the database schema and seeds sample data on first startup — no manual steps needed. Use the user-switcher dropdown to view the system as different users.

To manually reset the database:

```bash
cd backend && uv run python -m app.seed
```

See `./dev.sh help` for all commands.

## Prerequisites

- Python 3.13+ and [uv](https://docs.astral.sh/uv/)
- Node.js 20+ and npm

## Key Features

- **Queues** — shared ticket spaces with OWNER / MEMBER / VIEWER roles
- **Discord integration** — import a Discord server as a queue, syncing members and roles via a bot
- **Dashboard** with "Assigned to Me" and "Assigned by Me" tabs
- **Ticket creation** with priority levels (Sev-1 through Sev-4), due dates, and Category/Type/Item categorization
- **Severity limits** — queue owners can restrict the max severity members can create
- **Ticket detail** view with inline editing and status workflow (Open → In Progress → Blocked/Completed/Cancelled)
- **Comment threads** on tickets
- **Search and filter** by status, priority, and free text
- **Queue settings** — manage members, roles, and queue configuration (owner only)

## Authentication

STS supports two modes:

- **Debug mode** (`DEBUG=true` in `.env`): Uses a user-switcher dropdown with no real authentication. The `X-User-Id` header identifies the current user. This is the default for local development.
- **Production mode** (`DEBUG=false`): Discord OAuth2 login. Users authenticate via Discord, and their profile (name, avatar) is synced on each login. Requires `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and fill in the values. Key settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `DEBUG` | `true` for dev mode, `false` for production | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth2 application ID | Production only |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 client secret | Production only |
| `SESSION_SECRET_KEY` | Secret for session signing (generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`) | Production only |
| `DISCORD_BOT_TOKEN` | Bot token for Discord server import/sync | Optional |
| `DATABASE_URL` | Database connection string (defaults to SQLite) | Optional |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (defaults to `http://localhost:5173`) | Optional |

## Production Deployment

STS ships with Docker support for production:

```bash
# Create a .env with production values (see backend/.env.example)
docker compose up -d
```

This starts:
- **PostgreSQL 16** — production database
- **Backend** — FastAPI app with auto-migrations on startup
- **Frontend** — nginx serving the React build + proxying API requests

The app is available on port 80 (configurable via `PORT` env var).

## Discord Bot Setup

To enable importing Discord servers as queues:

1. Create a Discord application at [discord.com/developers](https://discord.com/developers/applications)
2. Under **OAuth2**, add redirect URI: `http://localhost:5173/api/auth/callback` (or your production URL)
3. Under **Bot**, generate a token and enable **Server Members Intent**
4. Set `DISCORD_BOT_TOKEN` in your `.env`
5. Invite the bot to your server: `https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=0`

Then in the app: Create Queue → From Discord → select your server.

## Deferred Features

- Real-time notifications / WebSockets
- File attachments
- Email/SMS/push notifications
- Edit/delete comments
- Audit trail / activity log
- Markdown rendering
- Mobile-specific UI

See `user-experience.org` for the full product vision.
