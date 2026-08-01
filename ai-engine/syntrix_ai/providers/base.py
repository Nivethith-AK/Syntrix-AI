"""AI provider ports — graphs/agents depend only on these interfaces."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatModel(ABC):
    """Port for chat / completion providers (Ollama primary, OpenAI-compatible optional)."""

    @abstractmethod
    async def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        raise NotImplementedError


class EmbeddingModel(ABC):
    """Port for embedding models used by pgvector memory (Phase 4+)."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    @property
    @abstractmethod
    def dimensions(self) -> int:
        raise NotImplementedError
