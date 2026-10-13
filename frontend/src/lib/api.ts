/**
 * Syntrix AI — Frontend API Client
 * Connects UI and homescreen dashboard to the FastAPI backend.
 */

const API_BASE_URL =
  (typeof window !== "undefined" && (window as any).__SYNTRIX_API_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:8000/api/v1";

export interface DemoBootstrapData {
  user_id: string;
  project_id: string;
  workspace_id: string;
  dataset_version: {
    id: string | null;
    status: string;
    version_number: number;
  } | null;
  metadata: {
    row_count: number;
    column_count: number;
    semantic_summary: string;
    quality: Record<string, any>;
    eda: Record<string, any>;
    target_candidates: Array<{ column: string; task_type: string; score: number }>;
  } | null;
  model_count: number;
  models: Array<{
    id: string;
    name: string;
    algorithm: string;
    task_type: string;
    metrics: Record<string, any>;
    is_champion: boolean;
    status: string;
  }>;
}

export interface JobStatus {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress_pct: number;
  result_json: Record<string, any>;
  error_message: string | null;
}

export const api = {
  baseUrl: API_BASE_URL,

  async getHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Backend offline");
    return res.json();
  },

  async bootstrapDemo(): Promise<DemoBootstrapData> {
    const res = await fetch(`${API_BASE_URL}/demo/bootstrap`);
    if (!res.ok) throw new Error("Failed to bootstrap demo workspace");
    return res.json();
  },

  async uploadDemoDataset(file: File, name?: string): Promise<{ dataset_id: string; version_id: string; job_id: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);

    const res = await fetch(`${API_BASE_URL}/demo/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  async trainDemoAutoML(
    datasetVersionId?: string,
    targetColumn: string = "churned",
    taskType: string = "classification",
    algorithms?: string[]
  ): Promise<{ experiment_id: string; job_id: string; status: string }> {
    const res = await fetch(`${API_BASE_URL}/demo/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_version_id: datasetVersionId,
        target_column: targetColumn,
        task_type: taskType,
        algorithms: algorithms || ["random_forest", "logistic_regression", "xgboost"],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Training failed" }));
      throw new Error(err.detail || "Training failed");
    }
    return res.json();
  },

  getDemoReportPdfUrl(): string {
    return `${API_BASE_URL}/demo/report/pdf`;
  },

  async sendDemoChat(message: string): Promise<{ reply: string }> {
    const res = await fetch(`${API_BASE_URL}/demo/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Chat service unavailable");
    return res.json();
  },

  async getJob(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!res.ok) throw new Error("Job not found");
    return res.json();
  },
};
