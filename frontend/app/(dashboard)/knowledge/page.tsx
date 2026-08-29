"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Search, BookOpen, FileText, Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import { uploadDocument, searchKnowledge } from "@/lib/api";
import { KnowledgeSearchResult } from "@/lib/api";

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchKnowledge(query, 5);
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadDocument(file);
      setUploadResult({ message: res.message, type: "success" });
    } catch (err: unknown) {
      setUploadResult({ message: (err as Error).message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">FAISS Knowledge Vector Store</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload runbooks, standard operating procedures, and architecture logs. Semantic dense retrieval powered by all-MiniLM-L6-v2.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload Column */}
        <div className="lg:col-span-4 glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={17} className="text-indigo-400" />
            <h2 className="font-bold text-sm text-white uppercase tracking-wider">Upload Runbook / Log</h2>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleUpload(f);
            }}
            className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-[#070b14]/70 hover:bg-[#070b14] rounded-xl p-8 text-center cursor-pointer transition-all space-y-2"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
            </div>
            <p className="text-sm font-bold text-white">
              {uploading ? "Chunking & Indexing..." : "Drag & drop or click to browse"}
            </p>
            <p className="text-xs text-slate-400">
              Supports .md, .txt, .log, .csv (Max 10MB)
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.log,.csv,.markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />

          <AnimatePresence>
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3.5 rounded-xl text-xs flex items-start gap-2.5"
                style={{
                  background:
                    uploadResult.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${
                    uploadResult.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                  }`,
                  color: uploadResult.type === "success" ? "#6ee7b7" : "#fca5a5",
                }}
              >
                {uploadResult.type === "success" ? (
                  <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                )}
                <span>{uploadResult.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <p className="font-bold text-slate-300">Supported Knowledge Assets</p>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              <li>Incident runbooks & remediation SOPs</li>
              <li>Past post-mortem documents</li>
              <li>Microservice architecture overviews</li>
              <li>Error log snippets & stack traces</li>
            </ul>
          </div>
        </div>

        {/* Search Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Search size={17} className="text-indigo-400" />
              <h2 className="font-bold text-sm text-white uppercase tracking-wider">Semantic Vector Search</h2>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query in natural language, e.g. 'connection pool starvation in auth'..."
                className="input-field flex-1 text-sm"
              />
              <button type="submit" disabled={searching} className="btn-primary flex-shrink-0 text-xs">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                <span>{searching ? "Searching..." : "Vector Search"}</span>
              </button>
            </form>
          </div>

          {/* Results View */}
          {results !== null && (
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-2">
                  <BookOpen size={36} className="mx-auto text-slate-500" />
                  <p className="font-bold text-slate-300">No semantic matches found</p>
                  <p className="text-xs text-slate-500">Upload a runbook or adjust your search prompt.</p>
                </div>
              ) : (
                results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-indigo-400" />
                        <span className="font-bold text-xs text-indigo-300">{r.source}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                          chunk #{r.chunk}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">Rank #{i + 1}</span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-200 bg-[#070b14] p-3 rounded-lg border border-slate-800 font-mono whitespace-pre-wrap">
                      {r.content}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {results === null && (
            <div className="glass-card p-12 text-center space-y-3 border-dashed border-indigo-500/20">
              <Database size={36} className="mx-auto text-indigo-400/60" />
              <p className="font-bold text-base text-white">Semantic Knowledge Retrieval</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                LangGraph workers autonomously search this local FAISS dense index to find historical resolutions and formulate immediate remediation steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
