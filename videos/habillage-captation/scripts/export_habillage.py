"""Export the live-stream graphics as PNG files, with both READMEs (vMix and OBS) and navigateur/ in one folder.
The pages lay out a 1920x1080 canvas; the exporter renders it at --scale (default 2, so 3840x2160 UHD, same layout).
navigateur/ is a standalone copy of bumpers.html with only the assets it loads (OBS Browser sources).
Usage: uv run --with playwright --with pillow python scripts/export_habillage.py <habillage-captation dir> [<out dir>] [--scale 1]
Default out dir: <habillage-captation dir>/livrables/habillage-genai-days. Then build_single_html.py and pack_livrable.py
make the single hand-off zip, livrables/GENAI-DAYS-habillage-captation.zip.
Needs Chromium once: uv run --with playwright python -m playwright install chromium"""
import argparse, functools, http.server, io, os, pathlib, re, shutil, subprocess, threading, urllib.parse
from PIL import Image, ImageChops, ImageCms, ImageStat
from playwright.sync_api import sync_playwright

ARGS = argparse.ArgumentParser()
ARGS.add_argument("root")
ARGS.add_argument("out", nargs="?")
ARGS.add_argument("--scale", type=int, choices=(1, 2), default=2, help="2 = 3840x2160 (default), 1 = 1920x1080")
ARGS = ARGS.parse_args()
ROOT = os.path.abspath(ARGS.root)
OUT = os.path.abspath(ARGS.out) if ARGS.out else os.path.join(ROOT, "livrables", "habillage-genai-days")
# W, H: the CSS canvas the pages lay out (and the coordinates in data-holes). PW, PH: the pixels the PNG files carry.
W, H = 1920, 1080
SCALE = ARGS.scale
PW, PH = W * SCALE, H * SCALE

BUMPERS = "01-bumpers"
TALKS = "02-conferences"
TALKS_PREVIEW = f"{TALKS}/_apercu"
PANELS = "03-tables-rondes"
CONTEST = "04-startup-contest"
SIGNATURE = "05-signature-angle.png"
END_CARD = "06-carton-inter-sessions-et-fin.png"
BROWSER_DIR = "navigateur"
README_VMIX, README_OBS = "LISEZ-MOI-vMix.txt", "LISEZ-MOI-OBS.txt"
README_FILES = {"vmix": README_VMIX, "obs": README_OBS}
# Startup Contest, régie side: the bumper and one generic pitch overlay (?part=1, keyed).
# The transitions (a card per pitch, the jury) are Florian Hervéou's slides: exported next to the hand-off folder, never inside it.
CONTEST_BUMPER = "00-bumper.png"
CONTEST_OVERLAY = "01-trame-pitch.png"
TRANSITIONS_DIR = "startup-contest-transitions-florian"
# Sessions that are not streamed (the podcast): their room screen, opaque, at the top of the folder.
WAITING = "07-podcast-teasing-hemicycle.png"
TRACK_SHORT = {"decide": "decider", "impl": "implementer", "common": "commun"}
TRACK_NAME = {"decide": "Décider", "impl": "Implémenter", "common": "Commun"}
ROOM_NAME = {"decide": "Hémicycle", "impl": "Salle Loire", "common": "Hall"}
HOLE_LABEL = {"camera": "Caméra", "slides": "PC (slides)"}
# A browser source renders the same page as the exporter; anything above this mean pixel gap means it drew something else.
MAX_BROWSER_DRIFT = 1.0
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
problems = []


def serve(root):
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(QuietHandler, directory=root)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}/"


READY_JS = """async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.complete ? img.decode().catch(() => {}) : new Promise(r => { img.onload = img.onerror = r; })));
  if (typeof fitTitles === "function") fitTitles(document);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const cv = document.querySelector(".cv"), issues = [];
  const broken = [...document.images].filter(img => !img.naturalWidth).map(img => img.getAttribute("src"));
  if (broken.length) issues.push("broken images: " + broken.join(", "));
  const badFonts = [...document.fonts].filter(f => f.status === "error").map(f => f.family);
  if (badFonts.length) issues.push("fonts failed: " + badFonts.join(", "));
  const col = cv.querySelector(".col");
  if (col && col.scrollHeight > col.clientHeight + 1) issues.push(`text column overflows by ${col.scrollHeight - col.clientHeight}px`);
  const box = cv.querySelector(".tk-box");
  if (box && box.offsetTop + box.offsetHeight > TALK_CAM_TOP - 24) issues.push("title box runs into the camera");
  cv.querySelectorAll(".title,.tk-title,.name,.cname,.role,.co,.lb,.wm,.spk-card").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && (r.left < -1 || r.right > 1921 || r.bottom > 1081)) issues.push(`out of frame: ${el.className} "${el.textContent.trim().slice(0, 40)}"`);
  });
  return {issues, holes: cv.dataset.holes || ""};
}"""


