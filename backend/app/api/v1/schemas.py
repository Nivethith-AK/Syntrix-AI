"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    limit: int
    offset: int
    total: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000)
    preferences: dict[str, Any] | None = None


class UserStatsOut(BaseModel):
    projects: int = 0
    workspaces: int = 0
    datasets: int = 0
    dataset_versions: int = 0
    experiments: int = 0
    models: int = 0
    agent_runs: int = 0
    reports: int = 0


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    settings: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, pattern="^(active|archived)$")
    settings: dict[str, Any] | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    status: str
    settings: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    settings: dict[str, Any] = Field(default_factory=dict)


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, pattern="^(active|archived)$")
    settings: dict[str, Any] | None = None


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    status: str
    settings: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DemoJobCreate(BaseModel):
    project_id: UUID
    workspace_id: UUID | None = None
    message: str = Field(default="hello from Syntrix", max_length=500)


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    project_id: UUID
    workspace_id: UUID | None = None
    job_type: str
    status: str
    progress_pct: int
    input_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None
    celery_task_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class JobAccepted(BaseModel):
    job_id: UUID
    status: str
    events_url: str


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    user_id: UUID
    name: str
    storage_path: str
    format: str
    mime_type: str | None = None
    original_filename: str | None = None
    size_bytes: int
    status: str
    content_hash: str | None = None
    created_at: datetime
    updated_at: datetime


class DatasetVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    dataset_id: UUID
    project_id: UUID
    user_id: UUID
    version_number: int
    label: str | None = None
    storage_path: str
    content_hash: str | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class DatasetMetadataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: UUID
    dataset_version_id: UUID
    row_count: int | None = None
    column_count: int | None = None
    schema_json: dict[str, Any] = Field(default_factory=dict)
    profile_json: dict[str, Any] = Field(default_factory=dict)
    quality_json: dict[str, Any] = Field(default_factory=dict)
    eda_json: dict[str, Any] = Field(default_factory=dict)
    semantic_summary: str | None = None
    target_candidates: list[Any] = Field(default_factory=list)
    profiled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DatasetUploadAccepted(BaseModel):
    dataset: DatasetOut
    dataset_version: DatasetVersionOut
    job_id: UUID
    status: str
    events_url: str


class DatasetPreviewOut(BaseModel):
    dataset_version_id: UUID
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool


class EdaAccepted(BaseModel):
    dataset_version_id: UUID
    job_id: UUID
    status: str
    events_url: str
