"""ppt_renderer — third node of the PPT graph.

Pure function over (content, blueprint, design). No LLM or FLUX calls.

Responsibilities:
  1. Create a blank python-pptx Presentation (16:9 widescreen).
  2. Resolve the Design instance via scripts.theme.get_design(blueprint.design_name).
  3. For each SlideBlueprint in position order:
       - Look up LAYOUT_REGISTRY[blueprint.layout] -> render function.
       - Call render(prs, content, blueprint, design).
  4. Save the deck to agent/output/<safe_deck_title>.pptx.
  5. Return the output path.

Because this node is pure, it can be unit tested with hand-authored
blueprints — no network calls required.
"""

from __future__ import annotations

import io

from pptx import Presentation

from pipeline.agents.ppt_agent.schema import DeckBlueprint, SalesPPTOutput
from pipeline.agents.ppt_agent.scripts.layouts import LAYOUT_REGISTRY
from pipeline.agents.ppt_agent.scripts.render.layout_helpers import SLIDE_HEIGHT, SLIDE_WIDTH
from pipeline.agents.ppt_agent.scripts.theme import get_design


def render_deck(
    content: SalesPPTOutput,
    blueprint: DeckBlueprint,
) -> bytes:
    """Render a complete .pptx deck from content + blueprint.

    Returns the raw .pptx bytes.
    """
    design = get_design(blueprint.design_name)

    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT

    for slide_bp in sorted(blueprint.slide_blueprints, key=lambda b: b.position):
        render_fn = LAYOUT_REGISTRY.get(slide_bp.layout)
        if render_fn is None:
            raise ValueError(
                f"No layout registered for {slide_bp.layout!r} "
                f"(slide position {slide_bp.position})"
            )
        render_fn(prs, content, slide_bp, design)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()
