from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from typing import List

from pydantic import BaseModel

from app.database import get_db
from app.models.work_order import WorkOrder
from app.models.requirement import Requirement


router = APIRouter(prefix="/api/v1/statistics", tags=["统计分析"])


class TotalStats(BaseModel):
    total_work_orders: int
    total_requirements: int
    active_work_orders: int
    archived_work_orders: int


class GroupCount(BaseModel):
    name: str
    count: int


class CrossStatItem(BaseModel):
    operation_type: str
    internet: int
    qianliyan: int
    total: int


class ActiveByCityDetail(BaseModel):
    name: str
    total: int
    qianliyan_open: int
    qianliyan_adjust: int
    qianliyan_cancel: int
    internet_open: int
    internet_cancel: int


@router.get("/total")
def get_total_stats(db: Session = Depends(get_db)):
    total_work_orders = db.execute(select(func.count()).select_from(WorkOrder)).scalar()
    total_requirements = db.execute(select(func.count()).select_from(Requirement)).scalar()
    active_work_orders = db.execute(
        select(func.count()).select_from(WorkOrder).where(WorkOrder.status == "开通中")
    ).scalar()
    archived_work_orders = db.execute(
        select(func.count()).select_from(WorkOrder).where(WorkOrder.status == "已归档")
    ).scalar()
    return TotalStats(
        total_work_orders=total_work_orders,
        total_requirements=total_requirements,
        active_work_orders=active_work_orders,
        archived_work_orders=archived_work_orders,
    )


@router.get("/by-operation-type", response_model=List[GroupCount])
def stats_by_operation_type(db: Session = Depends(get_db)):
    rows = db.execute(
        select(WorkOrder.operation_type, func.count().label("cnt"))
        .group_by(WorkOrder.operation_type)
        .order_by(func.count().desc())
    ).all()
    return [GroupCount(name=r[0], count=r[1]) for r in rows]


@router.get("/by-product-category", response_model=List[GroupCount])
def stats_by_product_category(db: Session = Depends(get_db)):
    """按产品分类分组统计：互联网专线 / 千里眼（包含视频算力一张网和接入和云存储功能费用）"""
    internet_count = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(WorkOrder.product_category == "互联网专线")
    ).scalar() or 0

    qianliyan_count = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]))
    ).scalar() or 0

    return [
        GroupCount(name="互联网专线", count=internet_count),
        GroupCount(name="千里眼", count=qianliyan_count),
    ]


@router.get("/by-status", response_model=List[GroupCount])
def stats_by_status(db: Session = Depends(get_db)):
    rows = db.execute(
        select(WorkOrder.status, func.count().label("cnt"))
        .group_by(WorkOrder.status)
        .order_by(func.count().desc())
    ).all()
    return [GroupCount(name=r[0], count=r[1]) for r in rows]


@router.get("/by-city", response_model=List[GroupCount])
def stats_by_city(db: Session = Depends(get_db)):
    rows = db.execute(
        select(WorkOrder.business_location_city, func.count().label("cnt"))
        .where(WorkOrder.business_location_city.isnot(None), WorkOrder.business_location_city != "")
        .group_by(WorkOrder.business_location_city)
        .order_by(func.count().desc())
    ).all()
    return [GroupCount(name=r[0], count=r[1]) for r in rows]


@router.get("/active-by-city", response_model=List[GroupCount])
def stats_active_by_city(db: Session = Depends(get_db)):
    """在途工单（开通中）按业务所属地市降序排列"""
    rows = db.execute(
        select(WorkOrder.business_location_city, func.count().label("cnt"))
        .where(
            WorkOrder.status == "开通中",
        )
        .group_by(WorkOrder.business_location_city)
        .order_by(func.count().desc())
    ).all()
    result = []
    for city, cnt in rows:
        name = city if city and city.strip() else "未知"
        result.append(GroupCount(name=name, count=cnt))
    return result


@router.get("/active-by-city-detail", response_model=List[ActiveByCityDetail])
def stats_active_by_city_detail(db: Session = Depends(get_db)):
    """在途工单按地市展开：总在途、千里眼开通/调整/取消、互联网开通/取消"""
    rows = db.execute(
        select(
            WorkOrder.business_location_city,
            WorkOrder.product_category,
            WorkOrder.operation_type,
            func.count().label("cnt"),
        )
        .where(WorkOrder.status == "开通中")
        .group_by(
            WorkOrder.business_location_city,
            WorkOrder.product_category,
            WorkOrder.operation_type,
        )
        .order_by(WorkOrder.business_location_city)
    ).all()

    agg = {}
    for city, cat, op_type, cnt in rows:
        city_key = city if city and city.strip() else "未知"
        if city_key not in agg:
            agg[city_key] = {"total": 0, "qianliyan_open": 0, "qianliyan_adjust": 0,
                             "qianliyan_cancel": 0, "internet_open": 0, "internet_cancel": 0}
        agg[city_key]["total"] += cnt

        is_qianliyan = cat in ("视频算力一张网", "接入和云存储功能费用")
        if is_qianliyan:
            if op_type == "业务开通":
                agg[city_key]["qianliyan_open"] += cnt
            elif op_type == "业务调整":
                agg[city_key]["qianliyan_adjust"] += cnt
            elif op_type == "业务取消":
                agg[city_key]["qianliyan_cancel"] += cnt
        else:
            if op_type == "业务开通":
                agg[city_key]["internet_open"] += cnt
            elif op_type == "业务取消":
                agg[city_key]["internet_cancel"] += cnt

    result = []
    for name in sorted(agg.keys(), key=lambda k: -agg[k]["total"]):
        v = agg[name]
        result.append(ActiveByCityDetail(
            name=name,
            total=v["total"],
            qianliyan_open=v["qianliyan_open"],
            qianliyan_adjust=v["qianliyan_adjust"],
            qianliyan_cancel=v["qianliyan_cancel"],
            internet_open=v["internet_open"],
            internet_cancel=v["internet_cancel"],
        ))
    return result


@router.get("/cross-operation-category", response_model=List[CrossStatItem])
def stats_cross_operation_category(db: Session = Depends(get_db)):
    """操作类型 x 产品分类分组（互联网专线/千里眼）交叉统计"""
    rows = db.execute(
        select(
            WorkOrder.operation_type,
            WorkOrder.product_category,
            func.count().label("cnt"),
        )
        .group_by(WorkOrder.operation_type, WorkOrder.product_category)
        .order_by(WorkOrder.operation_type)
    ).all()

    agg = {}
    for op_type, cat, cnt in rows:
        if op_type not in agg:
            agg[op_type] = {"internet": 0, "qianliyan": 0}
        if cat == "互联网专线":
            agg[op_type]["internet"] = cnt
        elif cat in ("视频算力一张网", "接入和云存储功能费用"):
            agg[op_type]["qianliyan"] += cnt

    result = []
    for op_type in sorted(agg.keys(), key=lambda k: -agg[k]["internet"] - agg[k]["qianliyan"]):
        v = agg[op_type]
        result.append(CrossStatItem(
            operation_type=op_type,
            internet=v["internet"],
            qianliyan=v["qianliyan"],
            total=v["internet"] + v["qianliyan"],
        ))
    return result
