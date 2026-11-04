"""Export the live-stream graphics as 1920x1080 PNG files, packed twice: one zip for vMix, one zip for OBS.
The OBS pack also carries navigateur/, a standalone copy of bumpers.html with only the assets it loads (Browser sources).
Usage: uv run --with playwright --with pillow python scripts/export_habillage.py <habillage-captation dir> [<out dir>]
Default out dir: <habillage-captation dir>/livrables/habillage-genai-days (the zips land next to it, in livrables/).
Needs Chromium once: uv run --with playwright python -m playwright install chromium"""
import functools, http.server, io, os, pathlib, shutil, subprocess, sys, tempfile, threading, urllib.parse, zipfile
from PIL import Image, ImageChops, ImageCms, ImageStat
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(sys.argv[1])
OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(ROOT, "livrables", "habillage-genai-days")
RENDERS = os.path.dirname(OUT)
W, H = 1920, 1080

BUMPERS = "01-bumpers"
PANELS = "02-tables-rondes"
CONTEST = "03-startup-contest"
SIGNATURE = "04-signature-angle.png"
END_CARD = "05-carton-de-fin.png"
OPTION = "option-slides-et-intervenant"
OPTION_PREVIEW = f"{OPTION}/_apercu"
BROWSER_DIR = "navigateur"
README_VMIX, README_OBS = "LISEZ-MOI-vMix.txt", "LISEZ-MOI-OBS.txt"
# Each pack: folder name inside its zip, the README it keeps, and the working-folder entries it leaves out.
PACKS = {
    "vmix": {"folder": "habillage-genai-days-vmix", "readme": README_VMIX, "skip": {README_OBS, BROWSER_DIR}},
    "obs": {"folder": "habillage-genai-days-obs", "readme": README_OBS, "skip": {README_VMIX}},
}
CONTEST_FRAMES = ["1-bumper.png", "2-pitch-1-bworlds.png", "3-pitch-2-motiv.png", "4-pitch-3-laborheto.png", "5-jury.png"]
TRACK_SHORT = {"decide": "decider", "impl": "implementer", "common": "commun"}
TRACK_NAME = {"decide": "Décider", "impl": "Implémenter", "common": "Commun"}
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
  cv.querySelectorAll(".title,.tk-title,.name,.cname,.role,.co,.lb,.wm").forEach(el => {
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
    return (img.convert("RGBA") if transparent else img.convert("RGB")), result["holes"]


def shoot(page, url, rel, transparent):
    img, holes = capture(page, url, transparent, rel)
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, icc_profile=SRGB, optimize=True)
    return [dict(zip("nxywh", [h.split()[0], *map(int, h.split()[1:])])) for h in holes.split(";") if h]


# ---------- checks on the saved files ----------
def check_opaque(rel):
    img = Image.open(os.path.join(OUT, rel))
    if img.size != (W, H) or img.mode != "RGB":
        problems.append(f"{rel}: expected opaque RGB {W}x{H}, got {img.mode} {img.size}")


def alpha_of(rel):
    img = Image.open(os.path.join(OUT, rel))
    if img.size != (W, H) or img.mode != "RGBA":
        problems.append(f"{rel}: expected RGBA {W}x{H}, got {img.mode} {img.size}")
    return img.getchannel("A")


def check_talk_overlay(rel, holes):
    alpha = alpha_of(rel)
    mask = Image.new("L", (W, H), 0)
    for h in holes:
        mask.paste(255, (h["x"], h["y"], h["x"] + h["w"], h["y"] + h["h"]))
        inside = alpha.crop((h["x"], h["y"], h["x"] + h["w"], h["y"] + h["h"])).getextrema()
        if inside != (0, 0):
            problems.append(f"{rel}: {h['n']} hole alpha range {inside}, expected 0")
    outside = Image.composite(Image.new("L", (W, H), 255), alpha, mask).getextrema()
    if outside != (255, 255):
        problems.append(f"{rel}: alpha outside the holes ranges {outside}, expected 255")


def check_signature(rel):
    alpha = alpha_of(rel)
    box = alpha.point(lambda a: 255 if a else 0).getbbox()
    if not box or box[2] > 560 or box[3] > 150:
        problems.append(f"{rel}: signature bbox {box} should sit inside the 560x150 reserved zone")


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
def holes_text(talk_holes):
    hole_sets = {tuple((h["n"], h["x"], h["y"], h["w"], h["h"]) for h in holes) for holes in talk_holes.values()}
    if len(hole_sets) == 1:
        return "Identiques pour tous les overlays de l'option :\n" + "\n".join(
            f"  {HOLE_LABEL[n]:<12} x {x:<5} y {y:<5} largeur {w:<6} hauteur {h}" for n, x, y, w, h in next(iter(hole_sets)))
    return "Attention, les trous varient selon le talk :\n" + "\n".join(
        f"  {slug} : " + ", ".join(f"{h['n']} x {h['x']} y {h['y']} l {h['w']} h {h['h']}" for h in holes) for slug, holes in talk_holes.items())


def schedule_table(sessions, files_by_slug):
    rows = [("Heure", "Parcours", "Session", "Fichiers"), ("", "", "", "")]
    for s in sessions:
        files = files_by_slug[s["slug"]]
        rows.append((s["time"], TRACK_NAME[s["track"]], f"{s['format']} · {s['title']}", files[0]))
        rows.extend(("", "", "", f) for f in files[1:])
    widths = [max(len(r[i]) for r in rows) for i in range(3)]
    return "\n".join(f"{r[0]:<{widths[0]}}  {r[1]:<{widths[1]}}  {r[2]:<{widths[2]}}  {r[3]}".rstrip() for r in rows)


def common_sections(software, input_word):
    head = f"""GENAI DAYS 2026 · Habillage de captation pour {software}
Mardi 17 novembre 2026 · Hôtel de Région · Nantes

Toutes les images font 1920 x 1080 px, en PNG sRGB, à charger en {input_word}.
(transparent) = PNG avec couche alpha, à poser par-dessus une source.
(opaque) = image plein écran, elle remplace la source.


CONTENU

L'essentiel, utilisé toute la journée :

{BUMPERS}/                 (opaque) Carton d'intro de chaque session, 3 à 5 s.
                            Nom : heure-parcours-session.png, dans l'ordre de la journée.
{PANELS}/           (opaque) Écran de chaque table ronde, plein écran, à la place des
                            slides : affiche, titre, les quatre intervenant·es avec leur rôle.
{CONTEST}/         (opaque) Séquence du Startup Contest : 1 bumper, 2 à 4 un écran
                            par pitch, 5 délibération du jury.
{SIGNATURE}      (transparent) Signature GENAI DAYS seule, en haut à gauche.
                            Reste par-dessus le PC du speaker pendant tout un talk.
{END_CARD}        (opaque) Affiche, signature et partenaires. Fin de journée, fin des vidéos.

En bonus, pas nécessaire au direct :

{OPTION}/  (transparent) OPTION. Overlay complet pendant un talk : affiche et
                            titre à gauche, nom de l'intervenant·e, signature, avec deux
                            trous pour la caméra et le PC du speaker. Pas prévu dans le
                            déroulé de base. Peut servir au montage des replays, et
                            peut-être en direct en salle 2 (pas encore décidé).
  _apercu/                  (opaque) Le même cadre avec caméra et slides figurées. Pour voir
                            le rendu attendu, jamais pour l'antenne.


DÉROULÉ D'UNE SESSION (déroulé de base)

1. Début de session : le bumper de {BUMPERS}, quelques secondes.
2. Pendant un talk : PC du speaker plein écran, {SIGNATURE} par-dessus.
3. Tables rondes (10:20 et 16:00, parcours Décider) : pas de slides. L'écran {PANELS}
   de la session à la place du PC, en alternance avec la caméra plateau
   ({SIGNATURE} par-dessus la caméra).
4. Startup Contest (11:55) : {CONTEST} dans l'ordre. 1 en ouverture, 2, 3 et 4
   pendant chaque pitch, 5 pendant la délibération du jury.
5. Podcast (18:00) : bumper de {BUMPERS}, puis caméra avec {SIGNATURE} par-dessus.
6. Fin de journée et fin de chaque vidéo : {END_CARD}.

Deux scènes tournent en parallèle (Décider et Implémenter) : la colonne Parcours du
planning dit quelle scène est concernée.
"""
    return head


def option_holes_section(talk_holes):
    return f"""OPTION SLIDES ET INTERVENANT (bonus)

Remplace l'étape 2 du déroulé quand on veut voir la caméra et les slides ensemble.
Un overlay par talk : il porte le titre et le nom, en changer à chaque session.

Trous de l'overlay (pixels sur 1920 x 1080, origine en haut à gauche) :

{holes_text(talk_holes)}

Dans les trous, alpha 0. Partout ailleurs, alpha 255. Le liseré crème autour de la
caméra fait partie de l'overlay. La caméra 16:9 entre à 1 px près dans 472 x 266.
"""


def planning_section(sessions, files_by_slug):
    return f"""PLANNING

(option) = fichier du bonus, inutile pour le déroulé de base.

{schedule_table(sessions, files_by_slug)}
"""


def readme_vmix(sessions, talk_holes, files_by_slug):
    return "\n\n".join([common_sections("vMix", "input Image"), option_holes_section(talk_holes) + f"""
Dans vMix : prendre un input qui porte des couches (Colour, Virtual Set ou Multi View
selon la version), y mettre la caméra et le PC comme couches positionnées et
dimensionnées aux coordonnées ci-dessus, puis l'overlay de l'option en couche du
dessus ou sur un canal Overlay.
""", f"""CONSEILS VMIX (à vérifier selon la version)

- Ajouter chaque PNG en input Image (Add Input > Image). vMix gère la transparence PNG.
- Les PNG transparents se lancent sur un canal Overlay (1 à 4) : {SIGNATURE}
  peut rester sur un canal pendant tout un talk.
- Les PNG opaques (bumpers, tables rondes, Startup Contest, carton de fin) passent
  en Preview puis en Program comme n'importe quel input.
- Préparer les inputs de la journée à l'avance et les nommer comme les fichiers.
""", planning_section(sessions, files_by_slug)])


def readme_obs(sessions, talk_holes, files_by_slug, sample_slug, contest_slug):
    return "\n\n".join([common_sections("OBS Studio", "source Image"), f"""SCÈNES OBS SUGGÉRÉES (à vérifier selon la version)

Canevas : Paramètres > Vidéo > Résolution de base 1920 x 1080.
Dans une scène, l'ordre des sources est l'ordre des calques : la source du haut de la
liste passe devant celles du dessous.

- Bumper : une scène par session, chacune avec une source Image sur le bumper de
  {BUMPERS}. Ou une seule scène « Bumper » avec une source Diaporama d'images
  (Image Slide Show) qui contient tout {BUMPERS} dans l'ordre, avancée à la main.
- Talk : la capture du PC du speaker (carte d'acquisition ou périphérique de
  capture vidéo) en plein écran, et au-dessus une source Image {SIGNATURE}.
- Table ronde : une source Image par table ronde ({PANELS}), plus une scène
  caméra plateau avec {SIGNATURE} au-dessus, pour alterner.
- Startup Contest : un Diaporama d'images avec les cinq fichiers de {CONTEST},
  avancé à la main, ou une scène par fichier.
- Fin : une source Image {END_CARD}.

OBS gère la transparence PNG sans réglage.
""", option_holes_section(talk_holes) + f"""
Dans OBS : une scène « Talk complet » avec, de haut en bas dans la liste des sources,
l'overlay de l'option (source Image), puis la caméra, puis la capture du PC. Placer
la caméra et le PC avec clic droit > Transformer > Modifier la transformation
(Ctrl+E) : Position x et y comme ci-dessus, alignement en haut à gauche, type de
cadre de délimitation « Mettre à l'échelle dans les limites intérieures », taille du
cadre = largeur et hauteur ci-dessus.
""", f"""DOSSIER {BROWSER_DIR}/ (optionnel)

Les PNG restent le choix sûr. Ce dossier sert à qui préfère une source Navigateur :
{BROWSER_DIR}/bumpers.html est une copie autonome de la page qui a produit les PNG,
avec seulement les images et polices dont elle a besoin. Rien ne passe par internet.

Source Navigateur : largeur 1920, hauteur 1080. Décocher « Fichier local » et coller
dans URL le chemin complet du fichier suivi des paramètres (avec « Fichier local »
coché, OBS ne garde pas ce qui suit le « ? »). À tester sur la machine avant le jour J.
Exemple sous Windows :

  file:///C:/habillage-genai-days-obs/{BROWSER_DIR}/bumpers.html?session={sample_slug}

Paramètres :
  bumpers.html?session=<slug>                               bumper de la session
  bumpers.html?view=talks&session=<slug>                    écran du talk ou de la table ronde
  bumpers.html?view=talks&session=<slug>&key=1              overlay de l'option, trous transparents
  bumpers.html?view=talks&session={contest_slug}&part=<1 à 4>   pitch 1 à 3, puis jury

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
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
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


# ---------- zips ----------
def pack(name, readme_text):
    spec = PACKS[name]
    path = os.path.join(RENDERS, spec["folder"] + ".zip")
    if os.path.exists(path):
        subprocess.run(["trash", path], check=True)
    count = 0
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, dirnames, names in os.walk(OUT):
            rel_dir = os.path.relpath(dirpath, OUT)
            dirnames[:] = sorted(d for d in dirnames if not (rel_dir == "." and d in spec["skip"]))
            for n in sorted(names):
                if n.startswith(".") or (rel_dir == "." and n in spec["skip"] | {README_VMIX, README_OBS}):
                    continue
                full = os.path.join(dirpath, n)
                z.write(full, os.path.join(spec["folder"], os.path.relpath(full, OUT)))
                count += 1
        z.writestr(os.path.join(spec["folder"], spec["readme"]), readme_text)
    return path, count + 1


def main():
    if os.path.exists(OUT):
        subprocess.run(["trash", OUT], check=True)
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
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        page.on("request", record_asset)
        # The listing views load every asset the page can show, so navigateur/ also works without ?session.
        for listing in ("bumpers.html", "bumpers.html?view=talks"):
            page.goto(base + listing, wait_until="networkidle")
            page.evaluate(LOADED_JS)
        sessions = page.evaluate("""() => SESSIONS.map(s => {
          const t = document.createElement("textarea"); t.innerHTML = s.title;
          return {slug: s.slug, time: s.time, track: s.track, format: s.format, title: t.value.replace(/\\u2011/g, "-"),
                  contest: !!s.contest, panel: !s.contest && s.speakers.length >= 3};
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
                queries = [query] + [f"?view=talks&session={s['slug']}&part={i}" for i in range(1, len(CONTEST_FRAMES))]
                for frame, q in zip(CONTEST_FRAMES, queries):
                    rel = f"{CONTEST}/{frame}"
                    shoot(page, base + "bumpers.html" + q, rel, False)
                    check_opaque(rel)
                    sheets["contest"].append(rel)
                    browser_checks.append((q, rel, False))
                    files.append(rel)
            elif s["panel"]:
                rel, q = f"{PANELS}/{name}", f"?view=talks&session={s['slug']}"
                shoot(page, base + "bumpers.html" + q, rel, False)
                check_opaque(rel)
                sheets["tables"].append(rel)
                browser_checks.append((q, rel, False))
                files += [rel, SIGNATURE]
            else:
                q = f"?view=talks&session={s['slug']}"
                overlay, preview = f"{OPTION}/{name}", f"{OPTION_PREVIEW}/{name}"
                holes = shoot(page, base + "bumpers.html" + q + "&key=1", overlay, True)
                shoot(page, base + "bumpers.html" + q, preview, False)
                check_opaque(preview)
                if [h["n"] for h in holes] != ["camera", "slides"]:
                    problems.append(f"{overlay}: holes not measured: {holes}")
                talk_holes[s["slug"]] = holes
                check_talk_overlay(overlay, holes)
                sheets["talks"] += [overlay, preview]
                browser_checks += [(q + "&key=1", overlay, True), (q, preview, False)]
                files += [SIGNATURE, f"{overlay}  (option)"]
            files_by_slug[s["slug"]] = files
        shoot(page, base + "board.html?frame=o4", END_CARD, False)
        check_opaque(END_CARD)
        shoot(page, base + "board.html?frame=g2&key=1", SIGNATURE, True)
        check_signature(SIGNATURE)
        sheets["contest"] += [END_CARD, SIGNATURE]
        page.close()

        build_browser_copy(bumper_assets)
        sample_slug = next(s["slug"] for s in sessions if not s["contest"] and not s["panel"])
        readmes = {"vmix": readme_vmix(sessions, talk_holes, files_by_slug),
                   "obs": readme_obs(sessions, talk_holes, files_by_slug, sample_slug, contest_slug)}
        for key, text in readmes.items():
            assert "\u2014" not in text, "READMEs must not contain em dashes"
            with open(os.path.join(OUT, PACKS[key]["readme"]), "w", encoding="utf-8") as f:
                f.write(text)

        zips = {key: pack(key, text) for key, text in readmes.items()}
        # The OBS operator opens navigateur/ from wherever the zip was unpacked: test exactly that copy.
        with tempfile.TemporaryDirectory() as tmp:
            with zipfile.ZipFile(zips["obs"][0]) as z:
                z.extractall(tmp)
            worst = verify_browser_copy(browser, os.path.join(tmp, PACKS["obs"]["folder"], BROWSER_DIR), browser_checks)
        browser.close()

    sheet_dir = os.environ.get("SHEET_DIR")
    if sheet_dir:
        os.makedirs(sheet_dir, exist_ok=True)
        for key, rels in sheets.items():
            contact_sheet(rels, os.path.join(sheet_dir, f"sheet-{key}.png"), cols=2 if key == "talks" else 3)

    print(OUT)
    for key, (path, count) in zips.items():
        print(path, f"{os.path.getsize(path) / 1e6:.1f} MB", f"{count} files")
    print(f"{BROWSER_DIR}: {len(bumper_assets)} assets, {len(browser_checks)} views checked from the unzipped OBS pack, worst mean gap {worst:.2f}")
    for key, holes in list(talk_holes.items())[:1]:
        print("holes", key, holes)
    print("problems:" if problems else "no problems", *problems, sep="\n  ")


main()
