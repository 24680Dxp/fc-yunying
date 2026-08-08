from datetime import datetime, date
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from typing import List

from pydantic import BaseModel

from app.database import get_db
from app.models.work_order import WorkOrder
from app.models.requirement import Requirement
from app.models.historical_work_order import HistoricalWorkOrder


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


# ===== 历史工单统计 =====


class HistSummary(BaseModel):
    total: int
    city_count: int
    internet_count: int
    qianliyan_count: int


class HistByCityItem(BaseModel):
    name: str
    total: int
    internet_count: int
    qianliyan_count: int


@router.get("/historical-summary")
def hist_summary(db: Session = Depends(get_db)):
    """历史工单总览"""
    total = db.execute(select(func.count()).select_from(HistoricalWorkOrder)).scalar() or 0

    city_count = db.execute(
        select(func.count(func.distinct(HistoricalWorkOrder.city)))
        .where(HistoricalWorkOrder.city.isnot(None), HistoricalWorkOrder.city != "")
    ).scalar() or 0

    internet_count = db.execute(
        select(func.count()).select_from(HistoricalWorkOrder)
        .where(HistoricalWorkOrder.internet_work_order.isnot(None), HistoricalWorkOrder.internet_work_order != "")
    ).scalar() or 0

    qianliyan_count = db.execute(
        select(func.count()).select_from(HistoricalWorkOrder)
        .where(HistoricalWorkOrder.ql_work_order.isnot(None), HistoricalWorkOrder.ql_work_order != "")
    ).scalar() or 0

    return HistSummary(
        total=total,
        city_count=city_count,
        internet_count=internet_count,
        qianliyan_count=qianliyan_count,
    )


@router.get("/historical-by-city", response_model=List[HistByCityItem])
def hist_by_city(db: Session = Depends(get_db)):
    """历史工单按地市统计，含专线/千里眼拆分"""
    rows = db.execute(
        select(HistoricalWorkOrder.city, func.count().label("cnt"))
        .where(HistoricalWorkOrder.city.isnot(None), HistoricalWorkOrder.city != "")
        .group_by(HistoricalWorkOrder.city)
        .order_by(func.count().desc())
    ).all()

    result = []
    for city, total in rows:
        # 该地市的专线工单数
        internet_cnt = db.execute(
            select(func.count()).select_from(HistoricalWorkOrder)
            .where(
                HistoricalWorkOrder.city == city,
                HistoricalWorkOrder.internet_work_order.isnot(None),
                HistoricalWorkOrder.internet_work_order != "",
            )
        ).scalar() or 0

        # 该地市的千里眼工单数
        ql_cnt = db.execute(
            select(func.count()).select_from(HistoricalWorkOrder)
            .where(
                HistoricalWorkOrder.city == city,
                HistoricalWorkOrder.ql_work_order.isnot(None),
                HistoricalWorkOrder.ql_work_order != "",
            )
        ).scalar() or 0

        result.append(HistByCityItem(
            name=city,
            total=total,
            internet_count=internet_cnt,
            qianliyan_count=ql_cnt,
        ))

    return result


@router.get("/historical-internet-status", response_model=List[GroupCount])
def hist_internet_status(db: Session = Depends(get_db)):
    """专线工单状态分布"""
    rows = db.execute(
        select(
            HistoricalWorkOrder.internet_work_order_status,
            func.count().label("cnt"),
        )
        .where(
            HistoricalWorkOrder.internet_work_order_status.isnot(None),
            HistoricalWorkOrder.internet_work_order_status != "",
        )
        .group_by(HistoricalWorkOrder.internet_work_order_status)
        .order_by(func.count().desc())
    ).all()
    return [GroupCount(name=r[0] if r[0] else "未知", count=r[1]) for r in rows]


@router.get("/historical-ql-status", response_model=List[GroupCount])
def hist_ql_status(db: Session = Depends(get_db)):
    """千里眼工单状态分布"""
    rows = db.execute(
        select(
            HistoricalWorkOrder.ql_work_order_status,
            func.count().label("cnt"),
        )
        .where(
            HistoricalWorkOrder.ql_work_order_status.isnot(None),
            HistoricalWorkOrder.ql_work_order_status != "",
        )
        .group_by(HistoricalWorkOrder.ql_work_order_status)
        .order_by(func.count().desc())
    ).all()
    return [GroupCount(name=r[0] if r[0] else "未知", count=r[1]) for r in rows]


