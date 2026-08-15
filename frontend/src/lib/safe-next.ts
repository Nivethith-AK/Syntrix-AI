/** Allow only same-origin relative paths (blocks //evil.com open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/app"): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}

export const DASHBOARD_SECTIONS = [
  "overview",
  "projects",
  "datasets",
  "experiments",
  "models",
  "agents",
  "reports",
  "settings",
] as const;

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export function parseDashboardSection(value: string | null | undefined): DashboardSection {
  if (value && (DASHBOARD_SECTIONS as readonly string[]).includes(value)) {
    return value as DashboardSection;
  }
  return "overview";
}

export type WorkspaceHubTab = "data" | "experiments" | "agents" | "reports" | "chat";

export function sectionToWorkspaceTab(section: DashboardSection): WorkspaceHubTab | null {
  switch (section) {
    case "datasets":
      return "data";
    case "experiments":
    case "models":
      return "experiments";
    case "agents":
      return "agents";
    case "reports":
      return "reports";
    default:
      return null;
  }
}
