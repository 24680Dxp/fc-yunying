from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 10 个业务字段
    receive_date: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="接收日期"
    )
    city: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="市"
    )
    district: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="区/县"
    )
    outlet_code: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="网点号"
    )
    owner_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="业主姓名"
    )
    contact: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="联系方式"
    )
    order_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="工单类型"
    )
    install_address: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="安装地址"
    )
    product_code: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="产品编码"
    )
    remark: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="备注"
    )

    # 公共字段
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending_review"
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Requirement(id={self.id}, owner={self.owner_name!r})>"
