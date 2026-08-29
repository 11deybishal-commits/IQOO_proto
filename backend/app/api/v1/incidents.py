import json
import uuid
import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from uuid import UUID

from app.db.session import get_db, AsyncSessionLocal
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentResponse, IncidentUpdate
from app.schemas.hackathon import PostMortemRequest, PostMortemResponse, CostImpactResponse
from app.api.deps import get_current_active_user
from app.agents.graph import build_graph
from app.agents.postmortem import generate_postmortem
from langchain_core.messages import HumanMessage
from typing import List

router = APIRouter()

# ─── Severity cost multipliers (no LLM needed) ───────────────────────────────
SEVERITY_MULTIPLIERS = {
    "low": 1.0,
    "medium": 3.0,
    "high": 8.0,
    "critical": 20.0,
}

DEFAULT_COST_PER_MINUTE = 500.0  # Base revenue loss in USD per minute


def run_incident_analysis_sync(
    incident_id: str, title: str, description: str, project: str = "", department: str = ""
):
    """Synchronous background task — FastAPI BackgroundTasks runs this in a thread."""
    print(f"[AI] Starting analysis for incident {incident_id}...")

    try:
        graph = build_graph()
        initial_message = HumanMessage(
            content=(
                f"New Incident Reported:\n"
                f"Title: {title}\n"
                f"Description: {description}\n"
                f"Project: {project or 'N/A'}\n"
                f"Department: {department or 'N/A'}\n\n"
                f"Please analyze this incident. First search for similar past incidents in this project/department, "
                f"then provide a comprehensive root cause hypothesis and recommended actions."
            )
        )

        state = {
            "messages": [initial_message],
            "incident_id": incident_id,
            "user_id": "system",
        }

        result = graph.invoke(state)
        final_report = result["messages"][-1].content
        print(f"[AI] Analysis complete for {incident_id}. Report length: {len(final_report)} chars")

    except Exception as e:
        final_report = (
            f"⚠️ AI Analysis encountered an error:\n\n"
            f"**Error**: {str(e)}\n\n"
            f"The incident has been logged and the system will retry. "
            f"Please check that your GROQ_API_KEY is valid in the .env file."
        )
        print(f"[AI] ERROR during analysis for {incident_id}:")
        traceback.print_exc()

    async def _save():
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(Incident).where(Incident.id == uuid.UUID(incident_id))
            )
            incident = res.scalars().first()
            if incident:
                incident.ai_analysis = final_report
                incident.status = "investigating"
                await session.commit()
                print(f"[AI] Saved analysis to DB for {incident_id}")
            else:
                print(f"[AI] WARNING: Incident {incident_id} not found in DB!")

    try:
        loop = asyncio.new_event_loop()
        loop.run_until_complete(_save())
        loop.close()
    except Exception as e:
        print(f"[AI] ERROR saving to DB: {e}")
        traceback.print_exc()


def run_postmortem_sync(incident_id: str):
    """Generate postmortem in background after incident resolution."""
    print(f"[PM] Generating postmortem for {incident_id}...")

    async def _load():
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(Incident).where(Incident.id == uuid.UUID(incident_id))
            )
            return res.scalars().first()

    loop = asyncio.new_event_loop()
    incident = loop.run_until_complete(_load())

    if not incident:
        print(f"[PM] Incident {incident_id} not found, skipping postmortem.")
        loop.close()
        return

    try:
        postmortem_text = generate_postmortem(
            incident_id=str(incident.id),
            title=incident.title,
            description=incident.description or "",
            ai_analysis=incident.ai_analysis or "",
            severity=incident.severity,
            project=incident.project or "N/A",
            created_at=str(incident.created_at),
            resolved_at=str(incident.resolved_at),
        )

        async def _save():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(Incident).where(Incident.id == uuid.UUID(incident_id))
                )
                inc = res.scalars().first()
                if inc:
                    inc.postmortem = postmortem_text
                    await session.commit()
                    print(f"[PM] Saved postmortem for {incident_id}")

        loop.run_until_complete(_save())

    except Exception as e:
        print(f"[PM] ERROR generating postmortem for {incident_id}: {e}")
        traceback.print_exc()
    finally:
        loop.close()


# ─── CRUD Endpoints ───────────────────────────────────────────────────────────

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    *,
    db: AsyncSession = Depends(get_db),
    incident_in: IncidentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Create new incident and trigger background AI analysis."""
    incident = Incident(**incident_in.model_dump())
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    background_tasks.add_task(
        run_incident_analysis_sync,
        incident_id=str(incident.id),
        title=incident.title,
        description=incident.description or "",
        project=incident.project or "",
        department=incident.department or "",
    )

    return incident


@router.get("/", response_model=List[IncidentResponse])
async def read_incidents(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Retrieve incidents."""
    result = await db.execute(select(Incident).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{id}", response_model=IncidentResponse)
async def read_incident(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Get incident by ID."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{id}", response_model=IncidentResponse)
async def update_incident(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    incident_in: IncidentUpdate,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Update an incident."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = incident_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)

    await db.commit()
    await db.refresh(incident)
    return incident


@router.post("/{id}/analyze", response_model=IncidentResponse)
async def analyze_incident(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Re-trigger AI Analysis for an existing incident."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.ai_analysis = None
    incident.status = "investigating"
    await db.commit()
    await db.refresh(incident)

    background_tasks.add_task(
        run_incident_analysis_sync,
        incident_id=str(incident.id),
        title=incident.title,
        description=incident.description or "",
        project=incident.project or "",
        department=incident.department or "",
    )

    return incident


@router.post("/{id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Mark incident as resolved and trigger blameless postmortem generation."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "resolved"
    incident.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(incident)

    # Trigger postmortem in background (single LLM call)
    background_tasks.add_task(run_postmortem_sync, incident_id=str(incident.id))

    return incident


@router.get("/{id}/postmortem", response_model=PostMortemResponse)
async def get_postmortem(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Get the generated postmortem for a resolved incident."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not incident.postmortem:
        raise HTTPException(
            status_code=404,
            detail="Postmortem not yet generated. Resolve the incident first.",
        )
    return PostMortemResponse(
        incident_id=str(incident.id), postmortem=incident.postmortem
    )


@router.get("/{id}/cost-impact", response_model=CostImpactResponse)
async def get_cost_impact(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """Calculate real-time revenue loss for an active incident. Zero LLM tokens."""
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    created = incident.created_at
    if created.tzinfo is None:
        from datetime import timezone as tz
        created = created.replace(tzinfo=timezone.utc)

    end_time = incident.resolved_at or now
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    duration_minutes = max((end_time - created).total_seconds() / 60.0, 0)
    multiplier = SEVERITY_MULTIPLIERS.get(incident.severity, 1.0)
    cost_per_min = incident.estimated_cost_per_minute or DEFAULT_COST_PER_MINUTE
    total_cost = duration_minutes * cost_per_min * multiplier

    services = []
    if incident.affected_services:
        try:
            services = json.loads(incident.affected_services)
        except Exception:
            services = [incident.affected_services]

    return CostImpactResponse(
        incident_id=str(incident.id),
        duration_minutes=round(duration_minutes, 2),
        cost_per_minute=cost_per_min,
        total_estimated_loss=round(total_cost, 2),
        severity_multiplier=multiplier,
        affected_services=services,
    )
