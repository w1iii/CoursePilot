"""Package existing audit evidence and render template-based handoff; no network."""
from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from pathlib import Path
from urllib.parse import quote, urlsplit

import fitz
import markdown
from bs4 import BeautifulSoup, NavigableString
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.shared import Pt

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "coursepilot/docs"
EVIDENCE = DOCS / "audit-evidence"
OLD = ROOT / "docs"
TEMPLATE = ROOT / "CSP221A_Final_Technical_Documentation_Template.docx"
BASE = "https://github.com/w1iii/CoursePilot/blob/main/docs/"
RAG_SHA = "c50770126f4f6c6a3d6120c56bfa6d6b0b41d494"
WEB_SHA = "12a2855d40ca52b9dbc4631907898fa1a3b5fdc0"
NAME = "FINAL_TECHNICAL_HANDOFF_REVISED"
BREAK = '<div class="page-break"></div>'


def remote_for(path: Path, fragment: str = "") -> str:
    path = path.resolve()
    for folder, repo, revision in [
        (ROOT / "coursepilot", "CoursePilot", WEB_SHA),
        (ROOT / "rag/canvas-ai-assistant", "CoursePilot-RAG", RAG_SHA),
    ]:
        if path.is_relative_to(folder):
            relative = path.relative_to(folder).as_posix()
            rev = "main" if repo == "CoursePilot" and relative.startswith("docs/") else revision
            kind = "tree" if path.is_dir() else "blob"
            return f"https://github.com/w1iii/{repo}/{kind}/{rev}/{quote(relative)}" + fragment
    if path.is_relative_to(OLD):
        url = BASE + quote(path.relative_to(OLD).as_posix()) + fragment
        return url.replace("/blob/", "/tree/") if path.is_dir() else url
    raise ValueError(f"Unsupported evidence path: {path}")


def convert_links(text: str, original: Path) -> str:
    def change(match):
        label, target = match.groups()
        if "://" in target or target.startswith("#"):
            return match.group(0)
        location, marker, frag = target.partition("#")
        return f"[{label}]({remote_for(original.parent / location, '#' + frag if marker else '')})"
    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", change, text)


def package_evidence() -> None:
    inventory = []
    for source in sorted((OLD / "audit-evidence").iterdir()):
        if not source.is_file():
            continue
        dest = EVIDENCE / source.name
        if dest.exists():
            raise FileExistsError(f"Refusing to overwrite existing evidence {dest}")
        raw = source.read_bytes()
        dest.write_bytes(raw)
        inventory.append({"file": source.name, "source": str(source.relative_to(ROOT)),
                          "sha256": hashlib.sha256(raw).hexdigest()})
    for filename in ["SYSTEM_REVIEW.md", "FINAL_TECHNICAL_HANDOFF.md"]:
        source, dest = OLD / filename, DOCS / filename
        if dest.exists():
            raise FileExistsError(dest)
        text = convert_links(source.read_text(), source)
        notice = (
            "> **Repository evidence copy:** original audit records describe the "
            "pre-documentation source snapshot. README/docs additions are authorized "
            "later changes, not a claim of currently clean Git status. "
            "New `main/docs` links require publication; private RAG links require access.\n\n"
        )
        text = text.replace("\n\n", "\n\n" + notice, 1)
        if filename == "SYSTEM_REVIEW.md":
            text = text.replace(BASE + "FINAL_TECHNICAL_HANDOFF.md", BASE + NAME + ".md")
            text = text.replace(BASE + "FINAL_TECHNICAL_HANDOFF.pdf", BASE + NAME + ".pdf")
            text += (
                "\n## Revised submission and supplied schema evidence\n\n"
                f"[Revised template-based handoff]({BASE}{NAME}.md) · "
                f"[PDF]({BASE}{NAME}.pdf) · [Word]({BASE}{NAME}.docx).\n\n"
                f"[Owner-supplied schema/ERD context]({BASE}audit-evidence/SCHEMA_CONTEXT.md) "
                "is non-executable, not independently verified production metadata. "
                f"[AI security implementation]({BASE}audit-evidence/AI_SECURITY_IMPLEMENTATION.md) · "
                f"[Readable benchmark evidence]({BASE}audit-evidence/offline-stream-benchmark.md).\n"
            )
        dest.write_text(text)
    (EVIDENCE / "packaging-provenance.json").write_text(json.dumps({
        "purpose": "Copy existing audit records into web repository for publication",
        "original_records_immutable": True, "production_requeried": False,
        "historical_integrity_note": "final-integrity.json predates authorized README/docs edits",
        "publication_status": "Pending commit/merge/push; no publication performed",
        "files": inventory,
    }, indent=2) + "\n")


