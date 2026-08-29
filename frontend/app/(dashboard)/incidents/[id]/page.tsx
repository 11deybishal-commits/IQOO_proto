"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  DollarSign,
  FileText,
  Loader2,
  AlertTriangle,
  Wrench,
  Download,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  getIncident,
  getCostImpact,
  getPostmortem,
  analyzeIncident,
  resolveIncident,
  getSelfHealProposals,
  approveSelfHeal,
} from "@/lib/api";
import { HealingProposal, SelfHealExecuteResponse } from "@/lib/api";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";

// ─── PDF/Text export for post-mortem ─────────────────────────────────────────
function downloadPostmortem(content: string, incidentId: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `postmortem-${incidentId.slice(0, 8)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Risk colours ─────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
};

// ─── Individual Healing Action Card ──────────────────────────────────────────
function HealingCard({
  incidentId,
  proposal,
}: {
  incidentId: string;
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

  const color = RISK_COLORS[proposal.risk] || "#6366f1";

  return (
    <div
      className="p-4 rounded-xl border transition-all"
      style={{
        background: execResult ? "rgba(16,185,129,0.05)" : "rgba(8,13,25,0.6)",
        borderColor: execResult ? "rgba(16,185,129,0.3)" : `${color}25`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: `${color}20`, color }}
          >
            {proposal.priority}
          </div>
          <p className="text-sm font-bold text-white">{proposal.description}</p>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
        >
          {proposal.risk} risk
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-3 ml-7 leading-relaxed">{proposal.rationale}</p>

      <div className="flex items-center gap-3 ml-7 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock size={10} /> ~{proposal.estimated_resolution_time_minutes}m</span>
        <span className="flex items-center gap-1"><Activity size={10} /> {proposal.duration_seconds}s exec</span>
      </div>

      {/* Command preview */}
      <button
        onClick={() => setShowCmd(!showCmd)}
        className="ml-7 flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mb-2"
      >
        <Terminal size={10} />
        {showCmd ? "Hide" : "Preview"} Command
        {showCmd ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      <AnimatePresence>
        {showCmd && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-7 mb-3 p-2.5 rounded-lg bg-[#050a12] border border-indigo-500/20 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap"
          >
            $ {proposal.command_preview}
          </motion.pre>
        )}
      </AnimatePresence>

      {/* Approve / Execute */}
      {!execResult && (
        <div className="ml-7">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8" }}
            >
              <ShieldCheck size={12} /> Approve & Execute
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-semibold">Confirm?</span>
              <button
                onClick={() => approveMut.mutate()}
                disabled={approveMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              >
                {approveMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                {approveMut.isPending ? "Running..." : "Yes, Execute"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400"
              >
                Cancel
              </button>
            </div>
          )}
          {approveMut.isError && (
            <p className="text-xs text-red-400 mt-1">{(approveMut.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Execution log */}
      {execResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-xl overflow-hidden border border-emerald-500/30 bg-[#050a12]"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400">Executed Successfully</span>
          </div>
          <pre className="p-3 text-[10px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
            {execResult.log}
          </pre>
        </motion.div>
      )}
    </div>
  );
}

// ─── Self-Healing Panel ───────────────────────────────────────────────────────
function SelfHealPanel({ incidentId }: { incidentId: string }) {
  const [active, setActive] = useState(false);

  const { data: proposals, isLoading, error, refetch } = useQuery({
    queryKey: ["self-heal", incidentId],
    queryFn: () => getSelfHealProposals(incidentId),
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30">
            <Wrench size={15} className="text-violet-400" />
          </div>
          <h2 className="font-bold text-sm text-white">Autonomous Self-Healing</h2>
        </div>
        <button
          onClick={() => { setActive(true); if (active) refetch(); }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {active ? (isLoading ? "Generating..." : "Refresh Proposals") : "Generate AI Proposals"}
        </button>
      </div>

      {!active && (
        <p className="text-xs text-slate-400 leading-relaxed">
          Click above to have the AI analyze this incident and propose targeted remediation actions.
          All actions require your approval before execution.
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 size={18} className="animate-spin text-violet-400" />
          <span className="text-sm text-slate-400">AI generating healing proposals...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs py-2">
          <AlertTriangle size={14} />
          <span>{(error as Error).message}</span>
        </div>
      )}

      {proposals && proposals.proposals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold">
            <Wrench size={12} />
            <span>AI HEALING PROPOSALS — SORTED BY PRIORITY</span>
          </div>
          {proposals.proposals
            .sort((a, b) => a.priority - b.priority)
            .map((p) => (
              <HealingCard key={p.action_key} incidentId={incidentId} proposal={p} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
    refetchInterval: 10_000,
  });

  const { data: cost } = useQuery({
    queryKey: ["cost", id],
    queryFn: () => getCostImpact(id),
    enabled: !!incident,
    refetchInterval: 15_000,
  });

  const { data: pm } = useQuery({
    queryKey: ["postmortem", id],
    queryFn: () => getPostmortem(id),
    enabled: incident?.status === "resolved",
    retry: false,
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeIncident(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident", id] }),
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveIncident(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident", id] }),
  });

  if (isLoading || !incident) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Title Bar */}
      <div className="space-y-3">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Incidents Workspace</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
              <span className={`badge badge-${incident.status}`}>{incident.status}</span>
              <span className="text-xs text-slate-400 font-mono">ID: {incident.id.slice(0, 8)}...</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{incident.title}</h1>
            <p className="text-xs text-slate-400">
              {incident.project ? `${incident.project} • ` : ""}
              {incident.department ? `${incident.department} • ` : ""}
              Reported {formatRelativeTime(incident.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
            {incident.status !== "resolved" && (
              <>
                <button
                  onClick={() => analyzeMut.mutate()}
                  disabled={analyzeMut.isPending}
                  className="btn-secondary text-xs"
                >
                  {analyzeMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                  <span>{analyzeMut.isPending ? "Analyzing..." : "Re-trigger AI RCA"}</span>
                </button>

                <button
                  onClick={() => resolveMut.mutate()}
                  disabled={resolveMut.isPending}
                  className="btn-success text-xs"
                >
                  {resolveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>{resolveMut.isPending ? "Generating Post-Mortem..." : "Resolve Incident"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Description */}
          {incident.description && (
            <div className="glass-card p-6 space-y-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">Incident Description</h2>
              <p className="text-sm text-slate-200 leading-relaxed">{incident.description}</p>
            </div>
          )}

          {/* AI Root Cause Analysis */}
          <div className="glass-card p-6 space-y-3.5">
            <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Brain size={16} />
                </div>
                <h2 className="font-bold text-sm text-white">LangGraph Autonomous RCA Report</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                Verified Engine
              </span>
            </div>

            {incident.ai_analysis ? (
              <div className="prose-dark text-xs bg-[#070b14]/90 p-4 rounded-xl border border-slate-800">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                  {incident.ai_analysis}
                </pre>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-8 text-xs text-slate-400 justify-center bg-[#070b14]/50 rounded-xl">
                <div className="spinner" />
                <span>Autonomous diagnostic pipeline in progress...</span>
              </div>
            )}
          </div>

          {/* Self-Healing Section (Feature #1) */}
          {incident.status !== "resolved" && (
            <SelfHealPanel incidentId={incident.id} />
          )}

          {/* Blameless Post-Mortem */}
          {pm && (
            <div className="glass-card p-6 space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <FileText size={16} />
                  </div>
                  <h2 className="font-bold text-sm text-white">Blameless Post-Mortem Report</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Generated
                  </span>
                  <button
                    onClick={() => downloadPostmortem(pm.postmortem, incident.id)}
                    title="Download as Markdown"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <Download size={12} />
                    Export .md
                  </button>
                </div>
              </div>

              <div className="prose-dark text-xs bg-[#070b14]/90 p-4 rounded-xl border border-slate-800">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed">
                  {pm.postmortem}
                </pre>
              </div>
            </div>
          )}

          {incident.status === "resolved" && !pm && (
            <div className="glass-card p-8 text-center space-y-2 border-dashed border-emerald-500/30">
              <Loader2 size={24} className="animate-spin mx-auto text-emerald-400" />
              <p className="text-sm font-semibold text-slate-300">Generating Blameless Post-Mortem via Groq...</p>
              <p className="text-xs text-slate-500">Document will appear automatically upon completion.</p>
            </div>
          )}
        </div>

        {/* Sidebar: Financial Loss & Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Revenue Impact Card */}
          {cost && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 space-y-4 border-red-500/30 bg-gradient-to-b from-red-950/25 to-slate-900/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-red-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-red-400">Live Financial Exposure</h3>
                </div>
                <span className="badge badge-critical text-[10px]">{cost.severity_multiplier}× Multiplier</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080d19] border border-red-500/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accrued Estimated Loss</p>
                <p className="text-3xl font-black font-mono text-red-400 mt-1">
                  {formatCurrency(cost.total_estimated_loss)}
                </p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-800">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Duration</span>
                  <span className="font-bold text-slate-200 font-mono">{cost.duration_minutes.toFixed(1)} mins</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Base Cost Rate</span>
                  <span className="font-bold text-slate-200 font-mono">{formatCurrency(cost.cost_per_minute)}/min</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Severity Factor</span>
                  <span className="font-bold text-amber-400 font-mono">{cost.severity_multiplier}× Base</span>
                </div>
              </div>

              {cost.affected_services.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Impacted Microservices</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cost.affected_services.map((s) => (
                      <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Timeline Card */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">Incident Event Timeline</h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                  <AlertTriangle size={11} />
                </div>
                <div>
                  <p className="font-bold text-slate-200">Incident Created</p>
                  <p className="text-[11px] text-slate-400">{new Date(incident.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {incident.ai_analysis && (
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                    <Brain size={11} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">AI RCA Completed</p>
                    <p className="text-[11px] text-slate-400">Diagnosis emitted by LangGraph</p>
                  </div>
                </div>
              )}

              {incident.resolved_at && (
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                    <CheckCircle size={11} />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-400">Resolved</p>
                    <p className="text-[11px] text-slate-400">{new Date(incident.resolved_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
