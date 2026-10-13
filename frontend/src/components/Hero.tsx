import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  GitBranch,
  ArrowRight,
  Star,
  Search,
  GripVertical,
  CheckCircle2,
  Clock,
  Users,
  Database,
  Brain,
  Sparkles,
  FileText,
  Plus,
  Activity,
  TrendingUp,
  BarChart2,
  Bot,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GridBackground } from "@/components/ui/GridBackground";
import { PartnerLogos } from "@/components/PartnerLogos";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { api, DemoBootstrapData } from "@/lib/api";

const tagColorClasses: Record<string, string> = {
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

interface TaskItem {
  id: string;
  title: string;
  description: string;
  tag: { color: string; label: string };
  dueDate: string;
  branch: string;
  assignees: number;
  progress: { completed: number; total: number };
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: TaskItem[];
}

const initialColumns: Column[] = [
  {
    id: "data-prep",
    title: "Data Ingestion & Prep",
    color: "slate",
    tasks: [
      {
        id: "t1",
        title: "Automated Data Cleaning & Validation",
        description: "Profile 1.2M rows, handle missing values, and run schema checks.",
        tag: { color: "sky", label: "Data Engineer" },
        dueDate: "Stage 1-3",
        branch: "agent/data-prep",
        assignees: 1,
        progress: { completed: 3, total: 3 },
      },
      {
        id: "t2",
        title: "Automated Feature Engineering",
        description: "Generate interaction terms, categorical encodings, and scaling matrices.",
        tag: { color: "indigo", label: "Data Scientist" },
        dueDate: "Stage 4",
        branch: "agent/features",
        assignees: 2,
        progress: { completed: 4, total: 4 },
      },
      {
        id: "t3",
        title: "Vector-Native Retrieval via pgvector",
        description: "Index unstructured research documents and logs with semantic embeddings.",
        tag: { color: "emerald", label: "MCP Protocol" },
        dueDate: "Active",
        branch: "mcp/database",
        assignees: 1,
        progress: { completed: 2, total: 2 },
      },
    ],
  },
  {
    id: "model-training",
    title: "Model Experimentation",
    color: "sky",
    tasks: [
      {
        id: "t5",
        title: "Train Gradient Boosted Ensembles",
        description: "Evaluate XGBoost, LightGBM, and CatBoost with 5-fold cross-validation.",
        tag: { color: "sky", label: "ML Engineer" },
        dueDate: "Stage 5",
        branch: "agent/training",
        assignees: 3,
        progress: { completed: 5, total: 5 },
      },
      {
        id: "t6",
        title: "MLflow Experiment Tracking & Registry",
        description: "Log hyperparameters, loss curves, and artifact checkpoints automatically.",
        tag: { color: "amber", label: "MLOps" },
        dueDate: "Stage 6",
        branch: "mlops/registry",
        assignees: 2,
        progress: { completed: 8, total: 8 },
      },
    ],
  },
  {
    id: "explainability",
    title: "Evaluation & Explainability",
    color: "amber",
    tasks: [
      {
        id: "t8",
        title: "SHAP Value Attribution & Ranking",
        description: "Compute mathematical feature importances and waterfall plots for every prediction.",
        tag: { color: "sky", label: "Explainability" },
        dueDate: "Stage 7",
        branch: "agent/shap-eval",
        assignees: 1,
        progress: { completed: 10, total: 10 },
      },
      {
        id: "t9",
        title: "Validation Agent Self-Critique",
        description: "Stress-test analytical results, audit data leakage, and check confidence bounds.",
        tag: { color: "emerald", label: "Self-Critique" },
        dueDate: "Stage 8",
        branch: "agent/validation",
        assignees: 2,
        progress: { completed: 4, total: 4 },
      },
    ],
  },
  {
    id: "executive-report",
    title: "Executive Synthesis",
    color: "emerald",
    tasks: [
      {
        id: "t11",
        title: "Stakeholder Intelligence Report",
        description: "Synthesize findings into strategic business decisions and export PDF briefs.",
        tag: { color: "slate", label: "Report Agent" },
        dueDate: "Stage 9",
        branch: "agent/synthesis",
        assignees: 1,
        progress: { completed: 5, total: 5 },
      },
    ],
  },
];

const StatCounter: React.FC<{ end: number; label: string; suffix?: string }> = ({
  end,
  label,
  suffix = "",
}) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let curr = 0;
          const step = (end / 1800) * 16;
          const timer = setInterval(() => {
            curr += step;
            if (curr >= end) {
              setVal(end);
              clearInterval(timer);
            } else {
              setVal(Math.floor(curr));
            }
          }, 16);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="flex flex-col items-center sm:items-start">
      <div className="text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
        {val.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

export const Hero: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addColId, setAddColId] = useState("col-1");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Data Engineer");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [demoData, setDemoData] = useState<DemoBootstrapData | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    // Fetch live backend telemetry
    api
      .bootstrapDemo()
      .then((data) => {
        setDemoData(data);
      })
      .catch((err) => {
        console.warn("Bootstrap demo fallback:", err);
      });
    return () => clearTimeout(timer);
  }, []);

  const openAddTask = (colId: string = "col-1") => {
    setAddColId(colId);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setUploadFile(null);
    setIsAddModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const roleColors: Record<string, string> = {
      "Data Engineer": "sky",
      "Data Scientist": "indigo",
      "ML Engineer": "emerald",
      "Explainability": "purple",
      "Report Agent": "amber",
    };

    const created: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "Autonomous task orchestrated by Syntrix multi-agent supervisor.",
      tag: { color: roleColors[newTaskRole] || "sky", label: newTaskRole },
      dueDate: "Live",
      branch: `feat/${newTaskRole.toLowerCase().replace(/\s+/g, "-")}-agent`,
      assignees: 2,
      progress: { completed: 1, total: 5 },
    };

    setColumns((prev) =>
      prev.map((c) => (c.id === addColId ? { ...c, tasks: [created, ...c.tasks] } : c))
    );
    setIsAddModalOpen(false);

    // If a CSV file was attached, upload it to the real backend
    if (uploadFile) {
      setIsUploading(true);
      setToastMessage("Uploading dataset & running EDA validation...");
      try {
        await api.uploadDemoDataset(uploadFile, newTaskTitle);
        setToastMessage("✓ Dataset uploaded. Ingestion & EDA pipeline running.");
        const fresh = await api.bootstrapDemo();
        setDemoData(fresh);
      } catch (err: any) {
        setToastMessage(`Upload notice: ${err.message || "queued"}`);
      } finally {
        setIsUploading(false);
        setUploadFile(null);
      }
    } else {
      const targetTitle = columns.find((c) => c.id === addColId)?.title || "Pipeline";
      setToastMessage(`Created autonomous agent task in ${targetTitle}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleAdvanceTask = async (taskId: string) => {
    const currentColIdx = columns.findIndex((c) => c.tasks.some((t) => t.id === taskId));
    if (currentColIdx === -1 || currentColIdx >= columns.length - 1) return;

    const targetCol = columns[currentColIdx + 1];
    let taskToMove: TaskItem | undefined;

    const updated = columns.map((col, idx) => {
      if (idx === currentColIdx) {
        taskToMove = col.tasks.find((t) => t.id === taskId);
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      return col;
    });

    if (taskToMove) {
      taskToMove = {
        ...taskToMove,
        progress: {
          completed: Math.min(taskToMove.progress.total, taskToMove.progress.completed + 1),
          total: taskToMove.progress.total,
        },
      };
      const finalCols = updated.map((col, idx) =>
        idx === currentColIdx + 1 ? { ...col, tasks: [taskToMove!, ...col.tasks] } : col
      );
      setColumns(finalCols);
      setSelectedTask(null);

      // If advancing into Model Experimentation or Evaluation, trigger real AutoML training
      if (targetCol.id === "model-training" || targetCol.id === "evaluation") {
        setIsTraining(true);
        setToastMessage("🚀 Training AutoML models on backend (RF, LogReg, XGB)...");
        try {
          const res = await api.trainDemoAutoML();
          setToastMessage(`✓ Models trained! Experiment #${res.experiment_id.slice(0, 8)}`);
          const fresh = await api.bootstrapDemo();
          setDemoData(fresh);
        } catch (err: any) {
          console.warn("AutoML notice:", err);
          setToastMessage(`Advanced task to ${targetCol.title}`);
        } finally {
          setIsTraining(false);
          setTimeout(() => setToastMessage(null), 4000);
        }
      } else {
        setToastMessage(`Advanced task to ${targetCol.title}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }))
    );
    setSelectedTask(null);
    setToastMessage("Task removed from active pipeline");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    e.dataTransfer.setData("taskId", task.id);
    const col = columns.find((c) => c.tasks.some((t) => t.id === task.id));
    if (col) e.dataTransfer.setData("sourceColId", col.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");
    if (!taskId || !sourceColId || sourceColId === targetColId) return;

    let movedTask: TaskItem | undefined;
    const newCols = columns.map((col) => {
      if (col.id === sourceColId) {
        movedTask = col.tasks.find((t) => t.id === taskId);
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      return col;
    });

    if (movedTask) {
      const finalCols = newCols.map((col) => {
        if (col.id === targetColId && movedTask) {
          return { ...col, tasks: [...col.tasks, movedTask] };
        }
        return col;
      });
      setColumns(finalCols);
      const targetTitle = columns.find((c) => c.id === targetColId)?.title;
      setToastMessage(`Workflow assigned to ${targetTitle}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const filteredColumns = columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTag = selectedTag === "All" || t.tag.label === selectedTag;
      return matchSearch && matchTag;
    }),
  }));

  const allTags = ["All", "Data Engineer", "Data Scientist", "ML Engineer", "Explainability", "Report Agent"];

  return (
    <section className="relative w-full overflow-hidden bg-background">
      <GridBackground className="!absolute inset-0 hidden lg:block opacity-40" gridSize={40} />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="h-[500px] w-[900px] rounded-full bg-foreground/[0.04] blur-[120px] -translate-y-1/2" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 pt-16 pb-0 md:pt-24">
        {/* Top Header & Copy */}
        <div
          className={cn(
            "flex flex-col items-center text-center space-y-8 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/60 backdrop-blur-sm text-xs font-medium text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-foreground animate-pulse" />
            Syntrix AI · The Autonomous AI Intelligence Platform
            <Zap className="h-3 w-3 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
          </div>

          {/* Heading with Underline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-balance leading-[1.08] text-foreground max-w-4xl">
            Autonomous data{" "}
            <span className="relative whitespace-nowrap inline-block px-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 418 42"
                className="absolute left-0 -bottom-3 w-full h-8 overflow-visible pointer-events-none"
                preserveAspectRatio="none"
              >
                <path
                  d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203"
                  strokeWidth="8"
                  fill="none"
                  className="stroke-foreground/70 dark:stroke-white/80"
                />
              </svg>
              <span className="relative z-10">intelligence</span>
            </span>{" "}
            for your entire organization.
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed text-balance">
            From raw data ingestion to trained models, explainable predictions, and executive-ready reports — Syntrix orchestrates a supervisor-led fleet of specialized AI agents to compress weeks of data science work into hours.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <a href="javascript:void(0)" onClick={(e) => scrollToSection("dashboard", e)}>
              <Button className="h-12 px-8 rounded-full text-base font-semibold shadow-lg shadow-primary/20 gap-2 cursor-pointer">
                <BarChart2 className="h-4 w-4" />
                Explore Live Dashboard
              </Button>
            </a>
            <a href="/auth">
              <Button
                variant="outline"
                className="border-border text-foreground rounded-full hover:bg-muted text-base h-12 px-8 gap-2 group cursor-pointer"
              >
                Deploy Multi-Agent Fleet
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>

          {/* Micro trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 fill-foreground/30 text-foreground/30" /> 6 Specialized Agents
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> 9-Stage Automated ML Pipeline
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Model Context Protocol (MCP)
            </span>
          </div>
        </div>

        {/* Live Interactive Kanban Board Window (Full Dashboard) */}
        <div
          id="dashboard"
          className={cn(
            "mt-12 transition-all duration-700 delay-300 scroll-mt-24",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40 ring-1 ring-border bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-xl">
            {/* Window title bar */}
            <div className="h-10 bg-muted/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-green-400/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-5 px-3 rounded bg-background/80 border border-border text-[10px] text-muted-foreground flex items-center gap-1.5 max-w-[200px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  app.syntrix.ai
                </div>
              </div>
            </div>

            {/* Inner Dashboard Header */}
            <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 gap-3 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md">
              {/* Left Brand Info */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-md">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                      SYNTRIX AI
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      v2.4-agent
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Autonomous Task Flow · {columns.reduce((sum, c) => sum + c.tasks.length, 0)} active tasks
                  </span>
                </div>
              </div>

              {/* Right Controls: Search, Filter Tabs, New Task Button */}
              <div className="flex items-center gap-3">
                <div className="relative hidden sm:block w-44 md:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 z-10" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                  />
                </div>

                <div className="hidden lg:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/80 p-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={cn(
                        "text-[11px] px-3 py-1 font-semibold rounded-full transition-colors cursor-pointer",
                        selectedTag === tag
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={() => openAddTask("col-1")}
                  className="h-8 rounded-full px-4 text-xs font-semibold gap-1.5 shadow-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Task</span>
                </Button>
              </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
              <div className="bg-emerald-500 text-white text-xs px-4 py-1.5 text-center font-medium transition-all shadow-sm">
                ✓ {toastMessage}
              </div>
            )}

            {/* Dashboard Body: Sidebar + Kanban Board */}
            <div className="flex min-h-[540px]">
              {/* Left Sidebar: Agent Context & Metrics */}
              <div className="hidden lg:flex flex-col w-48 border-r border-zinc-200/80 dark:border-zinc-800/80 p-2.5 space-y-4 bg-white/40 dark:bg-zinc-900/30 shrink-0">
                {/* Agent Context Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 px-2">
                    Agent Context
                  </span>
                  <div className="space-y-1">
                    <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 font-medium text-xs border border-zinc-300/80 dark:border-zinc-700/60">
                      <span className="flex items-center gap-2">
                        <GitBranch className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                        <span>Active Agents</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-950">
                        6
                      </span>
                    </button>

                    <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-xs">
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Model Latency</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        42ms
                      </span>
                    </button>

                    <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-xs">
                      <span className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5" />
                        <span>Active Data</span>
                      </span>
                      <span className="text-[10px] font-mono">
                        {demoData?.metadata?.row_count ? `${demoData.metadata.row_count} rows` : "1.2M"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Metrics & Insights Section */}
                <div className="space-y-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 px-2">
                    Metrics & Insights
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-xs cursor-pointer">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Model Accuracy</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-foreground">
                        {demoData?.models?.[0]?.metrics?.accuracy != null
                          ? `${(demoData.models[0].metrics.accuracy * 100).toFixed(1)}%`
                          : "94.1%"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-xs cursor-pointer">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                        <span>Best Model</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-foreground">
                        {demoData?.models?.[0]?.algorithm || "RF / XGB"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Full Analytics Button */}
                <div className="mt-auto pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <a
                    href="/auth"
                    className="w-full py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Full Analytics</span>
                  </a>
                </div>
              </div>

              {/* Right Content: Horizontal Scrollable Kanban Columns */}
              <div className="flex-1 p-3 overflow-x-auto">
                <div className="flex gap-3 min-w-full pb-2">
                  {filteredColumns.map((column) => (
                    <div
                      key={column.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.id)}
                      className="flex-1 min-w-[210px] sm:min-w-[230px] max-w-[270px] flex flex-col rounded-2xl border p-2.5 transition-colors bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/60"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200/80 dark:border-zinc-800/80 px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold tracking-tight text-zinc-800 dark:text-zinc-200 uppercase">
                            {column.title}
                          </h3>
                          <span className="flex items-center justify-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                            {column.tasks.length}
                          </span>
                        </div>
                        <button
                          onClick={() => openAddTask(column.id)}
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title={`Add task to ${column.title}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Task Cards Container */}
                      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[560px] pr-1 scrollbar-thin">
                        {column.tasks.map((task) => {
                          const pct = Math.round((task.progress.completed / task.progress.total) * 100);

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={() => setSelectedTask(task)}
                              className="group relative rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/80 p-3.5 shadow-sm transition-all cursor-pointer active:cursor-grabbing hover:border-zinc-400 dark:hover:border-zinc-700 hover:-translate-y-0.5"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                    tagColorClasses[task.tag.color] || tagColorClasses.sky
                                  )}
                                >
                                  {task.tag.label}
                                </span>
                                <GripVertical className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors cursor-grab" />
                              </div>

                              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug mb-1 line-clamp-1">
                                {task.title}
                              </h4>

                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                                {task.description}
                              </p>

                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 mb-3 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 w-fit">
                                <GitBranch className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                                <span>{task.branch}</span>
                              </div>

                              <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-mono text-zinc-500 dark:text-zinc-400">
                                      {task.progress.completed}/{task.progress.total} ops
                                    </span>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{pct}%</span>
                                  </div>
                                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        pct === 100 ? "bg-emerald-500" : "bg-indigo-500 dark:bg-indigo-400"
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex -space-x-1.5 items-center">
                                    {Array.from({ length: task.assignees }).map((_, i) => (
                                      <img
                                        key={i}
                                        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${task.id}-${i}`}
                                        alt="Assignee"
                                        className="h-5 w-5 rounded-full border border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-zinc-400" />
                                    {task.dueDate}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {column.tasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-zinc-400 text-xs gap-1.5 opacity-60">
                            <span>Drop tasks here</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Partner Logos */}
        <div className="py-12">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] mb-8">
            Integrated with Modern AI & Data Infrastructure
          </p>
          <PartnerLogos />
        </div>

        {/* 4 Stat Counters */}
        <div
          className={cn(
            "pt-8 pb-16 grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 delay-500 border-t border-border/60",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <StatCounter end={6} suffix="" label="Specialized AI Agents" />
          <StatCounter end={9} suffix="-Stage" label="Automated ML Pipeline" />
          <StatCounter end={10} suffix="x" label="Faster Time-to-Insight" />
          <StatCounter end={100} suffix="%" label="SHAP-Grade Explainability" />
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-base">Assign Autonomous Agent Task</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Train LightGBM & Run SHAP Beeswarm Plot"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Extract top 5 churn attribution vectors via SHAP TreeExplainer"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pipeline Stage
                  </label>
                  <select
                    value={addColId}
                    onChange={(e) => setAddColId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Agent Assigned
                  </label>
                  <select
                    value={newTaskRole}
                    onChange={(e) => setNewTaskRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  >
                    <option value="Data Engineer">Data Engineer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="Explainability">Explainability Agent</option>
                    <option value="Report Agent">Report Agent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="h-3 w-3" />
                  <span>Attach Custom Dataset (Optional .CSV)</span>
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-2.5 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 dark:file:bg-white file:text-white dark:file:text-zinc-950 hover:file:opacity-90 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading} className="flex-1 rounded-xl cursor-pointer">
                  {isUploading ? "Uploading..." : "Deploy to Pipeline"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", tagColorClasses[selectedTask.tag.color] || tagColorClasses.sky)}>
                  {selectedTask.tag.label}
                </span>
                <h3 className="font-bold text-lg leading-snug">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedTask.description}
            </p>

            {/* Live Pipeline Telemetry Mockup */}
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" />
                  {selectedTask.branch}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LangGraph Active
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Pipeline Operations</span>
                  <span className="font-bold">
                    {Math.round((selectedTask.progress.completed / selectedTask.progress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((selectedTask.progress.completed / selectedTask.progress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="text-xs text-destructive hover:underline font-medium px-2 py-1 cursor-pointer"
                >
                  Delete task
                </button>
                <a
                  href={api.getDemoReportPdfUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-muted/70 hover:bg-muted text-foreground transition-colors cursor-pointer"
                  title="Generate & download comprehensive executive PDF report"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>PDF Synthesis</span>
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAdvanceTask(selectedTask.id)}
                  disabled={isTraining}
                  className="rounded-xl cursor-pointer gap-1.5"
                >
                  <span>{isTraining ? "Training..." : "Advance Stage"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
