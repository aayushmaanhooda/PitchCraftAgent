from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class DesignName(str, Enum):
    CORPORATE_BLUE = "corporate_blue"
    WARM_EARTH = "warm_earth"


class GeneratePPTRequest(BaseModel):
    customer_id: int
    rfp_text: str
    design_name: DesignName = DesignName.CORPORATE_BLUE


class GeneratePPTResponse(BaseModel):
    customer_id: int
    ppt_s3_key: str
    ppt_url: str
    deck_title: str
    slide_count: int