# ===== 全周期统计 =====


class FullcycleSummary(BaseModel):
    operation_total: int
    operation_internet: int
    operation_qianliyan: int
    hist_total: int
    grand_total: int
    operation_requirements: int
    hist_internet_count: int
    hist_qianliyan_count: int
    operation_qianliyan_open: int
    operation_qianliyan_open_active: int
    operation_qianliyan_adjust_active: int
    operation_qianliyan_cancel: int
    valid_site_count: int
    valid_active_count: int


class FullcycleByCityItem(BaseModel):
    name: str
    operation_count: int
    hist_count: int
    total: int


@router.get("/fullcycle-summary")
def fullcycle_summary(db: Session = Depends(get_db)):
    """全周期总览：整合运营期 + 建设期"""
    operation_total = db.execute(select(func.count()).select_from(WorkOrder)).scalar() or 0
    hist_total = db.execute(select(func.count()).select_from(HistoricalWorkOrder)).scalar() or 0
    operation_requirements = db.execute(select(func.count()).select_from(Requirement)).scalar() or 0

    # 运营期按产品分类
    operation_internet = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(WorkOrder.product_category == "互联网专线")
    ).scalar() or 0
    operation_qianliyan = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]))
    ).scalar() or 0

    # 建设期专线/千里眼
    hist_internet_count = db.execute(
        select(func.count()).select_from(HistoricalWorkOrder)
        .where(HistoricalWorkOrder.internet_work_order.isnot(None), HistoricalWorkOrder.internet_work_order != "")
    ).scalar() or 0
    hist_qianliyan_count = db.execute(
        select(func.count()).select_from(HistoricalWorkOrder)
        .where(HistoricalWorkOrder.ql_work_order.isnot(None), HistoricalWorkOrder.ql_work_order != "")
    ).scalar() or 0

    # 运营期千里眼开通/取消
    operation_qianliyan_open = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(
            WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]),
            WorkOrder.operation_type == "业务开通",
        )
    ).scalar() or 0
    operation_qianliyan_open_active = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(
            WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]),
            WorkOrder.operation_type == "业务开通",
            WorkOrder.status == "开通中",
        )
    ).scalar() or 0
    operation_qianliyan_adjust_active = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(
            WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]),
            WorkOrder.operation_type == "业务调整",
            WorkOrder.status == "开通中",
        )
    ).scalar() or 0
    operation_qianliyan_cancel = db.execute(
        select(func.count()).select_from(WorkOrder)
        .where(
            WorkOrder.product_category.in_(["视频算力一张网", "接入和云存储功能费用"]),
            WorkOrder.operation_type == "业务取消",
        )
    ).scalar() or 0

    # 当前有效站点总数 = 建设期千里眼 + 运营期千里眼开通 - 运营期千里眼取消
    valid_site_count = hist_qianliyan_count + operation_qianliyan_open - operation_qianliyan_cancel
    valid_active_count = operation_qianliyan_open_active + operation_qianliyan_adjust_active

    return FullcycleSummary(
        operation_total=operation_total,
        operation_internet=operation_internet,
        operation_qianliyan=operation_qianliyan,
        hist_total=hist_internet_count + hist_qianliyan_count,
        grand_total=operation_total + hist_internet_count + hist_qianliyan_count,
        operation_requirements=operation_requirements,
        hist_internet_count=hist_internet_count,
        hist_qianliyan_count=hist_qianliyan_count,
        operation_qianliyan_open=operation_qianliyan_open,
        operation_qianliyan_open_active=operation_qianliyan_open_active,
        operation_qianliyan_adjust_active=operation_qianliyan_adjust_active,
        operation_qianliyan_cancel=operation_qianliyan_cancel,
        valid_site_count=valid_site_count,
        valid_active_count=valid_active_count,
    )


