import { ProjectList } from "@/features/projects/project-list";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Workspace</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Projects
        </h1>
      </header>
      <ProjectList />
    </div>
  );
}
