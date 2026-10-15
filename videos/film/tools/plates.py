# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Split each key-art illustration into screen-print plates.

Model: pixel = paper * blue^cb * orange^co * charcoal^ck (Beer-Lambert, per channel).
Solving the 3x3 log system per pixel gives ink coverages. We export two plates:
  key plate    = blue^cb   (blue ink; overprint with orange gives the charcoal darks)
  signal plate = orange^co               (orange ink)
Multiplied onto cream paper they rebuild the art; offsetting them is real misregistration.
A <name>-recon.jpg preview of that rebuild goes to the gitignored renders/plates/.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SITE = Path(__file__).resolve().parents[3] / "public"  # the site repo this folder lives in
OUT = Path(__file__).resolve().parents[1] / "assets/plates"
PREVIEW = Path(__file__).resolve().parents[2] / "renders/plates"  # debug only, kept out of the published assets
PAPER = np.array([249, 244, 236]) / 255
BLUE = np.array([61, 67, 206]) / 255
ORANGE = np.array([254, 77, 27]) / 255
CHARCOAL = np.array([57, 54, 54]) / 255
SOURCES = {
    "cover": "images/cover_v2-optimized.webp",
    "manifesto": "da/manifesto-civic-optimized.webp",
    "miroir": "images/chateau-nantes-miroir-eau-banner-genai-days-optimized.webp",
    "costs": "da/issue-costs-optimized.webp",
    "shadow": "da/issue-shadow-ai-optimized.webp",
    "sovereignty": "da/issue-sovereignty-optimized.webp",
    "production": "da/issue-production-optimized.webp",
    "speakers": "images/speaker_background-optimized.webp",
    "castle": "images/nantes_castle-optimized.webp",
    "hotel": "images/hotel-region-banner-genai-days-optimized.webp",
    "chateau": "images/affiche-chateau-nantes-2306.webp",
    # Not on the site: absolute path wins over SITE in the join below.
    "rails": str(Path(__file__).resolve().parents[1] / "assets/img/tracks-rails-v2-optimized.webp"),
}
MAX_W = 2400

M = np.log(np.stack([BLUE, ORANGE, CHARCOAL], axis=1))  # 3x3, columns = inks
M2_PINV = np.linalg.pinv(M[:, :2])
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)

for name, rel in SOURCES.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]:
        continue
    im = Image.open(SITE / rel).convert("RGBA")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    rgba = np.asarray(im).astype(np.float64) / 255
    alpha = rgba[..., 3:4]
    rgb = rgba[..., :3] * alpha + PAPER * (1 - alpha)
    y = np.log(np.clip(rgb, 1e-3, 1) / PAPER)  # h, w, 3
    # Two-ink least squares (blue + orange); charcoal comes from overprinting both,
    # which keeps the light pinks and mid blues of the art instead of greying them.
    cov = np.einsum("ij,hwj->hwi", M2_PINV, y)
    cov = np.clip(cov, 0, 4)
    cb, co = cov[..., 0:1], cov[..., 1:2]
    key = np.power(BLUE, cb)
    signal = np.power(ORANGE, co)
    for plate, data in (("key", key), ("signal", signal)):
        img = Image.fromarray((np.clip(data, 0, 1) * 255).round().astype(np.uint8), "RGB")
        img.save(OUT / f"{name}-{plate}.webp", quality=88, method=6)
    recon = PAPER * key * signal
    Image.fromarray((np.clip(recon, 0, 1) * 255).round().astype(np.uint8)).save(PREVIEW / f"{name}-recon.jpg", quality=80)
    print(name, im.size)
