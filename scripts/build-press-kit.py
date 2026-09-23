"""Build the downloadable press dossier from the site's source content.

Run with:
  uv run --with reportlab --with svglib --with pyyaml --with fonttools --with brotli --with pillow scripts/build-press-kit.py

Every fact (date, venue, pricing, tracks, sessions, speakers, partners, team)
is read from the content collections and JSON files, so the PDF and the ZIP
only need a rebuild when the site content changes.
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
import unicodedata
from datetime import date
from html import escape
from pathlib import Path
from urllib.parse import urljoin, urlparse
from zipfile import ZIP_DEFLATED, ZipFile

import yaml
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont as FontToolsFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageOps
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Group, Shape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from svglib.svglib import svg2rlg


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CONTENT = ROOT / "src/content"
KIT = PUBLIC / "press" / "genai-days-press-kit"
PDF = PUBLIC / "press" / "README.pdf"
PAGE_W, PAGE_H = A4
RAIL = 40
CONTENT_W = PAGE_W - 2 * RAIL
PAD = 16
TOTAL_PAGES = 7
ILLUSTRATION_WIDTH = 1920
MONTHS = (
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
)
NBSP = " "


# ---------------------------------------------------------------- content ---

def frontmatter(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    data = yaml.safe_load(content.split("---", 2)[1])
    data["id"] = path.stem
    return data


def collection(name: str) -> list[dict]:
    return [frontmatter(path) for path in sorted((CONTENT / name).glob("*.md"))]


def token(name: str) -> colors.Color:
    css = (ROOT / "src/styles/global.css").read_text(encoding="utf-8")
    match = re.search(rf"--color-brand-{name}:\s*(#[0-9a-fA-F]{{6}});", css)
    if not match:
        raise ValueError(f"Missing brand color: {name}")
    return colors.HexColor(match.group(1))


CREAM = token("cream")
CREAM_DEEP = token("cream-deep")
WHITE = token("white")
BLUE = token("blue")
ORANGE = token("orange")
INK = token("black")
NIGHT = token("night")
MUTED = colors.Color(INK.red, INK.green, INK.blue, alpha=0.72)
RULE = colors.Color(INK.red, INK.green, INK.blue, alpha=0.2)
RULE_SOFT = colors.Color(INK.red, INK.green, INK.blue, alpha=0.12)
CREAM_MUTED = colors.Color(CREAM.red, CREAM.green, CREAM.blue, alpha=0.78)
CREAM_RULE = colors.Color(CREAM.red, CREAM.green, CREAM.blue, alpha=0.28)


def programme_slots() -> list[dict]:
    source = (ROOT / "src/lib/programme.ts").read_text(encoding="utf-8")
    field = re.compile(r"""(\w+):\s*(?:'([^']*)'|"([^"]*)")""")
    slots = []
    for block in re.findall(r"\{([^{}]*)\}", source):
        fields = {key: single or double for key, single, double in field.findall(block)}
        if "time" in fields:
            slots.append({"time": fields["time"], "title": fields["title"], "kind": fields["kind"]})
    return slots


def hero_title() -> tuple[str, str]:
    source = (ROOT / "src/components/HeroAffiche.astro").read_text(encoding="utf-8")
    primary = re.search(r'hero-affiche__title-primary">([^<]+)<', source)
    accent = re.search(r'hero-affiche__title-accent">([^<]+)<', source)
    if not primary or not accent:
        raise ValueError("Hero title not found in HeroAffiche.astro")
    return primary.group(1).strip(), accent.group(1).strip()


def prominence_order() -> list[str]:
    source = (ROOT / "src/lib/speakers.ts").read_text(encoding="utf-8")
    block = re.search(r"SPEAKER_PROMINENCE_ORDER = \[(.*?)\]", source, re.S)
    return re.findall(r"'([^']+)'", block.group(1)) if block else []


def lucide_icon(name: str) -> str:
    source = (ROOT / f"node_modules/lucide-react/dist/esm/icons/{name}.mjs").read_text(encoding="utf-8")
    parts = []
    for tag, attrs in re.findall(r'\[\s*"(\w+)",\s*\{(.*?)\}\s*\]', source, re.S):
        fields = {
            key: value
            for key, value in re.findall(r'(\w+):\s*"([^"]*)"', attrs)
            if key != "key"
        }
        parts.append(f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in fields.items()) + "/>")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
        'fill="none" stroke="#000" stroke-width="1.85" stroke-linecap="round" '
        'stroke-linejoin="round">' + "".join(parts) + "</svg>"
    )


def format_date(iso: str) -> str:
    day = date.fromisoformat(iso)
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"


def french(text: str) -> str:
    """Typographic apostrophes, non-breaking spaces before high punctuation and inside guillemets."""
    text = text.replace("'", "’")
    text = re.sub(r"(?<=\S)([:;!?])(?=\s|$)", NBSP + r"\1", text)
    text = re.sub(r" ([:;!?»])", NBSP + r"\1", text)
    return text.replace("« ", "«" + NBSP)


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


# ------------------------------------------------------------------ fonts ---

def register_fonts(tmp: Path) -> dict[str, Path]:
    font_dir = ROOT / "node_modules/@fontsource-variable/eb-garamond/files"
    files = {}
    for name, source, weight in (
        ("GaramondRegular", "eb-garamond-latin-wght-normal.woff2", 400),
        ("GaramondSemibold", "eb-garamond-latin-wght-normal.woff2", 600),
        ("GaramondBold", "eb-garamond-latin-wght-normal.woff2", 700),
        ("GaramondExtraBold", "eb-garamond-latin-wght-normal.woff2", 800),
        ("GaramondSemiboldItalic", "eb-garamond-latin-wght-italic.woff2", 600),
        ("GaramondBoldItalic", "eb-garamond-latin-wght-italic.woff2", 700),
    ):
        font = FontToolsFont(font_dir / source)
        font.flavor = None
        instantiateVariableFont(font, {"wght": weight}, inplace=True)
        subsetter = Subsetter(options=Options())
        subsetter.populate(unicodes=[
            *range(0x20, 0x100), 0x152, 0x153, 0x2019, 0x201C, 0x201D,
            0x2026, 0x20AC, 0x2022, 0x202F,
        ])
        subsetter.subset(font)
        # Every instance comes from the same variable file: give each one its
        # own PostScript name or ReportLab embeds a single weight for all.
        table = font["name"]
        for record in list(table.names):
            if record.nameID in (1, 3, 4, 6, 16, 17):
                table.removeNames(nameID=record.nameID)
        for name_id in (1, 3, 4, 6):
            table.setName(name, name_id, 3, 1, 0x409)
        target = tmp / f"{name}.ttf"
        font.save(target)
        pdfmetrics.registerFont(TTFont(name, str(target)))
        files[name] = target

    arial = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Arial", str(arial / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("ArialBold", str(arial / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("ArialItalic", str(arial / "Arial Italic.ttf")))
    pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="ArialBold", italic="ArialItalic", boldItalic="ArialBold")
    return files


