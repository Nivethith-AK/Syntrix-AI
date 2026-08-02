"""Apply supabase/migrations/*.sql to DATABASE_URL from repo .env (idempotent)."""

from __future__ import annotations

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    load_dotenv(ROOT / ".env")
    url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql+psycopg://", "postgresql://"
    )
    print("target:", url.split("@")[-1])

    migrations = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
    if not migrations:
        raise SystemExit("No migrations found under supabase/migrations")

    with psycopg.connect(url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            for path in migrations:
                print("applying", path.name)
                cur.execute(path.read_text(encoding="utf-8"))
                print("  ok")

            cur.execute(
                """
                select
                  exists(select 1 from information_schema.columns
                         where table_name='dataset_metadata' and column_name='eda_json'),
                  exists(select 1 from information_schema.columns
                         where table_name='models' and column_name='explanation_json'),
                  exists(select 1 from information_schema.columns
                         where table_name='reports' and column_name='summary_json'),
                  exists(select 1 from pg_proc p
                         join pg_namespace n on n.oid=p.pronamespace
                         where n.nspname='public' and p.proname='handle_new_user')
                """
            )
            eda, explain, summary, trigger = cur.fetchone()
            print(
                "checks:",
                {
                    "eda_json": eda,
                    "models.explanation_json": explain,
                    "reports.summary_json": summary,
                    "handle_new_user": trigger,
                },
            )
    print("done")


if __name__ == "__main__":
    main()
