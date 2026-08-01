"""Environment-driven provider factory (no vendor lock-in)."""

from __future__ import annotations

import os

from syntrix_ai.providers.base import ChatModel, EmbeddingModel
from syntrix_ai.providers.ollama import OllamaChatModel, OllamaEmbeddingModel
from syntrix_ai.providers.openai_compatible import (
    OpenAICompatibleChatModel,
    OpenAICompatibleEmbeddingModel,
)


def get_chat_model(
    provider: str | None = None,
    *,
    base_url: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
) -> ChatModel:
    selected = (provider or os.getenv("AI_PROVIDER", "ollama")).lower()
    url = base_url or os.getenv("AI_BASE_URL", "http://localhost:11434")
    name = model or os.getenv("AI_MODEL", "llama3.2")
    key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")

    if selected == "ollama":
        return OllamaChatModel(base_url=url, model=name)
    if selected in {"openai_compatible", "openai"}:
        openai_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        return OpenAICompatibleChatModel(base_url=openai_url, model=name, api_key=key)
    raise ValueError(f"Unsupported AI_PROVIDER: {selected}")


def get_embedding_model(
    provider: str | None = None,
    *,
    base_url: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    dimensions: int = 1536,
) -> EmbeddingModel:
    selected = (provider or os.getenv("AI_PROVIDER", "ollama")).lower()
    url = base_url or os.getenv("AI_BASE_URL", "http://localhost:11434")
    name = model or os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")

    if selected == "ollama":
        return OllamaEmbeddingModel(base_url=url, model=name, dimensions=dimensions)
    if selected in {"openai_compatible", "openai"}:
        openai_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        return OpenAICompatibleEmbeddingModel(
            base_url=openai_url,
            model=name,
            api_key=key,
            dimensions=dimensions,
        )
    raise ValueError(f"Unsupported AI_PROVIDER: {selected}")
