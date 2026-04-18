"""DESIGN_REGISTRY — maps design name -> Design instance.

To add a new design:
  1. Create scripts/theme/design/<your_design>.py with a top-level
     DESIGN = Design(...) instance.
  2. Add it to DESIGN_REGISTRY below.
"""

from pipeline.agents.ppt_agent.scripts.theme.base_design import Design
from pipeline.agents.ppt_agent.scripts.theme.design.corporate_blue import DESIGN as _CORPORATE_BLUE
from pipeline.agents.ppt_agent.scripts.theme.design.warm_earth import DESIGN as _WARM_EARTH

DESIGN_REGISTRY: dict[str, Design] = {
    "corporate_blue": _CORPORATE_BLUE,
    "warm_earth": _WARM_EARTH,
}
