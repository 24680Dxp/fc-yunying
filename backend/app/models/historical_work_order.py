from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class HistoricalWorkOrder(Base):
    __tablename__ = "historical_work_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)

    site_code = Column(String(100), unique=True, nullable=False, comment="站点编号")
    batch = Column(String(100), nullable=True, comment="批次")
    city = Column(String(100), nullable=True, comment="地市")
    access_address = Column(Text, nullable=True, comment="接入地址")
    crm_order_id = Column(String(200), nullable=True, comment="CRM订单号")
    line_group_product_number = Column(String(200), nullable=True, comment="专线集团产品号")
    internet_work_order = Column(String(200), nullable=True, comment="互联网工单")
    internet_work_order_status = Column(String(100), nullable=True, comment="互联网工单状态")
    ql_crm_order_id = Column(String(200), nullable=True, comment="千里眼CRM订单号")
    ql_group_product_number = Column(String(200), nullable=True, comment="千里眼集团产品号")
    ql_work_order = Column(String(200), nullable=True, comment="千里眼工单")
    ql_work_order_status = Column(String(100), nullable=True, comment="千里眼工单状态")

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return f"<HistoricalWorkOrder(id={self.id}, site={self.site_code!r})>"
