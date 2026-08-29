"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Database,
  Network,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import { sendChatOpsMessage } from "@/lib/api";
import { ChatOpsMessage, ChatOpsResponse } from "@/lib/api";

const SUGGESTED_QUERIES = [
  "What is the current status of all critical incidents?",
  "Which service has the highest blast radius risk right now?",
  "Show me all incidents from the last 24 hours",
  "Are there any memory leak patterns in recent incidents?",
  "What are the top 3 unresolved incidents by severity?",
  "Analyze the cascade risk for the API Gateway going down",
];

const AGENT_ICONS: Record<string, React.ElementType> = {
  "DBA Agent": Database,
  "Network Agent": Network,
  "Supervisor": Brain,
};

const AGENT_COLORS: Record<string, string> = {
  "DBA Agent": "#06b6d4",
  "Network Agent": "#10b981",
  "Supervisor": "#6366f1",
};

interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatOpsResponse;
  timestamp: Date;
}

function AgentResponsePanel({ response }: { response: ChatOpsResponse }) {
  const [showSubagents, setShowSubagents] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main Supervisor Response */}
      <div
        className="p-4 rounded-xl text-sm text-slate-200 leading-relaxed"
        style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}
        dangerouslySetInnerHTML={{
          __html: response.supervisor_response
            .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>")
            .replace(/^## (.*?)$/gm, "<h3 class='font-bold text-indigo-300 mt-3 mb-1 text-sm'>$1</h3>")
            .replace(/^- (.*?)$/gm, "<li class='ml-4 text-slate-300'>• $1</li>")
            .replace(/\n/g, "<br/>"),
        }}
      />

      {/* Sub-agent outputs toggle */}
      <button
        onClick={() => setShowSubagents(!showSubagents)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Sparkles size={11} className="text-indigo-400" />
        {showSubagents ? "Hide" : "Show"} sub-agent analysis ({response.agents_consulted.length - 1} agents)
        {showSubagents ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      <AnimatePresence>
        {showSubagents && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {[
              { key: "DBA Agent", content: response.dba_agent_response },
              { key: "Network Agent", content: response.network_agent_response },
            ].map(({ key, content }) => {
              const Icon = AGENT_ICONS[key] || Bot;
              const color = AGENT_COLORS[key] || "#6366f1";
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl text-xs text-slate-300 leading-relaxed"
                  style={{ background: `${color}08`, border: `1px solid ${color}25` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 rounded-lg" style={{ background: `${color}20` }}>
                      <Icon size={11} style={{ color }} />
                    </div>
                    <span className="font-bold text-[11px]" style={{ color }}>{key}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{content}</p>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ entry }: { entry: ConversationEntry }) {
  const isUser = entry.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isUser
            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
            : "rgba(99,102,241,0.15)",
          border: isUser ? "none" : "1px solid rgba(99,102,241,0.3)",
        }}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Brain size={14} className="text-indigo-400" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {isUser ? "You" : "SentinelOps Command"} · {entry.timestamp.toLocaleTimeString()}
        </span>

        {isUser ? (
          <div
            className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            {entry.content}
          </div>
        ) : entry.response ? (
          <div
            className="rounded-2xl rounded-tl-sm p-4 w-full"
            style={{ background: "rgba(8,13,25,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            {/* Agent attribution */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-500/15">
              {entry.response.agents_consulted.map((agent) => {
                const Icon = AGENT_ICONS[agent.split(" ").slice(0, 2).join(" ")] || Bot;
                const color = AGENT_COLORS[agent.split(" ").slice(0, 2).join(" ")] || "#6366f1";
                return (
                  <div
                    key={agent}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                  >
                    <Icon size={9} />
                    {agent}
                  </div>
                );
              })}
            </div>
            <AgentResponsePanel response={entry.response} />
          </div>
        ) : (
          <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span>Multi-agent swarm processing...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatOpsPage() {
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = async (query?: string) => {
    const text = (query || input).trim();
    if (!text || isProcessing) return;

    setInput("");

    const userEntry: ConversationEntry = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const assistantEntry: ConversationEntry = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setConversation((prev) => [...prev, userEntry, assistantEntry]);
    setIsProcessing(true);

    // Build history for context
    const history: ChatOpsMessage[] = conversation.slice(-8).map((e) => ({
      role: e.role,
      content: e.role === "assistant" && e.response
        ? e.response.supervisor_response
        : e.content,
    }));
    history.push({ role: "user", content: text });

    try {
      const response = await sendChatOpsMessage(text, history);
      setConversation((prev) =>
        prev.map((e) =>
          e.id === assistantEntry.id
            ? { ...e, response, content: response.supervisor_response }
            : e
        )
      );
    } catch (err) {
      setConversation((prev) =>
        prev.map((e) =>
          e.id === assistantEntry.id
            ? {
                ...e,
                response: {
                  query: text,
                  dba_agent_response: "",
                  network_agent_response: "",
                  supervisor_response: `⚠️ Error: ${(err as Error).message}`,
                  agents_consulted: ["Supervisor"],
                },
                content: `Error: ${(err as Error).message}`,
              }
            : e
        )
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
            <MessageSquare size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">ChatOps Command Center</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-agent swarm: DBA · Network · Supervisor synthesizing real-time intelligence.
            </p>
          </div>
        </div>
      </div>

      {/* Agent status badges */}
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        {[
          { name: "DBA Agent", icon: Database, color: "#06b6d4", desc: "Incident DB & Runbooks" },
          { name: "Network Agent", icon: Network, color: "#10b981", desc: "Topology & VPC Flows" },
          { name: "Supervisor", icon: Brain, color: "#6366f1", desc: "Synthesis & Command" },
        ].map(({ name, icon: Icon, color, desc }) => (
          <div
            key={name}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <Icon size={12} />
            {name}
            <span className="text-slate-500 font-normal">· {desc}</span>
          </div>
        ))}
      </div>

      {/* Conversation Area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1">
        {conversation.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center space-y-6 py-8"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <MessageSquare size={28} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-lg mb-1">SentinelOps Multi-Agent Swarm</p>
              <p className="text-sm text-slate-400 max-w-sm">
                Ask anything about your incidents, topology, or infrastructure. Three specialist AI agents will collaborate to answer.
              </p>
            </div>

            {/* Suggested queries */}
            <div className="w-full max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info size={13} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Try asking...</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-left p-3 rounded-xl text-xs text-slate-300 transition-all hover:text-white"
                    style={{
                      background: "rgba(99,102,241,0.06)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          conversation.map((entry) => (
            <MessageBubble key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div
        className="flex-shrink-0 rounded-2xl p-3 backdrop-blur-xl"
        style={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(99,102,241,0.25)" }}
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SentinelOps anything… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={isProcessing}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none leading-relaxed"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:
                !input.trim() || isProcessing
                  ? "rgba(99,102,241,0.1)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow:
                !input.trim() || isProcessing
                  ? "none"
                  : "0 0 20px rgba(99,102,241,0.4)",
            }}
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin text-indigo-400" />
            ) : (
              <Send size={16} className={!input.trim() ? "text-slate-600" : "text-white"} />
            )}
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-indigo-500/15">
            <div className="flex gap-1">
              {["DBA Agent", "Network Agent", "Supervisor"].map((agent, i) => (
                <motion.span
                  key={agent}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${AGENT_COLORS[agent]}15`, color: AGENT_COLORS[agent] }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }}
                >
                  {agent}
                </motion.span>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">collaborating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