WORDMARK_PARTS = (("GEN", "GaramondBold"), ("AI", "GaramondBoldItalic"), (" DAYS", "GaramondRegular"))


def wordmark_width(size: float) -> float:
    return sum(
        pdfmetrics.stringWidth(word, face, size) + len(word) * size * 0.015
        for word, face in WORDMARK_PARTS
    )


def wordmark(pdf: canvas.Canvas, x: float, y: float, size: float, color: colors.Color, *, align: str = "left") -> float:
    width = wordmark_width(size)
    if align == "right":
        x -= width
    elif align == "center":
        x -= width / 2
    pdf.saveState()
    pdf.setFillColor(color)
    text = pdf.beginText(x, y)
    text.setCharSpace(size * 0.015)
    for word, face in WORDMARK_PARTS:
        text.setFont(face, size)
        text.textOut(word)
    pdf.drawText(text)
    pdf.restoreState()
    return width


def brand(markup: str) -> str:
    """Render every GENAI DAYS occurrence of a Paragraph with the wordmark treatment."""
    return markup.replace(
        "GENAI DAYS",
        '<font name="GaramondBold">GEN</font><font name="GaramondBoldItalic">AI</font>'
        '<font name="GaramondRegular"> DAYS</font>',
    )


def wordmark_svg(fonts: dict[str, Path], target: Path) -> None:
    """Outline the official wordmark so the press can use it without the fonts."""
    size = 100
    paths = []
    cursor = 0.0
    top = bottom = 0.0
    for word, face in WORDMARK_PARTS:
        font = FontToolsFont(fonts[face])
        glyphs = font.getGlyphSet()
        cmap = font.getBestCmap()
        scale = size / font["head"].unitsPerEm
        top = max(top, font["hhea"].ascent * scale)
        bottom = min(bottom, font["hhea"].descent * scale)
        for char in word:
            name = cmap[ord(char)]
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, 0)))
            if pen.getCommands():
                paths.append(pen.getCommands())
            cursor += glyphs[name].width * scale + size * 0.015
    cap = FontToolsFont(fonts["GaramondBold"])["OS/2"].sCapHeight * size / FontToolsFont(fonts["GaramondBold"])["head"].unitsPerEm
    margin = size * 0.08
    width = cursor - size * 0.015
    view = f"{-margin:.2f} {-cap - margin:.2f} {width + 2 * margin:.2f} {cap + 2 * margin:.2f}"
    target.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" '
        f'width="{width + 2 * margin:.0f}" height="{cap + 2 * margin:.0f}">'
        f'<title>GENAI DAYS</title><path fill="#{INK.hexval()[2:]}" d="{" ".join(paths)}"/></svg>\n',
        encoding="utf-8",
    )


# -------------------------------------------------------------- primitives ---

def paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    *,
    size: float = 9.5,
    leading: float | None = None,
    color: colors.Color = INK,
    font: str = "Arial",
) -> float:
    style = ParagraphStyle(
        "body", fontName=font, fontSize=size, leading=leading or size * 1.55,
        textColor=color, alignment=TA_LEFT, spaceAfter=0,
    )
    block = Paragraph(text, style)
    _, height = block.wrap(width, PAGE_H)
    block.drawOn(pdf, x, top - height)
    return top - height


def text(value: str) -> str:
    return escape(french(value))


def label(
    pdf: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    *,
    color: colors.Color = INK,
    size: float = 7,
    align: str = "left",
    font: str = "ArialBold",
) -> float:
    value = value.upper()
    spacing = size * 0.12
    width = pdfmetrics.stringWidth(value, font, size) + spacing * (len(value) - 1)
    if align == "right":
        x -= width
    elif align == "center":
        x -= width / 2
    pdf.saveState()
    pdf.setFillColor(color)
    line = pdf.beginText(x, y)
    line.setFont(font, size)
    line.setCharSpace(spacing)
    line.textOut(value)
    pdf.drawText(line)
    pdf.restoreState()
    return width


def headline(pdf: canvas.Canvas, value: str, x: float, top: float, width: float, *, size: float = 34, color: colors.Color = INK) -> float:
    style = ParagraphStyle(
        "headline", fontName="GaramondExtraBold", fontSize=size, leading=size * 0.98,
        textColor=color,
    )
    block = Paragraph(text(value), style)
    _, height = block.wrap(width, PAGE_H)
    block.drawOn(pdf, x, top - height)
    return top - height


def hline(pdf: canvas.Canvas, x1: float, x2: float, y: float, color: colors.Color = RULE, width: float = 0.6) -> None:
    pdf.setStrokeColor(color)
    pdf.setLineWidth(width)
    pdf.line(x1, y, x2, y)


def vline(pdf: canvas.Canvas, x: float, y1: float, y2: float, color: colors.Color = RULE, width: float = 0.6) -> None:
    pdf.setStrokeColor(color)
    pdf.setLineWidth(width)
    pdf.line(x, y1, x, y2)


def corner(pdf: canvas.Canvas, x: float, y: float, size: float = 4.5) -> None:
    pdf.setFillColor(ORANGE)
    pdf.rect(x - size / 2, y - size / 2, size, size, fill=1, stroke=0)


def section_rule(pdf: canvas.Canvas, y: float) -> None:
    """Section separation: full-bleed rule, orange squares where it meets the rails."""
    hline(pdf, 0, PAGE_W, y, RULE, 0.6)
    corner(pdf, RAIL, y)
    corner(pdf, PAGE_W - RAIL, y)


def page_base(pdf: canvas.Canvas, number: int, site_host: str, year: int) -> None:
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    vline(pdf, RAIL, 0, PAGE_H, RULE_SOFT)
    vline(pdf, PAGE_W - RAIL, 0, PAGE_H, RULE_SOFT)
    wordmark(pdf, RAIL + PAD, PAGE_H - 34, 15, INK)
    label(pdf, f"Dossier de presse {year}", PAGE_W - RAIL - PAD, PAGE_H - 32, size=6.5, align="right")
    section_rule(pdf, PAGE_H - 50)
    section_rule(pdf, 46)
    pdf.setFont("Arial", 7.5)
    pdf.setFillColor(MUTED)
    pdf.drawString(RAIL + PAD, 28, site_host)
    label(pdf, f"{number:02d} / {TOTAL_PAGES:02d}", PAGE_W - RAIL - PAD, 28, size=6.5, align="right", color=MUTED)


