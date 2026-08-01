import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import type {
  AgentActivity,
  AgentRun,
  ChatMessage,
  Conversation,
  Dataset,
  DatasetMetadata,
  DatasetPreview,
  DatasetVersion,
  Experiment,
  Job,
  Model,
  Paginated,
  Project,
  Report,
  User,
  Workspace,
} from "@/types/api";

async function getToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

async function authHeaders(json = true): Promise<HeadersInit> {
  const token = await getToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiUrl } = getPublicEnv();
  const json = !(init?.body instanceof FormData);
  const headers = await authHeaders(json);
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string; title?: string };
      detail = body.detail || body.title || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  me: () => apiFetch<User>("/api/v1/me"),
  listProjects: () => apiFetch<Paginated<Project>>("/api/v1/projects"),
  createProject: (body: { name: string; description?: string }) =>
    apiFetch<Project>("/api/v1/projects", { method: "POST", body: JSON.stringify(body) }),
  getProject: (id: string) => apiFetch<Project>(`/api/v1/projects/${id}`),
  listWorkspaces: (projectId: string) =>
    apiFetch<Paginated<Workspace>>(`/api/v1/projects/${projectId}/workspaces`),
  createWorkspace: (projectId: string, body: { name: string; description?: string }) =>
    apiFetch<Workspace>(`/api/v1/projects/${projectId}/workspaces`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getWorkspace: (id: string) => apiFetch<Workspace>(`/api/v1/workspaces/${id}`),

  submitDemoJob: (body: { project_id: string; workspace_id?: string; message?: string }) =>
    apiFetch<{ job_id: string; status: string; events_url: string }>("/api/v1/jobs/demo", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getJob: (jobId: string) => apiFetch<Job>(`/api/v1/jobs/${jobId}`),

  uploadDataset: async (workspaceId: string, file: File, name?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (name) form.append("name", name);
    return apiFetch<{
      dataset: Dataset;
      dataset_version: DatasetVersion;
      job_id: string;
      status: string;
      events_url: string;
    }>(`/api/v1/workspaces/${workspaceId}/datasets/upload`, { method: "POST", body: form });
  },
  listDatasetVersions: (workspaceId: string) =>
    apiFetch<Paginated<DatasetVersion>>(`/api/v1/workspaces/${workspaceId}/dataset-versions`),
  getDatasetVersion: (versionId: string) =>
    apiFetch<DatasetVersion>(`/api/v1/dataset-versions/${versionId}`),
  getDatasetMetadata: (versionId: string) =>
    apiFetch<DatasetMetadata>(`/api/v1/dataset-versions/${versionId}/metadata`),
  getDatasetPreview: (versionId: string, limit = 50) =>
    apiFetch<DatasetPreview>(`/api/v1/dataset-versions/${versionId}/preview?limit=${limit}`),
  getEda: (versionId: string) =>
    apiFetch<{
      dataset_version_id: string;
      eda: Record<string, unknown>;
      semantic_summary: string | null;
      quality: Record<string, unknown>;
      target_candidates: Array<Record<string, unknown>>;
    }>(`/api/v1/dataset-versions/${versionId}/eda`),
  startEda: (versionId: string) =>
    apiFetch<{ dataset_version_id: string; job_id: string; status: string }>(
      `/api/v1/dataset-versions/${versionId}/eda`,
      { method: "POST" },
    ),

  listExperiments: (workspaceId: string) =>
    apiFetch<Paginated<Experiment>>(`/api/v1/workspaces/${workspaceId}/experiments`),
  createExperiment: (
    workspaceId: string,
    body: {
      dataset_version_id: string;
      name: string;
      task_type: string;
      target_column: string;
      algorithms?: string[];
    },
  ) =>
    apiFetch<{ experiment: Experiment; job_id: string; status: string }>(
      `/api/v1/workspaces/${workspaceId}/experiments`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getExperiment: (id: string) => apiFetch<Experiment>(`/api/v1/experiments/${id}`),
  listModels: (workspaceId: string) =>
    apiFetch<Paginated<Model>>(`/api/v1/workspaces/${workspaceId}/models`),
  setChampion: (modelId: string) =>
    apiFetch<Model>(`/api/v1/models/${modelId}/champion`, { method: "POST" }),
  predict: (modelId: string, rows: Array<Record<string, unknown>>) =>
    apiFetch<{ prediction_id: string; output_json: Record<string, unknown> }>(
      `/api/v1/models/${modelId}/predictions`,
      { method: "POST", body: JSON.stringify({ rows }) },
    ),
  explainModel: (modelId: string) =>
    apiFetch<{ job_id: string; status: string }>(`/api/v1/models/${modelId}/explain`, {
      method: "POST",
    }),
  getExplanations: (modelId: string) =>
    apiFetch<{ explanations: Record<string, unknown> }>(
      `/api/v1/models/${modelId}/explanations`,
    ),

  startWorkflow: (
    workspaceId: string,
    body: { workflow_type: string; dataset_version_id?: string; input?: Record<string, unknown> },
  ) =>
    apiFetch<{ run_id: string; job_id: string; status: string; events_url: string }>(
      `/api/v1/workspaces/${workspaceId}/workflows`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getWorkflow: (runId: string) => apiFetch<AgentRun>(`/api/v1/workflows/${runId}`),
  resumeWorkflow: (runId: string, body: Record<string, unknown>) =>
    apiFetch<AgentRun>(`/api/v1/workflows/${runId}/resume`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listAgentRuns: (workspaceId: string) =>
    apiFetch<Paginated<AgentRun>>(`/api/v1/workspaces/${workspaceId}/agent-runs`),
  listAgentActivities: (workspaceId: string) =>
    apiFetch<Paginated<AgentActivity>>(`/api/v1/workspaces/${workspaceId}/agent-activities`),

  listReports: (workspaceId: string) =>
    apiFetch<Paginated<Report>>(`/api/v1/workspaces/${workspaceId}/reports`),
  createReport: (
    workspaceId: string,
    body: { title: string; report_type?: string; experiment_id?: string; model_id?: string },
  ) =>
    apiFetch<{ report: Report; job_id: string }>(`/api/v1/workspaces/${workspaceId}/reports`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getReport: (id: string) => apiFetch<Report>(`/api/v1/reports/${id}`),
  downloadReportUrl: (id: string, format: "md" | "pdf") =>
    apiFetch<{ url: string }>(`/api/v1/reports/${id}/download?format=${format}`),

  listConversations: (workspaceId: string) =>
    apiFetch<Paginated<Conversation>>(`/api/v1/workspaces/${workspaceId}/conversations`),
  createConversation: (workspaceId: string, title?: string) =>
    apiFetch<Conversation>(`/api/v1/workspaces/${workspaceId}/conversations`, {
      method: "POST",
      body: JSON.stringify({ title: title || "Workspace chat" }),
    }),
  getConversation: (id: string) =>
    apiFetch<Conversation & { messages: ChatMessage[] }>(`/api/v1/conversations/${id}`),
  sendMessage: (id: string, content: string) =>
    apiFetch<{ user_message: ChatMessage; assistant_message: ChatMessage }>(
      `/api/v1/conversations/${id}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),
};
