"""image_generator — second node of the PPT graph.

Two-step node:
  1. Claude call with a dedicated prompt-writing system prompt.
     Writes image descriptions for slides marked image_source=generated.
  2. Parallel image-generation calls. Saves PNGs, attaches paths to blueprints.

Provider is switchable via the ``IMAGE_PROVIDER`` env var:
  - ``openai`` (default) — OpenAI ``gpt-image-1`` via the ``openai`` SDK.
  - ``flux``             — FLUX.1-dev via Modal (kept as fallback).

Same prompt-writer system prompt is reused for both providers so swapping
the backend changes only the pixel-generator, not the prompt style.

Skipped entirely (conditional edge) when no slides need images.
"""

from __future__ import annotations

import base64
import os
import random
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from openai import OpenAI, RateLimitError
from pydantic import BaseModel, Field

from pipeline.agents.ppt_agent.modal.flux_client import generate_image
from pipeline.agents.ppt_agent.schema import (
    ContentSource,
    DeckBlueprint,
    SalesPPTOutput,
    SlideBlueprint,
)
from pipeline.agents.ppt_agent.scripts.theme import get_design
from pipeline.agents.ppt_agent.scripts.theme.base_design import Design

load_dotenv()

PROMPT_WRITER_MODEL = "claude-sonnet-4-20250514"
OPENAI_IMAGE_MODEL = "gpt-image-1"
_TMP_DIR = Path(__file__).resolve().parents[2] / "agent" / "output" / "tmp"


# ── Schema for the prompt-writing LLM call ──────────────────────────

class ImagePromptEntry(BaseModel):
    """One FLUX prompt for a single slide."""
    position: int = Field(..., description="Slide position this prompt is for.")
    prompt: str = Field(..., description="FLUX image generation prompt.")


class ImagePromptsResult(BaseModel):
    """All FLUX prompts for slides that need images."""
    prompts: list[ImagePromptEntry] = Field(..., min_length=1)


# ── Step 1: Write FLUX prompts via Claude ────────────────────────────
#
# All palette / colour phrasing comes from the active Design's
# ``palette_hint`` — NEVER hardcoded here. Swapping corporate_blue for
# warm_earth must change every generated image's colours without edits
# to this file.


def _build_prompt_writer_system(design: Design) -> str:
    """Build the FLUX prompt-writer system prompt for the active design."""
    return f"""You write image generation prompts for a FLUX.1-dev model.

You receive slide content for slides that need generated images in a B2B sales presentation.
For EACH slide, write ONE sharp, evocative prompt (35-55 words) that produces a polished
minimalist flat-vector illustration suitable as a side-panel visual.

MANDATORY STYLE ELEMENTS — include verbatim phrasing in every prompt:
- "minimalist flat vector illustration, editorial magazine style"
- "{design.palette_hint}"
- "bold simple shapes, thick clean outlines, generous negative space"
- "one soft drop shadow per element"
- "no gradients, no grain, no noise, no texture, no blur, no soft focus"
- "tack-sharp crisp edges, razor-sharp vector lines, ultra-high-resolution, 8k, studio quality"

CRITICAL: Use EXACTLY the palette phrasing above. Do not invent alternative colours,
substitute "blue/white/amber" etc., or describe colours that contradict the palette.
The palette phrase is the single source of truth for the illustration's colour scheme.

CONTENT RULES:
- Describe ONE clear central object or scene representing the slide's core idea.
- Prefer FEW bold shapes over intricate detail — FLUX renders simple subjects cleanly
  but blurs busy / detailed scenes at this step budget.
- Good examples: "a single stylised shield with a keyhole",
  "a floating cloud connected to three modules by thick pipelines",
  "a minimalist bar chart rising diagonally with an accent arrow".
- NEVER include people, faces, text, numbers, logos, watermarks, hands, or body parts.
- Avoid clichés: no "network of dots", no vague "data flowing". Pick ONE concrete metaphor.

OUTPUT SHAPE: one ImagePromptEntry per slide. The position must match the input.
"""


