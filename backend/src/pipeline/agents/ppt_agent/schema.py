from __future__ import annotations
from enum import Enum
# from typing import Optional
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


# class TemplateInstructions(BaseModel):
#     must_include_slides_alignment: list[str] = Field(
#         default_factory=list,
#         description="Topics that must be covered in the slide deck.",
#     ) 
#     logo_theme: Optional[str] = Field(
#         default=None,
#         description="Logo/theme override, if any.",
#     )
#     reference_urls: list[str] = Field(
#         default_factory=list,
#         description="Reference URLs for additional context.",
#     )
 


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
    # template_instructions: Optional[TemplateInstructions] = Field(
    #     default=None,
    #     description="Optional slide generation instructions.",
    # )
    # constant_corporate_slides: Optional[list[str]] = Field(
    #     default=None,
    #     description="Titles of slides that stay the same across all decks.",
    # )


class SalesPPTEnvelope(BaseModel):
    """
    Top-level wrapper matching the expected JSON output with a `sales_ppt` root key.
    """

    sales_ppt: SalesPPTOutput = Field(
        ..., description="The complete sales PPT output payload."
    )


# =============================================================================
# Blueprint models — emitted by the visual_planner node to drive rendering.
# Content models above are untouched; these are additive.
# =============================================================================


class LayoutType(str, Enum):
    """Visual layout templates. Mirrors the six layouts in agent/prompt.py."""

    TITLE_CARD = "title_card"
    HERO_IMAGE = "hero_image"
    ICON_GRID = "icon_grid"
    TWO_COLUMN = "two_column"
    BULLETS_ONLY = "bullets_only"
    CTA = "cta"
    SUMMARY_SOLUTION = "summary_solution"


class ImageSource(str, Enum):
    """Where a slide's image comes from (if any)."""

    GENERATED = "generated"
    NONE = "none"


class DensityVerdict(str, Enum):
    """Planner's judgement on whether a slide's content needs simplification."""

    OK = "ok"
    SIMPLIFY = "simplify"


class ContentSource(str, Enum):
    """Which JSON region a logical slide pulls its content from.

    Enforces complete coverage — every Region A field is its own slide.
    """

    DECK_TITLE = "deck_title"
    DECK_SUMMARY_SOLUTION = "deck_summary_solution"
    DECK_WHY_AZIRO = "deck_why_aziro"
    DECK_DIFFERENTIATORS = "deck_differentiators"
    DECK_AGENDA = "deck_agenda"
    MAIN_SLIDE = "main_slide"
    USE_CASE = "use_case"


class LogicalSlide(BaseModel):
    """Deterministic output of expand() — one per JSON field.

    Carries no visual decisions; that is the visual_planner's job.
    """

    position: int = Field(
        ..., ge=1, description="1-indexed position in the rendered deck."
    )
    content_source: ContentSource = Field(
        ..., description="Which JSON region this slide's content comes from."
    )
    content_index: int | None = Field(
        default=None,
        ge=0,
        description=(
            "Index into slides[] or use_cases[] when content_source points "
            "into those lists. None for Region A (deck-level) fields."
        ),
    )


class SlideBlueprint(BaseModel):
    """Visual treatment for a single slide, emitted by the visual_planner.

    One SlideBlueprint per LogicalSlide, preserving position order.
    """

    position: int = Field(
        ..., ge=1, description="1-indexed position in the rendered deck."
    )
    content_source: ContentSource = Field(
        ..., description="JSON region this blueprint's content comes from."
    )
    content_index: int | None = Field(
        default=None,
        ge=0,
        description="Index into slides[] or use_cases[]; None for Region A.",
    )
    layout: LayoutType = Field(
        ..., description="Visual layout template chosen by the planner."
    )
    image_source: ImageSource = Field(
        ..., description="Whether this slide uses a generated image or none."
    )
    image_prompt: str | None = Field(
        default=None,
        description=(
            "FLUX image prompt; required when image_source=generated, "
            "must be None otherwise."
        ),
    )
    icons: list[str] | None = Field(
        default=None,
        description=(
            "Font Awesome 6 Free solid icon names, one per bullet. "
            "Only populated when layout=icon_grid."
        ),
    )
    density_verdict: DensityVerdict = Field(
        ..., description="Whether the slide's source bullets need simplifying."
    )
    simplified_bullets: list[str] | None = Field(
        default=None,
        max_length=4,
        description=(
            "Up to 4 concise bullets replacing the originals when "
            "density_verdict=simplify. None otherwise."
        ),
    )
    generated_image_path: str | None = Field(
        default=None,
        description=(
            "Local file path to the generated image PNG. "
            "Populated by the image_generator node, None at planning time."
        ),
    )


class DeckBlueprint(BaseModel):
    """Full deck plan emitted by the visual_planner node."""

    total_images: int = Field(
        ...,
        ge=0,
        description=(
            "Count of slide_blueprints with image_source=generated. "
            "Must equal the post-validated image count and be <= image_budget."
        ),
    )
    slide_blueprints: list[SlideBlueprint] = Field(
        ...,
        min_length=1,
        description="One SlideBlueprint per LogicalSlide, in position order.",
    )
    design_name: str = Field(
        default="corporate_blue",
        description="Key into DESIGN_REGISTRY selecting the color/font preset.",
    )
