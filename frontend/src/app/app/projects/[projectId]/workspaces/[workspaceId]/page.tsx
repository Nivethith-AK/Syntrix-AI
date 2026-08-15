import { Suspense } from "react";

import { WorkspaceHub } from "@/features/workspaces/workspace-hub";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string; workspaceId: string }>;
}) {
  const { projectId, workspaceId } = await params;
  return (
    <Suspense
      fallback={<p className="animate-pulse text-sm text-muted-foreground">Loading workspace…</p>}
    >
      <WorkspaceHub projectId={projectId} workspaceId={workspaceId} />
    </Suspense>
  );
}
