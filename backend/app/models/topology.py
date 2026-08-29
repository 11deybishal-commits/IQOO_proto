from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, Boolean
from app.models.base import Base

class ServiceNode(Base):
    """Represents a service in the infrastructure topology."""
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_type: Mapped[str] = mapped_column(String(50), default="service")  # service, database, queue, gateway
    team: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cost_per_minute: Mapped[float] = mapped_column(Float, default=100.0)  # Revenue loss per minute if down
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)  # Graph layout position X
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)  # Graph layout position Y
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class ServiceEdge(Base):
    """Represents a dependency link between two services."""
    source_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    edge_type: Mapped[str] = mapped_column(String(50), default="http")  # http, grpc, amqp, tcp