def add_inline(paragraph, node, bold=False, italic=False):
    if isinstance(node, NavigableString):
        run = paragraph.add_run(str(node))
        run.bold, run.italic = bold, italic
        return
    if node.name == "a":
        hyperlink = OxmlElement("w:hyperlink")
        hyperlink.set(qn("r:id"), paragraph.part.relate_to(node["href"], RT.HYPERLINK, is_external=True))
        run = OxmlElement("w:r")
        props = OxmlElement("w:rPr")
        style = OxmlElement("w:rStyle")
        style.set(qn("w:val"), "Hyperlink")
        props.append(style)
        size = OxmlElement("w:sz")
        size.set(qn("w:val"), "21")
        props.append(size)
        run.append(props)
        value = OxmlElement("w:t")
        value.text = node.get_text()
        run.append(value)
        hyperlink.append(run)
        paragraph._p.append(hyperlink)
        return
    if node.name == "br":
        paragraph.add_run().add_break()
        return
    for child in node.children:
        add_inline(paragraph, child, bold or node.name in ("strong", "b"),
                   italic or node.name in ("em", "i"))


def render() -> None:
    source = DOCS / f"{NAME}.md"
    chunks = source.read_text().split(BREAK)
    assert len(chunks) == 3
    template = Document(TEMPLATE)
    section = template.sections[0]
    width, height = section.page_width.pt, section.page_height.pt
    margins = [section.left_margin.pt, section.top_margin.pt,
               section.right_margin.pt, section.bottom_margin.pt]
    # Preserve supplied template package, section geometry, headers/footers/styles.
    # Rebuild body with its ten headings and table categories, removing placeholders.
    body = template._element.body
    for node in list(body):
        if node.tag != qn("w:sectPr"):
            body.remove(node)
    for style_name in ["Normal", "normal"]:
        try:
            style = template.styles[style_name]
        except KeyError:
            continue
        style.font.name, style.font.size = "Arial", Pt(10.5)
        style.paragraph_format.space_after = Pt(5)
    for name, size in [("Heading 1", 11), ("Title", 16)]:
        style = template.styles[name]
        style.font.name, style.font.size = "Arial", Pt(size)
        style.paragraph_format.keep_with_next = True
    pdf = fitz.open()
    pages = []
    css = """
    body { font-family: sans-serif; font-size: 10.5pt; line-height: 1.16; color: #172334; }
    h1 { font-size: 16pt; color: #163c51; margin: 0 0 7pt; }
    h2 { font-size: 11pt; color: #163c51; margin: 8pt 0 4pt; }
    p { margin: 0 0 5pt; }
    a { color: #075d80; text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; margin: 3pt 0 6pt; }
    th,td { padding: 3pt; border-bottom: 0.5pt solid #c9d3da; vertical-align: top; }
    th { background-color: #edf3f6; text-align: left; }
    code { font-family: monospace; font-size: 10pt; }
    """
    for index, text in enumerate(chunks):
        html = markdown.markdown(text, extensions=["tables"])
        soup = BeautifulSoup(html, "html.parser")
        if index:
            template.add_page_break()
        for element in soup.children:
            if isinstance(element, NavigableString):
                continue
            if element.name == "table":
                rows = element.find_all("tr")
                table = template.add_table(rows=0, cols=len(rows[0].find_all(["th", "td"])))
                table.autofit = False
                for row in rows:
                    cells = table.add_row().cells
                    for cell, data in zip(cells, row.find_all(["th", "td"])):
                        p = cell.paragraphs[0]
                        for child in data.children:
                            add_inline(p, child, bold=data.name == "th")
                continue
            p = template.add_paragraph(style="Heading 1" if element.name == "h2"
                                       else "Title" if element.name == "h1" else "normal")
            for child in element.children:
                add_inline(p, child)
        page = pdf.new_page(width=width, height=height)
        rect = fitz.Rect(margins[0], margins[1], width-margins[2], height-margins[3]-12)
        spare, scale = page.insert_htmlbox(rect, html, css=css, scale_low=1)
        if spare < 0:
            raise RuntimeError(f"Page {index+1} overflows: shorten content, no shrinking")
        page.insert_text((margins[0], height-25), f"COURSEPILOT | REVISED HANDOFF | {index+1}/3", fontsize=8)
        pages.append({"page": index+1, "scale": scale, "spare_height_pt": round(spare, 2)})
    template.core_properties.title = "CoursePilot — Final Technical Documentation (Revised)"
    template.core_properties.author = "Lui Franz Lomugdang"
    template.save(DOCS / f"{NAME}.docx")
    pdf.set_metadata({"title": template.core_properties.title, "author": "Lui Franz Lomugdang"})
    pdf.save(DOCS / f"{NAME}.pdf", garbage=4, deflate=True)
    report = {
        "template": TEMPLATE.name, "template_sha256": hashlib.sha256(TEMPLATE.read_bytes()).hexdigest(),
        "template_geometry_pt": {"width": width, "height": height, "margins_left_top_right_bottom": margins},
        "body_font_pt": 10.5, "ten_template_sections_retained": True, "pdf_pages": pages,
        "pdf_renderer": "Installed PyMuPDF HTML renderer; content-equivalent PDF, not Word layout engine",
        "docx_rendering_limit": "Word/LibreOffice page count not independently rendered; inspect DOCX in Word before submission",
        "new_github_links": "Pending publication, not verified live",
        "source": f"{NAME}.md",
    }
    (EVIDENCE / "revised-render.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    import sys
    if "--package" in sys.argv:
        package_evidence()
    render()
