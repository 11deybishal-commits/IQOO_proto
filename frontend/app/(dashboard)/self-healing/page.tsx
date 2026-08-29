"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
} from "lucide-react";
import { getIncidents, getSelfHealProposals, approveSelfHeal } from "@/lib/api";
import { HealingProposal, SelfHealExecuteResponse } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
};

function RiskBadge({ risk }: { risk: string }) {
  const color = RISK_COLORS[risk] || "#94a3b8";
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {risk} risk
    </span>
  );
}

function ExecutionLog({ result }: { result: SelfHealExecuteResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 rounded-xl overflow-hidden border border-emerald-500/30 bg-[#050a12]"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
        <CheckCircle2 size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-emerald-400">Execution Successful</span>
      </div>
      <pre className="p-4 text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-64">
        {result.log}
      </pre>
    </motion.div>
  );
}

function HealingCard({
  incidentId,
  incidentTitle,
  proposal,
}: {
  incidentId: string;
  incidentTitle: string;
  proposal: HealingProposal;
}) {
  const [showCmd, setShowCmd] = useState(false);
  const [execResult, setExecResult] = useState<SelfHealExecuteResponse | null>(null);
  const [confirming, setConfirming] = useState(false);

  const approveMut = useMutation({
    mutationFn: () => approveSelfHeal(incidentId, proposal.action_key),
    onSuccess: (data) => {
      setExecResult(data);
      setConfirming(false);
    },
    onError: () => setConfirming(false),
  });

  return (
    <div
      className="p-4 rounded-xl border transition-all"
      style={{
        background: "rgba(8, 13, 25, 0.6)",
        borderColor: execResult
          ? "rgba(16,185,129,0.3)"
          : `${RISK_COLORS[proposal.risk] || "#6366f1"}25`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${RISK_COLORS[proposal.risk] || "#6366f1"}20`, color: RISK_COLORS[proposal.risk] || "#6366f1" }}
          >
            {proposal.priority}
          </div>
          <p className="text-sm font-bold text-white truncate">{proposal.description}</p>
        </div>
        <RiskBadge risk={proposal.risk} />
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed ml-8">{proposal.rationale}</p>

      <div className="flex items-center gap-3 ml-8 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={11} /> ~{proposal.estimated_resolution_time_minutes}m to resolve
        </span>
        <span className="flex items-center gap-1">
          <Activity size={11} /> {proposal.duration_seconds}s execution
        </span>
      </div>

      {/* Command preview toggle */}
      <button
        onClick={() => setShowCmd(!showCmd)}
        className="ml-8 flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mb-2"
      >
        <Terminal size={11} />
        {showCmd ? "Hide" : "Preview"} Command
        {showCmd ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      <AnimatePresence>
        {showCmd && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-8 mb-3 p-2.5 rounded-lg bg-[#050a12] border border-indigo-500/20 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap overflow-x-auto"
          >
            $ {proposal.command_preview}
          </motion.pre>
        )}
      </AnimatePresence>

      {/* Approve button */}
      {!execResult && (
        <div className="ml-8">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={approveMut.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.4)",
                color: "#818cf8",
              }}
            >
              <ShieldCheck size={13} />
              Approve & Execute
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-amber-400 font-semibold">Confirm execution?</p>
              <button
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all"
              >
                {approveMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {approveMut.isPending ? "Executing..." : "Yes, Execute"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          {approveMut.isError && (
            <p className="text-xs text-red-400 mt-1.5">
              {(approveMut.error as Error).message}
            </p>
          )}
        </div>
      )}

      {execResult && <ExecutionLog result={execResult} />}
    </div>
  );
}

function IncidentHealingPanel({
  incident,
}: {
  incident: { id: string; title: string; severity: string; status: string; created_at: string; project: string | null };
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: proposals, isLoading, error, refetch } = useQuery({
    queryKey: ["self-heal", incident.id],
    queryFn: () => getSelfHealProposals(incident.id),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-1.5 h-12 rounded-full flex-shrink-0"
            style={{
              background:
                incident.severity === "critical" ? "#ef4444"
                : incident.severity === "high" ? "#f97316"
                : incident.severity === "medium" ? "#f59e0b"
                : "#10b981",
            }}
          />
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
              <span className={`badge badge-${incident.status}`}>{incident.status}</span>
            </div>
            <p className="font-bold text-sm text-white">{incident.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {incident.project ? `${incident.project} · ` : ""}
              {formatRelativeTime(incident.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); if (!expanded) setExpanded(true); else refetch(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8",
            }}
          >
            <Zap size={13} />
            {expanded ? "Refresh Proposals" : "Generate Proposals"}
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-indigo-500/15 bg-[#070b14]/90 p-5"
          >
            {isLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 size={18} className="animate-spin text-indigo-400" />
                <span className="text-sm text-slate-400">AI is generating healing proposals...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-400 text-sm py-4">
                <AlertTriangle size={16} />
                <span>Failed to generate proposals: {(error as Error).message}</span>
              </div>
            ) : proposals && proposals.proposals.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-3">
                  <Wrench size={13} />
                  <span>AI HEALING PROPOSALS — SORTED BY PRIORITY</span>
                </div>
                {proposals.proposals
                  .sort((a, b) => a.priority - b.priority)
                  .map((p) => (
                    <HealingCard
                      key={p.action_key}
                      incidentId={incident.id}
                      incidentTitle={incident.title}
                      proposal={p}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No proposals available.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SelfHealingPage() {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => getIncidents(0, 200),
    refetchInterval: 30_000,
  });

  const active = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed");
  const sorted = [...active].sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 };
    return (sev[b.severity as keyof typeof sev] || 0) - (sev[a.severity as keyof typeof sev] || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
            <Wrench size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Autonomous Self-Healing</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              AI proposes targeted remediation actions. A human must approve before execution — zero-touch with full co-pilot control.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/8 border border-indigo-500/20 mt-4">
          <ShieldCheck size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-indigo-400">Human-in-the-loop:</span> Every action requires explicit approval.
            Commands are previewed before execution. Actions simulate real kubectl/AWS/Vercel CLI operations.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Incidents", value: active.length, color: "#f59e0b" },
          { label: "Critical", value: active.filter(i => i.severity === "critical").length, color: "#ef4444" },
          { label: "High Priority", value: active.filter(i => i.severity === "high").length, color: "#f97316" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="spinner" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-3">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
          <p className="font-bold text-slate-200 text-lg">All Systems Healthy</p>
          <p className="text-sm text-slate-400">No active incidents requiring self-healing actions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((incident) => (
            <IncidentHealingPanel
              key={incident.id}
              incident={incident}
            />
          ))}
        </div>
      )}
    </div>
  );
}
