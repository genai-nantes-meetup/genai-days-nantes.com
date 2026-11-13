"""Pack the final hand-off zip: the offline preview at the root, the PNG pack and the HTML pack side by side.

Run after export_habillage.py (PNG pack in livrables/habillage-genai-days/) and build_single_html.py
(habillage-captation-genai-days.html). Usage: python3 scripts/pack_livrable.py <habillage-captation dir>
Output: livrables/GENAI-DAYS-habillage-captation.zip
"""
import os, sys, zipfile

ROOT = os.path.abspath(sys.argv[1])
EXPORT = os.path.join(ROOT, "livrables", "habillage-genai-days")
PREVIEW = os.path.join(ROOT, "habillage-captation-genai-days.html")
ZIP = os.path.join(ROOT, "livrables", "GENAI-DAYS-habillage-captation.zip")
TOP = "GENAI-DAYS-habillage-captation"
BROWSER_DIR = "navigateur"

README = """GENAI DAYS 2026 · Habillage de captation
Mardi 17 novembre 2026 · Hôtel de Région · Nantes


POUR VOIR LE RENDU

Ouvrir APERCU-habillage.html (double-clic, n'importe quel navigateur, sans internet).
On y trouve le board, le rendu final écran par écran (salle et YouTube), tous les
bumpers et toutes les trames, avec caméra, slides et sous-titres figurés.


POUR LA RÉGIE

images/       Les fichiers à l'antenne, en PNG 3840 x 2160 (conseillé).
              Le mode d'emploi est dans images/LISEZ-MOI-vMix.txt et
              images/LISEZ-MOI-OBS.txt.
navigateur/   La même chose en page HTML, pour une source Navigateur (OBS).
              Mode d'emploi : section « DOSSIER navigateur/ » de
              images/LISEZ-MOI-OBS.txt.

Les PNG « transparents » ont une vraie couche alpha : les poser au-dessus de la
caméra et de la capture du PC, sans incrustation ni clé chroma.
"""


def nbsp(text):
    # French typography: non-breaking space before : ; ! ? and inside « »
    import re
    text = re.sub(r" ([:;!?])(?=\s|$)", " \\1", text, flags=re.M)
    return text.replace("« ", "« ").replace(" »", " »")


for path in (EXPORT, PREVIEW):
    if not os.path.exists(path):
        sys.exit(f"missing {path}: run export_habillage.py and build_single_html.py first")

count = 0
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(f"{TOP}/LISEZ-MOI.txt", nbsp(README))
    z.write(PREVIEW, f"{TOP}/APERCU-habillage.html")
    count += 2
    for folder, _, files in os.walk(EXPORT):
        rel = os.path.relpath(folder, EXPORT)
        top_part = rel.split(os.sep)[0]
        base = BROWSER_DIR if top_part == BROWSER_DIR else "images"
        inner = os.path.relpath(folder, os.path.join(EXPORT, BROWSER_DIR)) if base == BROWSER_DIR else rel
        for name in sorted(files):
            if name.startswith("."):
                continue
            arc = os.path.normpath(os.path.join(TOP, base, inner, name))
            # PNGs are already compressed: store them as is
            kind = zipfile.ZIP_STORED if name.endswith(".png") else zipfile.ZIP_DEFLATED
            z.write(os.path.join(folder, name), arc, compress_type=kind)
            count += 1
print(f"{ZIP} {os.path.getsize(ZIP) / 1e6:.1f} MB {count} files")
