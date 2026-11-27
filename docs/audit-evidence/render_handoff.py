"""Render local handoff with installed PyMuPDF/Markdown; no network or installs."""
from __future__ import annotations

import json
import re
from pathlib import Path

import fitz
import markdown

DOCS = Path(__file__).resolve().parents[1]
SOURCE = DOCS / "FINAL_TECHNICAL_HANDOFF.md"
OUTPUT = DOCS / "FINAL_TECHNICAL_HANDOFF.pdf"
CSS = """
body { font-family: sans-serif; font-size: 10.5pt; line-height: 1.16; color: #172334; }
h1 { font-size: 19pt; line-height: 1.1; color: #163c51; margin: 0 0 9pt; }
h2 { font-size: 12.5pt; color: #163c51; margin: 10pt 0 5pt; }
p { margin: 0 0 6pt; }
a { color: #075d80; text-decoration: underline; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 7pt; }
th, td { padding: 4pt; border-bottom: 0.5pt solid #c9d3da; vertical-align: top; }
th { background-color: #edf3f6; text-align: left; }
code { font-family: monospace; font-size: 10pt; }
"""


def main() -> None:
    sections = SOURCE.read_text().split('<div class="page-break"></div>')
    assert len(sections) == 3
    document = fitz.open()
    report = {"renderer": "PyMuPDF", "renderer_version": fitz.VersionBind,
              "paper": "A4", "body_font_pt": 10.5, "pages": []}
    for number, text in enumerate(sections, 1):
        html = markdown.markdown(text, extensions=["tables"])
        # PDF local-file actions cannot reliably target Markdown heading fragments.
        # Keep companion-file links usable rather than encoding "#heading" as filename.
        html = re.sub(r'href="([^":]+\.md)#[^"]*"', r'href="\1"', html)
        page = document.new_page(width=595.276, height=841.89)
        rect = fitz.Rect(40, 35, 555.276, 801)
        spare, scale = page.insert_htmlbox(rect, html, css=CSS, scale_low=1)
        if spare < 0:
            raise RuntimeError(f"Page {number} overflows at 10.5pt; shorten content.")
        assert scale == 1, "Body text must never be shrunk"
        page.draw_line((40, 811), (555.276, 811), color=(0.75, 0.8, 0.84))
        page.insert_text((40, 824), "COURSEPILOT  |  27 NOV 2026  |  EVIDENCE-QUALIFIED HANDOFF",
                         fontsize=8, color=(0.3, 0.38, 0.44))
        page.insert_text((520, 824), f"{number} / 3", fontsize=8)
        report["pages"].append({"page": number, "remaining_height_pt": round(spare, 2),
                                "scale": scale})
    document.set_metadata({"title": "CoursePilot — Final Technical Documentation",
                           "author": "Lui Franz Lomugdang",
                           "subject": "Evidence-qualified technical handoff, 27 November 2026"})
    document.save(OUTPUT, garbage=4, deflate=True)
    document.close()
    check = fitz.open(OUTPUT)
    report["page_count"] = len(check)
    report["link_count"] = sum(len(page.get_links()) for page in check)
    report["external_https_links"] = sum(
        link.get("uri", "").startswith("https://")
        for page in check for link in page.get_links()
    )
    report["text_present_each_page"] = [len(page.get_text().strip()) > 100 for page in check]
    report["page_body_font_sizes"] = []
    for page in check:
        sizes = sorted({round(span["size"], 2)
                        for block in page.get_text("dict")["blocks"] if "lines" in block
                        for line in block["lines"] for span in line["spans"]
                        if span["bbox"][1] < 801})
        report["page_body_font_sizes"].append(sizes)
    (DOCS / "audit-evidence" / "pdf-render.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
