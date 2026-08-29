"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Network, AlertTriangle, Info } from "lucide-react";
import { getTopology, getBlastRadius } from "@/lib/api";
import { BlastRadius } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const SERVICE_TYPE_COLORS: Record<string, string> = {
  gateway: "#6366f1",
  service: "#06b6d4",
  database: "#10b981",
  external: "#f59e0b",
};

export default function BlastRadiusPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [blast, setBlast] = useState<BlastRadius | null>(null);
  const [loadingBlast, setLoadingBlast] = useState(false);

  const { data: topology, isLoading } = useQuery({
    queryKey: ["topology"],
    queryFn: getTopology,
  });

  const handleNodeClick = useCallback(
    async (nodeName: string) => {
      if (selected === nodeName) {
        setSelected(null);
        setBlast(null);
        return;
      }
      setSelected(nodeName);
      setLoadingBlast(true);
      try {
        const result = await getBlastRadius(nodeName);
        setBlast(result);
      } catch {
        setBlast(null);
      } finally {
        setLoadingBlast(false);
      }
    },
    [selected]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const nodes = topology?.nodes || [];
  const edges = topology?.edges || [];

  const minX = Math.min(...nodes.map((n) => n.pos_x));
  const maxX = Math.max(...nodes.map((n) => n.pos_x));
  const minY = Math.min(...nodes.map((n) => n.pos_y));
  const maxY = Math.max(...nodes.map((n) => n.pos_y));
  const scaleX = 720 / (maxX - minX || 1);
  const scaleY = 380 / (maxY - minY || 1);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    nodePositions[n.name] = {
      x: (n.pos_x - minX) * scaleX + 65,
      y: (n.pos_y - minY) * scaleY + 55,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Blast Radius Dependency Map</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Click any microservice node below to calculate cascading failure propagation and financial loss rate in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Interactive Topology Canvas */}
        <div className="lg:col-span-8 glass-card p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Live Microservices Mesh (10 Nodes, 11 Dependencies)</span>
            <span>Click to select</span>
          </div>

          <div className="w-full overflow-x-auto bg-[#070b14]/90 rounded-xl border border-indigo-500/15 p-2">
            <svg viewBox="0 0 860 480" className="w-full h-auto min-w-[620px] select-none">
              <defs>
                <pattern id="grid-dots" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="1" fill="rgba(99,102,241,0.12)" />
                </pattern>
              </defs>
              <rect width="860" height="480" fill="url(#grid-dots)" rx="8" />

              {/* Edges */}
              {edges.map((edge) => {
                const src = nodePositions[edge.source_name];
                const tgt = nodePositions[edge.target_name];
                if (!src || !tgt) return null;
                const isAffected =
                  blast?.affected_nodes.includes(edge.source_name) &&
                  blast?.affected_nodes.includes(edge.target_name);

                return (
                  <g key={edge.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isAffected ? "#ef4444" : "rgba(99,102,241,0.35)"}
                      strokeWidth={isAffected ? 2.5 : 1.5}
                      strokeDasharray={isAffected ? "0" : "4 4"}
                    />
                    <circle
                      cx={src.x + (tgt.x - src.x) * 0.65}
                      cy={src.y + (tgt.y - src.y) * 0.65}
                      r={3}
                      fill={isAffected ? "#ef4444" : "rgba(99,102,241,0.6)"}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const pos = nodePositions[node.name];
                if (!pos) return null;
                const isSelected = selected === node.name;
                const isAffected = blast?.affected_nodes.includes(node.name);
                const color = SERVICE_TYPE_COLORS[node.service_type] || "#6366f1";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleNodeClick(node.name)}
                    className="cursor-pointer transition-transform duration-150 hover:scale-110"
                  >
                    {isAffected && (
                      <circle r={26} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.6}>
                        <animate attributeName="r" values="22;32;22" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    <circle
                      r={20}
                      fill={isSelected ? "#ef4444" : isAffected ? "#ef444433" : `${color}25`}
                      stroke={isSelected ? "#ef4444" : isAffected ? "#ef4444" : color}
                      strokeWidth={isSelected ? 3 : 2}
                    />

                    {node.is_critical && (
                      <circle r={5} cx={14} cy={-14} fill="#ef4444" stroke="#070b14" strokeWidth={1.5} />
                    )}

                    <text
                      textAnchor="middle"
                      dy={34}
                      fontSize={10}
                      fontWeight={700}
                      fill={isAffected || isSelected ? "#f87171" : "#e2e8f0"}
                    >
                      {node.name}
                    </text>

                    <text
                      textAnchor="middle"
                      dy={45}
                      fontSize={8}
                      fontWeight={500}
                      fill="#94a3b8"
                    >
                      {node.service_type}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
            {Object.entries(SERVICE_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="capitalize text-slate-300 font-medium">{type}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-300 font-medium">Critical</span>
            </div>
          </div>
        </div>

        {/* Right Column: Node details / Simulation results */}
        <div className="lg:col-span-4 space-y-4">
          {!selected ? (
            <div className="glass-card p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                <Network size={24} />
              </div>
              <p className="font-bold text-sm text-white">Select a Service Node</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any service node in the topology canvas to trigger the BFS cascading failure simulator and assess financial exposure.
              </p>
            </div>
          ) : (
            <>
              {loadingBlast ? (
                <div className="glass-card p-10 flex items-center justify-center">
                  <div className="spinner" />
                </div>
              ) : blast ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-5 space-y-4"
                  style={{
                    border: `1px solid ${
                      blast.severity === "critical" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"
                    }`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        size={18}
                        className={blast.severity === "critical" ? "text-red-400" : "text-amber-400"}
                      />
                      <h3 className="font-bold text-base text-white">{selected}</h3>
                    </div>
                    <span className={`badge badge-${blast.severity}`}>{blast.severity} RISK</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#080d19] border border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cascading Loss Rate</p>
                    <p className="text-2xl font-extrabold font-mono text-red-400 mt-0.5">
                      {formatCurrency(blast.total_cost_per_minute)}
                      <span className="text-xs font-normal text-slate-400">/min</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Cascading Affected Nodes ({blast.affected_nodes.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {blast.affected_nodes.map((name) => {
                        const node = nodes.find((n) => n.name === name);
                        return (
                          <div
                            key={name}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#080d19] border border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              <span className="font-medium text-slate-200">{name}</span>
                            </div>
                            {node?.is_critical && (
                              <span className="badge badge-critical text-[10px] py-0 px-1.5">critical</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {/* Node Specifications */}
              {(() => {
                const node = nodes.find((n) => n.name === selected);
                if (!node) return null;
                return (
                  <div className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Info size={15} className="text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Service Specifications</h4>
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-slate-800">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Owner Team</span>
                        <span className="font-semibold text-slate-200">{node.team || "Platform SRE"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Service Type</span>
                        <span className="font-semibold text-slate-200 capitalize">{node.service_type}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Standalone Cost Rate</span>
                        <span className="font-bold font-mono text-red-400">{formatCurrency(node.cost_per_minute)}/min</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Critical Tier</span>
                        <span className={node.is_critical ? "font-bold text-red-400" : "font-bold text-emerald-400"}>
                          {node.is_critical ? "Tier 1 Critical" : "Standard"}
                        </span>
                      </div>
                    </div>

                    {node.description && (
                      <p className="text-xs text-slate-400 pt-2 border-t border-slate-800 leading-relaxed">
                        {node.description}
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
