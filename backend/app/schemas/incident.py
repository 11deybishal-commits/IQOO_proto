from pydantic import BaseModel, ConfigDict, field_serializer
from uuid import UUID
from datetime import datetime

class IncidentBase(BaseModel):
    title: str
    description: str | None = None
    status: str = "open"
    severity: str = "low"
    ai_analysis: str | None = None
    project: str | None = None
    department: str | None = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    severity: str | None = None
    project: str | None = None
    department: str | None = None

class IncidentResponse(IncidentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, v: datetime, _info: object) -> str:
        """Ensure UTC timestamps include Z suffix for correct frontend parsing."""
        iso = v.isoformat()
        if not iso.endswith('Z') and '+' not in iso and '-' not in iso[19:]:
            iso += 'Z'
        return iso