LOADED_JS = """async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
}"""


def capture(page, url, transparent, label):
    page.goto(url, wait_until="networkidle")
    result = page.evaluate(READY_JS)
    problems.extend(f"{label}: {issue}" for issue in result["issues"])
    png = page.screenshot(omit_background=transparent, clip={"x": 0, "y": 0, "width": W, "height": H})
    img = Image.open(io.BytesIO(png))
    if not transparent and img.mode == "RGBA" and img.getchannel("A").getextrema() != (255, 255):
        # A full frame must cover the whole canvas by itself, not rely on the screenshot's white fill.
        problems.append(f"{label}: full frame has see-through pixels before flattening")
    return (img.convert("RGBA") if transparent else img.convert("RGB")), result["holes"]


def shoot(page, url, rel, transparent):
    img, holes = capture(page, url, transparent, rel)
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, icc_profile=SRGB, optimize=True)
    # data-holes is in CSS px: scale to the file's pixels, which is what the checks and the READMEs use.
    return [dict(zip("nxywh", [h.split()[0], *(int(v) * SCALE for v in h.split()[1:])])) for h in holes.split(";") if h]


def transition_name(part):
    if part["pitch"]:
        return f"{part['part']:02d}-transition-pitch-{part['pitch']}-{part['logo']}.png"
    return f"{part['part']:02d}-transition-jury.png"


# ---------- checks on the saved files ----------
def check_opaque(rel):
    img = Image.open(os.path.join(OUT, rel))
    if img.size != (PW, PH) or img.mode != "RGB":
        problems.append(f"{rel}: expected opaque RGB {PW}x{PH}, got {img.mode} {img.size}")


def alpha_of(rel):
    img = Image.open(os.path.join(OUT, rel))
    if img.size != (PW, PH) or img.mode != "RGBA":
        problems.append(f"{rel}: expected RGBA {PW}x{PH}, got {img.mode} {img.size}")
    return img.getchannel("A")


def check_talk_overlay(rel, holes):
    alpha = alpha_of(rel)
    mask = Image.new("L", (PW, PH), 0)
    for h in holes:
        mask.paste(255, (h["x"], h["y"], h["x"] + h["w"], h["y"] + h["h"]))
        inside = alpha.crop((h["x"], h["y"], h["x"] + h["w"], h["y"] + h["h"])).getextrema()
        if inside != (0, 0):
            problems.append(f"{rel}: {h['n']} hole alpha range {inside}, expected 0")
    outside = Image.composite(Image.new("L", (PW, PH), 255), alpha, mask).getextrema()
    if outside != (255, 255):
        problems.append(f"{rel}: alpha outside the holes ranges {outside}, expected 255")


def check_signature(rel):
    alpha = alpha_of(rel)
    box = alpha.point(lambda a: 255 if a else 0).getbbox()
    zone = (560 * SCALE, 150 * SCALE)
    if not box or box[2] > zone[0] or box[3] > zone[1]:
        problems.append(f"{rel}: signature bbox {box} should sit inside the {zone[0]}x{zone[1]} reserved zone")
        return
    # The signature is drawn at opacity .72 on purpose, so its strongest alpha is ~184, never 255.
    # Straight (unpremultiplied) alpha keeps those pixels cream; premultiplied or flattened files would darken them.
    peak = alpha.getextrema()[1]
    if peak < 128:
        problems.append(f"{rel}: signature peak alpha {peak}, too faint to read")
        return
    strongest = alpha.point(lambda a: 255 if a == peak else 0)
    rgb = ImageStat.Stat(Image.open(os.path.join(OUT, rel)).convert("RGB"), mask=strongest).mean
    if min(rgb) < 220:
        problems.append(f"{rel}: signature colour {[round(c) for c in rgb]} at alpha {peak} is not cream: alpha looks premultiplied")


