"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, AlertCircle } from "lucide-react";
import { Incident } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface CostTickerProps {
  incidents: Incident[];
}

const SEVERITY_MULTIPLIERS: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 8,
  critical: 20,
};

const DEFAULT_COST_PER_MIN = 500;

export function CostTicker({ incidents }: CostTickerProps) {
  const [time, setTime] = useState(0);

  // Tick every second to give a live real-time financial impact feel
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { totalLoss, activeIncidents } = useMemo(() => {
    let lossSum = 0;
    const active: { title: string; loss: number; severity: string }[] = [];

    incidents
      .filter(i => i.status !== "resolved" && i.status !== "closed")
      .forEach(i => {
        const created = new Date(i.created_at).getTime();
        const durationMin = Math.max((time - created) / 60000, 0);
        const mult = SEVERITY_MULTIPLIERS[i.severity] ?? 1;
        const rate = i.estimated_cost_per_minute ?? DEFAULT_COST_PER_MIN;
        const loss = durationMin * rate * mult;
        lossSum += loss;
        active.push({ title: i.title, loss, severity: i.severity });
      });

    return { totalLoss: lossSum, activeIncidents: active };
  }, [incidents, time]);

  if (activeIncidents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden shadow-lg border border-red-500/30 bg-gradient-to-r from-red-950/40 via-red-900/20 to-slate-900/60 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between p-3.5 gap-4">
        {/* Left: Total Loss Highlight */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
            <DollarSign size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Live Incident Revenue Impact</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="text-xl font-extrabold font-mono text-red-300">
              {formatCurrency(totalLoss)}
              <span className="text-xs font-normal text-slate-400 ml-1.5">(accruing in real-time)</span>
            </p>
          </div>
        </div>

        {/* Right: Active summary badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1.5">
            <AlertCircle size={13} />
            {activeIncidents.length} Unresolved {activeIncidents.length === 1 ? "Incident" : "Incidents"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
