from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.requirement import Requirement
from app.models.work_order import WorkOrder
from app.schemas.requirement import RequirementCreate, RequirementUpdate

# 工单类型 → operation_type 映射
ORDER_TYPE_TO_OP = {
    '网点新增': '业务开通',
    '网点迁移': '业务调整',
    '网点注销': '业务取消',
}


def _extract_site_code(text: str) -> str:
    """从文本中提取8位站点编号"""
    import re
    m = re.search(r'\d{8}', text or '')
    return m.group() if m else ''


def _compute_req_status(req: Requirement, db: Session) -> str:
    """根据需求的工单类型和网点号，匹配工单清单计算需求状态"""
    order_type = req.order_type or ''
    outlet_code = req.outlet_code or ''

    # 非网点类工单默认"待开发"
    if order_type not in ('网点新增', '网点迁移', '网点注销'):
        return '待开发'

    op_type = ORDER_TYPE_TO_OP.get(order_type)
    if not op_type:
        return '待评审'

    # 查询匹配的工单（同一个 operation_type，且包含该网点号）
    query = select(WorkOrder).where(
        WorkOrder.operation_type == op_type,
    )
    work_orders = list(db.execute(query).scalars().all())

    # 用网点号匹配工单的站点编号
    matched_wo = None
    for wo in work_orders:
        addr = wo.customer_address or ''
        cam = wo.camera_install_location or ''
        site_code = _extract_site_code(addr) or _extract_site_code(cam)
        if site_code == outlet_code:
            matched_wo = wo
            break

    if not matched_wo:
        return '待评审'

    # 匹配到了，看工单状态
    if matched_wo.status == '已归档':
        return '已完工'
    else:
        return '处理中'


class RequirementService:
    """Business logic layer for requirements."""

    @staticmethod
    def list_requirements(
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        city: Optional[List[str]] = None,
        district: Optional[str] = None,
        order_type: Optional[List[str]] = None,
    ) -> Tuple[List[Requirement], int]:
        # Build filter conditions for count
        filters = []
        if priority:
            filters.append(Requirement.priority == priority)
        if status:
            filters.append(Requirement.status == status)
        if city:
            filters.append(Requirement.city.in_(city))
        if district:
            filters.append(Requirement.district == district)
        if order_type:
            filters.append(Requirement.order_type.in_(order_type))

        # Count independently
        count_query = select(func.count()).select_from(Requirement)
        if filters:
            count_query = count_query.where(*filters)
        if search:
            count_query = count_query.where(
                Requirement.owner_name.ilike(f"%{search}%")
                | Requirement.outlet_code.ilike(f"%{search}%")
                | Requirement.contact.ilike(f"%{search}%")
                | Requirement.product_code.ilike(f"%{search}%")
            )
        total = db.execute(count_query).scalar()

        # Build data query
        data_query = select(Requirement)
        if filters:
            data_query = data_query.where(*filters)
        if search:
            data_query = data_query.where(
                Requirement.owner_name.ilike(f"%{search}%")
                | Requirement.outlet_code.ilike(f"%{search}%")
                | Requirement.contact.ilike(f"%{search}%")
                | Requirement.product_code.ilike(f"%{search}%")
            )
        data_query = data_query.order_by(Requirement.created_at.desc())
        data_query = data_query.offset(skip).limit(limit)
        items = list(db.execute(data_query).scalars().all())
        return items, total

    @staticmethod
    def get_requirement(db: Session, requirement_id: int) -> Optional[Requirement]:
        return db.get(Requirement, requirement_id)

    @staticmethod
    def create_requirement(db: Session, data: RequirementCreate) -> Requirement:
        req = Requirement(**data.model_dump())
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    @staticmethod
    def update_requirement(
        db: Session, requirement_id: int, data: RequirementUpdate
    ) -> Optional[Requirement]:
        req = db.get(Requirement, requirement_id)
        if not req:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(req, field, value)
        db.commit()
        db.refresh(req)
        return req

    @staticmethod
    def delete_requirement(db: Session, requirement_id: int) -> bool:
        req = db.get(Requirement, requirement_id)
        if not req:
            return False
        db.delete(req)
        db.commit()
        return True

    @staticmethod
    def batch_import(db: Session, items: List[dict]) -> dict:
        """批量导入需求。校验 网点号+工单类型+安装地址 唯一，返回导入统计。"""
        imported = 0
        skipped = 0
        skipped_details = []
        seen = set()  # 批次内去重

        for item in items:
            outlet_code = (item.get("outlet_code") or "").strip()
            order_type = (item.get("order_type") or "").strip()
            install_address = (item.get("install_address") or "").strip()

            key = (outlet_code, order_type, install_address)
            if key in seen:
                skipped += 1
                skipped_details.append(
                    f"网点号[{outlet_code}] 工单类型[{order_type}] 批次内重复"
                )
                continue
            seen.add(key)

            # 唯一性校验：查数据库
            existing = db.execute(
                select(Requirement).where(
                    Requirement.outlet_code == outlet_code,
                    Requirement.order_type == order_type,
                    Requirement.install_address == install_address,
                )
            ).scalars().first()

            if existing:
                skipped += 1
                skipped_details.append(
                    f"网点号[{outlet_code}] 工单类型[{order_type}] 安装地址[{install_address[:20]}...]"
                )
                continue

            req = Requirement(
                receive_date=item.get("receive_date"),
                owner_name=item.get("owner_name"),
                contact=item.get("contact"),
                city=item.get("city"),
                district=item.get("district"),
                outlet_code=outlet_code,
                order_type=order_type,
                install_address=install_address,
                remark=item.get("remark"),
            )
            db.add(req)
            imported += 1

        db.commit()
        return {
            "imported": imported,
            "skipped": skipped,
            "skipped_count": skipped,
            "skipped_details": skipped_details,
        }


def attach_req_status(req: Requirement, db: Session) -> str:
    """计算需求的 req_status 并返回"""
    return _compute_req_status(req, db)