# ---------- contact sheets ----------
def checker(size, cell=16):
    tile = Image.new("RGB", (cell * 2, cell * 2), "#cfcfcf")
    tile.paste("#8e8e8e", (0, 0, cell, cell))
    tile.paste("#8e8e8e", (cell, cell, cell * 2, cell * 2))
    out = Image.new("RGB", size)
    for x in range(0, size[0], cell * 2):
        for y in range(0, size[1], cell * 2):
            out.paste(tile, (x, y))
    return out


def contact_sheet(rels, dest, cols=3, thumb_w=640):
    from PIL import ImageDraw
    thumb_h, label_h, pad = thumb_w * H // W, 26, 14
    rows = -(-len(rels) // cols)
    sheet = Image.new("RGB", (cols * (thumb_w + pad) + pad, rows * (thumb_h + label_h + pad) + pad), "#ffffff")
    draw = ImageDraw.Draw(sheet)
    for i, rel in enumerate(rels):
        img = Image.open(os.path.join(OUT, rel))
        if img.mode == "RGBA":
            bg = checker(img.size)
            bg.paste(img, mask=img.getchannel("A"))
            img = bg
        x, y = pad + (i % cols) * (thumb_w + pad), pad + (i // cols) * (thumb_h + label_h + pad)
        sheet.paste(img.resize((thumb_w, thumb_h), Image.LANCZOS), (x, y))
        draw.text((x, y + thumb_h + 6), rel, fill="#000000")
    sheet.save(dest)


# ---------- READMEs ----------
def french_spacing(text):
    """Non-breaking space before : ; ! ? and inside « », so the punctuation never wraps alone."""
    text = re.sub(r" ([:;!?])(?=\s|$)", "\u00a0\\1", text, flags=re.M)
    return text.replace("« ", "«\u00a0").replace(" »", "\u00a0»")


def holes_text(talk_holes):
    groups = {}
    for rel, holes in talk_holes.items():
        key = tuple((h["n"], h["x"], h["y"], h["w"], h["h"]) for h in holes)
        # The Salle Loire overlays (no subtitles) have their slides lower: name the room when it matters
        room = " (Salle Loire)" if "-implementer-" in rel else " (Hémicycle)" if "-decider-" in rel else ""
        groups.setdefault(key, set()).add(os.path.dirname(rel) + "/" + room)
    return "\n\n".join("Trames de " + ", ".join(sorted(dirs)) + " :\n" + "\n".join(
        f"  {HOLE_LABEL[n]:<12} x {x:<5} y {y:<5} largeur {w:<6} hauteur {h}" for n, x, y, w, h in key)
        for key, dirs in groups.items())


def schedule_table(sessions, files_by_slug):
    rows = [("Heure", "Salle", "Session", "Fichiers"), ("", "", "", "")]
    for s in sessions:
        files = files_by_slug[s["slug"]]
        rows.append((s["time"], ROOM_NAME[s["track"]], f"{s['format']} · {s['title']}", files[0]))
        rows.extend(("", "", "", f) for f in files[1:])
    widths = [max(len(r[i]) for r in rows) for i in range(3)]
    return "\n".join(f"{r[0]:<{widths[0]}}  {r[1]:<{widths[1]}}  {r[2]:<{widths[2]}}  {r[3]}".rstrip() for r in rows)


def resolution_text():
    if SCALE == 1:
        return f"Toutes les images font {PW} x {PH} px (Full HD)"
    return (f"Toutes les images font {PW} x {PH} px (4K UHD). Une production en {W} x {H}\n"
            f"les charge aussi : le logiciel les réduit de moitié, sans perte visible")


def common_sections(software, input_word):
    head = f"""GENAI DAYS 2026 · Habillage de captation pour {software}
Mardi 17 novembre 2026 · Hôtel de Région · Nantes

{resolution_text()}.
Format PNG sRGB, à charger en {input_word}.
(transparent) = PNG avec couche alpha, à poser par-dessus une source.
(opaque) = image plein écran, sans aucune transparence : elle remplace la source.


CONTENU

{BUMPERS}/                 (opaque) Carton d'intro de chaque session, 3 à 5 s.
                            Nom : heure-parcours-session.png, dans l'ordre de la journée.
{TALKS}/             (transparent) Trame de chaque conférence, keynote d'ouverture comprise :
                            affiche, titre et intervenant·e à gauche, signature, URL en haut
                            à droite. Deux trous : la caméra (petite, à gauche) et les slides
                            du PC (grandes, à droite). Hémicycle : la bande sous les
                            slides reste vide pour les sous-titres en direct. Salle Loire,
                            sans sous-titres : slides centrées, donc trous plus bas
                            (voir « Trames : position des trous »).
  _apercu/                  (opaque) Les mêmes trames avec caméra et slides figurées.
                            Pour voir le rendu attendu, jamais pour l'antenne.
{PANELS}/          (transparent) Trame de chaque table ronde, salle et YouTube : un
                            seul trou, la caméra en grand ; affiche, titre et intervenant·es
                            à gauche.
  _apercu/                  (opaque) La même trame avec la caméra figurée.
{CONTEST}/         Startup Contest : (opaque) {CONTEST_BUMPER} bumper d'ouverture.
                            (transparent) {CONTEST_OVERLAY} trame caméra et slides, la même
                            pour tous les pitchs, mêmes trous que {TALKS}/.
  _apercu/                  (opaque) Les mêmes trames avec caméra et slides figurées.
{SIGNATURE}      (transparent) Signature GENAI DAYS seule, en haut à gauche, à poser
                            sur la caméra quand elle passe seule à l'antenne.
{WAITING}
                            (opaque) Hémicycle, de 17:50 à 18:10 : teasing du podcast,
                            à la place du carton inter-sessions. Puis le bumper du
                            podcast, qui reste à l'écran pendant l'enregistrement.
{END_CARD}
                            (opaque) Entre deux sessions et en fin de journée, keynote
                            de clôture comprise : affiche, URL et partenaires. Peut rester
                            à l'écran aussi longtemps que nécessaire.


DÉROULÉ DE LA JOURNÉE

1. Entre deux sessions : {END_CARD}.
2. Début de session : le bumper de {BUMPERS}, quelques secondes.
3. Conférence : la trame {TALKS}/ de la session par-dessus la caméra et le PC
   du speaker. Écran de la salle et YouTube identiques.
4. Tables rondes (10:20 et 16:00, parcours Décider) : pas de slides.
   La trame {PANELS}/ par-dessus la caméra. Écran de la salle et YouTube identiques.
5. Startup Contest (11:55, Hémicycle) : comme une conférence. {CONTEST_BUMPER} en
   ouverture, puis {CONTEST_OVERLAY} par-dessus la caméra et l'entrée HDMI du pupitre
   jusqu'à la fin. Dans le trou des slides : le PC de Florian Hervéou, branché au
   pupitre, qui pilote le deck de tous les pitchs.
6. Keynotes de clôture (17:35, une par salle) : bumper et trame comme une conférence.
7. Podcast (Hémicycle, écran de la salle seulement) : {WAITING} de 17:50 à 18:10,
   puis à 18:10 le bumper du podcast, qui reste pendant l'enregistrement.
8. Fin de journée : {END_CARD}.

Deux salles tournent en parallèle, l'Hémicycle et la Salle Loire : la colonne Salle du
planning dit laquelle est concernée. Le déroulé complet, salle par salle, est dans
APERCU-habillage.html, page « Rendu final ».
"""
    return head


def holes_section(talk_holes):
    return f"""TRAMES : POSITION DES TROUS

Une trame par session : elle porte le titre et les noms, en changer à chaque session.
Les trames de pitch du Startup Contest ({CONTEST}/) ont la mise en page de {TALKS}/.

Trous des trames, en pixels de l'image {PW} x {PH}, origine en haut à gauche :

{holes_text(talk_holes)}
{half_canvas_note()}
Dans les trous, alpha 0. Partout ailleurs, alpha 255. Le liseré crème autour de la
caméra fait partie de l'overlay. La caméra 16:9 entre à {SCALE} px près dans {472 * SCALE} x {266 * SCALE}.
"""


def half_canvas_note():
    if SCALE == 1:
        return ""
    return (f"\nSur une production en {W} x {H}, l'overlay est réduit de moitié : diviser\n"
            f"toutes ces valeurs par {SCALE}.\n")


def planning_section(sessions, files_by_slug):
    return f"""PLANNING

(transparent) = trame à poser par-dessus la caméra (et le PC pour les conférences).

{schedule_table(sessions, files_by_slug)}
"""


def vmix_scale_note():
    if SCALE == 1:
        return ""
    return (f"- En production {W} x {H}, vMix met les images {PW} x {PH} à l'échelle de la sortie.\n"
            f"  Vérifier dans Position de l'input qu'elles occupent tout l'écran.\n")


def readme_vmix(sessions, talk_holes, files_by_slug):
    return "\n\n".join([common_sections("vMix", "input Image"), holes_section(talk_holes) + f"""
Dans vMix : prendre un input qui porte des couches (Colour, Virtual Set ou Multi View
selon la version), y mettre la caméra et le PC comme couches positionnées et
dimensionnées aux coordonnées ci-dessus, puis la trame en couche du
dessus ou sur un canal Overlay.
""", f"""CONSEILS VMIX (à vérifier selon la version)

- Ajouter chaque PNG en input Image (Add Input > Image). vMix gère la transparence PNG.
- Les PNG transparents se lancent sur un canal Overlay (1 à 4) : {SIGNATURE}
  peut rester sur un canal pendant tout un talk.
- Les PNG opaques (bumpers, tables rondes, Startup Contest, carton de fin) passent
  en Preview puis en Program comme n'importe quel input.
- Préparer les inputs de la journée à l'avance et les nommer comme les fichiers.
{vmix_scale_note()}""", planning_section(sessions, files_by_slug)])


def obs_canvas_note():
    if SCALE == 1:
        return ""
    return (f",\nou {W} x {H} : dans ce cas, sélectionner chaque source Image puis clic droit >\n"
            f"Transformer > Ajuster à l'écran (Ctrl+F), pour qu'elle occupe tout le canevas")


def obs_browser_note():
    if SCALE == 1:
        return ""
    return f", deux fois moins\nde pixels que les PNG sur un canevas {PW} x {PH}"


def obs_browser_size_note():
    if SCALE == 1:
        return ""
    return (f".\nLa page est dessinée pour {W} x {H} : sur un canevas {PW} x {PH}, garder ces\n"
            f"valeurs puis Ctrl+F pour l'agrandir")


def readme_obs(sessions, talk_holes, files_by_slug, sample_slug, contest_slug):
    return "\n\n".join([common_sections("OBS Studio", "source Image"), f"""SCÈNES OBS SUGGÉRÉES (à vérifier selon la version)

Canevas : Paramètres > Vidéo > Résolution de base {PW} x {PH}{obs_canvas_note()}.
Dans une scène, l'ordre des sources est l'ordre des calques : la source du haut de la
liste passe devant celles du dessous.

- Bumper : une scène par session, chacune avec une source Image sur le bumper de
  {BUMPERS}. Ou une seule scène « Bumper » avec une source Diaporama d'images
  (Image Slide Show) qui contient tout {BUMPERS} dans l'ordre, avancée à la main.
- Conférence : une scène « Talk complet » (plus bas) avec la trame {TALKS}/ de la
  session par-dessus la caméra et la capture du PC du speaker.
- Table ronde : la caméra en grand dans le trou, la trame {PANELS}/ de la session
  au-dessus.
- Startup Contest : le bumper {CONTEST}/{CONTEST_BUMPER}, puis une scène comme « Talk
  complet » (plus bas) avec {CONTEST}/{CONTEST_OVERLAY} par-dessus la caméra et le PC.
- Fin : une source Image {END_CARD}.

OBS gère la transparence PNG sans réglage.
""", f"""IMAGES OU SOURCE NAVIGATEUR ?

Les deux sont dans ce dossier. Elles affichent la même chose.

Images (conseillé) : les PNG des dossiers ci-dessus, en source Image. C'est le plus
simple et le plus sûr : rien à calculer, rien à charger au moment du direct, et elles
sont à la pleine résolution {PW} x {PH}.

Les PNG (transparent) ont une vraie couche alpha. Overlays : transparents dans les
deux trous (alpha 0), opaques partout ailleurs (alpha 255). Signature : transparente
autour du logo, le logo lui-même légèrement translucide (voulu).
Placer la source Image AU-DESSUS de la caméra et de la capture du PC dans la liste
des sources : la caméra et les slides apparaissent dans les trous, sans
incrustation, sans clé chroma, sans filtre ni réglage de fusion.
Les PNG (opaque) n'ont aucune transparence : ils couvrent tout l'écran.

Source Navigateur ({BROWSER_DIR}/, voir plus bas) : seulement pour qui préfère piloter
une page HTML, par exemple pour changer de session en changeant l'URL.
Elle rend la page à {W} x {H}{obs_browser_note()}.
Le carton de fin et la signature n'y sont pas : pour eux, toujours les PNG.
""", holes_section(talk_holes) + f"""
Dans OBS : une scène « Talk complet » avec, de haut en bas dans la liste des sources,
la trame (source Image), puis la caméra, puis la capture du PC. Placer
la caméra et le PC avec clic droit > Transformer > Modifier la transformation
(Ctrl+E) : Position x et y comme ci-dessus, alignement en haut à gauche, type de
cadre de délimitation « Mettre à l'échelle dans les limites intérieures », taille du
cadre = largeur et hauteur ci-dessus.
""", f"""DOSSIER {BROWSER_DIR}/ (optionnel)

Les PNG restent le choix sûr. Ce dossier sert à qui préfère une source Navigateur :
{BROWSER_DIR}/bumpers.html est une copie autonome de la page qui a produit les PNG,
avec seulement les images et polices dont elle a besoin. Rien ne passe par internet.

Source Navigateur : largeur {W}, hauteur {H}{obs_browser_size_note()}.
Décocher « Fichier local » et coller dans URL le chemin complet du fichier suivi des
paramètres (avec « Fichier local » coché, OBS ne garde pas ce qui suit le « ? »).
À tester sur la machine avant le jour J.
Exemple sous Windows :

  file:///C:/GENAI-DAYS-habillage-captation/{BROWSER_DIR}/bumpers.html?session={sample_slug}

Paramètres :
  bumpers.html?session=<slug>                               bumper de la session
  bumpers.html?view=talks&session=<slug>                    trame de la conférence, écran de salle d'une table ronde
  bumpers.html?view=talks&session=<slug>&part=2&key=1       table ronde, trame YouTube, trou transparent
  bumpers.html?view=talks&session=<slug>&key=1              trame de la conférence, trous transparents
  bumpers.html?view=talks&session={contest_slug}&key=1      trame des pitchs du Startup Contest

<slug> = la fin du nom de fichier du bumper, sans heure ni parcours : pour
{BUMPERS}/0940-implementer-product-velocity.png, le slug est product-velocity.
Le carton de fin et la signature n'existent qu'en PNG.
""", planning_section(sessions, files_by_slug)])


# ---------- navigateur/ : standalone bumpers.html ----------
def build_browser_copy(asset_paths):
    dest = os.path.join(OUT, BROWSER_DIR)
    os.makedirs(dest, exist_ok=True)
    shutil.copy2(os.path.join(ROOT, "bumpers.html"), os.path.join(dest, "bumpers.html"))
    for rel in sorted(asset_paths):
        target = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), target)


