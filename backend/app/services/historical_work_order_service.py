from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.historical_work_order import HistoricalWorkOrder
from app.schemas.historical_work_order import (
    HistoricalWorkOrderCreate,
    HistoricalWorkOrderUpdate,
)


class HistoricalWorkOrderService:

    @staticmethod
    def get(db: Session, id: int) -> Optional[HistoricalWorkOrder]:
        return db.get(HistoricalWorkOrder, id)

    @staticmethod
    def create(db: Session, data: HistoricalWorkOrderCreate) -> HistoricalWorkOrder:
        wo = HistoricalWorkOrder(**data.model_dump())
        db.add(wo)
        db.commit()
        db.refresh(wo)
        return wo

    @staticmethod
    def update(db: Session, id: int, data: HistoricalWorkOrderUpdate) -> Optional[HistoricalWorkOrder]:
        wo = db.get(HistoricalWorkOrder, id)
        if not wo:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(wo, k, v)
        db.commit()
        db.refresh(wo)
        return wo

    @staticmethod
    def delete(db: Session, id: int) -> bool:
        wo = db.get(HistoricalWorkOrder, id)
        if not wo:
            return False
        db.delete(wo)
        db.commit()
        return True

    @staticmethod
    def list_work_orders(
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        city: Optional[str] = None,
    ) -> Tuple[List[HistoricalWorkOrder], int]:
        filters = []
        if city:
            filters.append(HistoricalWorkOrder.city == city)
        if search:
            filters.append(
                HistoricalWorkOrder.site_code.ilike(f"%{search}%")
                | HistoricalWorkOrder.crm_order_id.ilike(f"%{search}%")
                | HistoricalWorkOrder.internet_work_order.ilike(f"%{search}%")
                | HistoricalWorkOrder.ql_work_order.ilike(f"%{search}%")
                | HistoricalWorkOrder.batch.ilike(f"%{search}%")
            )

        count_query = select(func.count()).select_from(HistoricalWorkOrder)
        if filters:
            count_query = count_query.where(*filters)
        total = db.execute(count_query).scalar() or 0

        data_query = select(HistoricalWorkOrder)
        if filters:
            data_query = data_query.where(*filters)
        data_query = data_query.order_by(HistoricalWorkOrder.created_at.desc())
        data_query = data_query.offset(skip).limit(limit)
        items = list(db.execute(data_query).scalars().all())
        return items, total

    @staticmethod
    def batch_import(db: Session, items: List[dict]) -> dict:
        """批量导入。站点编号唯一：已存在则覆盖更新，不存在则新增。"""
        imported = 0
        updated = 0
        skipped = 0
        skipped_details = []
        seen = set()

        for item in items:
            site_code = (item.get("site_code") or "").strip()
            if not site_code:
                skipped += 1
                skipped_details.append("站点编号为空")
                continue

            if site_code in seen:
                skipped += 1
                skipped_details.append(f"站点编号[{site_code}] 批次内重复")
                continue
            seen.add(site_code)

            existing = db.execute(
                select(HistoricalWorkOrder).where(
                    HistoricalWorkOrder.site_code == site_code,
                )
            ).scalars().first()

            if existing:
                # 覆盖更新
                existing.batch = item.get("batch")
                existing.city = item.get("city")
                existing.access_address = item.get("access_address")
                existing.crm_order_id = item.get("crm_order_id")
                existing.line_group_product_number = item.get("line_group_product_number")
                existing.internet_work_order = item.get("internet_work_order")
                existing.internet_work_order_status = item.get("internet_work_order_status")
                existing.ql_crm_order_id = item.get("ql_crm_order_id")
                existing.ql_group_product_number = item.get("ql_group_product_number")
                existing.ql_work_order = item.get("ql_work_order")
                existing.ql_work_order_status = item.get("ql_work_order_status")
                updated += 1
            else:
                wo = HistoricalWorkOrder(
                    site_code=site_code,
                    batch=item.get("batch"),
                    city=item.get("city"),
                    access_address=item.get("access_address"),
                    crm_order_id=item.get("crm_order_id"),
                    line_group_product_number=item.get("line_group_product_number"),
                    internet_work_order=item.get("internet_work_order"),
                    internet_work_order_status=item.get("internet_work_order_status"),
                    ql_crm_order_id=item.get("ql_crm_order_id"),
                    ql_group_product_number=item.get("ql_group_product_number"),
                    ql_work_order=item.get("ql_work_order"),
                    ql_work_order_status=item.get("ql_work_order_status"),
                )
                db.add(wo)
                imported += 1

        db.commit()
        return {
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "skipped_count": skipped,
            "skipped_details": skipped_details,
        }

    @staticmethod
    def get_cities(db: Session) -> List[str]:
        query = (
            select(HistoricalWorkOrder.city)
            .distinct()
            .where(HistoricalWorkOrder.city.isnot(None), HistoricalWorkOrder.city != "")
            .order_by(HistoricalWorkOrder.city)
        )
        rows = db.execute(query).scalars().all()
        return [r for r in rows if r]
