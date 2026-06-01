from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorkOrderBase(BaseModel):
    # 14 个业务字段
    crm_order_id: Optional[str] = Field(None, max_length=100)
    order_no: Optional[str] = Field(None, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    dispatch_time: Optional[str] = Field(None, max_length=50)
    business_city: Optional[str] = Field(None, max_length=100)
    product_category: Optional[str] = Field(None, max_length=100)
    operation_type: Optional[str] = Field(None, max_length=100)
    group_product_number: Optional[str] = Field(None, max_length=200)
    business_location_city: Optional[str] = Field(None, max_length=100)
    customer_address: Optional[str] = None
    current_step: Optional[str] = Field(None, max_length=100)
    camera_install_location: Optional[str] = None
    product_instance_id: Optional[str] = Field(None, max_length=200)

    # 其他字段
    description: Optional[str] = None
    priority: str = Field(default="medium")
    assignee: Optional[str] = Field(None, max_length=100)
    reporter: Optional[str] = Field(None, max_length=100)
    requirement_id: Optional[int] = None


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    crm_order_id: Optional[str] = Field(None, max_length=100)
    order_no: Optional[str] = Field(None, max_length=100)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    dispatch_time: Optional[str] = Field(None, max_length=50)
    business_city: Optional[str] = Field(None, max_length=100)
    product_category: Optional[str] = Field(None, max_length=100)
    operation_type: Optional[str] = Field(None, max_length=100)
    group_product_number: Optional[str] = Field(None, max_length=200)
    business_location_city: Optional[str] = Field(None, max_length=100)
    customer_address: Optional[str] = None
    status: Optional[str] = None
    current_step: Optional[str] = Field(None, max_length=100)
    camera_install_location: Optional[str] = None
    product_instance_id: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = Field(None, max_length=100)
    reporter: Optional[str] = Field(None, max_length=100)
    requirement_id: Optional[int] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderList(BaseModel):
    total: int
    items: list[WorkOrderResponse]
    skip: int
    limit: int