def verify_browser_copy(browser, page_root, checks):
    """Open the copied page from its own folder (file://) and compare each view to the exported PNG."""
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=SCALE)
    failed = []
    page.on("requestfailed", lambda r: failed.append(r.url))
    base = pathlib.Path(page_root, "bumpers.html").as_uri()
    worst = 0.0
    for query, rel, transparent in checks:
        label = f"{BROWSER_DIR}/bumpers.html{query}"
        img, _ = capture(page, base + query, transparent, label)
        scroll = page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
        if scroll[0] > W or scroll[1] > H:
            problems.append(f"{label}: page scrolls ({scroll[0]}x{scroll[1]})")
        ref = Image.open(os.path.join(OUT, rel)).convert(img.mode)
        drift = max(ImageStat.Stat(ImageChops.difference(img, ref)).mean)
        worst = max(worst, drift)
        if drift > MAX_BROWSER_DRIFT:
            problems.append(f"{label}: differs from {rel} (mean gap {drift:.2f})")
    problems.extend(f"{BROWSER_DIR}: request failed {u}" for u in sorted(set(failed)))
    page.close()
    return worst


# ---------- Startup Contest transitions, for Florian Hervéou's deck ----------
def transitions_dir():
    return os.path.join(os.path.dirname(OUT), TRANSITIONS_DIR)


