"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  ArrowRight,
  Brain,
  Shield,
  Database,
  Network,
  RefreshCw,
} from "lucide-react";
import { getIncidents } from "@/lib/api";
import { Incident } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { CostTicker } from "@/components/dashboard/CostTicker";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-card p-5 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <Icon size={19} style={{ color }} />
        </div>
        {sub && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color }}
          >
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold tracking-tight text-white mb-0.5">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

function SeverityBar({ incidents }: { incidents: Incident[] }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  incidents.forEach((i) => {
    if (i.status !== "resolved" && i.status !== "closed") {
      counts[i.severity as keyof typeof counts]++;
    }
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
          Active Severity Breakdown
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          {Object.values(counts).reduce((a, b) => a + b, 0)} Active
        </span>
      </div>

      <div className="flex rounded-full overflow-hidden h-3 bg-slate-900 gap-1 p-0.5 border border-slate-800">
        {[
          { key: "critical", color: "#ef4444" },
          { key: "high", color: "#f97316" },
          { key: "medium", color: "#f59e0b" },
          { key: "low", color: "#10b981" },
        ].map(({ key, color }) => (
          <div
            key={key}
            style={{
              width: `${(counts[key as keyof typeof counts] / total) * 100}%`,
              background: color,
              transition: "width 0.4s ease",
            }}
            className="rounded-full h-full"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {[
          { key: "critical", label: "Critical", color: "#ef4444" },
          { key: "high", label: "High", color: "#f97316" },
          { key: "medium", label: "Medium", color: "#f59e0b" },
          { key: "low", label: "Low", color: "#10b981" },
        ].map(({ key, label, color }) => (
          <div
            key={key}
            className="flex items-center justify-between p-2 rounded-lg bg-[#080d19] border border-slate-800"
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-xs font-medium text-slate-300">{label}</span>
            </div>
            <span className="text-xs font-bold font-mono" style={{ color }}>
              {counts[key as keyof typeof counts]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    data: incidents = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => getIncidents(0, 100),
    refetchInterval: 30_000,
  });

  const total = incidents.length;
  const open = incidents.filter((i) => i.status === "open").length;
  const investigating = incidents.filter((i) => i.status === "investigating").length;
  const resolved = incidents.filter((i) => i.status === "resolved").length;
  const critical = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed"
  ).length;

  const recent = [...incidents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Command Center</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time incident intelligence & telemetry —{" "}
            <span className="text-slate-300 font-medium">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="btn-secondary self-start sm:self-auto text-xs py-2 px-3.5"
        >
          <RefreshCw size={13} className={isRefetching ? "animate-spin" : ""} />
          <span>{isRefetching ? "Syncing..." : "Refresh Feed"}</span>
        </button>
      </div>

      {/* Live Financial Cost Ticker */}
      <CostTicker incidents={incidents} />

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Incidents"
          value={total}
          icon={Shield}
          color="#6366f1"
          sub="Indexed"
        />
        <StatCard
          label="Open Issues"
          value={open}
          icon={AlertTriangle}
          color="#f59e0b"
          sub={investigating > 0 ? `+${investigating} analyzing` : "Pending"}
        />
        <StatCard
          label="Resolved"
          value={resolved}
          icon={CheckCircle2}
          color="#10b981"
          sub="Closed"
        />
        <StatCard
          label="Critical Active"
          value={critical}
          icon={Zap}
          color="#ef4444"
          sub={critical > 0 ? "ACTION REQ" : "All Clear"}
        />
      </div>

      {/* Main Grid: Incident Feed + Platform Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Incidents Feed */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-white">Recent Incident Stream</h2>
              <p className="text-xs text-slate-400 mt-0.5">Live diagnostic status from LangGraph workers</p>
            </div>
            <Link
              href="/incidents"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="spinner" />
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-16 bg-[#080d19]/60 rounded-xl border border-slate-800">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400" />
              <p className="font-semibold text-slate-200">No active incidents</p>
              <p className="text-xs text-slate-400 mt-1">All microservices operational.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recent.map((i) => (
                <Link key={i.id} href={`/incidents/${i.id}`} className="block">
                  <motion.div
                    whileHover={{ x: 3 }}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#080d19]/80 border border-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer"
                  >
                    {/* Severity color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          i.status === "resolved"
                            ? "#10b981"
                            : i.severity === "critical"
                            ? "#ef4444"
                            : i.severity === "high"
                            ? "#f97316"
                            : "#f59e0b",
                      }}
                    />

                    {/* Title and metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{i.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {i.project ? `${i.project} • ` : ""}
                        {formatRelativeTime(i.created_at)}
                      </p>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge badge-${i.severity}`}>{i.severity}</span>
                      <span className={`badge badge-${i.status}`}>{i.status}</span>
                      {i.ai_analysis && (
                        <div
                          className="p-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-400"
                          title="AI Root Cause Analyzed"
                        >
                          <Brain size={13} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Severity breakdown + AI Agent Health */}
        <div className="space-y-6">
          <SeverityBar incidents={incidents} />

          {/* AI Platform Status */}
          <div className="glass-card p-5 space-y-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              AI Platform Subsystems
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "LangGraph Agent Core", status: "online", icon: Brain },
                { label: "FAISS Vector Store", status: "online", icon: Database },
                { label: "Groq Cloud LLM Engine", status: "online", icon: Zap },
                { label: "Blast Radius BFS Map", status: "online", icon: Network },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080d19] border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="text-indigo-400" />
                    <span className="text-xs font-medium text-slate-300">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