_COVER_PROMPT_TEMPLATE = (
    "Minimalist flat vector illustration, editorial magazine style, representing {theme_hint}, "
    "centred composition, bold simple shapes with thick clean outlines, generous negative space, "
    "{palette_hint}, "
    "one soft drop shadow per element, "
    "no gradients, no grain, no noise, no texture, no blur, no soft focus, "
    "no text, no logos, no people, "
    "tack-sharp crisp edges, razor-sharp vector lines, ultra-high-resolution, 8k, studio quality, "
    "premium B2B presentation cover art."
)


_SUMMARY_PROMPT_TEMPLATE = (
    "Minimalist flat vector illustration, editorial magazine style, symbolising {theme_hint}: "
    "a single central hub connected to three simple surrounding modules by thick "
    "clean lines, bold simple shapes, thick outlines, generous negative space, "
    "{palette_hint}, "
    "one soft drop shadow per element, "
    "no gradients, no grain, no noise, no texture, no blur, no soft focus, "
    "no text, no logos, no people, "
    "tack-sharp crisp edges, razor-sharp vector lines, ultra-high-resolution, 8k, studio quality."
)


def _summarise_theme(theme: str, title: str, max_words: int = 14) -> str:
    """Compress the deck theme into a short noun phrase for the FLUX prompt."""
    base = (theme or title).strip()
    words = base.split()
    if len(words) > max_words:
        base = " ".join(words[:max_words])
    return base.rstrip(".")


def build_deterministic_cover_prompt(
    content: SalesPPTOutput, design: Design,
) -> str:
    """Template-based FLUX prompt for the cover — no LLM involved.

    Deterministic so the cover illustration is reproducible for a given
    (deck title + theme + design). Palette comes from ``design.palette_hint``.
    """
    hint = _summarise_theme(content.proposed_solution_theme, content.deck_title)
    return _COVER_PROMPT_TEMPLATE.format(
        theme_hint=hint,
        palette_hint=design.palette_hint,
    )


def build_deterministic_summary_prompt(
    content: SalesPPTOutput, design: Design,
) -> str:
    """Template-based FLUX prompt for the summary_solution slide.

    Deterministic — no LLM involved. Palette comes from ``design.palette_hint``
    so the image matches whichever design is active.
    """
    hint = _summarise_theme(content.proposed_solution_theme, content.deck_title)
    return _SUMMARY_PROMPT_TEMPLATE.format(
        theme_hint=hint,
        palette_hint=design.palette_hint,
    )


def _build_slide_summaries(
    content: SalesPPTOutput,
    image_slides: list[SlideBlueprint],
) -> str:
    """Build a summary of slides that need images for the prompt-writer.

    The cover slide is handled deterministically (not via LLM), so only
    main_slide entries end up here in practice.
    """
    lines: list[str] = []
    for bp in image_slides:
        lines.append(f"--- Slide position={bp.position}, layout={bp.layout.value} ---")

        if bp.content_source == ContentSource.MAIN_SLIDE:
            slide = content.slides[bp.content_index]
            lines.append(f"Title: {slide.title}")
            lines.append(f"Purpose: {slide.purpose}")
            lines.append(f"Bullets: {'; '.join(slide.key_bullets[:3])}...")
        elif bp.content_source == ContentSource.USE_CASE:
            uc = content.use_cases[bp.content_index]
            lines.append(f"Title: {uc.title}")
            lines.append(f"Problem: {uc.customer_problem[:100]}...")
            lines.append(f"Solution: {uc.aziro_solution[:100]}...")
        else:
            lines.append(f"Content source: {bp.content_source.value}")

        lines.append("")

    return "\n".join(lines)


def _write_flux_prompts(
    content: SalesPPTOutput,
    image_slides: list[SlideBlueprint],
    design: Design,
    model: str | None = None,
) -> dict[int, str]:
    """Claude call to write FLUX prompts. Returns {position: prompt}.

    The system prompt is built from the active ``design`` so colour
    phrasing always matches the current palette.
    """
    llm = ChatAnthropic(model=model or PROMPT_WRITER_MODEL, max_tokens=4096)
    structured_llm = llm.with_structured_output(ImagePromptsResult)

    system = _build_prompt_writer_system(design)
    summary = _build_slide_summaries(content, image_slides)

    result: ImagePromptsResult = structured_llm.invoke([
        SystemMessage(content=system),
        HumanMessage(content=summary),
    ])

    return {entry.position: entry.prompt for entry in result.prompts}


