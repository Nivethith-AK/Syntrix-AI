from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    conversations,
    datasets,
    experiments,
    health,
    jobs,
    me,
    projects,
    reports,
    workflows,
    workspaces,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(me.router)
api_router.include_router(projects.router)
api_router.include_router(workspaces.router)
api_router.include_router(datasets.router)
api_router.include_router(experiments.router)
api_router.include_router(workflows.router)
api_router.include_router(reports.router)
api_router.include_router(conversations.router)
api_router.include_router(jobs.router)
