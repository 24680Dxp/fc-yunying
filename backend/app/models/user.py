from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # admin / user
    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return "<User(id={}, username={!r}, role={!r})>".format(self.id, self.username, self.role)
