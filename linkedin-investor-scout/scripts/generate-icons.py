#!/usr/bin/env python3
"""Generate icon assets for the LinkedIn Investor Scout extension.

Run from the linkedin-investor-scout/ directory:
    python3 scripts/generate-icons.py

Produces icons/16.png, icons/48.png, icons/128.png.
Design: rounded square in LinkedIn blue (#0A66C2) with a white
concentric-ring "scout target" mark (radar/reticle) centered.
Simple geometry so it stays readable at 16px.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

BG_COLOR = (10, 102, 194, 255)  # LinkedIn blue
FG_COLOR = (255, 255, 255, 255)  # white
SIZES = (16, 48, 128)

ICONS_DIR = Path(__file__).resolve().parent.parent / "icons"


def _rounded_square(size: int, radius_ratio: float = 0.22) -> Image.Image:
    """Opaque rounded-square canvas at the given pixel size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(2, int(size * radius_ratio))
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=radius,
        fill=BG_COLOR,
    )
    return img


def _draw_target(img: Image.Image) -> None:
    """Draw a concentric-ring scout target centered on the canvas."""
    size = img.width
    draw = ImageDraw.Draw(img)
    cx = cy = size / 2

    # Outer ring, inner ring, and center dot radii as fractions of size.
    # Stroke width scales with size but is clamped so 16px stays crisp.
    ring_outer = size * 0.36
    ring_inner = size * 0.20
    dot_r = size * 0.07
    stroke = max(1, round(size * 0.08))

    # Outer ring
    draw.ellipse(
        [(cx - ring_outer, cy - ring_outer), (cx + ring_outer, cy + ring_outer)],
        outline=FG_COLOR,
        width=stroke,
    )
    # Inner ring (skipped at 16px — two rings + dot would muddle)
    if size >= 32:
        draw.ellipse(
            [(cx - ring_inner, cy - ring_inner), (cx + ring_inner, cy + ring_inner)],
            outline=FG_COLOR,
            width=max(1, stroke - 1),
        )
    # Center dot
    draw.ellipse(
        [(cx - dot_r, cy - dot_r), (cx + dot_r, cy + dot_r)],
        fill=FG_COLOR,
    )


def render(size: int, out_path: Path) -> None:
    # Render at 4x then downsample for crisp anti-aliased edges.
    scale = 4 if size < 128 else 2
    big = _rounded_square(size * scale)
    _draw_target(big)
    final = big.resize((size, size), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(out_path, format="PNG", optimize=True)
    print(f"wrote {out_path.relative_to(Path.cwd())} ({size}x{size})")


def main() -> None:
    for s in SIZES:
        render(s, ICONS_DIR / f"{s}.png")


if __name__ == "__main__":
    main()
