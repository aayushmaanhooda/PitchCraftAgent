"""visual_planner — first node of the PPT graph.

Architecture:

  The STRUCTURE of the deck (position, content_source, content_index)
  is fully deterministic — it comes from ``expand.py``. The LLM is ONLY
  allowed to decide per-slide visual treatment (layout, image yes/no,
  icons, density). Structural fields are merged in server-side from the
  logical_slide list so the LLM can never reorder slides, mislabel
  content, or drop entries.

Steps:
  1. expand(content)          -> ordered list[LogicalSlide]
  2. image_budget = floor(len * 0.5)
  3. Call Claude              -> PlannerChoices (one per position)
  4. Merge server-side        -> build SlideBlueprint using
                                 logical_slide for structure +
                                 Claude's choice for visuals.
                                 Enforce hardwired content_source ->
                                 layout mappings regardless of Claude.
  5. Enforce image budget     -> downgrade excess hero_image main_slides.
  6. Return (logical_slides, DeckBlueprint)
"""

from __future__ import annotations

import math

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

load_dotenv()

from pipeline.agents.ppt_agent.schema import (
    ContentSource,
    DeckBlueprint,
    DensityVerdict,
    ImageSource,
    LayoutType,
    LogicalSlide,
    SalesPPTOutput,
    SlideBlueprint,
)
from pipeline.agents.ppt_agent.scripts.content.expand import expand

PLANNER_MODEL = "claude-sonnet-4-20250514"


# ── Hardwired content_source → (layout, image_source) ────────────────
# Every non-main_slide layout is fixed by the content kind. These
# mappings are ENFORCED server-side after the LLM responds, so Claude's
# structural mistakes can never corrupt the deck.
HARDWIRED: dict[ContentSource, tuple[LayoutType, ImageSource]] = {
    ContentSource.DECK_TITLE: (LayoutType.TITLE_CARD, ImageSource.GENERATED),
    ContentSource.DECK_SUMMARY_SOLUTION: (LayoutType.SUMMARY_SOLUTION, ImageSource.GENERATED),
    ContentSource.DECK_WHY_AZIRO: (LayoutType.ICON_GRID, ImageSource.NONE),
    ContentSource.DECK_DIFFERENTIATORS: (LayoutType.ICON_GRID, ImageSource.NONE),
    ContentSource.DECK_AGENDA: (LayoutType.BULLETS_ONLY, ImageSource.NONE),
    ContentSource.USE_CASE: (LayoutType.TWO_COLUMN, ImageSource.NONE),
}

# Layouts valid for main_slide entries (the only free-choice region).
_MAIN_SLIDE_LAYOUTS: frozenset[LayoutType] = frozenset({
    LayoutType.HERO_IMAGE,
    LayoutType.ICON_GRID,
    LayoutType.BULLETS_ONLY,
    LayoutType.CTA,
})


# ── LLM output schema (visual decisions only, NO structural fields) ─

class PlannerChoice(BaseModel):
    """One per-slide visual choice from the planner LLM.

    Carries NO structural information (position/content_source/content_index)
    — those come from the deterministic ``expand.py`` output and are merged
    server-side. The LLM cannot affect deck order or content identity.
    """

    position: int = Field(
        ..., ge=1, description="Position of the logical slide this choice is for.",
    )
    layout: LayoutType
    image_source: ImageSource
    icons: list[str] | None = Field(
        default=None,
        description=(
            "Font Awesome 6 Free solid icon names. "
            "Only used when the FINAL layout is icon_grid."
        ),
    )
    density_verdict: DensityVerdict = DensityVerdict.OK
    simplified_bullets: list[str] | None = Field(
        default=None, max_length=4,
    )


class PlannerChoices(BaseModel):
    """LLM output: one PlannerChoice per logical slide."""

    choices: list[PlannerChoice] = Field(..., min_length=1)


# ── Prompts ──────────────────────────────────────────────────────────

