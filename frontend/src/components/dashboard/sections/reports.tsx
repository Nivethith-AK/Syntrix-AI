"use client";

import { WorkspacePicker } from "@/components/dashboard/workspace-picker";

export function ReportsSection() {
  return (
    <WorkspacePicker
      title="Reports"
      description="Open a workspace to generate Markdown + PDF reports and download them when ready."
      emptyHint="No workspaces yet."
    />
  );
}
