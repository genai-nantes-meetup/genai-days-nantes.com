"""Push tools/holds.json into index.html (HOLDS table and clip windows). Run after tools/reading.py --fix."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
holds = json.loads((root / "tools/holds.json").read_text())["holds"]


def T(x):
    return round(x + sum(extra for at, extra in holds if x >= at), 3)


# Clip windows in source seconds.
SRC = {"root": (0, 28), "s1": (0, 3.05), "s2": (2.55, 7.05), "s3": (6.55, 9.05), "s4": (8.55, 12), "s5": (12, 15.05), "s6": (14.6, 18.05), "s7": (17.55, 22.05), "s9": (21.5, 28), "frag-ink": (0, 28), "grain": (0, 28), "bgm": (0, 28)}
html = (root / "index.html").read_text()
for key, (a, b) in SRC.items():
    html, n = re.subn(r'(id="%s"[^>]*?)data-start="[\d.]+" data-duration="[\d.]+"' % key, lambda m: f'{m.group(1)}data-start="{T(a):g}" data-duration="{round(T(b) - T(a), 3):g}"', html)
    assert n == 1, key
html, n = re.subn(r"var HOLDS = \[\[.*?\]\];", "var HOLDS = %s;" % json.dumps(holds), html)
assert n == 1
(root / "index.html").write_text(html)
print(f"index.html: {T(28):g} s")
