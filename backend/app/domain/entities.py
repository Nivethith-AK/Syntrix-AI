"""Domain entities (pure data)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class User:
    id: UUID
    email: str
    display_name: str | None
    avatar_url: str | None
    preferences: dict[str, Any]
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class Project:
    id: UUID
    user_id: UUID
    name: str
    description: str | None
    status: str
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


@dataclass(slots=True)
class Workspace:
    id: UUID
    project_id: UUID
    user_id: UUID
    name: str
    description: str | None
    status: str
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


@dataclass(slots=True)
class Job:
    id: UUID
    user_id: UUID
    project_id: UUID
    workspace_id: UUID | None
    job_type: str
    status: str
    progress_pct: int
    input_json: dict[str, Any] = field(default_factory=dict)
    result_json: dict[str, Any] = field(default_factory=dict)
    error_message: str | None = None
    celery_task_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(slots=True)
class Dataset:
    id: UUID
    project_id: UUID
    user_id: UUID
    name: str
    storage_path: str
    format: str
    mime_type: str | None
    original_filename: str | None
    size_bytes: int
    status: str
    content_hash: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


@dataclass(slots=True)
class DatasetVersion:
    id: UUID
    workspace_id: UUID
    dataset_id: UUID
    project_id: UUID
    user_id: UUID
    version_number: int
    label: str | None
    storage_path: str
    content_hash: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class DatasetMetadata:
    id: UUID
    dataset_version_id: UUID
    row_count: int | None
    column_count: int | None
    schema_json: dict[str, Any]
    profile_json: dict[str, Any]
    quality_json: dict[str, Any]
    semantic_summary: str | None
    target_candidates: list[Any]
    profiled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    eda_json: dict[str, Any] = field(default_factory=dict)
