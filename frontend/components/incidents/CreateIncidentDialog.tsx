"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createIncident } from "@/lib/api";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  project: z.string().optional(),
  department: z.string().optional(),
  estimated_cost_per_minute: z.number().optional(),
  affected_services: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateIncidentDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "medium" },
  });

  const mut = useMutation({
    mutationFn: (data: FormData) => createIncident({
      ...data,
      affected_services: data.affected_services
        ? JSON.stringify(data.affected_services.split(",").map(s => s.trim()).filter(Boolean))
        : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      reset();
      onClose();
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="glass-card w-full max-w-lg p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Report New Incident</h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI analysis will start automatically</p>
                  </div>
                </div>
                <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>TITLE *</label>
                  <input {...register("title")} placeholder="e.g. Production API Gateway Timeout" className="input-field" />
                  {errors.title && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>DESCRIPTION</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Describe what's happening, symptoms, affected users..."
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>SEVERITY *</label>
                    <select {...register("severity")} className="input-field">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>PROJECT</label>
                    <input {...register("project")} placeholder="e.g. Payments API" className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>DEPARTMENT</label>
                    <input {...register("department")} placeholder="e.g. Platform" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>COST/MIN (USD)</label>
                    <input
                      {...register("estimated_cost_per_minute", { valueAsNumber: true })}
                      type="number"
                      placeholder="500"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    AFFECTED SERVICES <span style={{ color: "var(--text-muted)" }}>(comma-separated)</span>
                  </label>
                  <input {...register("affected_services")} placeholder="API Gateway, Auth Service, SQLite DB" className="input-field" />
                </div>

                {mut.error && (
                  <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    {(mut.error as Error).message}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button type="submit" disabled={mut.isPending} className="btn-primary flex-1 justify-center">
                    {mut.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Plus size={14} /> Create Incident</>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
