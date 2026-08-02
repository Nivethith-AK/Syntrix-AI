"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Workspace } from "@/types/api";

export type CatalogWorkspace = Workspace & {
  project_name: string;
};

export function useWorkspaceCatalog() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const projects = projectsQuery.data?.items ?? [];

  const workspaceQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["workspaces", project.id],
      queryFn: () => api.listWorkspaces(project.id),
      enabled: projects.length > 0,
    })),
  });

  const workspaces: CatalogWorkspace[] = workspaceQueries.flatMap((query, index) => {
    const project = projects[index];
    if (!project || !query.data?.items) return [];
    return query.data.items.map((ws) => ({
      ...ws,
      project_name: project.name,
    }));
  });

  const isLoading =
    projectsQuery.isLoading || workspaceQueries.some((query) => query.isLoading && !query.data);
  const isError = projectsQuery.isError || workspaceQueries.some((query) => query.isError);

  return {
    projects,
    workspaces,
    isLoading,
    isError,
    error:
      (projectsQuery.error as Error | null)?.message ||
      (workspaceQueries.find((q) => q.error)?.error as Error | undefined)?.message ||
      null,
    refetch: async () => {
      await projectsQuery.refetch();
      await Promise.all(workspaceQueries.map((q) => q.refetch()));
    },
  };
}
