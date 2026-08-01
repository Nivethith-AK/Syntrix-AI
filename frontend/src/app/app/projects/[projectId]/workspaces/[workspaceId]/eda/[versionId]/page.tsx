import { EdaPage } from "@/features/datasets/eda-page";

export default async function DatasetEdaRoute({
  params,
}: {
  params: Promise<{ projectId: string; workspaceId: string; versionId: string }>;
}) {
  const { projectId, workspaceId, versionId } = await params;
  return <EdaPage projectId={projectId} workspaceId={workspaceId} versionId={versionId} />;
}
