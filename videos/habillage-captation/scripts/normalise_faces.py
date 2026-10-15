"""Crop every speaker portrait so the face has the same size and eye line."""
import sys, glob, os, json
import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
SIDE = 720
FACE_RATIO = 0.40      # detected face box height / output side
FACE_CENTER_Y = 0.44   # face box centre, as a fraction of the output height

cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
report = {}
for path in sorted(glob.glob(os.path.join(SRC, "*.webp"))):
    slug = os.path.splitext(os.path.basename(path))[0]
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img.shape[2] == 4:  # flatten transparency on a neutral grey
        alpha = img[:, :, 3:4] / 255.0
        img = (img[:, :, :3] * alpha + 200 * (1 - alpha)).astype(np.uint8)
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = grey.shape
    faces = cascade.detectMultiScale(grey, 1.08, 6, minSize=(int(min(h, w) * 0.08),) * 2)
    if len(faces) == 0:
        print("NO FACE", slug); continue
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
    cv2.imwrite(os.path.join(OUT, slug + ".webp"), crop, [cv2.IMWRITE_WEBP_QUALITY, 88])
    overflow = {k: round(v, 2) for k, v in dict(l=-left, t=-top, r=left + side - w, b=top + side - h).items() if v > 0}
    report[slug] = dict(face=[int(x), int(y), int(fw), int(fh)], src=[w, h], upscale=round(SIDE / side, 2), overflow=overflow, n=len(faces))
print(json.dumps(report, indent=1))
