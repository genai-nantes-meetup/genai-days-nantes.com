"""Crop every speaker portrait used by the live-stream graphics so the face has the same size and eye line.

The site is the only source of truth for portraits: each speaker's `photo` field in src/content/speakers/<slug>.md
points to the file in public/. This script reads it directly, so the graphics keep no copy of their own, and writes
only the derived crops to assets/speakers/norm/.

Usage (from the repo root or anywhere):
  uv run --with "opencv-python-headless<5" --with numpy --with pyyaml python videos/habillage-captation/scripts/normalise_faces.py [slug ...]
Without slugs, every speaker referenced in bumpers.html is processed. OpenCV 5 dropped cv2.CascadeClassifier, hence the pin.
"""
import sys, os, re, json, pathlib
import cv2
import numpy as np
import yaml

HABILLAGE = pathlib.Path(__file__).resolve().parent.parent
REPO = HABILLAGE.parent.parent
OUT = HABILLAGE / "assets" / "speakers" / "norm"
SIDE = 720
FACE_RATIO = 0.40      # detected face box height / output side
FACE_CENTER_Y = 0.44   # face box centre, as a fraction of the output height


def site_photo(slug):
    front = (REPO / "src" / "content" / "speakers" / f"{slug}.md").read_text().split("---")[1]
    return REPO / "public" / yaml.safe_load(front)["photo"].lstrip("/")


def graphics_slugs():
    # P("Name","slug",...) entries of SESSIONS
    return sorted(set(re.findall(r'P\("[^"]*","([^"]+)"', (HABILLAGE / "bumpers.html").read_text())))


def normalise(slug, path, cascade):
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:  # flatten transparency on a neutral grey
        alpha = img[:, :, 3:4] / 255.0
        img = (img[:, :, :3] * alpha + 200 * (1 - alpha)).astype(np.uint8)
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = grey.shape
    faces = cascade.detectMultiScale(grey, 1.08, 6, minSize=(int(min(h, w) * 0.08),) * 2)
    if len(faces) == 0:
        return None
    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    side = fh / FACE_RATIO
    cx, cy = x + fw / 2, y + fh / 2
    left, top = cx - side / 2, cy - side * FACE_CENTER_Y
    # Tight headshots: extend the photo by edge replication, then blur the added area so no streaks show
    pad = int(side)
    padded = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    inside = np.zeros(padded.shape[:2], np.float32)
    inside[pad:pad + h, pad:pad + w] = 1
    soft = cv2.GaussianBlur(padded, (0, 0), side / 18)
    feather = cv2.GaussianBlur(inside, (0, 0), side / 60)[:, :, None]
    padded = (padded * feather + soft * (1 - feather)).astype(np.uint8)
    crop = padded[int(top) + pad:int(top + side) + pad, int(left) + pad:int(left + side) + pad]
    crop = cv2.resize(crop, (SIDE, SIDE), interpolation=cv2.INTER_AREA if side > SIDE else cv2.INTER_CUBIC)
    cv2.imwrite(str(OUT / f"{slug}.webp"), crop, [cv2.IMWRITE_WEBP_QUALITY, 88])
    overflow = {k: round(v, 2) for k, v in dict(l=-left, t=-top, r=left + side - w, b=top + side - h).items() if v > 0}
    return dict(src=str(path.relative_to(REPO)), face=[int(x), int(y), int(fw), int(fh)], size=[w, h],
                upscale=round(SIDE / side, 2), overflow=overflow, faces=len(faces))


cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
OUT.mkdir(parents=True, exist_ok=True)
report = {}
for slug in sys.argv[1:] or graphics_slugs():
    result = normalise(slug, site_photo(slug), cascade)
    report[slug] = result or "NO FACE"
    if result and result["faces"] > 1:
        print(f"check {slug}: {result['faces']} faces detected, the largest was kept", file=sys.stderr)
print(json.dumps(report, indent=1, ensure_ascii=False))