def prepared_image(
    source: Path,
    target: Path,
    box: tuple[float, float],
    *,
    focus: tuple[float, float] = (0.5, 0.5),
    grayscale: bool = False,
    dpi: int = 220,
) -> Path:
    """Crop to the box ratio around a focus point, then resample for print."""
    with Image.open(source) as image:
        image = image.convert("RGB")
        ratio = box[0] / box[1]
        width, height = image.size
        if width / height > ratio:
            crop_w, crop_h = height * ratio, height
        else:
            crop_w, crop_h = width, width / ratio
        left = min(max(width * focus[0] - crop_w / 2, 0), width - crop_w)
        top = min(max(height * focus[1] - crop_h / 2, 0), height - crop_h)
        image = image.crop((round(left), round(top), round(left + crop_w), round(top + crop_h)))
        pixels = (round(box[0] / 72 * dpi), round(box[1] / 72 * dpi))
        if image.width > pixels[0]:
            image = image.resize(pixels, Image.Resampling.LANCZOS)
        if grayscale:
            image = ImageOps.grayscale(image)
        image.save(target, "JPEG", quality=84, optimize=True)
    return target


def silhouette(source: Path, target: Path, color: colors.Color, max_px: int = 900) -> tuple[Path, float]:
    """Monochrome logo from a raster file, like the site's CSS mask."""
    with Image.open(source) as image:
        image = image.convert("RGBA")
        image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] == 255:
            alpha = ImageOps.invert(ImageOps.grayscale(image.convert("RGB")))
        ink = Image.new("RGBA", image.size, tuple(round(c * 255) for c in color.rgb()) + (0,))
        ink.putalpha(alpha)
        bbox = alpha.point(lambda value: 255 if value > 24 else 0).getbbox()
        if bbox:
            ink = ink.crop(bbox)
        ink.save(target, "PNG", optimize=True)
        return target, ink.width / ink.height


def recolor(node, color: colors.Color) -> None:
    if isinstance(node, Group):
        for child in node.contents:
            recolor(child, color)
    elif isinstance(node, Shape):
        for attribute in ("fillColor", "strokeColor"):
            current = getattr(node, attribute, None)
            if current is not None and getattr(current, "alpha", 1) > 0:
                setattr(node, attribute, color)


def draw_svg(pdf: canvas.Canvas, source: Path | str, x: float, y: float, box_w: float, box_h: float, *, color: colors.Color | None = None, align: str = "center") -> float:
    if isinstance(source, Path):
        drawing = svg2rlg(str(source))
    else:
        with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as handle:
            handle.write(source)
        drawing = svg2rlg(handle.name)
    if color is not None:
        recolor(drawing, color)
    scale = min(box_w / drawing.width, box_h / drawing.height)
    width, height = drawing.width * scale, drawing.height * scale
    drawing.scale(scale, scale)
    drawing.width, drawing.height = width, height
    offset = {"center": (box_w - width) / 2, "left": 0, "right": box_w - width}[align]
    renderPDF.draw(drawing, pdf, x + offset, y + (box_h - height) / 2)
    return width


def logo(pdf: canvas.Canvas, path: str, x: float, y: float, box_w: float, box_h: float, tmp: Path, *, color: colors.Color = INK, align: str = "center") -> None:
    source = PUBLIC / path.lstrip("/")
    if source.suffix == ".svg":
        draw_svg(pdf, source, x, y, box_w, box_h, color=color, align=align)
        return
    target, ratio = silhouette(source, tmp / f"logo-{slugify(source.stem)}-{color.hexval()}.png", color)
    width = min(box_w, box_h * ratio)
    height = width / ratio
    offset = {"center": (box_w - width) / 2, "left": 0, "right": box_w - width}[align]
    pdf.drawImage(str(target), x + offset, y + (box_h - height) / 2, width, height, mask="auto")


def track_mark(pdf: canvas.Canvas, track: str, x: float, y: float, *, color: colors.Color = INK, size: float = 8) -> float:
    icon = lucide_icon("telescope" if track == "decideurs" else "wrench")
    draw_svg(pdf, icon, x, y - 3, 11, 11, color=color, align="left")
    name = "Ceux qui décident" if track == "decideurs" else "Ceux qui implémentent"
    return 16 + label(pdf, name, x + 16, y, color=color, size=size - 1)


def session_title(session: dict) -> str:
    return f"« {session['title']} »" if session.get("quoteTitle", True) else session["title"]


# ------------------------------------------------------------------ pages ---

def cover_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, tmp = ctx["event"], ctx["tmp"]
    venue = event["venue"]
    image_h = 468
    pdf.setFillColor(BLUE)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    cover = prepared_image(PUBLIC / event["image"], tmp / "cover.jpg", (PAGE_W, image_h), focus=(0.5, 0.42))
    pdf.drawImage(str(cover), 0, PAGE_H - image_h, PAGE_W, image_h)

    wordmark(pdf, PAGE_W - RAIL, PAGE_H - 56, 30, CREAM, align="right")
    label(pdf, f"Nantes {event['year']}", PAGE_W - RAIL, PAGE_H - 74, color=CREAM, size=9.5, align="right", font="GaramondRegular")
    draw_svg(pdf, PUBLIC / "logos/Gen AI Logo.svg", RAIL, PAGE_H - 78, 34, 34, color=CREAM, align="left")

    vline(pdf, RAIL, 0, PAGE_H - image_h, CREAM_RULE)
    vline(pdf, PAGE_W - RAIL, 0, PAGE_H - image_h, CREAM_RULE)
    hline(pdf, 0, PAGE_W, PAGE_H - image_h, CREAM_RULE)
    corner(pdf, RAIL, PAGE_H - image_h)
    corner(pdf, PAGE_W - RAIL, PAGE_H - image_h)

    top = PAGE_H - image_h - 34
    label(pdf, f"Dossier de presse · Édition {event['year']}", RAIL + PAD, top, color=CREAM, size=7.5)
    primary, accent = ctx["hero_title"]
    y = headline(pdf, primary, RAIL + PAD, top - 20, 350, size=34, color=CREAM)
    style = ParagraphStyle("tag", fontName="GaramondSemiboldItalic", fontSize=20, leading=22, textColor=CREAM)
    block = Paragraph(text(accent), style)
    _, height = block.wrap(400, PAGE_H)
    block.drawOn(pdf, RAIL + PAD, y - 12 - height)

    # Physical label: the hero pass, flattened for print.
    pdf.saveState()
    pdf.translate(PAGE_W - RAIL - 108, PAGE_H - image_h + 18)
    pdf.rotate(-4)
    w, h = 176, 124
    pdf.setFillColor(colors.Color(0.035, 0.07, 0.18, alpha=0.35))
    pdf.roundRect(-w / 2 + 4, -h / 2 - 5, w, h, 8, fill=1, stroke=0)
    pdf.setFillColor(CREAM)
    pdf.roundRect(-w / 2, -h / 2, w, h, 8, fill=1, stroke=0)
    pdf.setStrokeColor(INK)
    pdf.setLineWidth(0.8)
    pdf.roundRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 5, fill=0, stroke=1)
    pdf.setLineWidth(0.4)
    pdf.roundRect(-w / 2 + 7.5, -h / 2 + 7.5, w - 15, h - 15, 3.5, fill=0, stroke=1)
    day = date.fromisoformat(event["date"])
    pdf.setFillColor(INK)
    pdf.setFont("GaramondExtraBold", 46)
    pdf.drawString(-w / 2 + 18, 4, str(day.day))
    month_x = -w / 2 + 22 + pdfmetrics.stringWidth(str(day.day), "GaramondExtraBold", 46)
    pdf.setFont("GaramondBold", 15)
    pdf.drawString(month_x, 24, MONTHS[day.month - 1].upper())
    pdf.drawString(month_x, 8, str(day.year))
    hline(pdf, -w / 2 + 18, w / 2 - 18, -6, INK, 0.5)
    label(pdf, venue["shortName"], -w / 2 + 18, -22, size=7.5)
    label(pdf, f"{venue['city']} · Accueil {event['startTime'].replace(':', 'h')}", -w / 2 + 18, -35, size=7.5)
    pdf.restoreState()

    region = ctx["supporter"]
    hline(pdf, RAIL, PAGE_W - RAIL, 92, CREAM_RULE)
    label(pdf, "Avec le soutien de", RAIL + PAD, 70, color=CREAM, size=6.5)
    logo(pdf, region["monochromeLogo"], RAIL + PAD, 30, 96, 30, tmp, color=CREAM, align="left")
    pdf.setFillColor(CREAM)
    pdf.setFont("Arial", 8)
    pdf.drawRightString(PAGE_W - RAIL - PAD, 58, f"{format_date(event['date'])} · {event['startTime'].replace(':', 'h')} à {event['endTime'].replace(':', 'h')}")
    pdf.drawRightString(PAGE_W - RAIL - PAD, 45, f"{venue['name']}, {venue['address']}, {venue['postalCode']} {venue['city']}")
    pdf.drawRightString(PAGE_W - RAIL - PAD, 32, ctx["site_host"])


