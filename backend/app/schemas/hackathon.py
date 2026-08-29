from pydantic import BaseModel
from typing import Any


# ─── Post-Mortem ─────────────────────────────────────────────────────────────
class PostMortemRequest(BaseModel):
    additional_notes: str | None = None

class PostMortemResponse(BaseModel):
    incident_id: str
    postmortem: str


# ─── Cost Impact ─────────────────────────────────────────────────────────────
class CostImpactResponse(BaseModel):
    incident_id: str
    duration_minutes: float
    cost_per_minute: float
    total_estimated_loss: float
    severity_multiplier: float
    affected_services: list[str]


# ─── Voice ───────────────────────────────────────────────────────────────────
class VoiceTranscribeResponse(BaseModel):
    text: str
    language: str | None = None


# ─── Self-Healing (Feature #1) ───────────────────────────────────────────────
class HealingProposal(BaseModel):
    action_key: str
    description: str
    command_preview: str
    risk: str
    duration_seconds: int
    rationale: str
    priority: int
    estimated_resolution_time_minutes: int

class SelfHealProposalsResponse(BaseModel):
    incident_id: str
    proposals: list[HealingProposal]

class SelfHealApproveRequest(BaseModel):
    action_key: str

class SelfHealExecuteResponse(BaseModel):
    success: bool
    action_key: str
    command_executed: str
    log: str
    duration_seconds: int


# ─── Forecasting (Feature #2) ────────────────────────────────────────────────
class RiskScore(BaseModel):
    service: str
    risk_level: str   # low | medium | high | critical
    risk_score: int   # 0-100
    reason: str
    predicted_window: str  # e.g. "24h", "48h"

class PreIncidentAlert(BaseModel):
    title: str
    description: str
    severity: str   # warning | critical
    service: str

class ForecastResponse(BaseModel):
    generated_at: str
    total_incidents_analyzed: int
    incidents_last_24h: int
    pattern_summary: dict[str, Any]
    risk_scores: list[RiskScore]
    pre_incident_alerts: list[PreIncidentAlert]


# ─── ChatOps (Feature #3) ────────────────────────────────────────────────────
class ChatOpsMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatOpsRequest(BaseModel):
    query: str
    history: list[ChatOpsMessage] = []

class ChatOpsResponse(BaseModel):
    query: str
    dba_agent_response: str
    network_agent_response: str
    supervisor_response: str
    agents_consulted: list[str]
