"""Build single-colour alpha masks for the partner logos.

For each logo: rasterize, keep coverage as alpha, carve a thin gap where two
opaque colour regions meet (so Elastic's petals or Clever Cloud's facets stay
readable once flattened to one colour), trim to the ink bbox, and write a
white PNG with alpha under assets/partners/mono/. Prints per-logo metrics
(aspect ratio, ink density) as JSON for PARTNER_ROWS in index.html.

DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib uv run --with cairosvg --with pillow --with numpy python -I tools/partners_mono.py assets/partners
"""
import io
import json
import sys
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image, ImageFilter

src = Path(sys.argv[1])
out = src / "mono"
out.mkdir(exist_ok=True)
RASTER_WIDTH = 1600
GAP_PX = 1.0  # carve radius relative to a 1600px-wide raster
# Multi-colour marks whose shapes only read through colour changes; elsewhere
# overlapping paths would leave false seams, so the plain alpha is kept.
SEAMED = {"Logo Elastic-optimized.svg", "clever-cloud.svg"}

metrics = {}
for f in sorted(p for p in src.iterdir() if p.is_file()):
    if f.suffix == ".svg":
        im = Image.open(io.BytesIO(cairosvg.svg2png(url=str(f), output_width=RASTER_WIDTH))).convert("RGBA")
    else:
        im = Image.open(f).convert("RGBA")
        scale = max(1, round(RASTER_WIDTH / 2 / im.width))
        im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    alpha = a[..., 3]
    # Colour over white: an edge between two opaque fills shows up as a jump here.
    rgb = a[..., :3] * alpha[..., None] + (1 - alpha[..., None])
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    gy, gx = np.gradient(lum)
    grad = np.hypot(gx, gy)
    solid = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 30
    seam = (grad > 0.04) & solid
    seam_img = Image.fromarray((seam * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(GAP_PX))
    carve = np.asarray(seam_img).astype(np.float32) / 255
    if f.name in SEAMED:
        mono = np.clip(alpha * (1 - np.clip(carve * 1.6, 0, 1)), 0, 1)
        # Semi-transparent fills (Clever Cloud facets) go solid: one colour, one opacity.
        mono = np.clip(mono / 0.2, 0, 1) * (alpha > 0.08)
    else:
        mono = alpha * (alpha > 0.08)
    ys, xs = np.nonzero(mono > 0.12)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    mono = mono[y0:y1, x0:x1]
    h, w = mono.shape
    pad = 2
    canvas = np.zeros((h + 2 * pad, w + 2 * pad), dtype=np.float32)
    canvas[pad:-pad, pad:-pad] = mono
    rgba = np.zeros(canvas.shape + (4,), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (canvas * 255).round().astype(np.uint8)
    name = f.stem + ".png"
    Image.fromarray(rgba).save(out / name, optimize=True)
    metrics[f.name] = {"mono": name, "aspect": round(w / h, 3), "density": round(float(mono.mean()), 3), "px": [w, h]}

print(json.dumps(metrics, indent=1))
