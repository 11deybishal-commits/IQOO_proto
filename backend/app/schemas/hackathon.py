from pydantic import BaseModel

class PostMortemRequest(BaseModel):
    additional_notes: str | None = None

class PostMortemResponse(BaseModel):
    incident_id: str
    postmortem: str

class CostImpactResponse(BaseModel):
    incident_id: str
    duration_minutes: float
    cost_per_minute: float
    total_estimated_loss: float
    severity_multiplier: float
    affected_services: list[str]

class VoiceTranscribeResponse(BaseModel):
    text: str
    language: str | None = None
