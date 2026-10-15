"""Pack board.html + bumpers.html and their assets into one offline HTML file. Usage: uv run --with pillow python scripts/build_single_html.py <habillage-captation dir>"""
import base64, glob, io, json, os, re, sys
from PIL import Image

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, "habillage-captation-genai-days.html")
read = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()
board, bumpers = read("board.html"), read("bumpers.html")


def must_replace(text, old, new, count=1):
    found = text.count(old)
    assert found == count, f"expected {count} x {old!r}, found {found}"
    return text.replace(old, new)


# ---------- assets: recompressed once, keyed by their original path ----------
POSTER_MAX_W = 1920
SQUARE_POSTER_SIDE = 1080
EXPORT_MAX_W = 1280      # export examples only show at card width
LOGO_MAX_H = 160         # tallest logo is 76 canvas px (podcast host)


def webp_uri(path, max_w=None, max_h=None):
    im = Image.open(os.path.join(ROOT, path))
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    ratio = min(1, (max_w or im.width) / im.width, (max_h or im.height) / im.height)
    if ratio < 1:
        im = im.resize((round(im.width * ratio), round(im.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=80, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def raw_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(os.path.join(ROOT, path), "rb").read()).decode()


assets = {}
for p in sorted(glob.glob("assets/sessions/*.webp", root_dir=ROOT)):
    square = Image.open(os.path.join(ROOT, p)).size[0] == Image.open(os.path.join(ROOT, p)).size[1]
    assets[p] = webp_uri(p, SQUARE_POSTER_SIDE if square else POSTER_MAX_W)
for p in sorted(glob.glob("assets/plates/*.webp", root_dir=ROOT)) + ["assets/img/speaker_background-optimized.webp"]:
    assets[p] = webp_uri(p, POSTER_MAX_W)
for p in sorted(glob.glob("assets/speakers/norm/*.webp", root_dir=ROOT)):
    assets[p] = webp_uri(p)
for p in sorted(glob.glob("assets/partners/*.png", root_dir=ROOT)):
    assets[p] = webp_uri(p, max_h=LOGO_MAX_H)
for p in sorted(glob.glob("exports/*.webp", root_dir=ROOT)):
    assets[p] = webp_uri(p, EXPORT_MAX_W)
grain_uri = raw_uri("assets/img/grain.png", "image/png")
fonts = {f: raw_uri(f"assets/fonts/{f}", "font/woff2") for f in os.listdir(os.path.join(ROOT, "assets/fonts"))}

# Every static asset path in both pages must resolve
for path in re.findall(r'src="((?:assets|exports)/[^"$]+)"', board + bumpers):
    assert path in assets, path


# ---------- CSS: each page scoped under its own wrapper class ----------
def css_of(html):
    return re.search(r"<style>(.*?)</style>", html, re.S).group(1)


def top_level_rules(css):
    rules, depth, start, prelude = [], 0, 0, ""
    for i, ch in enumerate(css):
        if ch == "{":
            if depth == 0:
                prelude, start = css[start:i].strip(), i + 1
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                rules.append((prelude, css[start:i]))
                start = i + 1
    return rules


GLOBAL_SELECTORS = ("*", "html", "body")


def scope_css(css, scope, keep_globals):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = []
    for prelude, body in top_level_rules(css):
        if prelude.startswith("@font-face"):
            continue
        if prelude.startswith("@media"):
            inner = scope_css(body, scope, keep_globals)
            if inner.strip():
                out.append(f"{prelude}{{{inner}}}")
            continue
        selectors = [s.strip() for s in prelude.split(",")]
        if all(s.startswith(":root") or s in GLOBAL_SELECTORS for s in selectors):
            if keep_globals:
                out.append(f"{prelude}{{{body}}}")
            continue
        scoped = []
        for s in selectors:
            if s.startswith("body.solo"):
                rest = s[len("body.solo"):].strip()
                scoped.append(f"body.solo {scope} {rest}".strip() if rest else "body.solo")
            else:
                scoped.append(f"{scope} {s}")
        out.append(f"{','.join(scoped)}{{{body}}}")
    return "\n".join(out)


font_faces = "\n".join([
    f'@font-face{{font-family:"EB Garamond";src:url({fonts["eb-garamond-latin-wght-normal.woff2"]}) format("woff2");font-weight:400 800;font-style:normal;font-display:block}}',
    f'@font-face{{font-family:"EB Garamond";src:url({fonts["eb-garamond-latin-wght-italic.woff2"]}) format("woff2");font-weight:400 800;font-style:italic;font-display:block}}',
    f'@font-face{{font-family:"Special Elite";src:url({fonts["special-elite-latin-400-normal.woff2"]}) format("woff2");font-display:block}}',
    f'@font-face{{font-family:"Azeret Mono";src:url({fonts["azeret-mono-latin-500-normal.woff2"]}) format("woff2");font-weight:500;font-display:block}}',
])
bumpers_css = must_replace(css_of(bumpers), "url(assets/img/grain.png)", f"url({grain_uri})")
css = "\n".join([
    font_faces,
    scope_css(css_of(board), ".pg-board", keep_globals=True),
    scope_css(bumpers_css, ".pg-bumpers", keep_globals=False),
    "[hidden]{display:none!important}",
])


# ---------- markup ----------
def body_of(html):
    return re.search(r"<body>(.*?)<script>", html, re.S).group(1)


symbol = re.search(r'<svg width="0".*?</svg>', board, re.S).group(0)
board_body = body_of(board).replace(symbol, "")
board_body = re.sub(r'src="((?:assets|exports)/[^"]+)"', r'data-asset="\1"', board_body)
board_body = must_replace(board_body, 'href="bumpers.html"', 'href="#bumpers"')
board_body = must_replace(board_body, '<li><a href="#annexe">Annexe · chapitre</a></li>',
                          '<li><a href="#annexe">Annexe · chapitre</a></li>\n    <li><a href="#bumpers">Tous les bumpers d\'intro</a></li>')

bumpers_body = body_of(bumpers).replace(re.search(r'<svg width="0".*?</svg>', bumpers, re.S).group(0), "")
bumpers_body = must_replace(bumpers_body, '<div id="board">', '<div class="pg-bumpers" id="bumpers">')


# ---------- scripts ----------
def script_of(html):
    return re.search(r"<script>(.*?)</script>", html, re.S).group(1)


board_js = script_of(board)
board_js = must_replace(board_js, '`<img src="assets/partners/${slug}.png"', '`<img data-asset="assets/partners/${slug}.png"')
board_js = board_js.replace("document.querySelectorAll(", "BOARD.querySelectorAll(")
board_js = must_replace(board_js, "// Clones after bugs", "hydrateAssets(BOARD);\n\n// Clones after bugs")
board_js = "(() => {\nconst BOARD = document.querySelector(\".pg-board\");\n" + board_js + "})();\n"

bumpers_js = script_of(bumpers)
bumpers_js = must_replace(bumpers_js, 'src="${src}"', 'data-asset="${src}"', count=6)
bumpers_js = must_replace(bumpers_js, '<img src="assets/partners/${s.host}.png"', '<img data-asset="assets/partners/${s.host}.png"')
bumpers_js = must_replace(bumpers_js, 'document.querySelectorAll(".fr")', 'LISTING.querySelectorAll(".fr")')
routing_start = bumpers_js.index("const params = new URLSearchParams(location.search);")
bumpers_js = bumpers_js[:routing_start] + r"""
// Solo view for OBS: #session=<slug> (and &layout=c for the fallback layout).
// ?session= still works, as in the standalone bumpers.html.
const PAGES = document.getElementById("pages"), LISTING = document.getElementById("bumpers"), SOLO = document.getElementById("solo");
const FALLBACK_EXAMPLE = "souverainete-ia";
const card = (s, layout) => `<article class="card" id="${layout === "c" ? "secours-" : ""}${s.slug}">
  <a class="fr" href="#session=${s.slug}${layout === "c" ? "&layout=c" : ""}">${frameMarkup(s, layout)}</a>
  <h3>${s.title}</h3><p class="lb">${s.time} · ${TRACK_LABEL[s.track]}</p></article>`;

const slotTimes = [...new Set(SESSIONS.map(s => s.time))];
document.getElementById("slots").innerHTML = slotTimes.map(time => {
  const sessions = SESSIONS.filter(s => s.time === time);
  return `<section class="slot"><h2>${time}</h2><div class="cards">${sessions.map(s => card(s, "a")).join("")}</div></section>`;
}).join("") + `<section class="slot fallback"><h2>Variante de secours</h2><div class="cards">${card(SESSIONS.find(s => s.slug === FALLBACK_EXAMPLE), "c")}</div></section>`;
hydrateAssets(LISTING);
new ResizeObserver(fitFrames).observe(document.body);

function soloRequest() {
  const hash = new URLSearchParams(location.hash.slice(1)), query = new URLSearchParams(location.search);
  const params = hash.get("session") ? hash : query;
  const session = SESSIONS.find(s => s.slug === params.get("session"));
  return session && {session, layout: params.get("layout") === "c" ? "c" : "a"};
}

let lastSoloCardId = null;
function showRequestedView() {
  const solo = soloRequest();
  document.body.classList.toggle("solo", !!solo);
  PAGES.hidden = !!solo;
  SOLO.hidden = !solo;
  if (solo) {
    SOLO.innerHTML = frameMarkup(solo.session, solo.layout);
    hydrateAssets(SOLO);
    fitTitles(SOLO);
    lastSoloCardId = (solo.layout === "c" ? "secours-" : "") + solo.session.slug;
    return;
  }
  SOLO.innerHTML = "";
  fitFrames();
  fitTitles(LISTING);
  if (lastSoloCardId) document.getElementById(lastSoloCardId)?.scrollIntoView({block: "center"});
  lastSoloCardId = null;
}
showRequestedView();
addEventListener("hashchange", showRequestedView);
document.fonts.ready.then(() => fitTitles(soloRequest() ? SOLO : LISTING));
"""
bumpers_js = "(() => {\n" + bumpers_js + "})();\n"

hydrate_js = """// Each image is embedded once here; <img data-asset> elements get their src from this map
const ASSETS = """ + json.dumps(assets, separators=(",", ":")) + """;
function hydrateAssets(root) {
  root.querySelectorAll("img[data-asset]").forEach(img => {
    const uri = ASSETS[img.dataset.asset];
    if (!uri) console.error("missing asset", img.dataset.asset);
    img.src = uri;
    img.removeAttribute("data-asset");
  });
}
"""

page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Habillage de captation</title>
<style>
{css}
</style>
</head>
<body>
{symbol}
<div id="pages">
<div class="pg-board">
{board_body.strip()}
</div>
{bumpers_body.strip()}
</div>
<div class="pg-bumpers" id="solo" hidden></div>
<script>
{hydrate_js}
{board_js}
{bumpers_js}
</script>
</body>
</html>
"""
open(OUT, "w", encoding="utf-8").write(page)
print(OUT, f"{os.path.getsize(OUT) / 1e6:.2f} MB", len(assets), "images")
