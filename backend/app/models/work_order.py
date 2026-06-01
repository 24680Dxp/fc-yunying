from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 14 个业务字段
    crm_order_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="CRM订单号"
    )
    order_no: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="工单号"
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, comment="工单主题")
    dispatch_time: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="派单时间"
    )
    business_city: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="业务受理地市"
    )
    product_category: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="产品分类"
    )
    operation_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="操作类型"
    )
    group_product_number: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="集团产品号码"
    )
    business_location_city: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="业务所属地市"
    )
    customer_address: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="客户机房详细地址"
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending_assign", comment="工单状态"
    )
    current_step: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="当前环节名称"
    )
    camera_install_location: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="摄像头安装位置"
    )
    product_instance_id: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="产品实例编号"
    )

    # 原有公共字段
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium"
    )
    assignee: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reporter: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requirement_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("requirements.id"), nullable=True
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

    requirement = relationship("Requirement", foreign_keys=[requirement_id])

    def __repr__(self) -> str:
        return f"<WorkOrder(id={self.id}, title={self.title!r})>"
