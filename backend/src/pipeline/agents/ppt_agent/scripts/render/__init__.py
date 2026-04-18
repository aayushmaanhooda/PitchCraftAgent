"""Rendering helpers shared across layout modules.

  layout_helpers — EMU math, text-frame builders, positioning primitives.
  icon_helpers   — Font Awesome SVG -> PNG via cairosvg, cached.
  image_helpers  — load generated image bytes, fit/crop to a placeholder.

Layouts import from these utilities so each layout module stays focused
on slide-specific arrangement rather than low-level python-pptx mechanics.
"""
