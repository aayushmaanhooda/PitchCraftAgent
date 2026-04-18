"""Helpers backing the PPT renderer pipeline.

Subpackages:
  content/ — deterministic content expansion (SalesPPTOutput -> LogicalSlide list).
  layouts/ — one module per visual layout type, dispatched via LAYOUT_REGISTRY.
  theme/   — Design dataclass + pluggable design presets.
  render/  — shared rendering helpers (positioning math, icon + image loaders).
"""
