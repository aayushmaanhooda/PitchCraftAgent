"""Warm earth — alternate design preset.

Earthy neutrals (terracotta, sand, deep olive). Demonstrates how to drop
in an entirely new style without touching layout code. Same Design
shape as corporate_blue, different values.
"""

from pathlib import Path

from pipeline.agents.ppt_agent.scripts.theme.base_design import Design

_ASSETS = Path(__file__).resolve().parents[3] / "assets"

DESIGN = Design(
    # colours
    primary_color="5C3D2E",
    secondary_color="6B7B3A",
    accent_color="C1694F",
    background_color="FFF8F0",
    text_color="3E2723",
    # typography
    heading_font="Georgia",
    body_font="Calibri",
    # branding
    logo_path=_ASSETS / "logos" / "aziro-logo.png",
    footer_text="Confidential — Aziro Solutions",
    # FLUX palette description
    palette_hint=(
        "earthy neutrals palette: deep chocolate-walnut (#5C3D2E) primary, "
        "terracotta-clay (#C1694F) accent, and olive-sage (#6B7B3A) support, "
        "on a warm sand-cream (#FFF8F0) background"
    ),
)
