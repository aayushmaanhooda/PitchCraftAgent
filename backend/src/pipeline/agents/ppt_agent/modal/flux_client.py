"""OpenAI-backed image generator.

Keeps the original FLUX/Modal function signature (`generate_image(prompt, width,
height, steps, seed) -> bytes`) so the rest of the ppt_agent pipeline is
unchanged. `steps` and `seed` are ignored — OpenAI's image API does not expose
them. `width`/`height` are snapped to the nearest OpenAI-supported size.
"""

from __future__ import annotations

import base64
from pathlib import Path

from openai import OpenAI

from core.config import get_settings


_SUPPORTED_SIZES = (
    (1024, 1024),
    (1024, 1536),
    (1536, 1024),
)


def _closest_size(width: int, height: int) -> str:
    target = width / height
    best = min(
        _SUPPORTED_SIZES,
        key=lambda wh: abs((wh[0] / wh[1]) - target),
    )
    return f"{best[0]}x{best[1]}"


def generate_image(
    prompt: str,
    width: int = 1024,
    height: int = 768,
    steps: int = 20,
    seed: int = 42,
) -> bytes:
    client = OpenAI(api_key=get_settings().OPENAI_API_KEY)
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=_closest_size(width, height),
        n=1,
    )
    b64 = response.data[0].b64_json
    return base64.b64decode(b64)


def save_image(
    prompt: str,
    output_path: Path,
    width: int = 1024,
    height: int = 768,
    steps: int = 20,
    seed: int = 42,
) -> Path:
    image_bytes = generate_image(
        prompt=prompt,
        width=width,
        height=height,
        steps=steps,
        seed=seed,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return output_path
