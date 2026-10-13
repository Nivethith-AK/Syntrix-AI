import React from "react";
import { Database, Cpu, Layers, Box, Terminal, Activity, Zap } from "lucide-react";

interface PartnerItem {
  id: string;
  name: string;
  svg: React.ReactNode;
}

const partners: PartnerItem[] = [
  {
    id: "langgraph",
    name: "LangGraph",
    svg: <Layers className="h-5 w-5 text-foreground" />,
  },
  {
    id: "fastapi",
    name: "FastAPI",
    svg: <Zap className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />,
  },
  {
    id: "pytorch",
    name: "PyTorch",
    svg: <Activity className="h-5 w-5 text-orange-500" />,
  },
  {
    id: "postgresql",
    name: "PostgreSQL & pgvector",
    svg: <Database className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "mlflow",
    name: "MLflow",
    svg: <Cpu className="h-5 w-5 text-indigo-500" />,
  },
  {
    id: "docker",
    name: "Docker",
    svg: <Box className="h-5 w-5 text-sky-500" />,
  },
];

export const PartnerLogos: React.FC = () => {
  const repeatedPartners = [...partners, ...partners, ...partners, ...partners];

  return (
    <div className="w-full overflow-hidden py-4 select-none">
      <div className="flex w-max animate-marquee gap-8">
        {repeatedPartners.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-border/60 bg-muted/40 backdrop-blur-sm transition-transform hover:scale-105"
          >
            {item.svg}
            <span className="text-sm font-semibold tracking-tight text-foreground opacity-90">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