def brief_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, tmp = ctx["event"], ctx["tmp"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "En bref.", left, PAGE_H - 78, CONTENT_W - 2 * PAD, size=30)

    col_w = 290
    fact_x = left + col_w + 28
    fact_w = PAGE_W - RAIL - PAD - fact_x
    label(pdf, "Présentation prête à publier", left, y - 20, color=ORANGE)
    summary_bottom = paragraph(pdf, brand(text(ctx["summary"])), left, y - 30, col_w, size=8.7, leading=13)

    label(pdf, "Fiche factuelle", fact_x, y - 20, color=ORANGE)
    fy = y - 28
    hline(pdf, fact_x, fact_x + fact_w, fy, RULE)
    for name, value in ctx["facts"]:
        label(pdf, name, fact_x, fy - 11, size=6, color=MUTED)
        bottom = paragraph(pdf, text(value), fact_x + 64, fy - 5, fact_w - 64, size=8, leading=10.5)
        fy = min(fy - 17, bottom - 6)
        hline(pdf, fact_x, fact_x + fact_w, fy, RULE_SOFT)

    # Key figures band.
    band_top = min(summary_bottom, fy) - 18
    band_h = 62
    section_rule(pdf, band_top)
    figures = ctx["figures"]
    cell = CONTENT_W / len(figures)
    for index, (value, caption) in enumerate(figures):
        x = RAIL + index * cell
        if index:
            vline(pdf, x, band_top - band_h, band_top, RULE_SOFT)
        pdf.setFillColor(BLUE)
        pdf.setFont("GaramondExtraBold", 30)
        pdf.drawString(x + PAD, band_top - 32, str(value))
        paragraph(pdf, text(caption), x + PAD, band_top - 38, cell - 2 * PAD, size=6.8, leading=8.4, color=MUTED, font="ArialBold")
    section_rule(pdf, band_top - band_h)

    # Two tracks: a strip of the track poster, then one column per track.
    top = band_top - band_h - 16
    strip_h = 62
    strip = prepared_image(PUBLIC / "images/affiche-decide-implemente-optimized.webp", tmp / "tracks-strip.jpg", (CONTENT_W, strip_h), focus=(0.5, 0.72))
    pdf.drawImage(str(strip), RAIL, top - strip_h, CONTENT_W, strip_h)
    top -= strip_h
    col = CONTENT_W / 2
    lowest = top
    for index, track in enumerate(ctx["tracks"]):
        x = RAIL + index * col
        accent = BLUE if track["accentColor"] == "blue" else ORANGE
        pdf.setFillColor(accent)
        pdf.rect(x, top - 3, col, 3, fill=1, stroke=0)
        track_mark(pdf, track["id"], x + PAD, top - 20)
        bottom = paragraph(pdf, text(track["name"]), x + PAD, top - 28, col - 2 * PAD, size=16, leading=17, font="GaramondExtraBold")
        bottom = paragraph(pdf, text(track["description"]), x + PAD, bottom - 5, col - 2 * PAD, size=8.2, leading=11.5, color=MUTED)
        bottom = paragraph(pdf, text(" · ".join(track["themes"])), x + PAD, bottom - 6, col - 2 * PAD, size=10, leading=12, font="GaramondSemiboldItalic")
        label(pdf, " · ".join(track["formats"]), x + PAD, bottom - 14, size=6, color=ORANGE)
        lowest = min(lowest, bottom - 20)
    vline(pdf, RAIL + col, lowest - 6, top - 3, RULE_SOFT)
    top = lowest - 6
    hline(pdf, RAIL, PAGE_W - RAIL, top, RULE)

    # Editorial angles.
    top -= 18
    label(pdf, "Trois angles pour raconter l’événement", left, top, color=ORANGE)
    top -= 10
    angles = (
        ("Décider face à l’IA.", "Coûts, gouvernance, souveraineté, conformité et retour sur investissement."),
        ("Passer des prototypes à la production.", "Architectures, agents, évaluation, données et observabilité."),
        ("Partager ce que le terrain a appris.", "Des choix documentés, des méthodes concrètes et des retours d’expérience."),
    )
    col = CONTENT_W / 3
    lowest = top
    for index, (title, body) in enumerate(angles):
        x = RAIL + index * col
        bottom = paragraph(pdf, text(title), x + PAD, top - 4, col - 2 * PAD, size=12, leading=13, font="GaramondBold")
        bottom = paragraph(pdf, text(body), x + PAD, bottom - 4, col - 2 * PAD, size=7.8, leading=10.8, color=MUTED)
        lowest = min(lowest, bottom)
    for index in (1, 2):
        vline(pdf, RAIL + index * col, lowest - 8, top, RULE_SOFT)


