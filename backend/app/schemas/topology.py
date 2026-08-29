from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class ServiceNodeResponse(BaseModel):
    id: UUID
    name: str
    service_type: str
    team: str | None
    cost_per_minute: float
    is_critical: bool
    pos_x: float
    pos_y: float
    description: str | None

    model_config = {"from_attributes": True}

class ServiceEdgeResponse(BaseModel):
    id: UUID
    source_name: str
    target_name: str
    edge_type: str

    model_config = {"from_attributes": True}

class TopologyResponse(BaseModel):
    nodes: list[ServiceNodeResponse]
    edges: list[ServiceEdgeResponse]

class BlastRadiusResponse(BaseModel):
    affected_nodes: list[str]
    total_cost_per_minute: float
    severity: str