@router.get("/fullcycle-by-city", response_model=List[FullcycleByCityItem])
def fullcycle_by_city(db: Session = Depends(get_db)):
    """全周期按地市：合并运营期 + 建设期"""
    # 运营期按地市
    op_rows = db.execute(
        select(WorkOrder.business_location_city, func.count().label("cnt"))
        .where(WorkOrder.business_location_city.isnot(None), WorkOrder.business_location_city != "")
        .group_by(WorkOrder.business_location_city)
    ).all()

    # 建设期按地市
    hist_rows = db.execute(
        select(HistoricalWorkOrder.city, func.count().label("cnt"))
        .where(HistoricalWorkOrder.city.isnot(None), HistoricalWorkOrder.city != "")
        .group_by(HistoricalWorkOrder.city)
    ).all()

    agg = {}
    for city, cnt in op_rows:
        city_key = city.strip() if city else "未知"
        agg[city_key] = {"operation_count": cnt, "hist_count": 0}

    for city, cnt in hist_rows:
        city_key = city.strip() if city else "未知"
        if city_key not in agg:
            agg[city_key] = {"operation_count": 0, "hist_count": 0}
        agg[city_key]["hist_count"] += cnt

    result = []
    for name in sorted(agg.keys(), key=lambda k: -(agg[k]["operation_count"] + agg[k]["hist_count"])):
        v = agg[name]
        result.append(FullcycleByCityItem(
            name=name,
            operation_count=v["operation_count"],
            hist_count=v["hist_count"],
            total=v["operation_count"] + v["hist_count"],
        ))
    return result


# ===== 数据画像 =====

def _normalize_product(cat: str) -> str:
    """产品分类标准化：视频算力一张网/接入和云存储功能费用 → 千里眼"""
    if cat in ("视频算力一张网", "接入和云存储功能费用"):
        return "千里眼"
    return "互联网专线"


def _normalize_biz(op_type: str) -> str:
    """操作类型 → 业务大类"""
    mapping = {"业务开通": "开通", "业务调整": "调整", "业务取消": "销户"}
    return mapping.get(op_type, op_type)


