"""Defines the Design dataclass — the 'basedesign' every design file feeds into.

Each file under scripts/theme/design/ exports a `DESIGN` instance of this
dataclass. When the user picks a design by name, scripts.theme.get_design
resolves the name -> DESIGN instance and hands it to every layout
renderer as the `design` argument.

Layout renderers read colors and fonts from this dataclass — never
hard-coded. This decoupling is what lets users swap color schemes
without touching layout code.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Design:
    """Immutable design preset — colors, fonts, logo, footer.

    Every layout renderer receives this as the ``design`` argument.

    Colors are 6-char uppercase hex strings **without** the ``#`` prefix
    (e.g. ``"1A3C6E"``), matching python-pptx's
    ``RGBColor.from_string()`` format.
    """

    # -- colours --------------------------------------------------------
    primary_color: str
    """Titles, emphasis elements — e.g. ``"1A3C6E"``."""

    secondary_color: str
    """Subtitles, supporting text."""

    accent_color: str
    """Bullet markers, dividers, highlights."""

    background_color: str
    """Slide background fill."""

    text_color: str
    """Body / bullet text."""

    # -- typography -----------------------------------------------------
    heading_font: str
    """Font name for slide titles — e.g. ``"Calibri"``."""

    body_font: str
    """Font name for body text and bullets."""

    # -- branding -------------------------------------------------------
    logo_path: Path | None
    """Absolute path to brand logo PNG. ``None`` to omit."""

    footer_text: str
    """Text rendered in the slide footer strip."""

    # -- image-generation palette hint ----------------------------------
    palette_hint: str
    """Short evocative phrase describing this design's palette for the
    FLUX image generator. Consumed verbatim by the prompt writer so
    generated illustrations match the active design instead of a
    hardcoded one. Include hex codes AND natural-language color names
    so FLUX has both references, e.g.
    ``"deep corporate blue (#1A3C6E) primary and warm amber (#E8A838) accent palette on a pure white background"``.
    """
