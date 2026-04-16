"""
Aziro Sales Pipeline — Questionnaire Schema
"""

from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field


class GenerateExcelRequest(BaseModel):
    rfp_text: str


class GenerateExcelResponse(BaseModel):
    file_id: str
    file_name: str
    download_url: str
    preview: "QuestionnaireOutput"


# ENUM
class Priority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

# MODEL
class Question(BaseModel):
    """A single discovery question for the client."""
 
    question: str = Field(
        ..., description="The question text to ask the client."
    )
    why_it_matters: str = Field(
        ..., description="Why this question is important for scoping."
    )
    priority: Priority = Field(
        ..., description="Priority level: High, Medium, or Low."
    )
    risk_if_unanswered: str = Field(
        ..., description="What goes wrong if this isn't answered."
    )
 

# ROOT SCHEMA
class QuestionnaireOutput(BaseModel):
    """
    The complete JSON that the LLM must produce.
    The LangGraph Excel Flow reads this to generate the .xlsx file.
 
    Each category must have 5-10 questions.
    Categories are fixed — every RFP gets all seven.
    """
 
    Functional: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Functional/business process questions. 5-15 required.",
    )
    Technical: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Technical architecture and integration questions. 5-15 required.",
    )
    Design_UX: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Design, UX, and user experience questions. 5-15 required.",
    )
    Data: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Data model, migration, and reporting questions. 5-15 required.",
    )
    Security_Compliance: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Security, compliance, and audit questions. 5-15 required.",
    )
    Delivery_Governance: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Delivery, governance, and go-live questions. 5-15 required.",
    )
    Commercial_Assumptions: list[Question] = Field(
        ...,
        min_length=5,
        max_length=15,
        description="Commercial, pricing, and contractual questions. 5-15 required.",
    )
 
