"""Corporate blue — default Aziro design preset.

Blue + white palette, conservative sans pairing. Corporate and
trustworthy feel. This is the default Design used when no design_name
is supplied by the caller.
"""

from pathlib import Path

from pipeline.agents.ppt_agent.scripts.theme.base_design import Design

_ASSETS = Path(__file__).resolve().parents[3] / "assets"

DESIGN = Design(
    # colours
    primary_color="1A3C6E",
    secondary_color="4A7AB5",
    accent_color="E8A838",
    background_color="FFFFFF",
    text_color="333333",
    # typography
    heading_font="Calibri",
    body_font="Calibri",
    # branding
    logo_path=_ASSETS / "logos" / "aziro-logo.png",
    footer_text="Confidential — Aziro Solutions",
    # FLUX palette description
    palette_hint=(
        "deep corporate blue (#1A3C6E) primary and warm amber (#E8A838) "
        "accent palette on a pure white (#FFFFFF) background"
    ),
)
