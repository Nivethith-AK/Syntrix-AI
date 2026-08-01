"""Workspace conversations."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.v1.pagination import pagination_params
from app.api.v1.schemas import Paginated
from app.core.deps import CurrentUser, DbSession
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.conversation_service import ConversationService

router = APIRouter(tags=["conversations"])


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    project_id: UUID
    title: str | None = None
    created_at: Any = None
    updated_at: Any = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: Any = None


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


def _svc(session: DbSession) -> ConversationService:
    return ConversationService(session, WorkspaceRepository(session))


@router.get(
    "/workspaces/{workspace_id}/conversations",
    response_model=Paginated[ConversationOut],
)
async def list_conversations(
    workspace_id: UUID,
    user: CurrentUser,
    session: DbSession,
    paging: tuple[int, int] = Depends(pagination_params),
) -> Paginated[ConversationOut]:
    limit, offset = paging
    items, total = await _svc(session).list_conversations(
        workspace_id, user.id, limit=limit, offset=offset
    )
    return Paginated(
        items=[ConversationOut.model_validate(i) for i in items],
        limit=limit,
        offset=offset,
        total=total,
    )


@router.post(
    "/workspaces/{workspace_id}/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    workspace_id: UUID, body: ConversationCreate, user: CurrentUser, session: DbSession
) -> ConversationOut:
    row = await _svc(session).create(workspace_id, user.id, title=body.title)
    return ConversationOut.model_validate(row)


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: UUID, user: CurrentUser, session: DbSession
) -> dict:
    conv, messages = await _svc(session).get_with_messages(conversation_id, user.id)
    return {
        **ConversationOut.model_validate(conv).model_dump(),
        "messages": [MessageOut.model_validate(m).model_dump() for m in messages],
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: UUID, body: MessageCreate, user: CurrentUser, session: DbSession
) -> dict:
    user_msg, assistant = await _svc(session).send_message(
        conversation_id, user.id, body.content
    )
    return {
        "user_message": MessageOut.model_validate(user_msg).model_dump(),
        "assistant_message": MessageOut.model_validate(assistant).model_dump(),
    }