def _build_system_prompt(image_budget: int, slide_count: int) -> str:
    """System prompt for the planner.

    The LLM receives the list of logical slides (with forced layouts
    labelled) and must output exactly one PlannerChoice per position.
    We tell it which layouts are forced so it doesn't waste tokens
    deciding — but server-side we overwrite any mistakes anyway.
    """
    return f"""You are a presentation designer. For each of the {slide_count} logical slides below,
output ONE PlannerChoice. You decide ONLY visual treatment — the deck structure
(ordering, content identity) is fixed and not your concern.

LAYOUT CATALOG:
- title_card        hero title + image right. FORCED for deck_title.
- summary_solution  Summary + Solution stacked, image right. FORCED for deck_summary_solution.
- icon_grid         title + icon-prefixed bullets. FORCED for deck_why_aziro and deck_differentiators.
- bullets_only      title + numbered list, no visuals. FORCED for deck_agenda.
- two_column        title + problem/solution columns. FORCED for use_case.
- hero_image        text left 55%%, generated image right 45%%. (main_slide only)
- cta               centred closing slide. (main_slide only, typically the last one)

YOUR ONLY REAL DECISION is per main_slide: pick from {{hero_image, icon_grid, bullets_only, cta}}.
For any NON-main_slide, echo the forced layout exactly as labelled.

IMAGE RULES:
- image_source=generated iff layout in {{title_card, summary_solution, hero_image}}.
- Every other layout -> image_source=none.
- Exactly {image_budget} slides may have image_source=generated TOTAL across the deck
  (this INCLUDES the 2 guaranteed ones: title_card + summary_solution).
  So you have {image_budget - 2} hero_image slots to spend on main_slide entries.

WHEN TO PICK hero_image FOR main_slide (priority order):
  1. Any main_slide with 3 OR FEWER key_bullets — sparse text looks empty without a visual.
  2. Strategic / thematic titles (architecture, approach, solution overview).
  3. Fill remaining budget with the most visually-worthy remaining main_slides.
Only pick icon_grid/bullets_only when the slide already has 4+ dense bullets.
Pick cta for a clear closing / next-steps slide.

ICON RULES (only matters when final layout=icon_grid):
- Use Font Awesome 6 Free solid names WITHOUT the "fa-" prefix
  (e.g. "shield-halved", "chart-line", "gears", "bolt", "graduation-cap").
- One icon per bullet. Count of icons MUST equal count of bullets in that slide.
- Provide icons for every icon_grid slide INCLUDING the forced deck_why_aziro and
  deck_differentiators.

DENSITY:
- If a slide has MORE than 5 bullets -> density_verdict=simplify AND provide
  simplified_bullets (max 4 concise bullets).
- Otherwise density_verdict=ok, simplified_bullets=null.

OUTPUT:
- Output exactly {slide_count} PlannerChoice entries, one per listed position.
- Preserve the ``position`` number from each input row.
- Do NOT invent positions, skip positions, or output duplicates.
"""


