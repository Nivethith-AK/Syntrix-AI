"use client";

import { WorkspacePicker } from "@/components/dashboard/workspace-picker";

export function DatasetsSection() {
  return (
    <WorkspacePicker
      title="Datasets & EDA"
      description="Open a workspace to upload CSV/Parquet/Excel, run profiling, and explore EDA charts."
      emptyHint="No workspaces yet."
    />
  );
}
