---
type: invariant
status: active
applies_to:
  - "[[backend]]"
  - "[[frontend]]"
  - "[[mobile]]"
established_by: "[[001-naming-convention]]"
---

## Statement
All user identity flows through Discord OAuth. There is no custom user registration. Users are created/updated on first Discord login.

## Rationale
Simplifies identity management. Teams already use Discord — no need for a separate auth system. Breaking this would require building user registration, password management, email verification, etc.

## Verification
- `backend/app/routers/auth.py` — only Discord OAuth endpoints.
- No `/register` or `/signup` endpoints exist.
- `User` model has `discord_id` as the external identity.

## Risks
- If the project needs to support non-Discord users (e.g., external customers), this invariant must be revisited.