def _build_content_summary(
    content: SalesPPTOutput, logical_slides: list[LogicalSlide],
) -> str:
    """Human-readable summary of each logical slide with forced-layout tags."""
    lines: list[str] = [
        "=== CONTENT SUMMARY ===",
        f"Deck title: {content.deck_title}",
        f"Theme: {content.proposed_solution_theme}",
        f"Main slides: {len(content.slides)}  Use cases: {len(content.use_cases)}",
        "",
        "=== LOGICAL SLIDES (output one PlannerChoice per row, keyed by position) ===",
    ]

    for ls in logical_slides:
        src = ls.content_source.value
        idx_str = f"[{ls.content_index}]" if ls.content_index is not None else ""

        forced = HARDWIRED.get(ls.content_source)
        forced_str = (
            f"  [FORCED layout={forced[0].value} image={forced[1].value}]"
            if forced else "  [main_slide — YOU PICK]"
        )

        detail = ""
        if ls.content_source == ContentSource.DECK_TITLE:
            detail = f' "{content.deck_title}"'
        elif ls.content_source == ContentSource.DECK_SUMMARY_SOLUTION:
            detail = f' "{content.proposed_solution_theme[:60]}..."'
        elif ls.content_source == ContentSource.DECK_WHY_AZIRO:
            detail = f" ({len(content.why_aziro)} bullets — needs {len(content.why_aziro)} icons)"
        elif ls.content_source == ContentSource.DECK_DIFFERENTIATORS:
            detail = f" ({len(content.differentiators)} bullets — needs {len(content.differentiators)} icons)"
        elif ls.content_source == ContentSource.DECK_AGENDA:
            detail = f" ({len(content.recommended_agenda)} items)"
        elif ls.content_source == ContentSource.MAIN_SLIDE:
            slide = content.slides[ls.content_index]
            detail = (
                f' "{slide.title}" '
                f"({len(slide.key_bullets)} bullets, {slide.slide_type.value})"
            )
        elif ls.content_source == ContentSource.USE_CASE:
            uc = content.use_cases[ls.content_index]
            detail = f' "{uc.title}"'

        lines.append(f"  pos={ls.position:>2} {src}{idx_str}{detail}{forced_str}")

    return "\n".join(lines)


# ── Server-side merge + enforcement ──────────────────────────────────

def _merge_choices(
    logical_slides: list[LogicalSlide],
    choices: list[PlannerChoice],
) -> list[SlideBlueprint]:
    """Build SlideBlueprints from logical slides + LLM choices.

    Structural fields (position, content_source, content_index) ALWAYS
    come from ``logical_slides`` — the LLM cannot affect them. For
    non-main_slide entries the hardwired layout+image rule wins even
    if Claude picked something different.
    """
    by_pos: dict[int, PlannerChoice] = {c.position: c for c in choices}
    blueprints: list[SlideBlueprint] = []

    for ls in logical_slides:
        choice = by_pos.get(ls.position)
        forced = HARDWIRED.get(ls.content_source)

        if forced is not None:
            layout, image_source = forced
        else:
            # main_slide — trust Claude with validation.
            if choice is None:
                layout, image_source = LayoutType.BULLETS_ONLY, ImageSource.NONE
            else:
                layout = (
                    choice.layout if choice.layout in _MAIN_SLIDE_LAYOUTS
                    else LayoutType.BULLETS_ONLY
                )
                image_source = choice.image_source
                # Keep layout ↔ image_source consistent.
                if layout == LayoutType.HERO_IMAGE:
                    image_source = ImageSource.GENERATED
                elif image_source == ImageSource.GENERATED:
                    layout = LayoutType.HERO_IMAGE

        icons = (
            choice.icons
            if (choice and layout == LayoutType.ICON_GRID)
            else None
        )
        density = choice.density_verdict if choice else DensityVerdict.OK
        simplified = (
            choice.simplified_bullets
            if (choice and density == DensityVerdict.SIMPLIFY)
            else None
        )

        blueprints.append(
            SlideBlueprint(
                position=ls.position,
                content_source=ls.content_source,
                content_index=ls.content_index,
                layout=layout,
                image_source=image_source,
                image_prompt=None,
                icons=icons,
                density_verdict=density,
                simplified_bullets=simplified,
                generated_image_path=None,
            )
        )

    return blueprints


