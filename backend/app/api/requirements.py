from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.requirement import (
    RequirementCreate,
    RequirementList,
    RequirementResponse,
    RequirementUpdate,
)
from app.services.requirement_service import RequirementService, attach_req_status

router = APIRouter(prefix="/api/v1/requirements", tags=["需求管理"])


def _enrich(requirement_obj, db: Session) -> RequirementResponse:
    """将 ORM 对象转为 Response，并注入计算的 req_status"""
    resp = RequirementResponse.from_orm(requirement_obj)
    resp.req_status = attach_req_status(requirement_obj, db)
    return resp


@router.get("/", response_model=RequirementList)
def list_requirements(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None, description="市"),
    district: Optional[str] = Query(None, description="区/县"),
    order_type: Optional[str] = Query(None, description="工单类型"),
    db: Session = Depends(get_db),
):
    items, total = RequirementService.list_requirements(
        db,
        skip=skip,
        limit=limit,
        priority=priority,
        status=status,
        search=search,
        city=city,
        district=district,
        order_type=order_type,
    )
    return RequirementList(
        total=total,
        items=[_enrich(r, db) for r in items],
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=RequirementResponse, status_code=201)
def create_requirement(data: RequirementCreate, db: Session = Depends(get_db)):
    req = RequirementService.create_requirement(db, data)
    return _enrich(req, db)


@router.get("/{requirement_id}", response_model=RequirementResponse)
def get_requirement(requirement_id: int, db: Session = Depends(get_db)):
    req = RequirementService.get_requirement(db, requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="需求不存在")
    return _enrich(req, db)


@router.put("/{requirement_id}", response_model=RequirementResponse)
def update_requirement(
    requirement_id: int, data: RequirementUpdate, db: Session = Depends(get_db)
):
    req = RequirementService.update_requirement(db, requirement_id, data)
    if not req:
        raise HTTPException(status_code=404, detail="需求不存在")
    return _enrich(req, db)


@router.delete("/{requirement_id}", status_code=204)
def delete_requirement(requirement_id: int, db: Session = Depends(get_db)):
    ok = RequirementService.delete_requirement(db, requirement_id)
    if not ok:
        raise HTTPException(status_code=404, detail="需求不存在")
    return None
