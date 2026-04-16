import io
import time
from dataclasses import dataclass
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.schemas.excel import GenerateExcelRequest, GenerateExcelResponse
from schemas.tables import User
from services.auth.auth_service import get_current_user
from pipeline.agents.excel_agent import (
    generate_excel_from_questionnaire,
    generate_questionnaire_from_rfp,
)

router = APIRouter(prefix="/agent")
GENERATED_EXCEL_TTL_SECONDS = 15 * 60


@dataclass(slots=True)
class GeneratedExcelFile:
    content: bytes
    file_name: str
    created_at: float


_generated_excels: dict[str, GeneratedExcelFile] = {}


def _purge_expired_generated_excels() -> None:
    cutoff = time.time() - GENERATED_EXCEL_TTL_SECONDS
    expired_ids = [
        file_id
        for file_id, generated_file in _generated_excels.items()
        if generated_file.created_at < cutoff
    ]
    for file_id in expired_ids:
        _generated_excels.pop(file_id, None)


def _store_generated_excel(content: bytes, file_name: str) -> str:
    _purge_expired_generated_excels()
    file_id = uuid4().hex
    _generated_excels[file_id] = GeneratedExcelFile(
        content=content,
        file_name=file_name,
        created_at=time.time(),
    )
    return file_id


@router.get("/generated-excel/{file_id}", name="download_generated_excel")
async def download_generated_excel(file_id: str):
    _purge_expired_generated_excels()
    generated_file = _generated_excels.get(file_id)
    if generated_file is None:
        raise HTTPException(status_code=404, detail="Generated Excel file not found or expired.")

    return StreamingResponse(
        io.BytesIO(generated_file.content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{generated_file.file_name}"',
        },
    )


@router.post("/generate-excel", response_model=GenerateExcelResponse)
async def generate_excel(
    body: GenerateExcelRequest,
    request: Request,
    _current_user: User = Depends(get_current_user),
) -> GenerateExcelResponse:
    file_name = "questionnaire.xlsx"
    questionnaire = generate_questionnaire_from_rfp(body.rfp_text)
    buf = generate_excel_from_questionnaire(questionnaire)
    file_id = _store_generated_excel(buf.getvalue(), file_name=file_name)

    return GenerateExcelResponse(
        file_id=file_id,
        file_name=file_name,
        download_url=str(request.url_for("download_generated_excel", file_id=file_id)),
        preview=questionnaire.model_dump(),
    )
