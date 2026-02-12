"""One-time migration: add discord_id and avatar_url to users, create sessions table."""

from __future__ import annotations

import sqlite3
import os


def migrate():
    db_path = os.path.join(os.path.dirname(__file__), "..", "sts.db")
    db_path = os.path.normpath(db_path)

    if not os.path.exists(db_path):
        print(f"Database not found at {db_path} — nothing to migrate.")
        print("The new columns and tables will be created on next server start.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check existing columns
    columns = [row[1] for row in cursor.execute("PRAGMA table_info(users)")]

    if "discord_id" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN discord_id VARCHAR(50)")
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_discord_id ON users(discord_id)"
        )
        print("Added discord_id column to users table.")
    else:
        print("discord_id column already exists.")

    if "avatar_url" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)")
        print("Added avatar_url column to users table.")
    else:
        print("avatar_url column already exists.")

    conn.commit()
    conn.close()

    print("Migration complete. Sessions table will be created on next server start.")


if __name__ == "__main__":
    migrate()
