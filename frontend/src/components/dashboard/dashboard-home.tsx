"use client";

import { OverviewSection } from "@/components/dashboard/sections/overview";
import { ProjectsSection } from "@/components/dashboard/sections/projects";
import { DatasetsSection } from "@/components/dashboard/sections/datasets";
import { ExperimentsSection } from "@/components/dashboard/sections/experiments";
import { ModelsSection } from "@/components/dashboard/sections/models";
import { AgentsSection } from "@/components/dashboard/sections/agents";
import { ReportsSection } from "@/components/dashboard/sections/reports";
import { SettingsSection } from "@/components/dashboard/sections/settings";
import type { Section } from "@/components/dashboard/types";

export function DashboardHome({
  activeSection,
  onNavigate,
}: {
  activeSection: Section;
  onNavigate?: (section: Section) => void;
}) {
  switch (activeSection) {
    case "overview":
      return (
        <OverviewSection
          onNavigateProjects={() => onNavigate?.("projects")}
          onNavigate={onNavigate}
        />
      );
    case "projects":
      return <ProjectsSection />;
    case "datasets":
      return <DatasetsSection />;
    case "experiments":
      return <ExperimentsSection />;
    case "models":
      return <ModelsSection />;
    case "agents":
      return <AgentsSection />;
    case "reports":
      return <ReportsSection />;
    case "settings":
      return <SettingsSection />;
    default:
      return (
        <OverviewSection
          onNavigateProjects={() => onNavigate?.("projects")}
          onNavigate={onNavigate}
        />
      );
  }
}
