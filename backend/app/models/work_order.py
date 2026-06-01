from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 14 个业务字段
    crm_order_id = Column(String(100), nullable=True, comment="CRM订单号")
    order_no = Column(String(100), nullable=True, comment="工单号")
    title = Column(String(255), nullable=False, comment="工单主题")
    dispatch_time = Column(String(50), nullable=True, comment="派单时间")
    business_city = Column(String(100), nullable=True, comment="业务受理地市")
    product_category = Column(String(100), nullable=True, comment="产品分类")
    operation_type = Column(String(100), nullable=True, comment="操作类型")
    group_product_number = Column(String(200), nullable=True, comment="集团产品号码")
    business_location_city = Column(String(100), nullable=True, comment="业务所属地市")
    customer_address = Column(Text, nullable=True, comment="客户机房详细地址")
    status = Column(String(30), nullable=False, default="pending_assign", comment="工单状态")
    current_step = Column(String(100), nullable=True, comment="当前环节名称")
    camera_install_location = Column(Text, nullable=True, comment="摄像头安装位置")
    product_instance_id = Column(String(200), nullable=True, comment="产品实例编号")

    # 原有公共字段
    description = Column(Text, nullable=True)
    priority = Column(String(20), nullable=False, default="medium")
    assignee = Column(String(100), nullable=True)
    reporter = Column(String(100), nullable=True)
    requirement_id = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return "<WorkOrder(id={}, title={!r})>".format(self.id, self.title)
