"""Layout renderers + dispatch table.

Each sibling module exports a render(prs, content, blueprint, design) -> None
function that draws exactly one slide in a specific visual treatment.

LAYOUT_REGISTRY: dict[LayoutType, Callable] maps the LayoutType enum
(set by the visual_planner LLM on each SlideBlueprint) to its render
function. ppt_renderer dispatches by registry lookup.

Adding a seventh layout = new sibling file + one entry in LAYOUT_REGISTRY.
No existing layout file is modified.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from pipeline.agents.ppt_agent.schema import LayoutType
from pipeline.agents.ppt_agent.scripts.layouts import (
    bullets_only,
    cta,
    hero_image,
    icon_grid,
    summary_solution,
    title_card,
    two_column,
)

if TYPE_CHECKING:
    from collections.abc import Callable

    from pipeline.agents.ppt_agent.schema import SalesPPTOutput, SlideBlueprint
    from pipeline.agents.ppt_agent.scripts.theme.base_design import Design

    LayoutRenderFn = Callable[
        [object, SalesPPTOutput, SlideBlueprint, Design], None
    ]

LAYOUT_REGISTRY: dict[LayoutType, LayoutRenderFn] = {
    LayoutType.TITLE_CARD: title_card.render,
    LayoutType.BULLETS_ONLY: bullets_only.render,
    LayoutType.ICON_GRID: icon_grid.render,
    LayoutType.TWO_COLUMN: two_column.render,
    LayoutType.HERO_IMAGE: hero_image.render,
    LayoutType.CTA: cta.render,
    LayoutType.SUMMARY_SOLUTION: summary_solution.render,
}
