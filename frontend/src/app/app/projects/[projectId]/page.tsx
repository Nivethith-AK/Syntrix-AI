import { ProjectDetail } from "@/features/projects/project-detail";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <ProjectDetail projectId={projectId} />
    </div>
  );
}
