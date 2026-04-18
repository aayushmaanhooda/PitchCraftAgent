"""Generated image helpers for python-pptx embedding.

Public API:
  fit_image_dims(path, max_width_emu, max_height_emu) -> (width, height)
    Opens the image to read its pixel dimensions, then calculates EMU
    width and height that fit within the target bounding box while
    preserving aspect ratio.  python-pptx handles actual loading and
    scaling when the path is passed to ``add_picture``.

Called by the hero_image layout when blueprint.generated_image_path is
set. Any path that fails to load raises loudly — silently falling back
to 'no image' would produce a visually broken slide.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def fit_image_dims(
    path: str, max_width: int, max_height: int,
) -> tuple[int, int]:
    """Calculate EMU dimensions to fit an image within bounds.

    Maintains aspect ratio.  Returns ``(width_emu, height_emu)``.

    Raises ``FileNotFoundError`` if *path* does not exist.
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Generated image not found: {path}")

    with Image.open(p) as img:
        img_w, img_h = img.size

    aspect = img_w / img_h

    # Try fitting by width first.
    w = max_width
    h = int(w / aspect)

    if h > max_height:
        # Width-fit overflows vertically → fit by height instead.
        h = max_height
        w = int(h * aspect)

    return w, h
