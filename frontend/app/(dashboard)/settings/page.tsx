"use client";

import { useAuth } from "@/lib/auth-context";
import { User, Shield, Plug, Brain, Zap, Database, Network, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Configuration</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Identity authentication, AI inference parameters, and integration telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-400" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-300">Active SRE Profile</h2>
          </div>

          <div className="text-center space-y-2">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {(user?.full_name || user?.email || "U")[0].toUpperCase()}
            </div>
            <p className="font-extrabold text-base text-white">{user?.full_name || "Lead SRE Engineer"}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle size={12} /> Active / Verified
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Role Authority</span>
              <span className="font-semibold text-indigo-300">Command Operator</span>
            </div>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-indigo-400" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-300">Security Benchmarks</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: "JWT Token Authentication", detail: "HS256 with 8-day expiration", ok: true },
              { label: "Bcrypt Hash & Salt", detail: "Multi-round password security", ok: true },
              { label: "Strict CORS Whitelist", detail: "Explicit frontend origins", ok: true },
              { label: "RBAC Access Guards", detail: "FastAPI Depends security model", ok: true },
            ].map(({ label, detail }) => (
              <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#080d19] border border-slate-800">
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-200">{label}</p>
                  <p className="text-[11px] text-slate-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Statuses */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plug size={16} className="text-indigo-400" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-300">Subsystem Integrations</h2>
          </div>

          <div className="space-y-3">
            {[
              { name: "Groq Cloud LLM", detail: "Qwen 3.6 27B Reasoning", icon: Zap, color: "#10b981" },
              { name: "Groq Whisper Audio", detail: "Large v3 Turbo Transcribe", icon: Brain, color: "#10b981" },
              { name: "FAISS Dense Index", detail: "MiniLM Embeddings", icon: Database, color: "#10b981" },
              { name: "ChatOps Dispatch", detail: "Slack & PagerDuty Webhooks", icon: Network, color: "#f59e0b" },
            ].map(({ name, detail, icon: Icon, color }) => (
              <div key={name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#080d19] border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{name}</p>
                    <p className="text-[10px] text-slate-400">{detail}</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                >
                  {color === "#10b981" ? "Connected" : "Planned"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Specifications */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain size={17} className="text-indigo-400" />
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-300">AI Model Specifications</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: "Reasoning LLM", value: "qwen/qwen3.6-27b" },
            { label: "Voice STT Model", value: "whisper-large-v3-turbo" },
            { label: "Vector Embeddings", value: "all-MiniLM-L6-v2" },
            { label: "Max Token Window", value: "4,096 tokens" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3.5 rounded-xl bg-[#080d19] border border-indigo-500/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="text-xs font-extrabold text-indigo-300 mt-1 font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
