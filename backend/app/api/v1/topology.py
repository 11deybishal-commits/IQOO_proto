import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.topology import ServiceNode, ServiceEdge
from app.models.user import User
from app.schemas.topology import TopologyResponse, BlastRadiusResponse, ServiceNodeResponse, ServiceEdgeResponse
from app.api.deps import get_current_active_user

router = APIRouter(redirect_slashes=False)


async def seed_topology_if_empty(db: AsyncSession):
    """Seed a realistic microservices topology if the DB is empty."""
    result = await db.execute(select(ServiceNode))
    if result.scalars().first():
        return  # Already seeded

    nodes_data = [
        {"name": "API Gateway", "service_type": "gateway", "team": "Platform", "cost_per_minute": 2000.0, "is_critical": True, "pos_x": 400, "pos_y": 50, "description": "Main entry point for all client traffic"},
        {"name": "Auth Service", "service_type": "service", "team": "Security", "cost_per_minute": 1500.0, "is_critical": True, "pos_x": 150, "pos_y": 200, "description": "JWT token validation and user authentication"},
        {"name": "Incident Service", "service_type": "service", "team": "SRE", "cost_per_minute": 800.0, "is_critical": True, "pos_x": 400, "pos_y": 200, "description": "Incident management core service"},
        {"name": "AI Analysis Service", "service_type": "service", "team": "AI Platform", "cost_per_minute": 1200.0, "is_critical": False, "pos_x": 650, "pos_y": 200, "description": "LangGraph multi-agent analysis pipeline"},
        {"name": "Notification Service", "service_type": "service", "team": "Platform", "cost_per_minute": 300.0, "is_critical": False, "pos_x": 150, "pos_y": 380, "description": "Slack/email notification dispatcher"},
        {"name": "Knowledge Service", "service_type": "service", "team": "SRE", "cost_per_minute": 200.0, "is_critical": False, "pos_x": 400, "pos_y": 380, "description": "Document upload and FAISS indexing"},
        {"name": "SQLite DB", "service_type": "database", "team": "Platform", "cost_per_minute": 500.0, "is_critical": True, "pos_x": 250, "pos_y": 550, "description": "Primary relational data store"},
        {"name": "FAISS Index", "service_type": "database", "team": "AI Platform", "cost_per_minute": 400.0, "is_critical": False, "pos_x": 550, "pos_y": 550, "description": "Vector similarity search index"},
        {"name": "Groq Cloud API", "service_type": "external", "team": "External", "cost_per_minute": 1000.0, "is_critical": False, "pos_x": 800, "pos_y": 380, "description": "External LLM inference provider"},
        {"name": "HuggingFace Hub", "service_type": "external", "team": "External", "cost_per_minute": 100.0, "is_critical": False, "pos_x": 800, "pos_y": 550, "description": "Embedding model downloads"},
    ]

    edges_data = [
        {"source_name": "API Gateway", "target_name": "Auth Service", "edge_type": "http"},
        {"source_name": "API Gateway", "target_name": "Incident Service", "edge_type": "http"},
        {"source_name": "Auth Service", "target_name": "SQLite DB", "edge_type": "tcp"},
        {"source_name": "Incident Service", "target_name": "SQLite DB", "edge_type": "tcp"},
        {"source_name": "Incident Service", "target_name": "AI Analysis Service", "edge_type": "amqp"},
        {"source_name": "Incident Service", "target_name": "Notification Service", "edge_type": "http"},
        {"source_name": "AI Analysis Service", "target_name": "FAISS Index", "edge_type": "tcp"},
        {"source_name": "AI Analysis Service", "target_name": "Groq Cloud API", "edge_type": "https"},
        {"source_name": "Knowledge Service", "target_name": "FAISS Index", "edge_type": "tcp"},
        {"source_name": "Knowledge Service", "target_name": "HuggingFace Hub", "edge_type": "https"},
        {"source_name": "API Gateway", "target_name": "Knowledge Service", "edge_type": "http"},
    ]

    for nd in nodes_data:
        db.add(ServiceNode(**nd))
    for ed in edges_data:
        db.add(ServiceEdge(**ed))

    await db.commit()


@router.get("", response_model=TopologyResponse)
async def get_topology(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Return full service topology for the blast-radius map."""
    await seed_topology_if_empty(db)

    nodes_result = await db.execute(select(ServiceNode))
    edges_result = await db.execute(select(ServiceEdge))

    nodes = nodes_result.scalars().all()
    edges = edges_result.scalars().all()

    return TopologyResponse(
        nodes=[ServiceNodeResponse.model_validate(n) for n in nodes],
        edges=[ServiceEdgeResponse.model_validate(e) for e in edges],
    )


@router.get("/", response_model=TopologyResponse, include_in_schema=False)
async def get_topology_slash(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> any:
    return await get_topology(db=db, current_user=current_user)



@router.get("/blast-radius", response_model=BlastRadiusResponse)
async def get_blast_radius(
    service: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Calculate which services are impacted if a given service goes down.
    Pure graph traversal — zero LLM tokens.
    """
    await seed_topology_if_empty(db)

    edges_result = await db.execute(select(ServiceEdge))
    edges = edges_result.scalars().all()

    nodes_result = await db.execute(select(ServiceNode))
    nodes = {n.name: n for n in nodes_result.scalars().all()}

    if service not in nodes:
        raise HTTPException(status_code=404, detail=f"Service '{service}' not found in topology")

    # Build adjacency map: if A → B, then B depends on A
    dependents: dict[str, list[str]] = {}
    for edge in edges:
        if edge.target_name not in dependents:
            dependents[edge.target_name] = []
        dependents[edge.target_name].append(edge.source_name)

    # BFS to find all downstream affected services
    affected = set()
    queue = [service]
    while queue:
        current = queue.pop()
        for edge in edges:
            if edge.source_name == current and edge.target_name not in affected:
                affected.add(edge.target_name)
                queue.append(edge.target_name)

    affected.add(service)
    total_cost = sum(
        nodes[s].cost_per_minute for s in affected if s in nodes
    )

    if total_cost > 5000:
        sev = "critical"
    elif total_cost > 2000:
        sev = "high"
    elif total_cost > 500:
        sev = "medium"
    else:
        sev = "low"

    return BlastRadiusResponse(
        affected_nodes=sorted(affected),
        total_cost_per_minute=round(total_cost, 2),
        severity=sev,
    )
