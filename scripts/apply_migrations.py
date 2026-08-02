"""Apply supabase/migrations/*.sql using DATABASE_URL from .env (no secrets printed)."""

from __future__ import annotations

import re
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[1]


def load_database_url() -> str:
    env_path = ROOT / ".env"
    text = env_path.read_text(encoding="utf-8")
    match = re.search(r"^DATABASE_URL=(.+)$", text, re.M)
    if not match:
        raise SystemExit("DATABASE_URL missing from .env")
    url = match.group(1).strip().strip('"').strip("'")
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+psycopg://", "postgresql://")
    return url


def main() -> None:
    url = load_database_url()
    migrations = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            for path in migrations:
                print(f"Applying {path.name}")
                cur.execute(path.read_text(encoding="utf-8"))
                conn.commit()
    print(f"Migrations OK ({len(migrations)} files)")


if __name__ == "__main__":
    main()
