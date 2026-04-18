from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)


class CustomerRead(BaseModel):
    id: int
    customer_name: str
    excel_s3_key: Optional[str] = None
    ppt_s3_key: Optional[str] = None
    questionnaire_json: Optional[dict[str, Any]] = None
    sales_ppt_json: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PresignedUrlResponse(BaseModel):
    url: str
    expires_in: int
