"""MCP Research server — SSRF-safe fetch (or mocked for demo)."""

from __future__ import annotations

import ipaddress
import os
import socket
from urllib.parse import urlparse

import httpx

from mcp.file_server import CapabilityToken, verify_capability

BLOCKED_HOSTS = {"localhost", "metadata.google.internal", "169.254.169.254"}


def _is_private_host(host: str) -> bool:
    if host.lower() in BLOCKED_HOSTS or host.endswith(".local"):
        return True
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return True
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        ):
            return True
    return False


class ResearchMCP:
    def __init__(self, token: CapabilityToken) -> None:
        if not verify_capability(token):
            raise PermissionError("Invalid capability token")
        if not token.allows("research:read"):
            raise PermissionError("Missing research:read scope")
        self.mock = os.getenv("RESEARCH_MCP_MOCK", "1") == "1"

    def search(self, query: str) -> list[dict[str, str]]:
        if self.mock:
            return [
                {
                    "title": f"Demo research note for: {query}",
                    "url": "https://example.com/research/demo",
                    "snippet": "Mocked research result for portfolio demo (set RESEARCH_MCP_MOCK=0 to enable live fetch).",
                }
            ]
        # Live mode still returns a constrained stub search list
        return [
            {
                "title": query,
                "url": "https://en.wikipedia.org/wiki/Special:Search?search=" + query.replace(" ", "+"),
                "snippet": "Live search redirect target (fetch via fetch_url).",
            }
        ]

    def fetch_url(self, url: str, max_bytes: int = 100_000) -> dict[str, str]:
        if self.mock:
            return {"url": url, "content": f"Mocked content for {url}", "status": "mocked"}
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise PermissionError("Only http/https allowed")
        host = parsed.hostname or ""
        if _is_private_host(host):
            raise PermissionError("SSRF blocked: private or local host")
        with httpx.Client(timeout=15.0, follow_redirects=False) as client:
            r = client.get(url)
            r.raise_for_status()
            text = r.text[:max_bytes]
        return {"url": url, "content": text, "status": "ok"}