def _enforce_image_budget(
    blueprints: list[SlideBlueprint], budget: int,
) -> list[SlideBlueprint]:
    """If Claude over-allocated images, downgrade excess main_slides.

    The 2 hardwired (title_card + summary_solution) generated slots are
    untouchable. Excess hero_image main_slides get dropped to
    bullets_only + image_source=none until the count fits the budget.
    """
    gen_count = sum(1 for bp in blueprints if bp.image_source == ImageSource.GENERATED)
    if gen_count <= budget:
        return blueprints

    excess = gen_count - budget
    # Walk in reverse position order so the last main_slides get
    # downgraded first — those tend to be less visually important.
    candidates = [
        bp for bp in sorted(blueprints, key=lambda b: b.position, reverse=True)
        if bp.content_source == ContentSource.MAIN_SLIDE
        and bp.image_source == ImageSource.GENERATED
    ]

    downgraded: set[int] = set()
    for bp in candidates:
        if excess <= 0:
            break
        downgraded.add(bp.position)
        excess -= 1

    if excess > 0:
        # Shouldn't happen — main_slides always have enough headroom —
        # but don't silently leave an over-budget blueprint.
        raise ValueError(
            f"Cannot fit image budget: {excess} excess images remain "
            f"after downgrading all main_slide candidates."
        )

    rebuilt: list[SlideBlueprint] = []
    for bp in blueprints:
        if bp.position in downgraded:
            rebuilt.append(
                bp.model_copy(update={
                    "layout": LayoutType.BULLETS_ONLY,
                    "image_source": ImageSource.NONE,
                    "icons": None,
                })
            )
        else:
            rebuilt.append(bp)
    return rebuilt


# ── Public API ───────────────────────────────────────────────────────

def plan(
    content: SalesPPTOutput, *, model: str | None = None,
) -> tuple[list[LogicalSlide], DeckBlueprint]:
    """Run the visual planner. Returns ``(logical_slides, DeckBlueprint)``.

    Structural correctness is guaranteed by server-side merge: the LLM's
    structural fields are discarded; only its layout/image/icon/density
    decisions are used.
    """
    # 1. Deterministic expansion.
    logical_slides = expand(content)

    # 2. Budget.
    image_budget = math.floor(len(logical_slides) * 0.5)

    # 3. LLM call.
    system = _build_system_prompt(image_budget, len(logical_slides))
    summary = _build_content_summary(content, logical_slides)

    llm = ChatAnthropic(model=model or PLANNER_MODEL, max_tokens=8192)
    structured_llm = llm.with_structured_output(PlannerChoices)

    result: PlannerChoices = structured_llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=summary),
    ])

    # 4. Server-side merge (structure from expand, visuals from Claude).
    blueprints = _merge_choices(logical_slides, result.choices)

    # 5. Enforce image budget.
    blueprints = _enforce_image_budget(blueprints, image_budget)

    total_images = sum(
        1 for bp in blueprints if bp.image_source == ImageSource.GENERATED
    )

    deck = DeckBlueprint(
        total_images=total_images,
        slide_blueprints=blueprints,
        design_name="corporate_blue",
    )

    return logical_slides, deck


if __name__ == "__main__":
    import json
    from pathlib import Path

    from pipeline.agents.ppt_agent.schema import SalesPPTEnvelope

    sample = Path("agent/output/sales_ppt_output.json")
    envelope = SalesPPTEnvelope.model_validate(json.loads(sample.read_text()))
    content = envelope.sales_ppt

    print("Running visual planner...")
    logical_slides, blueprint = plan(content)

    print(f"\nLogical slides: {len(logical_slides)}")
    print(f"Blueprints:     {len(blueprint.slide_blueprints)}")
    print(f"Total images:   {blueprint.total_images}")
    print(f"Design:         {blueprint.design_name}")
    print()
    print(f"{'pos':>3}  {'content_source':<26}  {'layout':<18}  {'img':>5}  {'density':<8}  icons")
    print("-" * 95)
    for bp in sorted(blueprint.slide_blueprints, key=lambda b: b.position):
        icons_str = ",".join(bp.icons) if bp.icons else "-"
        print(
            f"{bp.position:>3}  {bp.content_source.value:<26}  "
            f"{bp.layout.value:<18}  {bp.image_source.value:>5}  "
            f"{bp.density_verdict.value:<8}  {icons_str}"
        )
