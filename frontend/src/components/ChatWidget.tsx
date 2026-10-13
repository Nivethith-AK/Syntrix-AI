import React, { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Copy, Check, X, RotateCcw, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
  typing?: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "ai",
    content: `👋 Hi! I'm the **Syntrix AI Supervisor Agent**, your autonomous data intelligence co-pilot. I coordinate specialized agents for data engineering, ML modeling, SHAP explainability, and executive reporting.\n\nWhat data intelligence goal would you like to execute today?`,
    timestamp: new Date(Date.now() - 120000),
  },
];

const promptSuggestions = [
  "Predict customer churn risk",
  "Run 9-stage ML pipeline",
  "Generate SHAP explainability report",
  "Connect PostgreSQL via Database MCP",
];

const cannedResponses = {
  default: `I've parsed your objective with the Supervisor Agent. Here is the recommended execution plan:\n\n1. Ingest dataset via **File/Database MCP**\n2. Run automated validation & feature synthesis\n3. Train baseline and tuned ensemble models\n4. Compute SHAP explainability & self-critique metrics\n5. Output board-ready executive summary\n\nShall I trigger the multi-agent workflow now?`,
  churn: `**Goal Initiated:** Customer Churn Prediction\n\n✓ **Supervisor Agent:** Delegated tasks across 4 agents\n✓ **Data Eng Agent:** Cleaned 48,200 records (0 nulls remaining)\n✓ **ML Agent:** Trained LightGBM & XGBoost (ROC-AUC: **0.941**)\n✓ **Explainability Agent:** Extracted top churn drivers:\n  • \`contract_type = month-to-month\` (+0.38 SHAP)\n  • \`monthly_charges > $85\` (+0.24 SHAP)\n  • \`support_tickets > 3\` (+0.19 SHAP)\n\nExecutive report & MLflow run **#run-8492** ready. Shall I export the PDF synthesis?`,
  pipeline: `**Executing 9-Stage Machine Learning Pipeline...**\n\n1. 🗄️ Ingestion: CSV/Parquet ingested via File MCP\n2. 🔍 Validation: Schema verified (24 features, 0 drift)\n3. 🧹 Cleaning: Outliers clipped, standard scaling applied\n4. ⚙️ Feature Eng: Polynomial interactions generated\n5. 🧠 Model Training: Gradient Boosting vs Random Forest\n6. 📊 Evaluation: F1-Score: **0.912**, Log-Loss: **0.18**\n7. 💡 Explainability: SHAP summary beeswarm plot computed\n8. 🎯 Predictions: Scored 10,000 live entities\n9. 📄 Reporting: Board-level PDF generated\n\nAll 9 stages passed verification!`,
  explainability: `**Explainability Agent Analysis (SHAP & LIME)**\n\n• **Global Feature Importance:** Top 3 features account for 68% of model variance.\n• **Local Attribution:** Inspected high-risk sample \`ID-83921\` (Risk score: **89.4%**)\n  - Negative tenure: **-12 months** (+41% risk)\n  - Payment delays: **2 cycles** (+28% risk)\n• **Evidence Critique:** Confidence interval 95% [0.86, 0.92]. No algorithmic demographic bias detected.\n\nWould you like the full interactive waterfall plot?`,
  mcp: `**Database MCP Connector Status:**\n\n✓ Connected: \`postgresql://db.enterprise.internal:5432/analytics\`\n✓ Schema indexed: **14 tables**, **182 columns** detected\n✓ pgvector extension: **v0.7.0 active** (1536-dim embeddings)\n✓ Row-Level Security: Active & enforced\n\nReady to stream live transactional tables into the Data Engineering Agent.`,
};

function getBotResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("churn") || q.includes("customer") || q.includes("retention")) return cannedResponses.churn;
  if (q.includes("pipeline") || q.includes("9-stage") || q.includes("train") || q.includes("ml") || q.includes("model")) return cannedResponses.pipeline;
  if (q.includes("explain") || q.includes("shap") || q.includes("lime") || q.includes("interpret") || q.includes("report")) return cannedResponses.explainability;
  if (q.includes("mcp") || q.includes("database") || q.includes("postgres") || q.includes("sql") || q.includes("connect")) return cannedResponses.mcp;
  return cannedResponses.default;
}

const FormatMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  return (
    <span>
      {lines.map((line, lIdx) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {parts.map((part, pIdx) =>
              pIdx % 2 === 1 ? (
                <strong key={pIdx} className="font-semibold text-foreground">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const typingMsg: ChatMessage = {
      id: "typing",
      role: "ai",
      content: "",
      timestamp: new Date(),
      typing: true,
    };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setInputVal("");
    setIsTyping(true);

    try {
      const res = await api.sendDemoChat(trimmed);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "typing"),
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: res.reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      const reply = getBotResponse(trimmed);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "typing"),
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      if (!isOpen) setUnreadCount((c) => c + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputVal);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleReset = () => {
    setMessages(initialMessages);
    setInputVal("");
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center p-0 cursor-pointer"
          aria-label="Open Syntrix AI Chat"
        >
          <Bot className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex flex-col w-[92vw] max-w-[390px] rounded-3xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out font-primarylw",
            isMinimized ? "h-[64px]" : "h-[620px] max-h-[85vh]"
          )}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Syntrix AI
                  <span className="px-1.5 py-0.2 rounded bg-foreground/10 text-[9px] font-semibold text-foreground">
                    Agent
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">Online · Multi-Agent Orchestrator</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.map((msg) => {
                  const isAI = msg.role === "ai";
                  const time = msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "group flex gap-2.5",
                        isAI ? "items-start" : "items-start flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5 shadow-sm",
                          isAI
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                            : "bg-muted text-foreground border border-border"
                        )}
                      >
                        {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      </div>

                      <div className={cn("relative max-w-[84%]", !isAI && "items-end flex flex-col")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm",
                            isAI
                              ? "bg-muted/80 text-foreground rounded-tl-xs border border-border/70"
                              : "bg-foreground text-background rounded-tr-xs font-medium"
                          )}
                        >
                          {msg.typing ? (
                            <div className="flex items-center gap-1.5 py-1 px-1">
                              {[0, 1, 2].map((dot) => (
                                <span
                                  key={dot}
                                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                                  style={{ animationDelay: `${dot * 0.15}s`, animationDuration: "0.8s" }}
                                />
                              ))}
                            </div>
                          ) : (
                            <FormatMessage content={msg.content} />
                          )}
                        </div>

                        {!msg.typing && (
                          <div
                            className={cn(
                              "flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity",
                              isAI ? "flex-row" : "flex-row-reverse"
                            )}
                          >
                            <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
                            {isAI && (
                              <button
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Copy response"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Suggestions */}
              <div className="px-3 py-2 border-t border-border/50 flex gap-1.5 overflow-x-auto bg-muted/20">
                {promptSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border border-border focus-within:border-foreground/40 transition-colors">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Syntrix AI or give a prompt..."
                    className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-24 py-1 px-1.5"
                  />
                  <button
                    onClick={() => handleSend(inputVal)}
                    disabled={!inputVal.trim() || isTyping}
                    className="h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-30 transition-opacity cursor-pointer shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground/70 text-center pt-2">
                  Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">⏎</kbd> to send ·{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">⇧⏎</kbd> for new line
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
