"use client";

import { WorkspacePicker } from "@/components/dashboard/workspace-picker";

export function ExperimentsSection() {
  return (
    <WorkspacePicker
      title="Experiments"
      description="Open a workspace to run AutoML, compare metrics, and promote a champion model."
      emptyHint="No workspaces yet."
      tab="experiments"
    />
  );
}
