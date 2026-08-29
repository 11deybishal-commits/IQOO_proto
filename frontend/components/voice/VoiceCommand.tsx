"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, X, Zap } from "lucide-react";
import { transcribeAudio, getIncidents } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

// ─── Intent parsing ───────────────────────────────────────────────────────────
type CommandIntent =
  | { type: "status"; query: string }
  | { type: "find_incident"; query: string }
  | { type: "create_hint"; title: string }
  | { type: "blast_radius"; service: string }
  | { type: "unknown"; text: string };

function parseIntent(text: string): CommandIntent {
  const lower = text.toLowerCase().trim();

  // Status / health checks
  if (
    lower.includes("status") ||
    lower.includes("health") ||
    lower.includes("how is") ||
    lower.includes("what is the") ||
    lower.includes("check")
  ) {
    return { type: "status", query: text };
  }

  // Find / search incidents
  if (
    lower.includes("find") ||
    lower.includes("show") ||
    lower.includes("list") ||
    lower.includes("recent") ||
    lower.includes("incidents") ||
    lower.includes("search")
  ) {
    return { type: "find_incident", query: text };
  }

  // Create incident hints
  if (
    lower.includes("create") ||
    lower.includes("report") ||
    lower.includes("log") ||
    lower.includes("new incident")
  ) {
    return { type: "create_hint", title: text };
  }

  // Blast radius
  if (
    lower.includes("blast radius") ||
    lower.includes("cascade") ||
    lower.includes("impact") ||
    lower.includes("downstream")
  ) {
    const serviceMatch = text.match(/(?:for|of|on)\s+([A-Za-z ]+?)(?:\?|$)/i);
    return { type: "blast_radius", service: serviceMatch?.[1]?.trim() || "API Gateway" };
  }

  return { type: "unknown", text };
}

interface CommandResult {
  type: string;
  message: string;
  detail?: string;
}

async function executeCommand(intent: CommandIntent): Promise<CommandResult> {
  switch (intent.type) {
    case "status": {
      const incidents = await getIncidents(0, 100);
      const open = incidents.filter((i) => i.status === "open" || i.status === "investigating");
      const critical = open.filter((i) => i.severity === "critical");
      if (critical.length > 0) {
        return {
          type: "warning",
          message: `⚠️ ${critical.length} critical incident${critical.length > 1 ? "s" : ""} active`,
          detail: critical.map((i) => `• ${i.title}`).join("\n"),
        };
      }
      if (open.length > 0) {
        return {
          type: "info",
          message: `${open.length} open incident${open.length > 1 ? "s" : ""} under investigation`,
          detail: open.slice(0, 3).map((i) => `• [${i.severity}] ${i.title}`).join("\n"),
        };
      }
      return { type: "ok", message: "✅ All systems nominal — no active incidents detected." };
    }

    case "find_incident": {
      const incidents = await getIncidents(0, 100);
      const recent = incidents
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      if (recent.length === 0) {
        return { type: "info", message: "No incidents found in the system." };
      }
      return {
        type: "info",
        message: `Found ${incidents.length} total incidents — top 5 recent:`,
        detail: recent.map((i) => `• [${i.severity}] ${i.title} (${i.status})`).join("\n"),
      };
    }

    case "create_hint": {
      return {
        type: "action",
        message: "💡 To create an incident, use the 'Report New Incident' button on the Incidents page.",
        detail: `Detected title hint: "${intent.title}"`,
      };
    }

    case "blast_radius": {
      return {
        type: "action",
        message: `🌐 Check Blast Radius Map for service: "${intent.service}"`,
        detail: "Navigate to the Blast Radius page and click the service node for real-time cascade analysis.",
      };
    }

    default: {
      return {
        type: "info",
        message: "Command received — routing to ChatOps for full agent analysis.",
        detail: `Try the ChatOps page for complex queries: "${intent.text}"`,
      };
    }
  }
}

export function VoiceCommand() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const qc = useQueryClient();

  const startRecording = async () => {
    setTranscript(null);
    setCommandResult(null);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);
        try {
          // Step 1: Transcribe via Groq Whisper
          const res = await transcribeAudio(blob);
          const text = res.text?.trim() || "(no speech detected)";
          setTranscript(text);

          if (text && text !== "(no speech detected)") {
            // Step 2: Parse intent & execute command
            const intent = parseIntent(text);
            const result = await executeCommand(intent);
            setCommandResult(result);

            // Refresh incidents list in background
            qc.invalidateQueries({ queryKey: ["incidents"] });
          }
        } catch (e: unknown) {
          setError((e as Error).message || "Transcription or command failed");
        } finally {
          setProcessing(false);
        }
      };

      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const toggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const clearResult = () => {
    setTranscript(null);
    setCommandResult(null);
    setError(null);
  };

  const resultColors: Record<string, { bg: string; border: string; text: string }> = {
    ok: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", text: "#10b981" },
    warning: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", text: "#ef4444" },
    info: { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.3)", text: "#818cf8" },
    action: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" },
  };

  return (
    <div>
      {/* Record button */}
      <button
        onClick={toggle}
        disabled={processing}
        title={recording ? "Stop recording" : "Voice command (Whisper AI → Intent Execution)"}
        className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
        style={{
          background: recording ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.1)",
          border: `1px solid ${recording ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.3)"}`,
          color: recording ? "#ef4444" : "#818cf8",
        }}
      >
        {processing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : recording ? (
          <MicOff size={14} />
        ) : (
          <Mic size={14} />
        )}
        {processing
          ? "Processing..."
          : recording
          ? "Stop Recording"
          : "Voice Command"}
        {recording && (
          <span
            className="ml-auto w-2 h-2 rounded-full animate-ping"
            style={{ background: "#ef4444" }}
          />
        )}
      </button>

      {/* Result panel */}
      <AnimatePresence>
        {(transcript || error || commandResult) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 rounded-lg overflow-hidden"
            style={{
              background: error
                ? "rgba(239,68,68,0.08)"
                : commandResult
                ? resultColors[commandResult.type]?.bg || resultColors.info.bg
                : "rgba(99,102,241,0.08)",
              border: `1px solid ${
                error
                  ? "rgba(239,68,68,0.25)"
                  : commandResult
                  ? resultColors[commandResult.type]?.border || resultColors.info.border
                  : "rgba(99,102,241,0.25)"
              }`,
            }}
          >
            <div className="p-2 relative">
              <button
                onClick={clearResult}
                className="absolute top-1.5 right-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={10} />
              </button>

              {error ? (
                <p className="text-[11px] text-red-400 pr-4">{error}</p>
              ) : (
                <>
                  {/* Transcript */}
                  {transcript && (
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <Mic size={10} className="text-slate-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-slate-400 italic pr-4">"{transcript}"</p>
                    </div>
                  )}

                  {/* Command result */}
                  {commandResult && (
                    <div>
                      <div className="flex items-start gap-1.5">
                        <Zap
                          size={10}
                          className="mt-0.5 flex-shrink-0"
                          style={{
                            color: resultColors[commandResult.type]?.text || "#818cf8",
                          }}
                        />
                        <p
                          className="text-[11px] font-semibold pr-4"
                          style={{
                            color: resultColors[commandResult.type]?.text || "#818cf8",
                          }}
                        >
                          {commandResult.message}
                        </p>
                      </div>
                      {commandResult.detail && (
                        <pre className="text-[10px] text-slate-400 mt-1 ml-3.5 whitespace-pre-wrap leading-relaxed">
                          {commandResult.detail}
                        </pre>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
