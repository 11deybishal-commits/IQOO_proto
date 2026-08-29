"""
ChatOps API (Feature #3)
========================
Multi-agent swarm endpoint for in-app ChatOps interface.
"""
import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.incident import Incident
from app.models.topology import ServiceNode
from app.models.user import User
from app.schemas.hackathon import ChatOpsRequest, ChatOpsResponse
from app.api.deps import get_current_active_user
from app.agents.chatops import run_chatops_swarm

router = APIRouter()


@router.post("/chat", response_model=ChatOpsResponse)
async def chatops_chat(
    *,
    db: AsyncSession = Depends(get_db),
    body: ChatOpsRequest,
    current_user: User = Depends(get_current_active_user),
) -> any:
    """
    Multi-agent ChatOps endpoint.
    Routes query through DBA Agent → Network Agent → Supervisor.
    Returns synthesized response with individual agent outputs.
    """
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Fetch context data for agents
    incidents_result = await db.execute(select(Incident))
    incidents = incidents_result.scalars().all()

    nodes_result = await db.execute(select(ServiceNode))
    nodes = nodes_result.scalars().all()

    # Convert history to dicts
    history_dicts = [{"role": m.role, "content": m.content} for m in body.history]

    try:
        # Run in a thread pool since agents use sync LLM calls
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            run_chatops_swarm,
            body.query.strip(),
            history_dicts,
            list(incidents),
            list(nodes),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ChatOps agent error: {str(e)}")

    return ChatOpsResponse(**result)
