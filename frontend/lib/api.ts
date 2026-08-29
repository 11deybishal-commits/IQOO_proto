// ─── API Base Types ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "investigating" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  ai_analysis: string | null;
  postmortem: string | null;
  project: string | null;
  department: string | null;
  resolved_at: string | null;
  estimated_cost_per_minute: number | null;
  affected_services: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentCreate {
  title: string;
  description?: string;
  severity?: string;
  project?: string;
  department?: string;
  estimated_cost_per_minute?: number;
  affected_services?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CostImpact {
  incident_id: string;
  duration_minutes: number;
  cost_per_minute: number;
  total_estimated_loss: number;
  severity_multiplier: number;
  affected_services: string[];
}

export interface ServiceNode {
  id: string;
  name: string;
  service_type: string;
  team: string | null;
  cost_per_minute: number;
  is_critical: boolean;
  pos_x: number;
  pos_y: number;
  description: string | null;
}

export interface ServiceEdge {
  id: string;
  source_name: string;
  target_name: string;
  edge_type: string;
}

export interface TopologyResponse {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

export interface BlastRadius {
  affected_nodes: string[];
  total_cost_per_minute: number;
  severity: string;
}

export interface KnowledgeSearchResult {
  content: string;
  source: string;
  chunk: number;
}

// ─── API Client ──────────────────────────────────────────────────────────────
const BASE_URL = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sentinel_token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinel_token");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function register(
  email: string,
  password: string,
  full_name?: string
): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

// ─── Incidents ───────────────────────────────────────────────────────────────
export async function getIncidents(skip = 0, limit = 100): Promise<Incident[]> {
  return request<Incident[]>(`/incidents?skip=${skip}&limit=${limit}`);
}

export async function getIncident(id: string): Promise<Incident> {
  return request<Incident>(`/incidents/${id}`);
}

export async function createIncident(data: IncidentCreate): Promise<Incident> {
  return request<Incident>("/incidents", { method: "POST", body: JSON.stringify(data) });
}

export async function analyzeIncident(id: string): Promise<Incident> {
  return request<Incident>(`/incidents/${id}/analyze`, { method: "POST" });
}

export async function resolveIncident(id: string): Promise<Incident> {
  return request<Incident>(`/incidents/${id}/resolve`, { method: "POST" });
}

export async function getPostmortem(id: string): Promise<{ incident_id: string; postmortem: string }> {
  return request(`/incidents/${id}/postmortem`);
}

export async function getCostImpact(id: string): Promise<CostImpact> {
  return request<CostImpact>(`/incidents/${id}/cost-impact`);
}

export async function updateIncident(
  id: string,
  data: Partial<Incident>
): Promise<Incident> {
  return request<Incident>(`/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Topology ────────────────────────────────────────────────────────────────
export async function getTopology(): Promise<TopologyResponse> {
  return request<TopologyResponse>("/topology");
}

export async function getBlastRadius(service: string): Promise<BlastRadius> {
  return request<BlastRadius>(`/topology/blast-radius?service=${encodeURIComponent(service)}`);
}

// ─── Knowledge ───────────────────────────────────────────────────────────────
export async function uploadDocument(file: File): Promise<{ status: string; chunks_indexed: number; message: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/knowledge/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinel_token");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function searchKnowledge(
  q: string,
  limit = 5
): Promise<{ query: string; results: KnowledgeSearchResult[] }> {
  return request(`/knowledge/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

// ─── Voice ───────────────────────────────────────────────────────────────────
export async function transcribeAudio(
  blob: Blob
): Promise<{ text: string; language: string | null }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  const res = await fetch(`${BASE_URL}/voice/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinel_token");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Transcription failed");
  }
  return res.json();
}
