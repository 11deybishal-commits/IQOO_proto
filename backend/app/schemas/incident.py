from pydantic import BaseModel, ConfigDict, field_serializer
from uuid import UUID
from datetime import datetime
from typing import Optional

class IncidentBase(BaseModel):
    title: str
    description: str | None = None
    status: str = "open"
    severity: str = "low"
    ai_analysis: str | None = None
    project: str | None = None
    department: str | None = None
    postmortem: str | None = None
    resolved_at: datetime | None = None
    estimated_cost_per_minute: float | None = None
    affected_services: str | None = None  # JSON string of service names

class IncidentCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "open"
    severity: str = "low"
    project: str | None = None
    department: str | None = None
    estimated_cost_per_minute: float | None = None
    affected_services: str | None = None

class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    severity: str | None = None
    project: str | None = None
    department: str | None = None
    affected_services: str | None = None

class IncidentResponse(IncidentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('created_at', 'updated_at', 'resolved_at')
    def serialize_datetime(self, v: datetime | None, _info: object) -> str | None:
        """Ensure UTC timestamps include Z suffix for correct frontend parsing."""
        if v is None:
            return None
        iso = v.isoformat()
        if not iso.endswith('Z') and '+' not in iso and '-' not in iso[19:]:
            iso += 'Z'
        return iso
