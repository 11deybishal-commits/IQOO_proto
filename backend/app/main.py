from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all DB tables on startup."""
    from app.db.session import engine
    from app.models.base import Base
    # Import all models so SQLAlchemy registers them before create_all
    import app.models.user          # noqa: F401
    import app.models.incident      # noqa: F401
    import app.models.topology      # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield  # app runs here

    # Cleanup on shutdown
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5176",
            "http://127.0.0.1:5176",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok", "version": settings.VERSION}

    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