def measure(value: str, width: float, *, size: float, leading: float, font: str) -> float:
    block = Paragraph(value, ParagraphStyle("m", fontName=font, fontSize=size, leading=leading))
    return block.wrap(width, PAGE_H)[1]


def programme_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event = ctx["event"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "Le programme.", left, PAGE_H - 82, CONTENT_W - 2 * PAD)
    y = paragraph(pdf, text(ctx["programme_status"]), left, y - 14, 400, size=8.5, leading=12, color=MUTED)

    time_w = 50
    col_w = (CONTENT_W - time_w) / 2
    inner = col_w - 20
    top = y - 16
    hline(pdf, RAIL, PAGE_W - RAIL, top, RULE)
    for index, track in enumerate(ctx["tracks"]):
        x = RAIL + time_w + index * col_w
        accent = BLUE if track["accentColor"] == "blue" else ORANGE
        pdf.setFillColor(accent)
        pdf.rect(x, top - 3, col_w, 3, fill=1, stroke=0)
        track_mark(pdf, track["id"], x + 10, top - 16)
    top -= 24
    hline(pdf, RAIL, PAGE_W - RAIL, top, RULE)

    speakers = ctx["speakers_by_id"]
    kinds = {"table-ronde": "Table ronde", "concours": "Concours"}
    title_style = dict(size=9.6, leading=10.6, font="GaramondSemiboldItalic")
    people_style = dict(size=6.6, leading=8.2, font="ArialBold")

    def people(session: dict) -> str:
        names = ", ".join(speakers[slug]["name"] for slug in session["speakerSlugs"] if slug in speakers)
        return f"Jury : {names}" if names and session["format"] == "concours" else names

    def cell_height(session: dict | None) -> float:
        if session is None:
            return 12
        height = measure(text(session_title(session)), inner, **title_style)
        if session["format"] in kinds:
            height += 9
        if people(session):
            height += 2 + measure(text(people(session)), inner, **people_style)
        return height

    for row in ctx["programme_rows"]:
        if row["kind"] == "common":
            height = 26 if row.get("detail") else 17
            pdf.setFillColor(CREAM_DEEP)
            pdf.rect(RAIL, top - height, CONTENT_W, height, fill=1, stroke=0)
            label(pdf, row["time"], RAIL + 10, top - 11.5, size=6.2, color=MUTED)
            pdf.setFillColor(INK)
            pdf.setFont("GaramondBold", 10)
            pdf.drawString(RAIL + time_w + 10, top - 12, french(row["title"]))
            if row.get("detail"):
                pdf.setFont("Arial", 6.8)
                pdf.setFillColor(MUTED)
                pdf.drawString(RAIL + time_w + 10, top - 21.5, french(row["detail"]))
            top -= height
            hline(pdf, RAIL, PAGE_W - RAIL, top, RULE_SOFT)
            continue

        height = max(cell_height(session) for session in row["sessions"]) + 14
        label(pdf, row["time"], RAIL + 10, top - 12, size=6.2, color=MUTED)
        for index, session in enumerate(row["sessions"]):
            x = RAIL + time_w + index * col_w + 10
            vline(pdf, x - 10, top - height, top, RULE_SOFT)
            if session is None:
                label(pdf, "Programmation à venir", x, top - 12, size=6, color=MUTED)
                continue
            cy = top - 7
            if session["format"] in kinds:
                label(pdf, kinds[session["format"]], x, cy - 5.5, size=5.8, color=ORANGE)
                cy -= 9
            bottom = paragraph(pdf, text(session_title(session)), x, cy, inner, **title_style)
            if people(session):
                paragraph(pdf, text(people(session)), x, bottom - 2, inner, color=MUTED, **people_style)
        top -= height
        hline(pdf, RAIL, PAGE_W - RAIL, top, RULE_SOFT)


