from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, min_length=3, max_length=50)
    email: str = Field(index=True, unique=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



class Customer(SQLModel, table=True):
    __tablename__ = "customer"
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_name: str
    excel_s3_key: Optional[str] = Field(default=None)
    ppt_s3_key: Optional[str] = Field(default=None)
    questionnaire_json: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB, nullable=True)
    )
    sales_ppt_json: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB, nullable=True)
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: int = Field(foreign_key="users.id")
