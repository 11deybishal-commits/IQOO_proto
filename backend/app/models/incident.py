from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Float, DateTime
from app.models.base import Base
from datetime import datetime

class Incident(Base):
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="open", index=True)
    severity: Mapped[str] = mapped_column(String(50), default="low", index=True)
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    project: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Hackathon additions
    postmortem: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_cost_per_minute: Mapped[float | None] = mapped_column(Float, nullable=True)
    affected_services: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of service names
