"use client";

import { WorkspacePicker } from "@/components/dashboard/workspace-picker";

export function AgentsSection() {
  return (
    <WorkspacePicker
      title="Agents"
      description="Open a workspace to launch LangGraph workflows, resume HITL pauses, and watch the agent timeline."
      emptyHint="No workspaces yet."
      tab="agents"
    />
  );
}