def shoot_transition(page, url, name):
    """Opaque 16:9 slide for Florian's deck, outside the régie folder."""
    img, _ = capture(page, url, False, f"{TRANSITIONS_DIR}/{name}")
    os.makedirs(transitions_dir(), exist_ok=True)
    path = os.path.join(transitions_dir(), name)
    img.save(path, icc_profile=SRGB, optimize=True)
    return path


def write_transitions_pdf(paths):
    # One page per slide, Full HD: light enough to mail, sharp on a projector
    pages = [Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS) for p in paths]
    pages[0].save(os.path.join(transitions_dir(), "transitions-startup-contest.pdf"), save_all=True, append_images=pages[1:], resolution=96)


def main():
    for old in (OUT, transitions_dir()):
        if os.path.exists(old):
            subprocess.run(["trash", old], check=True)
    base = serve(ROOT)
    bumper_assets = set()

    def record_asset(request):
        page_url, asset_url = urllib.parse.urlparse(request.frame.url), urllib.parse.urlparse(request.url)
        # Navigation requests (the next goto, board.html included) start from the old document: skip them.
        if request.is_navigation_request():
            return
        if page_url.path == "/bumpers.html" and request.url.startswith(base) and asset_url.path != "/bumpers.html":
            bumper_assets.add(urllib.parse.unquote(asset_url.path.lstrip("/")))

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=SCALE)
        page.on("request", record_asset)
        # The listing views load every asset the page can show, so navigateur/ also works without ?session.
        for listing in ("bumpers.html", "bumpers.html?view=talks"):
            page.goto(base + listing, wait_until="networkidle")
            page.evaluate(LOADED_JS)
        sessions = page.evaluate("""() => SESSIONS.map(s => {
          const t = document.createElement("textarea"); t.innerHTML = s.title;
          return {slug: s.slug, time: s.time, track: s.track, format: s.format, title: t.value.replace(/\\u2011/g, "-"),
                  contest: !!s.contest, waiting: !!s.waiting, panel: !s.contest && !s.waiting && s.speakers.length >= 3,
                  transitions: s.contest ? talkFrames(s).filter(f => f.transition).map(f => {
                    const ps = pitchers(s), p = ps.find(p => f.caption.endsWith("· " + p.company));
                    return {part: f.part, pitch: p ? ps.indexOf(p) + 1 : 0, logo: p ? p.logo : ""};
                  }) : []};
        })""")
        sessions.sort(key=lambda s: (s["time"], s["track"] != "decide"))
        files_by_slug, talk_holes, browser_checks = {}, {}, []
        sheets = {k: [] for k in ("bumpers", "talks", "tables", "contest")}
        for s in sessions:
            name = f"{s['time'].replace(':', '')}-{TRACK_SHORT[s['track']]}-{s['slug']}.png"
            bumper = f"{BUMPERS}/{name}"
            query = f"?session={s['slug']}"
            shoot(page, base + "bumpers.html" + query, bumper, False)
            check_opaque(bumper)
            sheets["bumpers"].append(bumper)
            browser_checks.append((query, bumper, False))
            files = [bumper]
            if s["contest"]:
                contest_slug = s["slug"]
                rel = f"{CONTEST}/{CONTEST_BUMPER}"
                shoot(page, base + "bumpers.html" + query, rel, False)
                check_opaque(rel)
                sheets["contest"].append(rel)
                browser_checks.append((query, rel, False))
                q = f"?view=talks&session={s['slug']}&part=1"
                overlay, preview = f"{CONTEST}/{CONTEST_OVERLAY}", f"{CONTEST}/_apercu/{CONTEST_OVERLAY}"
                holes = shoot(page, base + "bumpers.html" + q + "&key=1", overlay, True)
                shoot(page, base + "bumpers.html" + q, preview, False)
                check_opaque(preview)
                if [h["n"] for h in holes] != ["camera", "slides"]:
                    problems.append(f"{overlay}: holes not measured: {holes}")
                talk_holes[overlay] = holes
                check_talk_overlay(overlay, holes)
                sheets["talks"] += [overlay, preview]
                browser_checks += [(q + "&key=1", overlay, True), (q, preview, False)]
                files += [rel, f"{overlay}  (transparent)"]
                transitions = [shoot_transition(page, base + "bumpers.html" + query, f"{CONTEST_BUMPER}")]
                for part in s["transitions"]:
                    q = f"?view=talks&session={s['slug']}&part={part['part']}"
                    transitions.append(shoot_transition(page, base + "bumpers.html" + q, transition_name(part)))
                write_transitions_pdf(transitions)
            elif s["waiting"]:
                q = f"?view=talks&session={s['slug']}"
                shoot(page, base + "bumpers.html" + q, WAITING, False)
                check_opaque(WAITING)
                sheets["contest"].append(WAITING)
                browser_checks.append((q, WAITING, False))
                files.append(f"{WAITING}  (Hémicycle, 17:50 à 18:10)")
            elif s["panel"]:
                q = f"?view=talks&session={s['slug']}"
                overlay, preview = f"{PANELS}/{name}", f"{PANELS}/_apercu/{name}"
                holes = shoot(page, base + "bumpers.html" + q + "&key=1", overlay, True)
                shoot(page, base + "bumpers.html" + q, preview, False)
                check_opaque(preview)
                if [h["n"] for h in holes] != ["camera"]:
                    problems.append(f"{overlay}: camera hole not measured: {holes}")
                talk_holes[overlay] = holes
                check_talk_overlay(overlay, holes)
                sheets["tables"] += [overlay, preview]
                browser_checks += [(q + "&key=1", overlay, True), (q, preview, False)]
                files.append(f"{overlay}  (transparent)")
            else:
                q = f"?view=talks&session={s['slug']}"
                overlay, preview = f"{TALKS}/{name}", f"{TALKS_PREVIEW}/{name}"
                holes = shoot(page, base + "bumpers.html" + q + "&key=1", overlay, True)
                shoot(page, base + "bumpers.html" + q, preview, False)
                check_opaque(preview)
                if [h["n"] for h in holes] != ["camera", "slides"]:
                    problems.append(f"{overlay}: holes not measured: {holes}")
                talk_holes[overlay] = holes
                check_talk_overlay(overlay, holes)
                sheets["talks"] += [overlay, preview]
                browser_checks += [(q + "&key=1", overlay, True), (q, preview, False)]
                files.append(f"{overlay}  (transparent)")
            files_by_slug[s["slug"]] = files
        shoot(page, base + "board.html?frame=o4", END_CARD, False)
        check_opaque(END_CARD)
        shoot(page, base + "board.html?frame=g2&key=1", SIGNATURE, True)
        check_signature(SIGNATURE)
        sheets["contest"] += [END_CARD, SIGNATURE]
        page.close()

        build_browser_copy(bumper_assets)
        sample_slug = next(s["slug"] for s in sessions if not s["contest"] and not s["panel"] and not s["waiting"])
        readmes = {"vmix": readme_vmix(sessions, talk_holes, files_by_slug),
                   "obs": readme_obs(sessions, talk_holes, files_by_slug, sample_slug, contest_slug)}
        readmes = {key: french_spacing(text) for key, text in readmes.items()}
        for key, text in readmes.items():
            assert "\u2014" not in text, "READMEs must not contain em dashes"
            with open(os.path.join(OUT, README_FILES[key]), "w", encoding="utf-8") as f:
                f.write(text)

        # The operator opens navigateur/ from wherever the hand-off zip was unpacked: test that copy from disk, over file://.
        worst = verify_browser_copy(browser, os.path.join(OUT, BROWSER_DIR), browser_checks)
        browser.close()

    sheet_dir = os.environ.get("SHEET_DIR")
    if sheet_dir:
        os.makedirs(sheet_dir, exist_ok=True)
        for key, rels in sheets.items():
            contact_sheet(rels, os.path.join(sheet_dir, f"sheet-{key}.png"), cols=2 if key == "talks" else 3)

    print(OUT)
    print(transitions_dir(), "(Startup Contest transitions, for Florian Hervéou)")
    print(f"{BROWSER_DIR}: {len(bumper_assets)} assets, {len(browser_checks)} views checked over file://, worst mean gap {worst:.2f}")
    for key, holes in list(talk_holes.items())[:1]:
        print("holes", key, holes)
    print("problems:" if problems else "no problems", *problems, sep="\n  ")


main()
