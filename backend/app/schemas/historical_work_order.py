from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class HistoricalWorkOrderBase(BaseModel):
    site_code: str = Field(..., min_length=1, max_length=100)
    batch: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    access_address: Optional[str] = None
    crm_order_id: Optional[str] = Field(None, max_length=200)
    line_group_product_number: Optional[str] = Field(None, max_length=200)
    internet_work_order: Optional[str] = Field(None, max_length=200)
    internet_work_order_status: Optional[str] = Field(None, max_length=100)
    ql_crm_order_id: Optional[str] = Field(None, max_length=200)
    ql_group_product_number: Optional[str] = Field(None, max_length=200)
    ql_work_order: Optional[str] = Field(None, max_length=200)
    ql_work_order_status: Optional[str] = Field(None, max_length=100)


class HistoricalWorkOrderCreate(HistoricalWorkOrderBase):
    pass


class HistoricalWorkOrderUpdate(BaseModel):
    site_code: Optional[str] = Field(None, min_length=1, max_length=100)
    batch: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    access_address: Optional[str] = None
    crm_order_id: Optional[str] = Field(None, max_length=200)
    line_group_product_number: Optional[str] = Field(None, max_length=200)
    internet_work_order: Optional[str] = Field(None, max_length=200)
    internet_work_order_status: Optional[str] = Field(None, max_length=100)
    ql_crm_order_id: Optional[str] = Field(None, max_length=200)
    ql_group_product_number: Optional[str] = Field(None, max_length=200)
    ql_work_order: Optional[str] = Field(None, max_length=200)
    ql_work_order_status: Optional[str] = Field(None, max_length=100)


class HistoricalWorkOrderResponse(HistoricalWorkOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HistoricalWorkOrderList(BaseModel):
    total: int
    items: List[HistoricalWorkOrderResponse]
    skip: int
    limit: int