def speakers_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, tmp = ctx["event"], ctx["tmp"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "Les intervenants.", left, PAGE_H - 82, CONTENT_W - 2 * PAD)
    paragraph(pdf, text(ctx["speakers_intro"]), left, y - 14, 380, size=8.5, leading=12, color=MUTED)

    columns = 4
    cell_w = CONTENT_W / columns
    photo_h = cell_w
    caption_h = 50
    top = y - 46
    hline(pdf, RAIL, PAGE_W - RAIL, top, RULE)
    for index, speaker in enumerate(ctx["speakers"]):
        col = index % columns
        row = index // columns
        x = RAIL + col * cell_w
        cell_top = top - row * (photo_h + caption_h)
        portrait = prepared_image(
            PUBLIC / speaker["photo"].lstrip("/"), tmp / f"speaker-{speaker['id']}.jpg",
            (cell_w, photo_h), focus=(0.5, 0.36), grayscale=True, dpi=200,
        )
        pdf.drawImage(str(portrait), x, cell_top - photo_h, cell_w, photo_h)
        pdf.setFillColor(INK)
        pdf.setFont("GaramondBold", 12)
        pdf.drawString(x + 9, cell_top - photo_h - 15, speaker["name"])
        paragraph(
            pdf, text(f"{speaker['role']} · {speaker['company']}"),
            x + 9, cell_top - photo_h - 20, cell_w - 18, size=6.8, leading=8.6, color=MUTED,
        )
        if col:
            vline(pdf, x, cell_top - photo_h - caption_h, cell_top, RULE)
        hline(pdf, RAIL, PAGE_W - RAIL, cell_top - photo_h - caption_h, RULE)
    vline(pdf, RAIL, top - ((len(ctx["speakers"]) - 1) // columns + 1) * (photo_h + caption_h), top, RULE)
    vline(pdf, PAGE_W - RAIL, top - ((len(ctx["speakers"]) - 1) // columns + 1) * (photo_h + caption_h), top, RULE)


def partners_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, tmp = ctx["event"], ctx["tmp"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "Ils rendent la journée possible.", left, PAGE_H - 82, CONTENT_W - 2 * PAD)

    region = ctx["supporter"]
    top = y - 26
    hline(pdf, RAIL, PAGE_W - RAIL, top, RULE)
    pdf.setFillColor(WHITE)
    pdf.rect(RAIL, top - 118, CONTENT_W, 118, fill=1, stroke=0)
    logo(pdf, region["logo"], RAIL + PAD, top - 100, 150, 82, tmp, color=INK)
    label(pdf, "Avec le soutien de", RAIL + 196, top - 22, color=ORANGE)
    paragraph(pdf, brand(text(region["description"])), RAIL + 196, top - 32, CONTENT_W - 196 - PAD, size=8.8, leading=13.2)
    hline(pdf, RAIL, PAGE_W - RAIL, top - 118, RULE)
    top -= 118

    rows = (
        ("platinum", 3, 84),
        ("gold", 6, 54),
        ("silver", 5, 48),
    )
    partners = ctx["partners"]
    for tier, columns, height in rows:
        members = [partner for partner in partners if partner["tier"] == tier and not partner.get("coOrganizer")]
        if not members:
            continue
        chunks = [members[i:i + columns] for i in range(0, len(members), columns)]
        for chunk in chunks:
            cell_w = CONTENT_W / columns
            cell_h = height + 26
            for index, partner in enumerate(chunk):
                x = RAIL + index * cell_w
                if index:
                    vline(pdf, x, top - cell_h, top, RULE_SOFT)
                logo(pdf, partner.get("monochromeLogo") or partner["logo"], x + 14, top - cell_h + 13, cell_w - 28, height - 10, tmp)
            if len(chunk) < columns:
                vline(pdf, RAIL + len(chunk) * cell_w, top - cell_h, top, RULE_SOFT)
            top -= cell_h
            hline(pdf, RAIL, PAGE_W - RAIL, top, RULE_SOFT)

    paragraph(
        pdf, text("La liste des partenaires évolue jusqu’à l’événement. La version à jour est publiée sur la page partenaires du site."),
        left, top - 14, CONTENT_W - 2 * PAD, size=7.5, leading=10, color=MUTED,
    )


def team_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, tmp = ctx["event"], ctx["tmp"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "L’équipe.", left, PAGE_H - 82, CONTENT_W - 2 * PAD)
    team = ctx["team"]
    paragraph(
        pdf,
        brand(text(f"{len(team)} bénévoles de l’écosystème nantais portent GENAI DAYS au sein de l’association {event['organizer']['name']}, dont les organisateurs du meetup Generative AI Nantes.")),
        left, y - 14, 380, size=8.5, leading=12, color=MUTED,
    )

    top = y - 50
    ratios = [member["photoWidth"] / member["photoHeight"] for member in team]
    tile_h = CONTENT_W / sum(ratios)
    x = RAIL
    for member, ratio in zip(team, ratios):
        width = tile_h * ratio
        tile = prepared_image(PUBLIC / member["photo"].lstrip("/"), tmp / f"team-{member['id']}.jpg", (width, tile_h), dpi=200)
        pdf.drawImage(str(tile), x, top - tile_h, width, tile_h)
        x += width
    x = RAIL
    for member, ratio in zip(team, ratios):
        width = tile_h * ratio
        if x > RAIL:
            vline(pdf, x, top - tile_h, top, ORANGE, 1.4)
        pdf.setFillColor(INK)
        name_bottom = paragraph(pdf, text(member["name"]), x + 6, top - tile_h - 9, width - 10, size=11, leading=11.5, font="GaramondBold")
        role_bottom = paragraph(pdf, text(member["role"]), x + 6, name_bottom - 3, width - 10, size=7.5, leading=9, font="GaramondSemiboldItalic", color=BLUE)
        paragraph(pdf, text(member["background"]), x + 6, role_bottom - 4, width - 10, size=6.5, leading=8.4, color=MUTED)
        x += width

    top = top - tile_h - 84
    section_rule(pdf, top)
    y = headline(pdf, "Pour une interview.", left, top - 22, 300, size=22)
    label(pdf, "Demandes via le contact presse du site", PAGE_W - RAIL - PAD, top - 38, size=6.2, color=ORANGE, align="right")
    rows_top = y - 12
    for index, person in enumerate(ctx["spokespeople"]):
        row_top = rows_top - index * 50
        hline(pdf, RAIL, PAGE_W - RAIL, row_top, RULE_SOFT)
        portrait = prepared_image(PUBLIC / person["photo"].lstrip("/"), tmp / f"spoke-{index}.jpg", (46, 46), focus=(0.5, 0.35), grayscale=True)
        pdf.drawImage(str(portrait), left, row_top - 45, 40, 40)
        pdf.setFillColor(INK)
        pdf.setFont("GaramondBold", 13)
        pdf.drawString(left + 54, row_top - 19, person["name"])
        label(pdf, person["role"], left + 54, row_top - 31, size=5.8, color=MUTED)
        paragraph(pdf, text(person["topics"]), left + 276, row_top - 11, CONTENT_W - 2 * PAD - 276, size=8, leading=11, color=MUTED)
    hline(pdf, RAIL, PAGE_W - RAIL, rows_top - len(ctx["spokespeople"]) * 50, RULE_SOFT)


def resources_page(pdf: canvas.Canvas, ctx: dict) -> None:
    event, site = ctx["event"], ctx["site"]
    page_base(pdf, ctx["page"], ctx["site_host"], event["year"])
    left = RAIL + PAD
    y = headline(pdf, "Ressources.", left, PAGE_H - 82, CONTENT_W - 2 * PAD)

    label(pdf, "Dans le kit presse", left, y - 26, color=ORANGE)
    top = y - 36
    hline(pdf, RAIL + PAD, PAGE_W - RAIL - PAD, top, RULE)
    for name, detail in ctx["kit_contents"]:
        pdf.setFillColor(INK)
        pdf.setFont("ArialBold", 8.5)
        pdf.drawString(left, top - 14, name)
        pdf.setFont("Arial", 8)
        pdf.setFillColor(MUTED)
        pdf.drawRightString(PAGE_W - RAIL - PAD, top - 14, detail)
        top -= 22
        hline(pdf, RAIL + PAD, PAGE_W - RAIL - PAD, top, RULE_SOFT)

    top -= 30
    label(pdf, "Identité visuelle", left, top, color=ORANGE)
    top -= 14
    box_w = 150
    pdf.setFillColor(WHITE)
    pdf.rect(left, top - 88, box_w, 88, fill=1, stroke=0)
    draw_svg(pdf, PUBLIC / "logos/Gen AI Logo.svg", left, top - 74, box_w, 60, color=INK)
    pdf.setFillColor(CREAM_DEEP)
    pdf.rect(left + box_w + 8, top - 88, CONTENT_W - 2 * PAD - box_w - 8, 88, fill=1, stroke=0)
    wordmark(pdf, left + box_w + 8 + (CONTENT_W - 2 * PAD - box_w - 8) / 2, top - 52, 34, INK, align="center")
    top -= 100
    top = paragraph(
        pdf,
        text(
            "Le nom de l’événement s’écrit toujours en capitales EB Garamond : GENAI en gras, DAYS en romain "
            "et seules les lettres AI en italique. Le wordmark vectorisé et le symbole sont fournis en SVG : "
            "conserver leurs proportions, sans ombre, contour ni effet."
        ).replace("GENAI", "<b>GENAI</b>"),
        left, top, CONTENT_W - 2 * PAD, size=8.5, leading=12.5, color=MUTED,
    ) - 14
    swatch_w = (CONTENT_W - 2 * PAD) / 4
    for index, (name, swatch) in enumerate((
        ("Bleu électrique", BLUE), ("Orange signal", ORANGE), ("Papier crème", CREAM), ("Encre charbon", INK),
    )):
        x = left + index * swatch_w
        pdf.setFillColor(swatch)
        pdf.setStrokeColor(RULE)
        pdf.rect(x, top - 26, swatch_w - 6, 26, fill=1, stroke=1 if swatch == CREAM else 0)
        pdf.setFillColor(INK)
        pdf.setFont("ArialBold", 7.5)
        pdf.drawString(x, top - 38, name)
        pdf.setFont("Arial", 7.5)
        pdf.setFillColor(MUTED)
        pdf.drawString(x, top - 48, f"#{swatch.hexval()[2:].upper()}")

    # Blue contact field closes the dossier like a back cover.
    field_top = 240
    pdf.setFillColor(BLUE)
    pdf.rect(0, 46, PAGE_W, field_top - 46, fill=1, stroke=0)
    vline(pdf, RAIL, 46, field_top, CREAM_RULE)
    vline(pdf, PAGE_W - RAIL, 46, field_top, CREAM_RULE)
    corner(pdf, RAIL, field_top)
    corner(pdf, PAGE_W - RAIL, field_top)
    headline(pdf, "Contact presse.", left, field_top - 24, 200, size=24, color=CREAM)
    paragraph(
        pdf, brand(text("Accréditations, interviews et mises en relation : l’équipe GENAI DAYS répond à chaque demande de la presse.")),
        left, field_top - 56, 190, size=8.5, leading=12.5, color=CREAM_MUTED,
    )
    links = (
        ("Contact presse", urljoin(site, "press-kit#contact-presse")),
        ("Site officiel", site.rstrip("/")),
        ("Programme", urljoin(site, "programme")),
        ("Intervenants", urljoin(site, "speakers")),
        ("Billetterie", ctx["tickets"]),
    )
    lx = left + 214
    ly = field_top - 26
    for name, url in links:
        hline(pdf, lx, PAGE_W - RAIL - PAD, ly + 12, CREAM_RULE)
        label(pdf, name, lx, ly - 3, color=CREAM, size=6.5)
        pdf.setFillColor(CREAM)
        pdf.setFont("Arial", 7.8)
        pdf.drawString(lx + 76, ly - 3, url.replace("https://", ""))
        pdf.linkURL(url, (lx, ly - 7, PAGE_W - RAIL - PAD, ly + 10), relative=0)
        ly -= 26
    hline(pdf, lx, PAGE_W - RAIL - PAD, ly + 12, CREAM_RULE)


# ------------------------------------------------------------------- data ---

def build_context(tmp: Path) -> dict:
    event = json.loads((CONTENT / "event.json").read_text(encoding="utf-8"))
    pricing = json.loads((CONTENT / "pricing.json").read_text(encoding="utf-8"))
    site = event["url"].rstrip("/") + "/"
    links = (ROOT / "src/lib/cta-links.ts").read_text(encoding="utf-8")
    tickets = re.search(r"tickets:\s*'([^']+)'", links)
    if tickets is None:
        raise ValueError("Ticket URL not found")

    tracks = []
    for path in sorted((CONTENT / "tracks").glob("*.md")):
        data = frontmatter(path)
        data["body"] = path.read_text(encoding="utf-8").split("---", 2)[2].strip()
        tracks.append(data)
    tracks.sort(key=lambda item: item["accentColor"] != "blue")

    sessions = collection("sessions")
    speakers = collection("speakers")
    speakers_by_id = {speaker["id"]: speaker for speaker in speakers}
    order = prominence_order()
    speakers.sort(key=lambda s: (order.index(s["id"]) if s["id"] in order else len(order), s["name"]))
    partners = sorted(collection("partners"), key=lambda p: p.get("order", 99))
    # `coOrganizer` is the site's flag for the featured public partner: the
    # Région supports the event and hosts it, it does not co-organise it.
    supporter = next(p for p in partners if p.get("coOrganizer"))
    team = sorted(collection("team"), key=lambda m: m["order"])
    team_by_id = {member["id"]: member for member in team}

    slots = programme_slots()
    by_time: dict[str, dict[str, dict]] = {}
    for session in sessions:
        by_time.setdefault(session["startTime"], {})[session["track"]] = session

    def names(session: dict) -> str:
        return ", ".join(speakers_by_id[s]["name"] for s in session["speakerSlugs"] if s in speakers_by_id)

    rows = []
    for slot in slots:
        common = by_time.get(slot["time"], {}).get("commun")
        if slot["kind"] == "conference":
            sessions_at = by_time.get(slot["time"], {})
            rows.append({
                "kind": "conference",
                "time": slot["time"].replace(":", "h"),
                "sessions": [sessions_at.get(track["id"]) for track in tracks],
            })
        elif slot["kind"] == "closing" or (slot["kind"] == "transition" and "pause" not in slot["title"].lower()):
            continue
        else:
            title = slot["title"].replace("'", "’")
            detail = ""
            if common and slot["kind"] == "keynote":
                title = session_title(common)
                detail = names(common)
            elif slot["kind"] == "social":
                closing = next((c for c in slots if c["kind"] == "closing"), None)
                detail = f"Jusqu’à {closing['time'].replace(':', 'h')}" if closing else ""
                if common:
                    detail += f" · {common['title']} enregistré en public"
            elif slot["kind"] == "keynote":
                detail = "Intervention à annoncer"
            rows.append({"kind": "common", "time": slot["time"].replace(":", "h"), "title": title, "detail": detail})

    keynote = next((s for s in sessions if s["format"] == "keynote"), None)
    podcast = next((s for s in sessions if s["format"] == "podcast"), None)
    contest = next((s for s in sessions if s["format"] == "concours"), None)
    round_table = next((s for s in sessions if s["format"] == "table-ronde"), None)

    keynote_speaker = speakers_by_id[keynote["speakerSlugs"][0]] if keynote and keynote["speakerSlugs"] else None
    highlights = []
    if keynote_speaker:
        highlights.append(
            f"une keynote d’ouverture de {keynote_speaker['name']}, {keynote_speaker['role'][0].lower()}{keynote_speaker['role'][1:]} "
            f"de la {keynote_speaker['company']}"
        )
    if round_table:
        highlights.append("une table ronde sur la souveraineté numérique")
    if contest:
        highlights.append("un Startup Contest")
    if podcast:
        highlights.append(f"l’enregistrement en public du podcast {podcast['title'].replace('Podcast ', '')}")
    summary = (
        "GENAI DAYS est une journée-conférence consacrée à l’intelligence artificielle générative, dédiée aux "
        f"décideurs et à leurs équipes techniques. Organisée par l’association {event['organizer']['name']} avec le "
        f"soutien de la {supporter['name']}, elle se tient le {format_date(event['date'])} à {event['venue']['city']} "
        f"({event['venue']['name']}). L’événement réunit celles et ceux qui décident, construisent et implémentent "
        "l’IA au quotidien. Deux parcours complémentaires rythment la journée : « Pour ceux qui décident », centré "
        "sur la stratégie, la gouvernance et le retour sur investissement, et « Pour ceux qui implémentent », dédié "
        "aux architectures, aux outils et aux retours d’expérience. Au programme : "
        + ", ".join(highlights[:-1]) + (" et " + highlights[-1] if len(highlights) > 1 else "".join(highlights))
        + ". Conférences, échanges concrets et rencontres composent un programme intégralement présenté en français."
    )

    figures = (
        (1, "journée, de l’accueil à l’afterwork"),
        (len(tracks), "parcours complémentaires"),
        (len(sessions), "rendez-vous au programme"),
        (len(speakers), "intervenants confirmés à ce jour"),
        (pricing["capacity"], "participants attendus"),
    )

    venue = event["venue"]
    facts = (
        ("Date", format_date(event["date"])),
        ("Horaires", f"{event['startTime'].replace(':', 'h')} à {event['endTime'].replace(':', 'h')}"),
        ("Lieu", f"{venue['name']}, {venue['address']}, {venue['postalCode']} {venue['city']}"),
        ("Organisation", f"Association {event['organizer']['name']}"),
        ("Soutien", supporter["name"]),
        ("Jauge", f"{pricing['capacity']} participants"),
        ("Billet", f"{pricing['name']} · {pricing['amount']}{NBSP}€{NBSP}HT"),
        ("Langue", "Français"),
    )

    illustrations = []
    for session in sorted(sessions, key=lambda s: (s["startTime"], s["track"])):
        source = session.get("illustration", {}).get("src")
        if source:
            name = f"{session['startTime'].replace(':', 'h')}-{session['id']}.webp"
            illustrations.append((PUBLIC / source.lstrip("/"), name))

    spokespeople = []
    for member_id in ("maxime-pitussi", "samuel-berthe"):
        member = team_by_id[member_id]
        spokespeople.append({
            "name": member["name"], "role": member["role"], "topics": member["background"],
            "photo": f"/organisateurs/{member_id}-optimized.webp",
        })
    spokespeople.append({
        "name": "Aymeric de Maussion",
        "role": "Directeur de l’IA · Région Pays de la Loire",
        "topics": "Écosystème régional, adoption de l’IA et dynamiques territoriales.",
        "photo": "/organisateurs/aymeric-de-maussion-optimized.webp",
    })

    kit_contents = (
        ("README.pdf", "Ce dossier de presse"),
        (Path(event["image"]).name, "Visuel officiel · WEBP · 2560 × 1454 px"),
        ("genai-days-wordmark.svg", "Wordmark vectorisé · SVG"),
        ("Gen AI Logo.svg", "Symbole · SVG"),
        (f"illustrations/ ({len(illustrations)} fichiers)", f"Illustrations des conférences · WEBP · {ILLUSTRATION_WIDTH} px"),
        (f"organisateurs/ ({len(team)} fichiers)", "Portraits de l’équipe · WEBP"),
    )

    return {
        "event": event, "pricing": pricing, "site": site, "site_host": urlparse(site).netloc,
        "tickets": tickets.group(1), "tracks": tracks, "sessions": sessions, "speakers": speakers,
        "speakers_by_id": speakers_by_id, "partners": partners, "supporter": supporter, "facts": facts, "hero_title": hero_title(),
        "team": team, "programme_rows": rows, "summary": summary, "figures": figures,
        "illustrations": illustrations, "spokespeople": spokespeople,
        "kit_contents": kit_contents, "tmp": tmp,
        "programme_status": (
            f"Programme au {format_date(date.today().isoformat())}. Les créneaux « Programmation à venir » "
            "seront annoncés sur le site, qui fait foi."
        ),
        "speakers_intro": (
            "Dirigeants, fondateurs et experts techniques confirmés à ce jour. La programmation continue "
            "d’être annoncée sur le site."
        ),
    }


def render_pdf(ctx: dict) -> None:
    event = ctx["event"]
    pdf = canvas.Canvas(str(PDF), pagesize=A4, pageCompression=1)
    pdf.setTitle(f"GENAI DAYS {event['year']} · Dossier de presse")
    pdf.setAuthor("GENAI DAYS")
    pdf.setSubject("Présentation, programme, intervenants, partenaires et ressources presse")
    pages = (cover_page, brief_page, programme_page, speakers_page, partners_page, team_page, resources_page)
    assert len(pages) == TOTAL_PAGES
    for number, page in enumerate(pages, start=1):
        ctx["page"] = number
        page(pdf, ctx)
        pdf.showPage()
    pdf.save()


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="genai-press-") as directory:
        tmp = Path(directory)
        fonts = register_fonts(tmp)
        ctx = build_context(tmp)
        event, team = ctx["event"], ctx["team"]

        # Generated folders are rebuilt from scratch; the ZIP only takes the
        # files listed in `manifest`, so anything else dropped in KIT stays out.
        portraits = KIT / "organisateurs"
        illustrations = KIT / "illustrations"
        for folder in (portraits, illustrations):
            if folder.exists():
                shutil.rmtree(folder)
            folder.mkdir(parents=True)
        manifest = []
        for member in team:
            filename = member["photo"].split("/")[-1].replace("-deck-optimized", "")
            shutil.copy2(PUBLIC / "organisateurs" / filename, portraits / filename)
            manifest.append(portraits / filename)
        for source, name in ctx["illustrations"]:
            with Image.open(source) as image:
                image.thumbnail((ILLUSTRATION_WIDTH, ILLUSTRATION_WIDTH), Image.Resampling.LANCZOS)
                image.save(illustrations / name, "WEBP", quality=82, method=6)
            manifest.append(illustrations / name)
        shutil.copy2(PUBLIC / event["image"], KIT / Path(event["image"]).name)
        shutil.copy2(PUBLIC / "logos/Gen AI Logo.svg", KIT / "Gen AI Logo.svg")
        wordmark_svg(fonts, KIT / "genai-days-wordmark.svg")
        render_pdf(ctx)
        shutil.copy2(PDF, KIT / "README.pdf")
        manifest += [KIT / name for name in ("README.pdf", Path(event["image"]).name, "genai-days-wordmark.svg", "Gen AI Logo.svg")]

    archive = PUBLIC / "press/genai-days-press-kit.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(manifest):
            bundle.write(path, Path("genai-days-press-kit") / path.relative_to(KIT))
    count = len(ZipFile(archive).namelist())
    size = archive.stat().st_size / 1024 / 1024
    print(f"Built {archive} with {count} files ({size:.1f} MB)")


if __name__ == "__main__":
    main()
