from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RequirementBase(BaseModel):
    # 10 个业务字段
    receive_date: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    outlet_code: Optional[str] = Field(None, max_length=100)
    owner_name: Optional[str] = Field(None, max_length=100)
    contact: Optional[str] = Field(None, max_length=100)
    order_type: Optional[str] = Field(None, max_length=100)
    install_address: Optional[str] = None
    product_code: Optional[str] = Field(None, max_length=200)
    remark: Optional[str] = None


class RequirementCreate(RequirementBase):
    pass


class RequirementUpdate(BaseModel):
    receive_date: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    outlet_code: Optional[str] = Field(None, max_length=100)
    owner_name: Optional[str] = Field(None, max_length=100)
    contact: Optional[str] = Field(None, max_length=100)
    order_type: Optional[str] = Field(None, max_length=100)
    install_address: Optional[str] = None
    product_code: Optional[str] = Field(None, max_length=200)
    remark: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class RequirementResponse(RequirementBase):
    id: int
    status: str
    priority: str
    req_status: str = ""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RequirementList(BaseModel):
    total: int
    items: List[RequirementResponse]
    skip: int
    limit: int
