import { WorkspaceHub } from "@/features/workspaces/workspace-hub";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string; workspaceId: string }>;
}) {
  const { projectId, workspaceId } = await params;
  return <WorkspaceHub projectId={projectId} workspaceId={workspaceId} />;
}
