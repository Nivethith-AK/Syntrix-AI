"""MCP Database server — read-only workspace-scoped SQL helpers."""

from __future__ import annotations

import os
import re
from typing import Any

from mcp.file_server import CapabilityToken, verify_capability

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy)\b",
    re.IGNORECASE,
)


class DatabaseMCP:
    def __init__(self, token: CapabilityToken) -> None:
        if not verify_capability(token):
            raise PermissionError("Invalid capability token")
        if not token.allows("db:read"):
            raise PermissionError("Missing db:read scope")
        self.token = token
        self.database_url = os.getenv("DATABASE_URL", "")

    def query(self, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        if _FORBIDDEN.search(sql):
            raise PermissionError("Only read-only SELECT queries are allowed")
        if "workspace_id" not in sql:
            raise PermissionError("Queries must filter by workspace_id")
        params = dict(params or {})
        params.setdefault("workspace_id", self.token.workspace_id)

        import psycopg
        from psycopg.rows import dict_row

        url = self.database_url
        if url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        with psycopg.connect(url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return list(cur.fetchall())
