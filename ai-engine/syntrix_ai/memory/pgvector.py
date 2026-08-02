"""pgvector workspace memory helpers."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from syntrix_ai.providers.factory import get_embedding_model


def embed_text(text: str) -> list[float]:
    model = get_embedding_model()
    vectors = model.embed([text])
    return list(vectors[0]) if vectors else []


def memory_insert_sql() -> str:
    return """
    insert into memory_chunks (
      id, workspace_id, project_id, user_id, conversation_id,
      kind, source_type, source_id, content, embedding, metadata_json
    ) values (
      cast(:id as uuid), cast(:workspace_id as uuid), cast(:project_id as uuid),
      cast(:user_id as uuid), cast(:conversation_id as uuid),
      :kind, :source_type, cast(:source_id as uuid), :content,
      cast(:embedding as vector), cast(:metadata_json as jsonb)
    )
    """


def build_memory_row(
    *,
    workspace_id: str,
    project_id: str,
    user_id: str,
    content: str,
    kind: str = "insight",
    conversation_id: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    with_embedding: bool = True,
) -> dict[str, Any]:
    embedding = None
    if with_embedding:
        try:
            vec = embed_text(content)
            embedding = "[" + ",".join(str(float(x)) for x in vec) + "]"
        except Exception:  # noqa: BLE001
            embedding = None
    return {
        "id": str(uuid4()),
        "workspace_id": workspace_id,
        "project_id": project_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "kind": kind,
        "source_type": source_type,
        "source_id": source_id,
        "content": content,
        "embedding": embedding,
        "metadata_json": __import__("json").dumps(metadata or {}),
    }
