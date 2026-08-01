export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  user_id: string;
  project_id: string;
  workspace_id: string | null;
  job_type: string;
  status: string;
  progress_pct: number;
  input_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  error_message: string | null;
  celery_task_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Dataset = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  storage_path: string;
  format: string;
  mime_type: string | null;
  original_filename: string | null;
  size_bytes: number;
  status: string;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type DatasetVersion = {
  id: string;
  workspace_id: string;
  dataset_id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  label: string | null;
  storage_path: string;
  content_hash: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DatasetMetadata = {
  id: string;
  dataset_version_id: string;
  row_count: number | null;
  column_count: number | null;
  schema_json: Record<string, unknown>;
  profile_json: Record<string, unknown>;
  quality_json: Record<string, unknown>;
  eda_json: Record<string, unknown>;
  semantic_summary: string | null;
  target_candidates: Array<Record<string, unknown>>;
  profiled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DatasetPreview = {
  dataset_version_id: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  row_count: number;
  truncated: boolean;
};

export type Experiment = {
  id: string;
  workspace_id: string;
  project_id: string;
  dataset_version_id: string;
  user_id: string;
  name: string;
  task_type: string;
  status: string;
  config_json: Record<string, unknown>;
  metrics_json: Record<string, unknown>;
  mlflow_run_id: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Model = {
  id: string;
  experiment_id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  algorithm: string;
  task_type: string;
  artifact_path: string | null;
  metrics_json: Record<string, unknown>;
  params_json: Record<string, unknown>;
  is_champion: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AgentRun = {
  id: string;
  workspace_id: string;
  project_id: string;
  user_id: string;
  job_id: string | null;
  workflow_type: string;
  status: string;
  input_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentActivity = {
  id: string;
  agent_run_id: string | null;
  workspace_id: string;
  agent_name: string;
  activity_type: string;
  status: string;
  payload_json: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
};

export type Report = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  report_type: string;
  status: string;
  content_md: string | null;
  storage_path_md: string | null;
  storage_path_pdf: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

export type Paginated<T> = {
  items: T[];
  limit: number;
  offset: number;
  total: number;
};
