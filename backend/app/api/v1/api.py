from fastapi import APIRouter
from app.api.v1 import auth, incidents, topology, voice, knowledge

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(topology.router, prefix="/topology", tags=["topology"])
api_router.include_router(voice.router, prefix="/voice", tags=["voice"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
