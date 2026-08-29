"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { transcribeAudio } from "@/lib/api";

export function VoiceCommand() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setTranscript(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);
        try {
          const res = await transcribeAudio(blob);
          setTranscript(res.text || "(no speech detected)");
        } catch (e: any) {
          setError(e.message);
        } finally {
          setProcessing(false);
        }
      };

      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e: any) {
      setError("Microphone access denied");
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

  return (
    <div>
      <button
        onClick={toggle}
        disabled={processing}
        title={recording ? "Stop recording" : "Voice command (Whisper AI)"}
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
        {processing ? "Transcribing..." : recording ? "Stop Recording" : "Voice Command"}
        {recording && (
          <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
        )}
      </button>

      <AnimatePresence>
        {(transcript || error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2 rounded-lg relative"
            style={{
              background: error ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
              border: `1px solid ${error ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            <button
              onClick={() => { setTranscript(null); setError(null); }}
              className="absolute top-1.5 right-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={10} />
            </button>
            <p className="text-xs pr-4" style={{ color: error ? "#ef4444" : "var(--text-secondary)" }}>
              {error || transcript}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
