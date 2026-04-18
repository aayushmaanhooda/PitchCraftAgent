"""bullets_only layout — title + clean bullet list, no visuals.

Used for: the deck-metadata list slides (executive summary, why_aziro,
differentiators, agenda), data-heavy main content, timelines, risks, or
any main slide where the planner opted out of images/icons (often
because the image_budget was already spent).

Content binding by blueprint.content_source:
  - deck_why_aziro:         content.why_aziro as bullets.
  - deck_differentiators:   content.differentiators as bullets.
  - deck_agenda:            content.recommended_agenda as bullets.
  - main_slide:             slides[content_index].title + .key_bullets.
                            If density_verdict == 'simplify', uses simplified_bullets
                            instead (capped at 4 concise bullets).

Styling: heading_font + primary_color on the title, body_font +
text_color on bullets. Bullet markers in accent_color.
"""

from __future__ import annotations

from pipeline.agents.ppt_agent.schema import (
    ContentSource,
    DensityVerdict,
    SalesPPTOutput,
    SlideBlueprint,
)
from pipeline.agents.ppt_agent.scripts.render.layout_helpers import (
    add_body,
    add_bullets,
    add_footer,
    add_logo,
    add_title,
    set_slide_bg,
)
from pipeline.agents.ppt_agent.scripts.theme.base_design import Design


def _get_content(
    content: SalesPPTOutput, blueprint: SlideBlueprint,
) -> tuple[str, list[str] | str]:
    """Extract title and bullets (or prose) based on content_source.

    Returns ``(title, bullets_or_prose)`` where the second element is
    a ``list[str]`` for bullet slides or a ``str`` for prose (executive
    summary).
    """
    src = blueprint.content_source

    if src == ContentSource.DECK_WHY_AZIRO:
        return "Why Aziro", content.why_aziro

    if src == ContentSource.DECK_DIFFERENTIATORS:
        return "Differentiators", content.differentiators

    if src == ContentSource.DECK_AGENDA:
        return "Agenda", content.recommended_agenda

    if src == ContentSource.MAIN_SLIDE:
        slide = content.slides[blueprint.content_index]
        bullets = slide.key_bullets
        if (
            blueprint.density_verdict == DensityVerdict.SIMPLIFY
            and blueprint.simplified_bullets
        ):
            bullets = blueprint.simplified_bullets
        return slide.title, bullets

    # Fallback.
    return src.value.replace("_", " ").title(), []


def render(
    prs, content: SalesPPTOutput, blueprint: SlideBlueprint, design: Design,
) -> None:
    """Render a bullets_only slide — title + bullet list or prose body."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, design.background_color)

    title, body = _get_content(content, blueprint)
    add_title(slide, title, design)

    if isinstance(body, list):
        add_bullets(slide, body, design)
    else:
        add_body(slide, body, design)

    add_logo(slide, design)
    add_footer(slide, design)
