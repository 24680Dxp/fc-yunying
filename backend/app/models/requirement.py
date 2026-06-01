from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 10 个业务字段
    receive_date = Column(String(50), nullable=True, comment="接收日期")
    city = Column(String(100), nullable=True, comment="市")
    district = Column(String(100), nullable=True, comment="区/县")
    outlet_code = Column(String(100), nullable=True, comment="网点号")
    owner_name = Column(String(100), nullable=True, comment="业主姓名")
    contact = Column(String(100), nullable=True, comment="联系方式")
    order_type = Column(String(100), nullable=True, comment="工单类型")
    install_address = Column(Text, nullable=True, comment="安装地址")
    product_code = Column(String(200), nullable=True, comment="产品编码")
    remark = Column(Text, nullable=True, comment="备注")

    # 公共字段
    status = Column(String(30), nullable=False, default="pending_review")
    priority = Column(String(20), nullable=False, default="medium")
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
        return "<Requirement(id={}, owner={!r})>".format(self.id, self.owner_name)
