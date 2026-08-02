"use client";

import { OverviewSection } from "@/components/dashboard/sections/overview";
import { PipelineSection } from "@/components/dashboard/sections/pipeline";
import { DealsSection } from "@/components/dashboard/sections/deals";
import { CustomersSection } from "@/components/dashboard/sections/customers";
import { TeamSection } from "@/components/dashboard/sections/team";
import { ForecastingSection } from "@/components/dashboard/sections/forecasting";
import { ReportsSection } from "@/components/dashboard/sections/reports";
import { SettingsSection } from "@/components/dashboard/sections/settings";
import type { Section } from "@/components/dashboard/types";

export function DashboardHome({ activeSection }: { activeSection: Section }) {
  switch (activeSection) {
    case "overview":
      return <OverviewSection />;
    case "pipeline":
      return <PipelineSection />;
    case "deals":
      return <DealsSection />;
    case "customers":
      return <CustomersSection />;
    case "team":
      return <TeamSection />;
    case "forecasting":
      return <ForecastingSection />;
    case "reports":
      return <ReportsSection />;
    case "settings":
      return <SettingsSection />;
    default:
      return <OverviewSection />;
  }
}
