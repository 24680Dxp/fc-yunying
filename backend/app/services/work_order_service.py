from typing import Optional, Tuple, List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.work_order import WorkOrder
from app.schemas.work_order import WorkOrderCreate, WorkOrderUpdate


class WorkOrderService:
    """Business logic layer for work orders."""

    @staticmethod
    def list_work_orders(
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        business_city: Optional[str] = None,
        product_category: Optional[str] = None,
        operation_type: Optional[str] = None,
        business_location_city: Optional[str] = None,
        product_category_group: Optional[str] = None,
    ) -> Tuple[List[WorkOrder], int]:
        # Build filter conditions
        filters = []
        if status:
            filters.append(WorkOrder.status == status)
        if priority:
            filters.append(WorkOrder.priority == priority)
        if business_city:
            filters.append(WorkOrder.business_city == business_city)
        if product_category:
            filters.append(WorkOrder.product_category == product_category)
        if operation_type:
            filters.append(WorkOrder.operation_type == operation_type)
        if business_location_city:
            filters.append(WorkOrder.business_location_city == business_location_city)
        if product_category_group:
            if product_category_group == "千里眼":
                filters.append(
                    WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"])
                )
            elif product_category_group == "互联网专线":
                filters.append(WorkOrder.product_category == "互联网专线")

        # Count independently
        count_query = select(func.count()).select_from(WorkOrder)
        if filters:
            count_query = count_query.where(*filters)
        if search:
            count_query = count_query.where(
                WorkOrder.title.ilike(f"%{search}%")
                | WorkOrder.order_no.ilike(f"%{search}%")
                | WorkOrder.crm_order_id.ilike(f"%{search}%")
                | WorkOrder.customer_address.ilike(f"%{search}%")
                | WorkOrder.camera_install_location.ilike(f"%{search}%")
            )
        total = db.execute(count_query).scalar()

        # Build data query
        data_query = select(WorkOrder)
        if filters:
            data_query = data_query.where(*filters)
        if search:
            data_query = data_query.where(
                WorkOrder.title.ilike(f"%{search}%")
                | WorkOrder.order_no.ilike(f"%{search}%")
                | WorkOrder.crm_order_id.ilike(f"%{search}%")
                | WorkOrder.customer_address.ilike(f"%{search}%")
                | WorkOrder.camera_install_location.ilike(f"%{search}%")
            )
        data_query = data_query.order_by(WorkOrder.created_at.desc())
        data_query = data_query.offset(skip).limit(limit)
        items = list(db.execute(data_query).scalars().all())
        return items, total

    @staticmethod
    def get_work_order(db: Session, work_order_id: int) -> Optional[WorkOrder]:
        return db.get(WorkOrder, work_order_id)

    @staticmethod
    def create_work_order(db: Session, data: WorkOrderCreate) -> WorkOrder:
        wo = WorkOrder(**data.dict())
        db.add(wo)
        db.commit()
        db.refresh(wo)
        return wo

    @staticmethod
    def update_work_order(
        db: Session, work_order_id: int, data: WorkOrderUpdate
    ) -> Optional[WorkOrder]:
        wo = db.get(WorkOrder, work_order_id)
        if not wo:
            return None
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(wo, field, value)
        db.commit()
        db.refresh(wo)
        return wo

    @staticmethod
    def replace_all(db: Session, items: List[dict]) -> int:
        """清空所有工单并批量插入新数据。返回导入条数。"""
        # 清空
        db.query(WorkOrder).delete()
        # 批量插入
        for item in items:
            wo = WorkOrder(**item)
            db.add(wo)
        db.commit()
        return len(items)

    @staticmethod
    def delete_work_order(db: Session, work_order_id: int) -> bool:
        """Soft delete: set status to 'closed'."""
        wo = db.get(WorkOrder, work_order_id)
        if not wo:
            return False
        wo.status = "closed"
        db.commit()
        return True

    @staticmethod
    def get_business_location_cities(db: Session) -> List[str]:
        query = select(WorkOrder.business_location_city).distinct().where(
            WorkOrder.business_location_city.isnot(None),
            WorkOrder.business_location_city != '',
        ).order_by(WorkOrder.business_location_city)
        rows = db.execute(query).scalars().all()
        return list(rows)
