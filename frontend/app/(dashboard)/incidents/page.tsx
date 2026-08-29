"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Brain,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { getIncidents, analyzeIncident, resolveIncident } from "@/lib/api";
import { Incident } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { CreateIncidentDialog } from "@/components/incidents/CreateIncidentDialog";
import Link from "next/link";

export default function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => getIncidents(0, 200),
    refetchInterval: 15_000,
  });

  const filtered = incidents.filter((i) => {
    const matchSearch =
      !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === "all" || i.severity === severityFilter;
    const matchStat = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchSev && matchStat;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Incidents Workspace</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Showing <span className="text-indigo-400 font-bold">{filtered.length}</span> of {incidents.length} total recorded incidents
          </p>
        </div>

        <button onClick={() => setShowCreate(true)} className="btn-primary self-start sm:self-auto text-xs">
          <Plus size={16} />
          <span>Report New Incident</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, project..."
            className="input-field pl-10 text-sm"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="input-field w-auto text-xs font-medium px-3.5 cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto text-xs font-medium px-3.5 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="spinner" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-14 text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-semibold text-slate-300">No matching incidents found</p>
          <p className="text-xs text-slate-500 mt-1">Try refining your search query or reset the filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              onRefresh={() => qc.invalidateQueries({ queryKey: ["incidents"] })}
            />
          ))}
        </div>
      )}

      <CreateIncidentDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function IncidentRow({
  incident,
  onRefresh,
}: {
  incident: Incident;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const analyzeMut = useMutation({
    mutationFn: () => analyzeIncident(incident.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      onRefresh();
    },
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveIncident(incident.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      onRefresh();
    },
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div
        className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Vertical severity bar */}
          <div
            className="w-1.5 h-12 rounded-full flex-shrink-0 mt-0.5"
            style={{
              background:
                incident.severity === "critical"
                  ? "#ef4444"
                  : incident.severity === "high"
                  ? "#f97316"
                  : incident.severity === "medium"
                  ? "#f59e0b"
                  : "#10b981",
            }}
          />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
              <span className={`badge badge-${incident.status}`}>{incident.status}</span>
              {incident.ai_analysis && (
                <span className="badge bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Brain size={11} /> AI Analyzed
                </span>
              )}
              {incident.postmortem && (
                <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <FileText size={11} /> Post-Mortem
                </span>
              )}
            </div>

            <p className="font-bold text-sm sm:text-base text-white truncate">{incident.title}</p>
            <p className="text-xs text-slate-400">
              {incident.project ? `${incident.project} • ` : ""}
              {incident.department ? `${incident.department} • ` : ""}
              Reported {formatRelativeTime(incident.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
          <Link href={`/incidents/${incident.id}`}>
            <button className="btn-secondary text-xs py-1.5 px-3">View Details</button>
          </Link>

          {incident.status !== "resolved" && (
            <>
              <button
                onClick={() => analyzeMut.mutate()}
                disabled={analyzeMut.isPending}
                title="Trigger LangGraph AI RCA"
                className="btn-secondary text-xs py-1.5 px-3"
              >
                {analyzeMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                <span>{analyzeMut.isPending ? "Analyzing..." : "AI RCA"}</span>
              </button>

              <button
                onClick={() => resolveMut.mutate()}
                disabled={resolveMut.isPending}
                title="Mark Resolved & Generate Post-Mortem"
                className="btn-success text-xs py-1.5 px-3"
              >
                {resolveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                <span>{resolveMut.isPending ? "Resolving..." : "Resolve"}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable AI RCA Drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-indigo-500/15 bg-[#070b14]/90 p-5 space-y-3"
          >
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Sparkles size={14} />
              <span>LANGGRAPH AUTONOMOUS RCA REPORT</span>
            </div>

            {incident.ai_analysis ? (
              <div className="prose-dark text-xs max-h-72 overflow-y-auto pr-2">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300">
                  {incident.ai_analysis}
                </pre>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4 text-xs text-slate-400">
                <div className="spinner" />
                <span>AI analysis is processing in the background...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
