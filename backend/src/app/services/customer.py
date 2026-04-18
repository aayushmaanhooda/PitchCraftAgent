from typing import Any

from fastapi import HTTPException, status
from sqlmodel import Session, select

from aws.s3 import delete_object
from schemas.tables import Customer


def create_customer(session: Session, user_id: int, customer_name: str) -> Customer:
    customer = Customer(
        customer_name=customer_name,
        user_id=user_id,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def list_customers_for_user(session: Session, user_id: int) -> list[Customer]:
    return list(
        session.exec(
            select(Customer)
            .where(Customer.user_id == user_id)
            .order_by(Customer.created_at.desc())
        )
    )


def get_customer_owned(session: Session, user_id: int, customer_id: int) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    if customer.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    return customer


def set_excel_key(session: Session, customer: Customer, s3_key: str) -> Customer:
    customer.excel_s3_key = s3_key
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def set_ppt_key(session: Session, customer: Customer, s3_key: str) -> Customer:
    customer.ppt_s3_key = s3_key
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def set_questionnaire_json(
    session: Session, customer: Customer, payload: dict[str, Any]
) -> Customer:
    customer.questionnaire_json = payload
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def set_sales_ppt_json(
    session: Session, customer: Customer, payload: dict[str, Any]
) -> Customer:
    customer.sales_ppt_json = payload
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def delete_customer(session: Session, user_id: int, customer_id: int) -> None:
    customer = get_customer_owned(session, user_id, customer_id)
    for key in (customer.excel_s3_key, customer.ppt_s3_key):
        if key:
            try:
                delete_object(key)
            except Exception:
                pass
    session.delete(customer)
    session.commit()
