"""Workspace chat with optional pgvector memory + provider answers."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import NotFoundError
from app.repositories.models import ConversationRow, MessageRow
from app.repositories.workspace_repo import WorkspaceRepository


class ConversationService:
    def __init__(self, session: AsyncSession, workspace_repo: WorkspaceRepository) -> None:
        self._session = session
        self._workspaces = workspace_repo

    async def list_conversations(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(ConversationRow).where(
                ConversationRow.workspace_id == workspace_id,
                ConversationRow.user_id == user_id,
            )
        )
        rows = (
            await self._session.execute(
                select(ConversationRow)
                .where(
                    ConversationRow.workspace_id == workspace_id,
                    ConversationRow.user_id == user_id,
                )
                .order_by(ConversationRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)

    async def create(self, workspace_id: UUID, user_id: UUID, *, title: str | None) -> ConversationRow:
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        row = ConversationRow(
            id=uuid4(),
            workspace_id=workspace_id,
            project_id=ws.project_id,
            user_id=user_id,
            title=title or "Workspace chat",
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return row

    async def get_with_messages(self, conversation_id: UUID, user_id: UUID):
        conv = await self._session.get(ConversationRow, conversation_id)
        if conv is None or conv.user_id != user_id:
            raise NotFoundError("Conversation not found")
        messages = (
            await self._session.execute(
                select(MessageRow)
                .where(MessageRow.conversation_id == conversation_id)
                .order_by(MessageRow.created_at.asc())
            )
        ).scalars().all()
        return conv, messages

    async def send_message(self, conversation_id: UUID, user_id: UUID, content: str):
        conv, prior = await self.get_with_messages(conversation_id, user_id)
        user_msg = MessageRow(
            id=uuid4(),
            conversation_id=conversation_id,
            role="user",
            content=content,
        )
        self._session.add(user_msg)
        await self._session.flush()

        answer = await self._generate_answer(conv, prior, content)
        assistant = MessageRow(
            id=uuid4(),
            conversation_id=conversation_id,
            role="assistant",
            content=answer,
        )
        self._session.add(assistant)
        await self._session.commit()
        await self._session.refresh(user_msg)
        await self._session.refresh(assistant)

        # Best-effort memory write (embedding optional / Phase 4+)
        try:
            from sqlalchemy import text

            await self._session.execute(
                text(
                    """
                    insert into memory_chunks (
                      id, workspace_id, project_id, user_id, conversation_id,
                      kind, content, metadata_json
                    ) values (
                      gen_random_uuid(), cast(:workspace_id as uuid), cast(:project_id as uuid),
                      cast(:user_id as uuid), cast(:conversation_id as uuid),
                      'conversation', :content, '{}'::jsonb
                    )
                    """
                ),
                {
                    "workspace_id": str(conv.workspace_id),
                    "project_id": str(conv.project_id),
                    "user_id": str(user_id),
                    "conversation_id": str(conversation_id),
                    "content": f"Q: {content}\nA: {answer}",
                },
            )
            await self._session.commit()
        except Exception:  # noqa: BLE001
            await self._session.rollback()

        return user_msg, assistant

    async def _generate_answer(self, conv: ConversationRow, prior: list[MessageRow], content: str) -> str:
        # Pull lightweight workspace context
        context_bits: list[str] = []
        try:
            from sqlalchemy import text

            meta = (
                await self._session.execute(
                    text(
                        """
                        select dm.semantic_summary
                        from dataset_metadata dm
                        join dataset_versions dv on dv.id = dm.dataset_version_id
                        where dv.workspace_id = cast(:ws as uuid)
                        order by dm.profiled_at desc nulls last
                        limit 1
                        """
                    ),
                    {"ws": str(conv.workspace_id)},
                )
            ).first()
            if meta and meta[0]:
                context_bits.append(f"Dataset: {meta[0]}")
            champ = (
                await self._session.execute(
                    text(
                        """
                        select algorithm, metrics_json
                        from models
                        where workspace_id = cast(:ws as uuid) and is_champion = true
                        limit 1
                        """
                    ),
                    {"ws": str(conv.workspace_id)},
                )
            ).mappings().first()
            if champ:
                context_bits.append(f"Champion model: {champ['algorithm']} metrics={champ['metrics_json']}")
        except Exception:  # noqa: BLE001
            pass

        history = "\n".join(f"{m.role}: {m.content}" for m in prior[-6:])
        prompt = (
            "You are Syntrix AI workspace assistant. Answer briefly using context.\n"
            f"Context:\n" + "\n".join(context_bits or ["No profiled dataset yet."]) + "\n"
            f"History:\n{history}\n"
            f"User: {content}\nAssistant:"
        )
        try:
            from syntrix_ai.providers.base import ChatMessage
            from syntrix_ai.providers.factory import get_chat_model

            model = get_chat_model()
            return await model.complete([ChatMessage(role="user", content=prompt)])
        except Exception:  # noqa: BLE001
            # Deterministic offline answer for demos without Ollama
            if context_bits:
                return (
                    "Based on the current workspace context: "
                    + " | ".join(context_bits)
                    + f". Regarding '{content}', review the EDA insights and champion model metrics in the Experiments tab."
                )
            return (
                f"I don't have a profiled dataset in this workspace yet. "
                f"Upload a CSV and run profiling, then ask again about '{content}'."
            )
