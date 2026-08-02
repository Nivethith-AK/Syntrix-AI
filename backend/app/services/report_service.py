"""Report generation orchestration (Markdown + PDF)."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.storage import SupabaseStorage, storage_paths
from app.domain.errors import NotFoundError
from app.repositories.job_repo import JobRepository
from app.repositories.models import ReportRow
from app.repositories.workspace_repo import WorkspaceRepository


class ReportService:
    def __init__(
        self,
        session: AsyncSession,
        workspace_repo: WorkspaceRepository,
        job_repo: JobRepository,
    ) -> None:
        self._session = session
        self._workspaces = workspace_repo
        self._jobs = job_repo
        self._settings = get_settings()

    async def list_reports(self, workspace_id: UUID, user_id: UUID, *, limit: int, offset: int):
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        total = await self._session.scalar(
            select(func.count()).select_from(ReportRow).where(
                ReportRow.workspace_id == workspace_id, ReportRow.user_id == user_id
            )
        )
        rows = (
            await self._session.execute(
                select(ReportRow)
                .where(ReportRow.workspace_id == workspace_id, ReportRow.user_id == user_id)
                .order_by(ReportRow.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).scalars().all()
        return rows, int(total or 0)

    async def create(
        self,
        workspace_id: UUID,
        user_id: UUID,
        *,
        title: str,
        report_type: str = "executive",
        experiment_id: UUID | None = None,
        model_id: UUID | None = None,
    ) -> tuple[ReportRow, Any]:
        ws = await self._workspaces.get(workspace_id, user_id)
        if ws is None:
            raise NotFoundError("Workspace not found")
        report = ReportRow(
            id=uuid4(),
            workspace_id=workspace_id,
            project_id=ws.project_id,
            user_id=user_id,
            title=title,
            report_type=report_type if report_type in {"eda", "experiment", "executive", "custom"} else "custom",
            status="drafting",
            outline_json={
                "experiment_id": str(experiment_id) if experiment_id else None,
                "model_id": str(model_id) if model_id else None,
            },
        )
        self._session.add(report)
        await self._session.flush()
        job = await self._jobs.create(
            user_id=user_id,
            project_id=ws.project_id,
            workspace_id=workspace_id,
            job_type="report",
            input_json={
                "report_id": str(report.id),
                "experiment_id": str(experiment_id) if experiment_id else None,
                "model_id": str(model_id) if model_id else None,
            },
        )
        report.job_id = job.id
        await self._session.commit()
        from app.workers.tasks import generate_report_task

        async_result = generate_report_task.delay(str(job.id))
        await self._jobs.set_celery_task_id(job.id, async_result.id)
        await self._session.commit()
        job = await self._jobs.get(job.id, user_id)
        await self._session.refresh(report)
        return report, job

    async def get(self, report_id: UUID, user_id: UUID) -> ReportRow:
        row = await self._session.get(ReportRow, report_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Report not found")
        return row

    async def download_url(self, report_id: UUID, user_id: UUID, fmt: str) -> str:
        report = await self.get(report_id, user_id)
        path = report.storage_path_pdf if fmt == "pdf" else report.storage_path_md
        if not path:
            raise NotFoundError("Report file not ready")
        # Create a short-lived signed URL via Storage API
        settings = self._settings
        base = settings.supabase_url.rstrip("/")
        bucket = storage_paths(settings).reports
        # Use create_signed_url REST
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base}/storage/v1/object/sign/{bucket}/{path}",
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json",
                },
                json={"expiresIn": 3600},
            )
            if resp.status_code >= 400:
                # Fallback: authenticated object URL (service role) — not for browser; return content path hint
                return f"{base}/storage/v1/object/authenticated/{bucket}/{path}"
            data = resp.json()
            signed = data.get("signedURL") or data.get("signedUrl") or ""
            if signed.startswith("http"):
                return signed
            return f"{base}/storage/v1{signed}"
