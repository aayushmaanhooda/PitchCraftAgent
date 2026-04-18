"""Font Awesome icon rendering helpers.

Public API:
  get_icon_png(name: str, color_hex: str, size_px: int) -> bytes | None
    Loads the SVG from the local icon cache, recolors it, rasterises to
    PNG bytes via cairosvg. If the SVG is not cached locally, attempts
    to download it from the Font Awesome CDN on demand. If that 404s,
    asks Claude for the closest valid FA6 Free solid name and retries.

  download_base_icons() -> int
    Downloads a curated set of commonly used FA 6 Free solid icons.
    Returns the number of icons downloaded.
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

import cairosvg
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_ICONS_DIR = Path(__file__).resolve().parents[2] / "assets" / "icons"

# Font Awesome 6 Free solid SVGs on jsDelivr CDN.
_FA_CDN = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/svgs/solid"

# On-disk mapping of {bad_name: suggested_name} so we don't ask the LLM
# more than once per bad name across runs.
_FALLBACK_CACHE_FILE = _ICONS_DIR / "_fallback_map.json"

# Commonly used icons that the visual planner tends to pick.
_BASE_ICONS = [
    "shield-halved", "chart-line", "bolt", "gears", "lock",
    "chart-bar", "server", "cloud", "code", "money-bill",
    "handshake", "star", "rocket", "trophy", "diamond",
    "crown", "lightbulb", "users", "award", "circle-check",
    "globe", "database", "network-wired", "layer-group",
    "puzzle-piece", "bullseye", "gauge-high", "arrow-trend-up",
    "shield", "key", "clock", "file-invoice",
    "credit-card", "building", "chart-pie",
    "triangle-exclamation", "money-bill-wave",
    "link", "plug", "arrows-rotate", "leaf", "eye", "brain",
    "microchip", "sitemap", "sliders", "wand-magic-sparkles",
    "mobile-screen", "graduation-cap", "book", "book-open",
    "certificate", "medal", "file-shield", "list-check",
    "user-graduate", "school", "flag-checkered",
]


def _load_fallback_cache() -> dict[str, str]:
    """Load the disk-backed {bad_name: good_name} cache."""
    if _FALLBACK_CACHE_FILE.exists():
        try:
            return json.loads(_FALLBACK_CACHE_FILE.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _save_fallback_cache(cache: dict[str, str]) -> None:
    """Persist the fallback cache to disk."""
    _ICONS_DIR.mkdir(parents=True, exist_ok=True)
    _FALLBACK_CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def _cdn_icon_exists(name: str) -> bool:
    """Quick HEAD check — is this icon resolvable on the FA CDN?"""
    try:
        resp = httpx.head(
            f"{_FA_CDN}/{name}.svg", timeout=5, follow_redirects=True,
        )
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


# Curated roster of FA6 Free solid icons the LLM picks from. All verified
# to exist on the CDN. Organised loosely by category so the model has
# coverage without hallucinating names that may not exist.
_FALLBACK_CANDIDATES = (
    # devices / tech
    "mobile-screen", "tablet-screen-button", "laptop", "desktop", "server",
    "microchip", "memory", "hard-drive", "ethernet", "wifi",
    # learning / compliance
    "graduation-cap", "book", "book-open", "certificate", "medal",
    "school", "user-graduate", "chalkboard", "chalkboard-user",
    "clipboard-check", "clipboard-list", "file-shield", "user-shield",
    # security
    "shield", "shield-halved", "lock", "key", "user-lock", "fingerprint",
    # analytics / charts
    "chart-line", "chart-bar", "chart-pie", "chart-area", "chart-column",
    "arrow-trend-up", "gauge-high", "magnifying-glass-chart",
    # flow / process
    "gear", "gears", "arrows-rotate", "sitemap", "diagram-project",
    "code-branch", "code-merge", "layer-group", "puzzle-piece",
    # communication / people
    "users", "user-tie", "handshake", "comments", "headset",
    # cloud / data
    "cloud", "cloud-arrow-up", "cloud-arrow-down", "database",
    "network-wired", "globe",
    # status / actions
    "circle-check", "circle-exclamation", "triangle-exclamation",
    "bolt", "rocket", "star", "award", "trophy", "crown",
    "lightbulb", "bullseye", "flag-checkered", "leaf", "link", "plug",
    # finance
    "money-bill", "credit-card", "file-invoice", "building",
    # misc
    "clock", "list-check", "eye", "brain", "wand-magic-sparkles",
)


def _suggest_fallback_icon(bad_name: str) -> str | None:
    """Ask Claude to pick the closest match from a curated FA6 roster.

    Picking from a known-valid list is far more reliable than having the
    LLM free-form generate a name (which can echo the input or invent
    non-existent icons). We still CDN-verify before returning.
    Caches the mapping on disk so we only ever ask once per bad name.
    """
    cache = _load_fallback_cache()
    if bad_name in cache:
        cached = cache[bad_name]
        return cached if cached else None

    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage, SystemMessage
        from pydantic import BaseModel, Field
    except ImportError:
        logger.warning("LLM fallback unavailable — langchain not installed")
        return None

    roster = "\n".join(f"  - {n}" for n in _FALLBACK_CANDIDATES)

    class IconChoice(BaseModel):
        name: str = Field(
            ...,
            description=(
                "The EXACT icon name chosen from the provided roster. "
                "Must be one of the listed names character-for-character. "
                "Never return the invalid input name."
            ),
        )

    system = (
        "You pick the single best Font Awesome 6 Free solid icon to "
        "replace a known-invalid icon name. You MUST choose from the "
        "roster below — nothing else. Pick the icon that best matches "
        "the semantic intent of the invalid name.\n\n"
        f"ROSTER (pick exactly one):\n{roster}\n\n"
        "Return only the chosen name, character-for-character as listed."
    )
    user = (
        f"The invalid icon name is {bad_name!r}. "
        f"Pick the best semantic match from the roster."
    )

    try:
        llm = ChatAnthropic(model="claude-haiku-4-5-20251001", max_tokens=128)
        structured = llm.with_structured_output(IconChoice)
        result: IconChoice = structured.invoke([
            SystemMessage(content=system),
            HumanMessage(content=user),
        ])
        suggestion = result.name.strip().lstrip("-")
    except Exception as exc:
        logger.warning("LLM icon fallback failed for %s: %s", bad_name, exc)
        cache[bad_name] = ""
        _save_fallback_cache(cache)
        return None

    if suggestion not in _FALLBACK_CANDIDATES:
        logger.warning(
            "LLM returned %r which is not in the roster; giving up", suggestion,
        )
        cache[bad_name] = ""
        _save_fallback_cache(cache)
        return None

    if _cdn_icon_exists(suggestion):
        logger.info("Icon fallback: %s -> %s", bad_name, suggestion)
        cache[bad_name] = suggestion
        _save_fallback_cache(cache)
        return suggestion

    logger.warning(
        "Roster pick %r for %r failed CDN check", suggestion, bad_name,
    )
    cache[bad_name] = ""
    _save_fallback_cache(cache)
    return None


def _download_icon(name: str) -> Path | None:
    """Download a single FA solid SVG from CDN. Returns path or None."""
    _ICONS_DIR.mkdir(parents=True, exist_ok=True)
    target = _ICONS_DIR / f"{name}.svg"

    if target.exists():
        return target

    url = f"{_FA_CDN}/{name}.svg"
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        if resp.status_code == 200 and resp.text.strip().startswith("<svg"):
            target.write_text(resp.text)
            logger.info("Downloaded icon: %s", name)
            return target
        logger.warning("Icon not found on CDN: %s (status %d)", name, resp.status_code)
    except httpx.HTTPError as exc:
        logger.warning("Failed to download icon %s: %s", name, exc)

    return None


def download_base_icons() -> int:
    """Download the base set of commonly used FA icons. Returns count downloaded."""
    downloaded = 0
    for name in _BASE_ICONS:
        path = _ICONS_DIR / f"{name}.svg"
        if not path.exists():
            if _download_icon(name):
                downloaded += 1
    return downloaded


def _resolve_svg_path(name: str) -> Path | None:
    """Resolve a FA name to a local SVG, downloading + fallback if needed."""
    svg_path = _ICONS_DIR / f"{name}.svg"
    if svg_path.exists():
        return svg_path

    # Try direct download first.
    result = _download_icon(name)
    if result is not None:
        return result

    # CDN 404 — ask the LLM for the closest valid icon name.
    fallback = _suggest_fallback_icon(name)
    if fallback is None:
        return None

    fallback_path = _ICONS_DIR / f"{fallback}.svg"
    if fallback_path.exists():
        return fallback_path
    return _download_icon(fallback)


@lru_cache(maxsize=256)
def get_icon_png(
    name: str, color_hex: str, size_px: int = 64,
) -> bytes | None:
    """Rasterise a Font Awesome SVG to coloured PNG bytes.

    Resolution order:
      1. local SVG cache
      2. CDN download for the given name
      3. LLM fallback (Claude) for a semantically similar valid FA6 name
      4. None if all three fail
    """
    svg_path = _resolve_svg_path(name)
    if svg_path is None:
        return None

    svg_text = svg_path.read_text()
    # Inject fill colour into the root <svg> element.
    colored_svg = svg_text.replace("<svg", f'<svg fill="#{color_hex}"', 1)

    return cairosvg.svg2png(
        bytestring=colored_svg.encode(),
        output_width=size_px,
        output_height=size_px,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"Icon directory: {_ICONS_DIR}")
    print(f"Base icon set: {len(_BASE_ICONS)} icons")
    print("Downloading base icons...")
    count = download_base_icons()
    existing = len(list(_ICONS_DIR.glob("*.svg")))
    print(f"Downloaded: {count} new icons")
    print(f"Total cached: {existing} SVGs")

    # Quick fallback test — mobile-alt is an FA5 name that 404s on FA6.
    print("\nTesting LLM fallback with 'mobile-alt'...")
    test_png = get_icon_png("mobile-alt", "E8A838", 64)
    if test_png:
        print(f"Render test: mobile-alt -> {len(test_png)} bytes PNG (via fallback)")
    else:
        print("Render test: FAILED")
