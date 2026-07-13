import asyncio
import traceback
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db, AsyncSessionLocal
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentResponse, IncidentUpdate
from app.api.deps import get_current_active_user
from app.agents.graph import build_graph
from langchain_core.messages import HumanMessage

router = APIRouter()


def run_incident_analysis_sync(incident_id: str, title: str, description: str):
    """
    Synchronous background task — FastAPI BackgroundTasks runs this in a thread.
    We build the graph, invoke it synchronously, then use asyncio.run() to save to DB.
    """
    print(f"[AI] Starting analysis for incident {incident_id}...")
    
    try:
        graph = build_graph()
        initial_message = HumanMessage(
            content=(
                f"New Incident Reported:\n"
                f"Title: {title}\n"
                f"Description: {description}\n\n"
                f"Please analyze this incident. First search for similar past incidents, "
                f"then provide a comprehensive root cause hypothesis and recommended actions."
            )
        )
        
        state = {
            "messages": [initial_message],
            "incident_id": incident_id,
            "user_id": "system"
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
    
    # Save to DB using a fresh event loop (we're in a sync thread)
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


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    *,
    db: AsyncSession = Depends(get_db),
    incident_in: IncidentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Create new incident and trigger background AI analysis.
    """
    incident = Incident(**incident_in.model_dump())
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    
    # Trigger background LangGraph analysis (sync function runs in thread pool)
    background_tasks.add_task(
        run_incident_analysis_sync,
        incident_id=str(incident.id),
        title=incident.title,
        description=incident.description or ""
    )
    
    return incident


@router.get("/", response_model=List[IncidentResponse])
async def read_incidents(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Retrieve incidents.
    """
    result = await db.execute(select(Incident).offset(skip).limit(limit))
    incidents = result.scalars().all()
    return incidents


@router.get("/{id}", response_model=IncidentResponse)
async def read_incident(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Get incident by ID.
    """
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
