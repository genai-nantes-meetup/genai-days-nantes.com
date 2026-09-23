"""Build the downloadable press dossier from the site's source content.

Run with:
  uv run --with reportlab --with pyyaml --with fonttools --with brotli --with pillow scripts/build-press-kit.py
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
from datetime import date
from html import escape
from pathlib import Path
from urllib.parse import urljoin, urlparse
from zipfile import ZIP_DEFLATED, ZipFile

import yaml
from fontTools.ttLib import TTFont as FontToolsFont
from fontTools.subset import Options, Subsetter
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
KIT = PUBLIC / "press" / "genai-days-press-kit"
PDF = PUBLIC / "press" / "README.pdf"
PAGE_W, PAGE_H = A4
MARGIN = 48
MONTHS = (
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
)


def frontmatter(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    return yaml.safe_load(content.split("---", 2)[1])


def token(name: str) -> colors.Color:
    css = (ROOT / "src/styles/global.css").read_text(encoding="utf-8")
    match = re.search(rf"--color-brand-{name}:\s*(#[0-9a-fA-F]{{6}});", css)
    if not match:
        raise ValueError(f"Missing brand color: {name}")
    return colors.HexColor(match.group(1))


CREAM = token("cream")
BLUE = token("blue")
ORANGE = token("orange")
INK = token("black")
NIGHT = token("night")


def register_fonts(tmp: Path) -> None:
    font_dir = ROOT / "node_modules/@fontsource-variable/eb-garamond/files"
    for name, source, weight in (
        ("GaramondRegular", "eb-garamond-latin-wght-normal.woff2", 400),
        ("GaramondBold", "eb-garamond-latin-wght-normal.woff2", 700),
        ("GaramondBoldItalic", "eb-garamond-latin-wght-italic.woff2", 700),
    ):
        font = FontToolsFont(font_dir / source)
        font.flavor = None
        instantiateVariableFont(font, {"wght": weight}, inplace=True)
        subsetter = Subsetter(options=Options())
        subsetter.populate(unicodes=[*range(0x20, 0x100), 0x152, 0x153, 0x2019, 0x20AC, 0x2022])
        subsetter.subset(font)
        target = tmp / f"{name}.ttf"
        font.save(target)
        pdfmetrics.registerFont(TTFont(name, str(target)))

    arial = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Arial", str(arial / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("ArialBold", str(arial / "Arial Bold.ttf")))


def wordmark(pdf: canvas.Canvas, x: float, y: float, size: float, color: colors.Color) -> None:
    pdf.saveState()
    pdf.setFillColor(color)
    text = pdf.beginText(x, y)
    text.setCharSpace(size * 0.015)
    for word, face in (
        ("GEN", "GaramondBold"),
        ("AI", "GaramondBoldItalic"),
        (" DAYS", "GaramondRegular"),
    ):
        text.setFont(face, size)
        text.textOut(word)
    pdf.drawText(text)
    pdf.restoreState()


def paragraph(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    *,
    size: float = 10.5,
    leading: float = 15,
    color: colors.Color = INK,
    font: str = "Arial",
) -> float:
    style = ParagraphStyle(
        "body", fontName=font, fontSize=size, leading=leading,
        textColor=color, alignment=TA_LEFT, spaceAfter=0,
    )
    block = Paragraph(text, style)
    _, height = block.wrap(width, PAGE_H)
    block.drawOn(pdf, x, top - height)
    return top - height


def heading(pdf: canvas.Canvas, label: str, x: float, top: float) -> float:
    pdf.setFillColor(ORANGE)
    pdf.setFont("ArialBold", 9)
    pdf.drawString(x, top - 9, label.upper())
    return top - 24


def page_base(pdf: canvas.Canvas, number: int, year: int, site_host: str) -> None:
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setStrokeColor(BLUE)
    pdf.setLineWidth(2)
    pdf.line(0, PAGE_H - 42, PAGE_W, PAGE_H - 42)
    pdf.setLineWidth(1)
    wordmark(pdf, MARGIN, PAGE_H - 28, 17, INK)
    pdf.setFillColor(INK)
    pdf.setFont("ArialBold", 8)
    pdf.drawRightString(PAGE_W - MARGIN, PAGE_H - 25, f"DOSSIER DE PRESSE {year}")
    pdf.setStrokeColor(colors.Color(0.22, 0.21, 0.21, alpha=0.25))
    pdf.line(MARGIN, 42, PAGE_W - MARGIN, 42)
    pdf.setFont("Arial", 8)
    pdf.setFillColor(INK)
    pdf.drawString(MARGIN, 27, site_host)
    pdf.drawRightString(PAGE_W - MARGIN, 27, str(number))


def title(pdf: canvas.Canvas, text: str, y: float) -> float:
    pdf.setFillColor(INK)
    pdf.setFont("GaramondBold", 31)
    pdf.drawString(MARGIN, y, text)
    return y - 28


def format_date(iso: str) -> str:
    day = date.fromisoformat(iso)
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"


def render_pdf(event: dict, pricing: dict, tracks: list[dict], team: list[dict], tickets: str, tmp: Path) -> None:
    site = event["url"].rstrip("/") + "/"
    site_host = urlparse(site).netloc
    venue = event["venue"]
    year = event["year"]
    pdf = canvas.Canvas(str(PDF), pagesize=A4, pageCompression=1)
    pdf.setTitle(f"GENAI DAYS {year} · Dossier de presse")
    pdf.setAuthor("GENAI DAYS")
    pdf.setSubject("Présentation, informations pratiques et ressources presse")

    page_base(pdf, 1, year, site_host)
    y = title(pdf, "Une journée pour décider et implémenter.", PAGE_H - 84)
    y = paragraph(
        pdf,
        f"<b>{format_date(event['date'])}</b> · {escape(venue['name'])} · {escape(venue['city'])}",
        MARGIN, y, PAGE_W - 2 * MARGIN, size=10, leading=13,
    ) - 18

    cover = tmp / "press-cover.jpg"
    with Image.open(PUBLIC / event["image"]) as source:
        source.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        source.convert("RGB").save(cover, quality=83, optimize=True, subsampling=0)
    cover_width = PAGE_W - 2 * MARGIN
    cover_height = cover_width * 1454 / 2560
    pdf.drawImage(str(cover), MARGIN, y - cover_height, cover_width, cover_height)
    y -= cover_height + 27

    y = heading(pdf, "Présentation prête à publier", MARGIN, y)
    intro = (
        "Cette journée-conférence consacrée à l’intelligence artificielle générative est "
        f"organisée le {format_date(event['date'])} à {venue['city']} ({venue['name']}). "
        "L’événement réunit celles et ceux qui décident, construisent et implémentent l’IA au quotidien. "
        "Deux parcours complémentaires rythment la journée : « Pour ceux qui décident », centré sur "
        "la stratégie, la gouvernance et le retour sur investissement, et « Pour ceux qui implémentent », "
        "dédié aux architectures, aux outils et aux retours d’expérience. Conférences, échanges concrets "
        "et rencontres composent un programme intégralement présenté en français."
    )
    y = paragraph(pdf, escape(intro), MARGIN, y, PAGE_W - 2 * MARGIN) - 24

    y = heading(pdf, "Informations pratiques", MARGIN, y)
    facts = (
        ("Date", format_date(event["date"])),
        ("Horaires", f"{event['startTime']} à {event['endTime']}"),
        ("Lieu", f"{venue['name']}, {venue['address']}, {venue['postalCode']} {venue['city']}"),
        ("Organisation", event["organizer"]["name"]),
        ("Billet", f"{pricing['name']} · {pricing['amount']} € HT · {pricing['capacity']} places"),
        ("Langue", "Français"),
    )
    for label, value in facts:
        pdf.setFont("ArialBold", 9)
        pdf.setFillColor(NIGHT)
        pdf.drawString(MARGIN, y - 10, label.upper())
        paragraph(pdf, escape(value), MARGIN + 90, y, PAGE_W - 2 * MARGIN - 90, size=9, leading=12)
        y -= 26
    pdf.showPage()

    page_base(pdf, 2, year, site_host)
    y = title(pdf, "Deux parcours, une même journée.", PAGE_H - 91) - 8
    for track in tracks:
        accent = BLUE if track["accentColor"] == "blue" else ORANGE
        pdf.setFillColor(accent)
        pdf.rect(MARGIN, y - 94, 4, 94, fill=1, stroke=0)
        pdf.setFont("GaramondBold", 20)
        pdf.setFillColor(NIGHT)
        pdf.drawString(MARGIN + 15, y - 17, track["name"])
        paragraph(pdf, escape(track["description"]), MARGIN + 15, y - 29, PAGE_W - 2 * MARGIN - 25, size=10)
        y -= 112

    y -= 12
    y = heading(pdf, "Équipe organisatrice", MARGIN, y)
    paragraph(
        pdf,
        f"{len(team)} bénévoles de l’écosystème nantais organisent cette édition.",
        MARGIN, y, PAGE_W - 2 * MARGIN, size=10,
    )
    y -= 37
    col_width = (PAGE_W - 2 * MARGIN - 18) / 2
    for index, member in enumerate(team):
        col = index % 2
        row = index // 2
        x = MARGIN + col * (col_width + 18)
        top = y - row * 119
        pdf.setStrokeColor(colors.HexColor("#D9D2C9"))
        pdf.rect(x, top - 103, col_width, 103, fill=0, stroke=1)
        pdf.setFillColor(BLUE)
        pdf.rect(x, top - 3, col_width, 3, fill=1, stroke=0)
        pdf.setFillColor(NIGHT)
        pdf.setFont("GaramondBold", 16)
        pdf.drawString(x + 11, top - 25, member["name"])
        paragraph(pdf, escape(member["role"]), x + 11, top - 31, col_width - 22, size=8.5, leading=11, font="ArialBold")
        paragraph(pdf, escape(member["background"]), x + 11, top - 56, col_width - 22, size=8.5, leading=11)
    pdf.showPage()

    page_base(pdf, 3, year, site_host)
    y = title(pdf, "Ressources pour la presse.", PAGE_H - 91) - 5
    y = heading(pdf, "Dans ce kit", MARGIN, y)
    resources = (
        "Ce dossier PDF, le visuel officiel au format WEBP, le symbole vectoriel au format SVG "
        f"et les portraits des {len(team)} membres de l’équipe."
    )
    y = paragraph(pdf, escape(resources), MARGIN, y, PAGE_W - 2 * MARGIN) - 16
    pdf.setFillColor(INK)
    pdf.setFont("Arial", 9)
    credit = "Crédit du visuel officiel :"
    pdf.drawString(MARGIN, y - 8, credit)
    wordmark(pdf, MARGIN + pdfmetrics.stringWidth(credit, "Arial", 9) + 8, y - 8, 11, INK)
    y -= 30

    y = heading(pdf, "Identité visuelle", MARGIN, y)
    wordmark(pdf, MARGIN, y - 21, 31, INK)
    y -= 44
    y = paragraph(
        pdf,
        "Le nom visible est composé en EB Garamond, en capitales : GENAI en gras, DAYS en romain "
        "régulier et seules les lettres AI en italique. Conserver les proportions du symbole vectoriel "
        "et ne lui ajouter ni ombre ni contour.",
        MARGIN, y, PAGE_W - 2 * MARGIN,
    ) - 24

    y = heading(pdf, "Encres de marque", MARGIN, y)
    for label, swatch in (
        ("Bleu électrique", BLUE),
        ("Orange signal", ORANGE),
        ("Papier crème", CREAM),
        ("Encre charbon", INK),
    ):
        pdf.setFillColor(swatch)
        pdf.setStrokeColor(colors.HexColor("#D9D2C9"))
        pdf.rect(MARGIN, y - 10, 20, 15, fill=1, stroke=1)
        pdf.setFillColor(INK)
        pdf.setFont("Arial", 9)
        pdf.drawString(MARGIN + 31, y - 6, label)
        pdf.drawRightString(PAGE_W - MARGIN, y - 6, f"#{swatch.hexval()[2:].upper()}")
        y -= 26

    y -= 19
    y = heading(pdf, "Liens et contact", MARGIN, y)
    for label, url in (
        ("Site officiel", site),
        ("Programme", urljoin(site, "programme")),
        ("Billetterie", tickets),
        ("Contact presse", urljoin(site, "press-kit#contact-presse")),
    ):
        pdf.setFillColor(NIGHT)
        pdf.setFont("ArialBold", 9)
        pdf.drawString(MARGIN, y - 8, label)
        pdf.setFillColor(BLUE)
        pdf.setFont("Arial", 8.5)
        pdf.drawString(MARGIN + 104, y - 8, url)
        pdf.linkURL(url, (MARGIN + 104, y - 10, PAGE_W - MARGIN, y + 5), relative=0)
        y -= 28

    pdf.save()


def main() -> None:
    event = json.loads((ROOT / "src/content/event.json").read_text(encoding="utf-8"))
    pricing = json.loads((ROOT / "src/content/pricing.json").read_text(encoding="utf-8"))
    tracks = [frontmatter(path) for path in sorted((ROOT / "src/content/tracks").glob("*.md"))]
    tracks.sort(key=lambda item: item["accentColor"] != "blue")
    team = [frontmatter(path) for path in (ROOT / "src/content/team").glob("*.md")]
    team.sort(key=lambda item: item["order"])
    links = (ROOT / "src/lib/cta-links.ts").read_text(encoding="utf-8")
    tickets = re.search(r"tickets:\s*'([^']+)'", links)
    if tickets is None:
        raise ValueError("Ticket URL not found")

    KIT.mkdir(parents=True, exist_ok=True)
    portraits = KIT / "organisateurs"
    portraits.mkdir(exist_ok=True)
    source_names = {
        member["photo"].split("/")[-1].replace("-deck-optimized", "")
        for member in team
    }
    for stale in portraits.iterdir():
        if stale.is_file() and stale.name not in source_names:
            stale.unlink()
    for filename in source_names:
        shutil.copy2(PUBLIC / "organisateurs" / filename, portraits / filename)

    shutil.copy2(PUBLIC / event["image"], KIT / Path(event["image"]).name)
    shutil.copy2(PUBLIC / "logos/Gen AI Logo.svg", KIT / "Gen AI Logo.svg")
    with tempfile.TemporaryDirectory(prefix="genai-press-fonts-") as directory:
        register_fonts(Path(directory))
        render_pdf(event, pricing, tracks, team, tickets.group(1), Path(directory))
    shutil.copy2(PDF, KIT / "README.pdf")

    archive = PUBLIC / "press/genai-days-press-kit.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(KIT.rglob("*")):
            if path.is_file():
                bundle.write(path, Path("genai-days-press-kit") / path.relative_to(KIT))
    print(f"Built {archive} with {len(ZipFile(archive).namelist())} files")


if __name__ == "__main__":
    main()