# ── Step 2: Pixel generation backends ────────────────────────────────
#
# Two interchangeable providers share the same (position, prompt) → PNG
# file signature. Selected at runtime via the IMAGE_PROVIDER env var so
# the rest of the pipeline (prompt writer, renderer) is provider-agnostic.


def _generate_flux(position: int, prompt: str) -> tuple[int, Path]:
    """Generate one image via Modal FLUX and save to disk."""
    _TMP_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _TMP_DIR / f"slide_{position}.png"

    png_bytes = generate_image(prompt=prompt, width=1280, height=1280, steps=45)
    out_path.write_bytes(png_bytes)

    return position, out_path


_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    """Lazy-init singleton — avoids constructing a client at import time."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI()
    return _openai_client


_OPENAI_MAX_RETRIES = 5
_OPENAI_RETRY_SECONDS_FALLBACK = 15


def _parse_retry_after(err: RateLimitError) -> float:
    """Extract the 'try again in Xs' hint from the API message.

    OpenAI's 429 body is ``"Please try again in 12s."`` — we parse the
    number and wait that long plus a jitter. Falls back to a conservative
    default when the phrase isn't present.
    """
    msg = str(err)
    match = re.search(r"try again in (\d+(?:\.\d+)?)\s*s", msg)
    if match:
        return float(match.group(1))
    return float(_OPENAI_RETRY_SECONDS_FALLBACK)


def _generate_openai(position: int, prompt: str) -> tuple[int, Path]:
    """Generate one image via OpenAI ``gpt-image-1`` and save to disk.

    gpt-image-1 always returns base64-encoded bytes on ``data[0].b64_json``.
    We decode and write them as PNG so the renderer does not care which
    provider produced the file.

    On ``RateLimitError`` (429), we honour the API's ``try again in Xs``
    hint and retry up to ``_OPENAI_MAX_RETRIES`` times with jitter. This
    is the 5-img/min tier limit most accounts hit on large decks.
    """
    _TMP_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _TMP_DIR / f"slide_{position}.png"

    client = _get_openai_client()
    last_err: Exception | None = None
    for attempt in range(_OPENAI_MAX_RETRIES):
        try:
            result = client.images.generate(
                model=OPENAI_IMAGE_MODEL,
                prompt=prompt,
                size="1024x1024",
                quality="high",
                n=1,
                output_format="png",
                background="auto",
            )
            break
        except RateLimitError as err:
            last_err = err
            wait_s = _parse_retry_after(err) + random.uniform(1.0, 3.0)
            print(
                f"[openai 429] slide {position} attempt {attempt + 1}/"
                f"{_OPENAI_MAX_RETRIES} — sleeping {wait_s:.1f}s"
            )
            time.sleep(wait_s)
    else:
        raise RuntimeError(
            f"OpenAI rate limit exceeded for slide {position} after "
            f"{_OPENAI_MAX_RETRIES} retries"
        ) from last_err

    b64 = result.data[0].b64_json
    if b64 is None:
        raise RuntimeError(f"OpenAI returned no b64_json for slide {position}")
    out_path.write_bytes(base64.b64decode(b64))

    return position, out_path


def _resolve_provider() -> str:
    """Return 'openai' or 'flux' based on the IMAGE_PROVIDER env var."""
    provider = os.getenv("IMAGE_PROVIDER", "openai").strip().lower()
    if provider not in {"openai", "flux"}:
        raise ValueError(
            f"Unknown IMAGE_PROVIDER={provider!r}; expected 'openai' or 'flux'."
        )
    return provider


_PROVIDER_MAX_WORKERS = {
    # OpenAI gpt-image-1 default tier = 5 images/minute. Cap threads
    # well under that so retries (not concurrency) absorb the limit.
    "openai": 3,
    # FLUX via Modal has no public per-minute cap — fan out wide.
    "flux": 10,
}


def _generate_all_parallel(prompts: dict[int, str]) -> dict[int, Path]:
    """Run image calls in parallel via threads, rate-aware per provider."""
    from concurrent.futures import ThreadPoolExecutor

    provider = _resolve_provider()
    generator = _generate_openai if provider == "openai" else _generate_flux
    max_workers = min(len(prompts), _PROVIDER_MAX_WORKERS[provider])
    print(f"Image provider: {provider} (max_workers={max_workers})")

    results: dict[int, Path] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(generator, pos, prompt): pos
            for pos, prompt in prompts.items()
        }
        for future in futures:
            pos, path = future.result()
            results[pos] = path

    return results


# ── Public API ───────────────────────────────────────────────────────

def generate_images(
    content: SalesPPTOutput,
    blueprint: DeckBlueprint,
    *,
    model: str | None = None,
) -> dict[int, str]:
    """Write FLUX prompts + generate images + attach paths to blueprints.

    The active ``Design`` is resolved from ``blueprint.design_name`` and
    drives all palette phrasing in every generated prompt.

    Returns ``{position: image_path}`` for all generated images.
    """
    # Filter slides that need images.
    image_slides = [
        bp for bp in blueprint.slide_blueprints
        if bp.image_source.value == "generated"
    ]

    if not image_slides:
        return {}

    # Resolve the active design — palette phrasing in all prompts comes
    # from here, never hardcoded.
    design = get_design(blueprint.design_name)

    # Split into hardcoded (cover + summary_solution) vs LLM-written.
    hardcoded: dict[int, str] = {}
    llm_slides: list[SlideBlueprint] = []
    for bp in image_slides:
        if bp.content_source == ContentSource.DECK_TITLE:
            hardcoded[bp.position] = build_deterministic_cover_prompt(
                content, design,
            )
        elif bp.content_source == ContentSource.DECK_SUMMARY_SOLUTION:
            hardcoded[bp.position] = build_deterministic_summary_prompt(
                content, design,
            )
        else:
            llm_slides.append(bp)

    # Step 1: Claude writes FLUX prompts for the non-hardcoded slides.
    if llm_slides:
        print(f"Writing FLUX prompts for {len(llm_slides)} main slides...")
        llm_prompts = _write_flux_prompts(
            content, llm_slides, design, model=model,
        )
    else:
        llm_prompts = {}

    prompts: dict[int, str] = {**hardcoded, **llm_prompts}
    print(
        f"Prompts ready: {len(hardcoded)} hardcoded + {len(llm_prompts)} LLM-written."
    )

    # Step 2: Parallel image generation (provider resolved at runtime).
    print(f"Generating {len(prompts)} images in parallel...")
    paths = _generate_all_parallel(prompts)

    # Step 3: Attach paths back to blueprints.
    path_map: dict[int, str] = {}
    for bp in blueprint.slide_blueprints:
        if bp.position in prompts:
            bp.image_prompt = prompts[bp.position]
        if bp.position in paths:
            bp.generated_image_path = str(paths[bp.position])
            path_map[bp.position] = str(paths[bp.position])

    print(f"Done — {len(path_map)} images generated.")
    return path_map


if __name__ == "__main__":
    import json

    from pipeline.agents.ppt_agent.schema import SalesPPTEnvelope
    from pipeline.agents.ppt_agent.nodes.visual_planner import plan

    sample = Path("agent/output/sales_ppt_output.json")
    envelope = SalesPPTEnvelope.model_validate(json.loads(sample.read_text()))
    content = envelope.sales_ppt

    print("Step 1: Running visual planner...")
    logical_slides, blueprint = plan(content)
    print(f"  {len(blueprint.slide_blueprints)} blueprints, {blueprint.total_images} images planned.\n")

    print("Step 2: Running image generator...")
    paths = generate_images(content, blueprint)
    print("\nGenerated images:")
    for pos, path in sorted(paths.items()):
        bp = next(b for b in blueprint.slide_blueprints if b.position == pos)
        print(f"  slide {pos}: {path}")
        print(f"    prompt: {bp.image_prompt[:80]}...")
