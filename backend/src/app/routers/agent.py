from fastapi import APIRouter, Depends
from sqlmodel import Session

from aws.s3 import generate_presigned_url, upload_bytes
from core.db import get_session
from pipeline.agents.excel_agent import (
    generate_excel_from_questionnaire,
    generate_questionnaire_from_rfp,
)
from pipeline.agents.ppt_agent import ppt_agent
from pipeline.agents.ppt_agent.reserach_agent import run_research_agent
from schemas.excel import GenerateExcelRequest, GenerateExcelResponse
from schemas.ppt import GeneratePPTRequest, GeneratePPTResponse
from schemas.tables import User
from services.auth.auth_service import get_current_user
from services.customer import (
    get_customer_owned,
    set_excel_key,
    set_ppt_key,
    set_questionnaire_json,
    set_sales_ppt_json,
)


router = APIRouter(prefix="/agent", tags=["agent"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
_PRESIGN_TTL = 15 * 60


def _excel_key(user_id: int, customer_id: int) -> str:
    return f"customers/{user_id}/{customer_id}/questionnaire.xlsx"


def _ppt_key(user_id: int, customer_id: int) -> str:
    return f"customers/{user_id}/{customer_id}/deck.pptx"


@router.post("/generate-excel", response_model=GenerateExcelResponse)
def generate_excel(
    body: GenerateExcelRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GenerateExcelResponse:
    customer = get_customer_owned(session, current_user.id, body.customer_id)

    questionnaire = generate_questionnaire_from_rfp(body.rfp_text)
    buf = generate_excel_from_questionnaire(questionnaire)

    key = _excel_key(current_user.id, customer.id)
    upload_bytes(buf.getvalue(), key, _XLSX_MIME)
    set_excel_key(session, customer, key)
    set_questionnaire_json(session, customer, questionnaire.model_dump())

    return GenerateExcelResponse(
        customer_id=customer.id,
        excel_s3_key=key,
        excel_url=generate_presigned_url(key, expires_in=_PRESIGN_TTL),
        preview=questionnaire.model_dump(),
    )


@router.post("/generate-ppt", response_model=GeneratePPTResponse)
def generate_ppt(
    body: GeneratePPTRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GeneratePPTResponse:
    customer = get_customer_owned(session, current_user.id, body.customer_id)

    envelope = run_research_agent(body.rfp_text)
    sales_ppt = envelope.sales_ppt
    pptx_bytes, slide_count = ppt_agent.run(
        sales_ppt, design_name=body.design_name.value
    )

    key = _ppt_key(current_user.id, customer.id)
    upload_bytes(pptx_bytes, key, _PPTX_MIME)
    set_ppt_key(session, customer, key)
    set_sales_ppt_json(session, customer, sales_ppt.model_dump())

    return GeneratePPTResponse(
        customer_id=customer.id,
        ppt_s3_key=key,
        ppt_url=generate_presigned_url(key, expires_in=_PRESIGN_TTL),
        deck_title=sales_ppt.deck_title,
        slide_count=slide_count,
    )
