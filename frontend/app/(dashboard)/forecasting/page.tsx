"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Activity,
  Zap,
  Shield,
  Info,
} from "lucide-react";
import { getForecast } from "@/lib/api";
import { RiskScore, PreIncidentAlert } from "@/lib/api";

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", label: "Low Risk" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "Medium Risk" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", label: "High Risk" },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Critical" },
};

function RiskGauge({ score, level }: { score: number; level: string }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.low;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          stroke={cfg.color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black font-mono" style={{ color: cfg.color }}>{score}</span>
        <span className="text-[9px] font-bold text-slate-500 uppercase">/ 100</span>
      </div>
    </div>
  );
}

function RiskCard({ risk }: { risk: RiskScore }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RISK_CONFIG[risk.risk_level] || RISK_CONFIG.low;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="glass-card p-5 cursor-pointer"
      style={{ borderColor: risk.risk_score >= 50 ? cfg.border : undefined }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4">
        <RiskGauge score={risk.risk_score} level={risk.risk_level} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {cfg.label}
            </span>
            <span className="text-[11px] font-mono text-slate-500">~{risk.predicted_window}</span>
          </div>
          <p className="font-bold text-sm text-white truncate">{risk.service}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{risk.reason}</p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-1"
          >
            <p><span className="font-bold text-slate-400">Risk Score:</span> {risk.risk_score}/100</p>
            <p><span className="font-bold text-slate-400">Predicted Window:</span> {risk.predicted_window}</p>
            <p><span className="font-bold text-slate-400">Analysis:</span> {risk.reason}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlertCard({ alert }: { alert: PreIncidentAlert }) {
  const isCritical = alert.severity === "critical";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl border"
      style={{
        background: isCritical ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
        borderColor: isCritical ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)",
      }}
    >
      <div
        className="p-1.5 rounded-lg flex-shrink-0"
        style={{ background: isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)" }}
      >
        {isCritical ? (
          <AlertTriangle size={14} className="text-red-400" />
        ) : (
          <AlertCircle size={14} className="text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-bold text-white">{alert.title}</p>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              color: isCritical ? "#ef4444" : "#f59e0b",
            }}
          >
            {alert.severity}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
        <p className="text-[11px] text-slate-500 mt-1">Service: {alert.service}</p>
      </div>
    </motion.div>
  );
}

// Simple horizontal bar chart
function RiskBarChart({ risks }: { risks: RiskScore[] }) {
  const sorted = [...risks].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
  const max = Math.max(...sorted.map((r) => r.risk_score), 1);

  return (
    <div className="glass-card p-5 space-y-3">
      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Risk Score Distribution</h3>
      <div className="space-y-2.5">
        {sorted.map((r) => {
          const cfg = RISK_CONFIG[r.risk_level] || RISK_CONFIG.low;
          return (
            <div key={r.service} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300 truncate max-w-[180px]">{r.service}</span>
                <span className="font-bold font-mono" style={{ color: cfg.color }}>{r.risk_score}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.color, width: `${(r.risk_score / max) * 100}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.risk_score / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ForecastingPage() {
  const {
    data: forecast,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["forecast"],
    queryFn: getForecast,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const criticalCount = forecast?.risk_scores.filter((r) => r.risk_level === "critical").length || 0;
  const highCount = forecast?.risk_scores.filter((r) => r.risk_level === "high").length || 0;
  const avgRisk = forecast?.risk_scores.length
    ? Math.round(forecast.risk_scores.reduce((a, b) => a + b.risk_score, 0) / forecast.risk_scores.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30">
              <TrendingUp size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Predictive Forecasting</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-powered time-series anomaly detection — predict failures before they impact customers.
              </p>
            </div>
          </div>
          {forecast && (
            <p className="text-xs text-slate-500 ml-11">
              Analyzed {forecast.total_incidents_analyzed} incidents ·{" "}
              {forecast.incidents_last_24h} in last 24h ·{" "}
              Last updated: {new Date(forecast.generated_at).toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="btn-secondary self-start text-xs py-2 px-3.5"
        >
          {isRefetching ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {isRefetching ? "Analyzing..." : "Run Forecast"}
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/8 border border-violet-500/20">
        <Info size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-violet-400">How it works:</span> The engine analyzes incident frequency,
          severity trends, and unresolved durations from the last 7 days. An LLM then identifies pre-incident signals
          and assigns risk scores per service — shifting the paradigm from reactive to predictive.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <p className="text-sm text-slate-400">AI is analyzing incident patterns...</p>
          </div>
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center space-y-3">
          <AlertTriangle size={36} className="mx-auto text-red-400" />
          <p className="text-sm text-red-400 font-bold">Forecast failed</p>
          <p className="text-xs text-slate-500">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="btn-secondary text-xs mx-auto">Retry</button>
        </div>
      ) : forecast ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Avg Risk Score", value: `${avgRisk}`, icon: Activity, color: "#6366f1", sub: "/100" },
              { label: "Critical Services", value: criticalCount, icon: Zap, color: "#ef4444", sub: "at risk" },
              { label: "High Risk", value: highCount, icon: AlertTriangle, color: "#f97316", sub: "elevated" },
              { label: "Pre-Incident Alerts", value: forecast.pre_incident_alerts.length, icon: Shield, color: "#8b5cf6", sub: "active" },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <motion.div key={label} whileHover={{ y: -2 }} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black font-mono text-white">{value}</p>
                  <span className="text-xs text-slate-500">{sub}</span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Pre-Incident Alerts */}
          {forecast.pre_incident_alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Pre-Incident Signals ({forecast.pre_incident_alerts.length})
              </h2>
              {forecast.pre_incident_alerts.map((alert, i) => (
                <AlertCard key={i} alert={alert} />
              ))}
            </div>
          )}

          {/* Risk Cards + Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Service Risk Profiles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {forecast.risk_scores.map((r, i) => (
                  <RiskCard key={i} risk={r} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <RiskBarChart risks={forecast.risk_scores} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
