"""Design resolution entry point.

Public API:
  get_design(name: str) -> Design
"""

from pipeline.agents.ppt_agent.scripts.theme.base_design import Design
from pipeline.agents.ppt_agent.scripts.theme.design import DESIGN_REGISTRY


def get_design(name: str = "corporate_blue") -> Design:
    """Resolve a design name to a Design instance.

    Raises KeyError with available names if ``name`` is not registered.
    """
    if name not in DESIGN_REGISTRY:
        available = ", ".join(sorted(DESIGN_REGISTRY))
        raise KeyError(f"Unknown design {name!r}. Available: {available}")
    return DESIGN_REGISTRY[name]
