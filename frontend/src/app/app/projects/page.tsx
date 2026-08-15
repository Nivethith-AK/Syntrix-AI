import { ProjectList } from "@/features/projects/project-list";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl animate-in fade-in duration-300">
      <p className="mb-4 text-sm text-muted-foreground">
        Organize workspaces for datasets, experiments, agents, and reports.
      </p>
      <ProjectList />
    </div>
  );
}
