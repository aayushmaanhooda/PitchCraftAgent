from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class SlideType(str, Enum):
    CONSTANT_CORPORATE = "constant_corporate"
    TAILORED_CUSTOMER = "tailored_customer"
    USE_CASE = "use_case"
    CLOSING = "closing"


class Slide(BaseModel):
    slide_no: int = Field(
        ..., description="Slide number (1-indexed)."
    )
    title: str = Field(
        ..., description="Slide title."
    )
    purpose: str = Field(
        ..., description="What this slide should accomplish."
    )
    key_bullets: list[str] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="2-6 key bullet points for the slide.",
    )
    speaker_notes: str = Field(
        ..., description="Speaker notes for the presenter."
    )
    slide_type: SlideType = Field(
        ...,
        description=(
            "constant_corporate = same across all decks (title, why aziro). "
            "tailored_customer = customized per client. "
            "use_case = illustrates a specific scenario. "
            "closing = next steps / CTA."
        ),
    )

class UseCase(BaseModel):
    title: str = Field(
        ..., description="Use case title."
    )
    customer_problem: str = Field(
        ..., description="The pain point this use case addresses."
    )
    aziro_solution: str = Field(
        ..., description="How Aziro solves the problem."
    )
    business_value: str = Field(
        ..., description="Quantified or qualitative business impact."
    )
    why_relevant_here: str = Field(
        ..., description="Why this use case matters for this specific RFP."
    )


class TemplateInstructions(BaseModel):
    must_include_slides_alignment: list[str] = Field(
        default_factory=list,
        description="Topics that must be covered in the slide deck.",
    )
    logo_theme: Optional[str] = Field(
        default=None,
        description="Logo/theme override, if any.",
    )
    reference_urls: list[str] = Field(
        default_factory=list,
        description="Reference URLs for additional context.",
    )
 


class SalesPPTOutput(BaseModel):
    """
    The complete JSON that the Research Agent must produce.
    The LangGraph PPT Flow reads this to generate the .pptx file.
    """
 
    deck_title: str = Field(
        ..., description="Overall title for the presentation deck."
    )
    executive_summary: str = Field(
        ..., description="2-4 sentence executive summary."
    )
    proposed_solution_theme: str = Field(
        ..., description="One-liner theme for the proposed solution."
    )
    why_aziro: list[str] = Field(
        ...,
        min_length=3,
        description="Reasons why Aziro is the right partner.",
    )
    differentiators: list[str] = Field(
        ...,
        min_length=3,
        description="What sets Aziro apart from competitors.",
    )
    recommended_agenda: list[str] = Field(
        ..., description="Ordered list of agenda items for the meeting."
    )
    slides: list[Slide] = Field(
        ...,
        min_length=5,
        description="Ordered list of slides for the deck.",
    )
    use_cases: list[UseCase] = Field(
        ...,
        min_length=1,
        description="Detailed use cases with problem/solution/value.",
    )
    template_instructions: Optional[TemplateInstructions] = Field(
        default=None,
        description="Optional slide generation instructions.",
    )
    constant_corporate_slides: Optional[list[str]] = Field(
        default=None,
        description="Titles of slides that stay the same across all decks.",
    )
 