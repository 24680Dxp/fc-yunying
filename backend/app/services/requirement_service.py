from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.requirement import Requirement
from app.schemas.requirement import RequirementCreate, RequirementUpdate


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
        city: Optional[str] = None,
        district: Optional[str] = None,
        order_type: Optional[str] = None,
    ) -> tuple[list[Requirement], int]:
        # Build filter conditions for count
        filters = []
        if priority:
            filters.append(Requirement.priority == priority)
        if status:
            filters.append(Requirement.status == status)
        if city:
            filters.append(Requirement.city == city)
        if district:
            filters.append(Requirement.district == district)
        if order_type:
            filters.append(Requirement.order_type == order_type)

        # Count independently
        count_query = select(func.count()).select_from(Requirement)
        if filters:
            count_query = count_query.where(*filters)
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
        req.status = "closed"
        db.commit()
        return True
