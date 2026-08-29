from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
    )

    @app.on_event("startup")
    async def startup_event():
        from app.db.session import engine
        from app.models.base import Base
        from app.models.user import User  # register User
        from app.models.incident import Incident  # register Incident
        async with engine.begin() as conn:
            # Sync tables to sqlite
            await conn.run_sync(Base.metadata.create_all)

    # Set up CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5176", "http://127.0.0.1:5176"], # Fix CORS explicit origins for credentials
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": settings.VERSION}
        
    app.include_router(api_router, prefix=settings.API_V1_STR)
        
    return app

app = create_app()
