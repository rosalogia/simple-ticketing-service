# STS Backend

FastAPI REST API for the collaborative ticketing system.

## Setup

```bash
uv sync
cp .env.example .env   # then edit .env with your values
uv run uvicorn app.main:app --reload --port 8000
```

In debug mode (`DEBUG=true`), the app automatically runs migrations and seeds sample data on first startup.

API docs are available at **http://localhost:8000/api/docs** (Swagger UI) when `DEBUG=true`.

## Project Structure

```
backend/
├── app/
│   ├── main.py          FastAPI app, CORS, lifespan (migrations + auto-seed)
│   ├── config.py        Environment config, validation, DEBUG flag
│   ├── database.py      SQLAlchemy engine + session (configurable DB URL)
│   ├── auth.py          Auth dependencies (session-based + dev mode)
│   ├── models.py        ORM models + enums
│   ├── schemas.py       Pydantic request/response schemas
│   ├── seed.py          Sample data seeder
│   └── routers/
│       ├── auth.py        Discord OAuth2 login/callback/logout + /me
│       ├── users.py       User CRUD
│       ├── queues.py      Queue CRUD, member management, Discord import/sync
│       ├── tickets.py     Ticket CRUD + filtering + stats (queue-scoped)
│       ├── comments.py    Comment CRUD (queue-scoped)
│       └── categories.py  CTI autocomplete (queue-scoped)
├── alembic/             Database migrations
│   ├── env.py
│   └── versions/
├── alembic.ini
├── pyproject.toml
└── Dockerfile
```

## Database

Configurable via `DATABASE_URL` environment variable:

- **Development**: SQLite (default, `sqlite:///./sts.db`)
- **Production**: PostgreSQL (`postgresql://user:pass@host:5432/sts`)

### Migrations

Schema changes are managed with Alembic:

```bash
# Apply pending migrations
uv run alembic upgrade head

# Create a new migration after model changes
uv run alembic revision --autogenerate -m "description of change"

# Check current migration version
uv run alembic current
```

Migrations run automatically on app startup.

### Seeding

```bash
# Full reset: drops all tables, re-applies migrations, inserts sample data
uv run python -m app.seed
```

In debug mode, the app auto-seeds if the database is empty.

## Authentication

### Production (Discord OAuth2)

When `DEBUG=false`, authentication uses Discord OAuth2:

1. `GET /api/auth/login` — returns Discord authorization URL (scope: `identify guilds`)
2. `GET /api/auth/callback?code=...` — exchanges code for token, creates/updates user, sets session cookie
3. `GET /api/auth/me` — returns current user from session cookie
4. `POST /api/auth/logout` — clears session

Sessions are stored in the database with a 30-day expiry. The Discord access token is stored on the session for guild list API calls.

### Debug Mode (X-User-Id header)

When `DEBUG=true`, any request can impersonate a user by sending `X-User-Id: {id}` header. No real authentication occurs. The user list endpoint allows unauthenticated access so the frontend can populate the user switcher.

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/login` | Get Discord OAuth URL |
| GET | `/api/auth/callback` | OAuth callback |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/logout` | Log out |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/` | List all users |
| POST | `/api/users/` | Create a user |
| GET | `/api/users/{id}` | Get a user by ID |

### Queues

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/queues/` | List queues the user belongs to |
| POST | `/api/queues/` | Create a queue (creator becomes OWNER) |
| GET | `/api/queues/{id}` | Get queue details |
| PATCH | `/api/queues/{id}` | Update queue settings (OWNER only) |
| DELETE | `/api/queues/{id}` | Delete queue + all tickets (OWNER only) |
| GET | `/api/queues/{id}/members` | List queue members with roles |
| POST | `/api/queues/{id}/members` | Add a member (OWNER only) |
| PATCH | `/api/queues/{id}/members/{user_id}` | Change member role (OWNER only) |
| DELETE | `/api/queues/{id}/members/{user_id}` | Remove member or self-leave |
| GET | `/api/queues/discord-servers` | List importable Discord servers |
| POST | `/api/queues/from-discord` | Import Discord server as queue |
| POST | `/api/queues/{id}/sync-discord` | Re-sync members from Discord (OWNER only) |

### Tickets

All ticket endpoints require `queue_id` and verify queue membership.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tickets/` | List tickets (with filtering) |
| POST | `/api/tickets/` | Create a ticket |
| GET | `/api/tickets/stats` | Dashboard statistics |
| GET | `/api/tickets/{id}` | Get ticket detail |
| PATCH | `/api/tickets/{id}` | Update a ticket |
| DELETE | `/api/tickets/{id}` | Delete a ticket |

**Filtering query params** for `GET /api/tickets/`:
- `queue_id` (required) — scope to a queue
- `status` — filter by status (repeatable: `?status=OPEN&status=BLOCKED`)
- `priority` — filter by priority (repeatable)
- `assignee_id` / `assigner_id` — filter by user
- `search` — case-insensitive search in title and description
- `due_before` / `due_after` — date range filters
- `category` / `type` / `item` — CTI filters
- `sort_by` — one of `created_at`, `updated_at`, `due_date`, `title`, `priority`
- `sort_order` — `asc` or `desc` (default: `desc`)
- `skip` / `limit` — pagination (default: 0 / 50)

### Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tickets/{id}/comments` | List comments for a ticket |
| POST | `/api/tickets/{id}/comments` | Add a comment |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories/?queue_id=...` | Distinct category/type/item values for a queue |

## Queue Roles

| Role | Permissions |
|------|-------------|
| OWNER | Full control: manage members, change settings, create any severity ticket, delete queue |
| MEMBER | Create tickets (severity capped by queue's `member_max_severity`), view, comment |
| VIEWER | View tickets and comments only |

## Testing

```bash
# List users (no auth needed in debug mode)
curl -s http://localhost:8000/api/users/ | python3 -m json.tool

# Get tickets assigned to user 1 in queue 1
curl -s "http://localhost:8000/api/tickets/?queue_id=1&assignee_id=1" \
  -H "X-User-Id: 1" | python3 -m json.tool

# Create a ticket
curl -s -X POST http://localhost:8000/api/tickets/ \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"title": "Test ticket", "assignee_id": 2, "queue_id": 1, "priority": "SEV3"}' \
  | python3 -m json.tool

# Create a queue
curl -s -X POST http://localhost:8000/api/queues/ \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"name": "My Queue", "description": "A test queue"}' \
  | python3 -m json.tool
```
