"use client";

import { WorkspacePicker } from "@/components/dashboard/workspace-picker";

export function ModelsSection() {
  return (
    <WorkspacePicker
      title="Models"
      description="Open a workspace to review trained models, run predictions, and view SHAP explanations."
      emptyHint="No workspaces yet."
      tab="experiments"
    />
  );
}
