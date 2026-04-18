from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from aws.s3 import generate_presigned_url
from core.db import get_session
from schemas.customer import CustomerCreate, CustomerRead, PresignedUrlResponse
from schemas.tables import User
from services.auth.auth_service import get_current_user
from services.customer import (
    create_customer,
    delete_customer,
    get_customer_owned,
    list_customers_for_user,
)


router = APIRouter(prefix="/customer", tags=["customer"])

_PRESIGN_TTL = 15 * 60


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create(
    payload: CustomerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CustomerRead:
    customer = create_customer(session, current_user.id, payload.customer_name)
    return CustomerRead.model_validate(customer)


@router.get("", response_model=list[CustomerRead])
def list_all(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[CustomerRead]:
    customers = list_customers_for_user(session, current_user.id)
    return [CustomerRead.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerRead)
def get_one(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CustomerRead:
    customer = get_customer_owned(session, current_user.id, customer_id)
    return CustomerRead.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_customer(session, current_user.id, customer_id)


@router.get("/{customer_id}/excel-url", response_model=PresignedUrlResponse)
def excel_url(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> PresignedUrlResponse:
    customer = get_customer_owned(session, current_user.id, customer_id)
    if not customer.excel_s3_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Excel not generated yet")
    url = generate_presigned_url(customer.excel_s3_key, expires_in=_PRESIGN_TTL)
    return PresignedUrlResponse(url=url, expires_in=_PRESIGN_TTL)


@router.get("/{customer_id}/ppt-url", response_model=PresignedUrlResponse)
def ppt_url(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> PresignedUrlResponse:
    customer = get_customer_owned(session, current_user.id, customer_id)
    if not customer.ppt_s3_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PPT not generated yet")
    url = generate_presigned_url(customer.ppt_s3_key, expires_in=_PRESIGN_TTL)
    return PresignedUrlResponse(url=url, expires_in=_PRESIGN_TTL)