@router.get("/portrait")
def get_portrait(db: Session = Depends(get_db)):
    """工单数据画像 — 全方位分析运营期工单"""
    all_orders = db.execute(select(WorkOrder)).scalars().all()
    today = date.today()

    records = []
    for wo in all_orders:
        r = {
            "product": _normalize_product(wo.product_category or ""),
            "biz": _normalize_biz(wo.operation_type or ""),
            "status": wo.status or "",
            "city": (wo.business_location_city or "").strip(),
            "step": wo.current_step or "",
            "dispatch_time": wo.dispatch_time or "",
        }
        backlog = 0
        if r["status"] == "开通中" and r["dispatch_time"]:
            try:
                dt = datetime.strptime(r["dispatch_time"][:10], "%Y-%m-%d").date()
                backlog = (today - dt).days
            except Exception:
                pass
        r["backlog"] = backlog
        records.append(r)

    if not records:
        return {"overview": {"total_detail_rows": 0}, "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

    total = len(records)
    completed = sum(1 for r in records if r["status"] == "已归档")
    inprog = total - completed

    # overview
    times = [r["dispatch_time"] for r in records if r["dispatch_time"]]
    sheets = {"销户": 0, "开通": 0, "调整": 0}
    for r in records:
        if r["biz"] in sheets:
            sheets[r["biz"]] += 1

    overview = {
        "total_detail_rows": total, "total_columns": 14,
        "sheets": {k: {"rows": v, "cols": 14} for k, v in sheets.items()},
        "time_range": {"start": min(times) if times else "", "end": max(times) if times else ""},
        "overall_completion_rate": round(completed / total * 100, 2),
        "overall_in_progress_rate": round(inprog / total * 100, 2),
        "total_completed": completed, "total_in_progress": inprog,
    }

    # helpers
    def _group_stats(key_func, label_key):
        agg = defaultdict(lambda: {"total": 0, "completed": 0})
        for r in records:
            k = key_func(r)
            agg[k]["total"] += 1
            if r["status"] == "已归档":
                agg[k]["completed"] += 1
        return [{
            label_key: k, "total_orders": v["total"], "completed": v["completed"],
            "in_progress": v["total"] - v["completed"],
            "completion_rate": round(v["completed"] / v["total"] * 100, 2) if v["total"] > 0 else 0,
            "in_progress_rate": round((v["total"] - v["completed"]) / v["total"] * 100, 2) if v["total"] > 0 else 0,
        } for k, v in agg.items()]

    product_stats = _group_stats(lambda r: r["product"], "产品分类")

    # product_detail_stats
    detail_agg = defaultdict(lambda: {"total": 0, "completed": 0})
    for wo in all_orders:
        cat = wo.product_category or "未知"
        detail_agg[cat]["total"] += 1
        if wo.status == "已归档":
            detail_agg[cat]["completed"] += 1
    product_detail_stats = [{
        "产品分类": k, "total_orders": v["total"], "completed": v["completed"],
        "in_progress": v["total"] - v["completed"],
        "completion_rate": round(v["completed"] / v["total"] * 100, 2) if v["total"] > 0 else 0,
    } for k, v in detail_agg.items()]

    # product_biz_summary
    pbs = []
    for prod in ["互联网专线", "千里眼"]:
        for biz in ["开通", "调整", "销户"]:
            g = [r for r in records if r["product"] == prod and r["biz"] == biz]
            comp = sum(1 for r in g if r["status"] == "已归档")
            pbs.append({"产品分类": prod, "业务类型": biz, "完成工单数量": comp, "在途工单数量": len(g) - comp, "合计工单数量": len(g)})
        g = [r for r in records if r["product"] == prod]
        comp = sum(1 for r in g if r["status"] == "已归档")
        pbs.append({"产品分类": prod, "业务类型": "小计", "完成工单数量": comp, "在途工单数量": len(g) - comp, "合计工单数量": len(g)})
    pbs.append({"产品分类": "总计", "业务类型": "总计", "完成工单数量": completed, "在途工单数量": inprog, "合计工单数量": total})

    biz_stats = _group_stats(lambda r: r["biz"], "业务类型")

    # city_stats
    city_agg = defaultdict(lambda: {"total": 0, "completed": 0})
    for r in records:
        if r["city"]:
            city_agg[r["city"]]["total"] += 1
            if r["status"] == "已归档":
                city_agg[r["city"]]["completed"] += 1
    city_stats = []
    for city, v in sorted(city_agg.items(), key=lambda x: -x[1]["total"]):
        city_stats.append({
            "地市": city, "total_orders": v["total"], "completed": v["completed"],
            "in_progress": v["total"] - v["completed"],
            "completion_rate": round(v["completed"] / v["total"] * 100, 2) if v["total"] > 0 else 0,
            "in_progress_rate": round((v["total"] - v["completed"]) / v["total"] * 100, 2) if v["total"] > 0 else 0,
        })
    city_completion_ranking = sorted(city_stats, key=lambda x: x["completion_rate"])

    # city_summary
    cities = sorted(set(r["city"] for r in records if r["city"]))
    city_summary = []
    for city in cities:
        g = [r for r in records if r["city"] == city]
        row = {"业务所属地市": city}
        for prod in ["互联网专线", "千里眼"]:
            pg = [r for r in g if r["product"] == prod]
            row[f"{prod}-完成"] = sum(1 for r in pg if r["status"] == "已归档")
            row[f"{prod}-在途"] = sum(1 for r in pg if r["status"] == "开通中")
            inprog_pg = [r for r in pg if r["status"] == "开通中"]
            for biz in ["开通", "调整", "销户"]:
                row[f"{prod}-{biz}在途"] = sum(1 for r in inprog_pg if r["biz"] == biz)
            row[f"{prod}-合计"] = len(pg)
        row["总计-完成"] = sum(1 for r in g if r["status"] == "已归档")
        row["总计-在途"] = sum(1 for r in g if r["status"] == "开通中")
        row["总计-合计"] = len(g)
        city_summary.append(row)
    total_row = {"业务所属地市": "总计"}
    for prod in ["互联网专线", "千里眼"]:
        pg = [r for r in records if r["product"] == prod]
        total_row[f"{prod}-完成"] = sum(1 for r in pg if r["status"] == "已归档")
        total_row[f"{prod}-在途"] = sum(1 for r in pg if r["status"] == "开通中")
        inprog_pg = [r for r in pg if r["status"] == "开通中"]
        for biz in ["开通", "调整", "销户"]:
            total_row[f"{prod}-{biz}在途"] = sum(1 for r in inprog_pg if r["biz"] == biz)
        total_row[f"{prod}-合计"] = len(pg)
    total_row["总计-完成"] = completed
    total_row["总计-在途"] = inprog
    total_row["总计-合计"] = total
    city_summary.append(total_row)

    # step stats
    step_dist = defaultdict(int)
    step_inprog = defaultdict(int)
    isp = {"互联网专线": defaultdict(int), "千里眼": defaultdict(int)}
    isb = {"开通": defaultdict(int), "调整": defaultdict(int), "销户": defaultdict(int)}
    for r in records:
        if r["step"]:
            step_dist[r["step"]] += 1
            if r["status"] == "开通中":
                step_inprog[r["step"]] += 1
                isp[r["product"]][r["step"]] += 1
                isb[r["biz"]][r["step"]] += 1

    # monthly trend
    month_agg = defaultdict(lambda: {"total": 0, "completed": 0})
    cmb = {"开通": defaultdict(int), "调整": defaultdict(int), "销户": defaultdict(int)}
    cmp = {"互联网专线": defaultdict(int), "千里眼": defaultdict(int)}
    for r in records:
        dt = r["dispatch_time"]
        if dt and len(dt) >= 7:
            m = dt[:7]
            month_agg[m]["total"] += 1
            if r["status"] == "已归档":
                month_agg[m]["completed"] += 1
            cmb[r["biz"]][m] += 1
            cmp[r["product"]][m] += 1

    months = sorted(month_agg.keys())
    monthly_trend = []
    for m in months:
        t = month_agg[m]["total"]
        c = month_agg[m]["completed"]
        monthly_trend.append({
            "月份": m, "total_orders": t, "completed": c, "in_progress": t - c,
            "completion_rate": round(c / t * 100, 2) if t > 0 else 0,
        })

    # cross tables
    cpb = {}
    for biz in ["开通", "调整", "销户"]:
        cpb[biz] = {}
        for prod in ["互联网专线", "千里眼"]:
            g = [r for r in records if r["biz"] == biz and r["product"] == prod]
            cpb[biz][prod] = round(sum(1 for r in g if r["status"] == "已归档") / len(g) * 100, 2) if g else 0

    ccp, ccb = {}, {}
    for prod in ["互联网专线", "千里眼", "总计"]:
        ccp[prod] = {c: sum(1 for r in records if r["city"] == c and (prod == "总计" or r["product"] == prod)) for c in cities}
    for biz in ["开通", "调整", "销户", "总计"]:
        ccb[biz] = {c: sum(1 for r in records if r["city"] == c and (biz == "总计" or r["biz"] == biz)) for c in cities}

    # deep analysis helper
    def _deep_analysis(items):
        if not items:
            return {"total": 0}
        result = {"total": len(items)}
        sc = defaultdict(int)
        pc = defaultdict(int)
        for r in items:
            if r["step"]:
                sc[r["step"]] += 1
            pc[r["product"]] += 1
        result["step_distribution"] = dict(sc)
        result["product_distribution"] = dict(pc)

        # city top15
        cagg = defaultdict(lambda: {"total": 0, "千里眼": 0, "互联网专线": 0, "steps": defaultdict(int)})
        for r in items:
            c = r["city"] or "未知"
            cagg[c]["total"] += 1
            cagg[c][r["product"]] += 1
            if r["step"]:
                cagg[c]["steps"][r["step"]] += 1
        clist = []
        for c, v in cagg.items():
            ms = max(v["steps"], key=v["steps"].get) if v["steps"] else ""
            clist.append({"city": c, "total": v["total"], "千里眼": v["千里眼"], "互联网专线": v["互联网专线"], "main_step": ms, "main_step_count": v["steps"][ms] if ms else 0})
        clist.sort(key=lambda x: x["total"], reverse=True)
        result["city_distribution"] = clist[:15]

        bls = [r["backlog"] for r in items if r["backlog"] > 0]
        if bls:
            sbls = sorted(bls)
            result["backlog_days"] = {
                "mean": round(sum(bls) / len(bls), 1), "median": sbls[len(bls) // 2],
                "max": max(bls), "min": min(bls),
                "over_30": sum(1 for d in bls if d > 30),
                "over_60": sum(1 for d in bls if d > 60),
                "over_90": sum(1 for d in bls if d > 90),
            }

        # top10 oldest
        sorted_items = sorted(items, key=lambda r: r["backlog"], reverse=True)
        result["top10_oldest"] = [{"产品": r["product"], "环节": r["step"], "地市": r["city"], "积压天数": r["backlog"], "派单时间": r["dispatch_time"]} for r in sorted_items[:10]]

        # step product cross
        sp = defaultdict(lambda: defaultdict(int))
        for r in items:
            if r["step"]:
                sp[r["step"]][r["product"]] += 1
        result["step_product_cross"] = {k: dict(v) for k, v in sp.items()}

        # monthly
        mc = defaultdict(int)
        for r in items:
            if r["dispatch_time"] and len(r["dispatch_time"]) >= 7:
                mc[r["dispatch_time"][:7]] += 1
        result["monthly_count"] = dict(sorted(mc.items()))

        # backlog bins
        bins = [(0, 7, "0-7天"), (8, 30, "8-30天"), (31, 60, "31-60天"), (61, 90, "61-90天"), (91, 999, "90天以上")]
        result["backlog_bins"] = [{"range": label, "count": sum(1 for r in items if lo <= r["backlog"] <= hi)} for lo, hi, label in bins]

        return result

    adj_records = [r for r in records if r["biz"] == "调整" and r["status"] == "开通中"]
    adjustment_inprogress = _deep_analysis(adj_records)

    can_records = [r for r in records if r["biz"] == "销户" and r["status"] == "开通中"]
    cancellation_inprogress = _deep_analysis(can_records)

    # Meizhou deep
    mz_records = [r for r in can_records if r["city"] == "梅州"]
    if mz_records:
        mz = {"total": len(mz_records)}
        pc = defaultdict(int)
        sc_all = defaultdict(int)
        sc_qly = defaultdict(int)
        sc_zl = defaultdict(int)
        for r in mz_records:
            pc[r["product"]] += 1
            if r["step"]:
                sc_all[r["step"]] += 1
                if r["product"] == "千里眼":
                    sc_qly[r["step"]] += 1
                else:
                    sc_zl[r["step"]] += 1
        mz["千里眼"] = pc.get("千里眼", 0)
        mz["互联网专线"] = pc.get("互联网专线", 0)
        mz["steps"] = dict(sc_all)
        mz["qly_steps"] = dict(sc_qly)
        mz["zl_steps"] = dict(sc_zl)
        cancellation_inprogress["meizhou_deep"] = mz

    # Batch dispatch days
    day_counts = defaultdict(int)
    for r in can_records:
        if r["dispatch_time"] and len(r["dispatch_time"]) >= 10:
            day_counts[r["dispatch_time"][:10]] += 1
    cancellation_inprogress["batch_dispatch_days"] = dict(sorted({d: c for d, c in day_counts.items() if c >= 5}.items()))

    return {
        "overview": overview,
        "product_stats": product_stats,
        "product_detail_stats": product_detail_stats,
        "product_biz_summary": pbs,
        "biz_stats": biz_stats,
        "city_stats": city_stats,
        "city_completion_ranking": city_completion_ranking,
        "city_summary": city_summary,
        "status_stats": {"开通中": inprog, "已归档": completed},
        "step_distribution": dict(step_dist),
        "step_inprogress": dict(step_inprog),
        "inprog_step_product": {k: dict(v) for k, v in isp.items()},
        "inprog_step_biz": {k: dict(v) for k, v in isb.items()},
        "monthly_trend": monthly_trend,
        "cross_month_biz": {k: dict(v) for k, v in cmb.items()},
        "cross_month_product": {k: dict(v) for k, v in cmp.items()},
        "cross_product_biz": cpb,
        "cross_city_product": ccp,
        "cross_city_biz": ccb,
        "adjustment_inprogress": adjustment_inprogress,
        "cancellation_inprogress": cancellation_inprogress,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
