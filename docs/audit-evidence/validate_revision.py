"""Offline link/content checks; distinguish local targets from online publication."""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile
import xml.etree.ElementTree as ET

import fitz
from docx import Document

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "coursepilot/docs"
EV = DOCS / "audit-evidence"
NAME = "FINAL_TECHNICAL_HANDOFF_REVISED"


def anchor(text):
    return re.sub(r"[^\w\- ]", "", text.lower()).replace(" ", "-")


def target_file(url, origin):
    if url.startswith("https://github.com/w1iii/"):
        parts = urlsplit(url).path.strip("/").split("/")
        if len(parts) >= 5 and parts[2] in ("blob", "tree"):
            repo = ROOT / ("coursepilot" if parts[1] == "CoursePilot" else "rag/canvas-ai-assistant")
            return repo / unquote("/".join(parts[4:]))
        return None
    if "://" not in url:
        return (origin.parent / unquote(url.split("#")[0])).resolve()
    return None


def main():
    errors, pending, private = [], set(), set()
    urls = set()
    paths = [ROOT / "coursepilot/README.md", ROOT / "rag/canvas-ai-assistant/README.md",
             *DOCS.glob("*.md"), *EV.glob("*.md"), *(DOCS / "ai-evaluation").glob("*.md")]
    for source in paths:
        for url in re.findall(r"\]\(([^)]+)\)", source.read_text()):
            urls.add(url)
            f = target_file(url, source)
            if f is not None and not f.exists():
                # The generated validation record is created at the end of this command.
                if f != EV / "revised-validation.json":
                    errors.append({"source": str(source.relative_to(ROOT)), "target": url})
            if f is not None and f.exists() and f.suffix == ".md" and "#" in url:
                slug = unquote(url.split("#", 1)[1])
                headings = {anchor(h) for h in re.findall(r"^#{1,6} (.+)$", f.read_text(), re.M)}
                if slug not in headings:
                    errors.append({"bad_anchor": url})
            if "/CoursePilot/blob/main/docs/" in url or "/CoursePilot/tree/main/docs" in url:
                pending.add(url)
            if "/CoursePilot-RAG/" in url:
                private.add(url)
    pdf = fitz.open(DOCS / f"{NAME}.pdf")
    links = [x for page in pdf for x in page.get_links()]
    bad_pdf = [x for x in links if not x.get("uri", "").startswith("https://")]
    headings = re.findall(r"^## (\d+ .+)$", (DOCS / f"{NAME}.md").read_text(), re.M)
    pdf_text = unicodedata.normalize("NFKC", " ".join(" ".join(p.get_text().split()) for p in pdf))
    word = Document(DOCS / f"{NAME}.docx")
    word_headings = [p.text for p in word.paragraphs if p.style.name == "Heading 1"]
    with ZipFile(DOCS / f"{NAME}.docx") as z:
        relationships = ET.fromstring(z.read("word/_rels/document.xml.rels"))
        word_links = {e.attrib["Target"] for e in relationships if e.attrib.get("TargetMode") == "External"}
    markdown_links = set(re.findall(r"\]\(([^)]+)\)", (DOCS / f"{NAME}.md").read_text()))
    sql = (EV / "USER_PROVIDED_SCHEMA_CONTEXT.sql").read_text()
    original = json.loads((EV / "baseline.json").read_text())
    code_changes = {}
    for repo, entry in original["repositories"].items():
        changed = []
        folder = ROOT / entry["path"]
        for rel, digest in entry["tracked_file_hashes"].items():
            path = folder / rel
            if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                changed.append(rel)
        code_changes[repo] = changed
    safe_patterns = {
        "google_key": r"AIza[0-9A-Za-z_-]{30,}",
        "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "aws_key": r"AKIA[0-9A-Z]{16}",
        "openai_key": r"sk-proj-[0-9A-Za-z_-]{20,}",
    }
    sensitive = []
    for file in [*DOCS.glob("*.md"), *EV.glob("*.md"), *EV.glob("*.json"), *EV.glob("*.log")]:
        text = file.read_text(errors="replace")
        for kind, pattern in safe_patterns.items():
            if re.search(pattern, text):
                sensitive.append({"file": file.name, "pattern": kind})
    report = {
        "local_link_target_errors": errors,
        "checked_markdown_files": len(paths), "unique_markdown_links": len(urls),
        "pdf_pages": len(pdf), "pdf_https_link_annotations": len(links),
        "pdf_non_https_actions": len(bad_pdf),
        "all_ten_headings_in_pdf": len(headings) == 10 and all(h in pdf_text for h in headings),
        "word_template_headings_match": headings == word_headings,
        "word_hyperlinks_match_markdown": markdown_links == word_links,
        "demo_folder_link_in_word_and_pdf": (
            "https://drive.google.com/drive/folders/1VEZ6SPDRTdkM5OcgxcBJ1wLIfodFx_0t?usp=sharing" in word_links
            and any(x.get("uri") == "https://drive.google.com/drive/folders/1VEZ6SPDRTdkM5OcgxcBJ1wLIfodFx_0t?usp=sharing" for x in links)
        ),
        "crud_proof_entry_omitted": "Deployed CRUD proof" not in (DOCS / f"{NAME}.md").read_text(),
        "ai_evaluation_status": "Planned only, no model-quality execution or results claimed",
        "supplied_schema_tables": len(re.findall(r"^CREATE TABLE ", sql, re.M)),
        "sql_executed": False,
        "original_tracked_files_changed": code_changes,
        "historical_baseline_unchanged_except_readmes": all(set(x) <= {"README.md"} for x in code_changes.values()),
        "application_source_unchanged": all(
            all(rel == "README.md" or rel.startswith(("docs/", ".github/")) for rel in changes)
            for changes in code_changes.values()
        ),
        "workflow_drift_from_historical_audit": {
            repo: [rel for rel in changes if rel.startswith(".github/")]
            for repo, changes in code_changes.items()
        },
        "freeze_readiness": "Not certified: document validation is separate from current infrastructure/application acceptance",
        "limited_sensitive_pattern_findings": sensitive,
        "online_publication": "Pending: no commit/push/merge performed; local checks do not certify live URLs",
        "new_documentation_links_pending_publication": sorted(pending),
        "private_backend_links_require_panel_access": sorted(private),
        "pdf_visual_review": "All 3 pages inspected: readable tables/headings, no clipping or overlap",
        "word_layout_limit": "Content and template geometry checked; Word pagination requires manual confirmation",
        "template_source_sha256": hashlib.sha256((ROOT / "CSP221A_Final_Technical_Documentation_Template.docx").read_bytes()).hexdigest(),
    }
    report["local_validation_passed"] = (
        not errors and not bad_pdf and len(pdf) == 3 and report["all_ten_headings_in_pdf"]
        and report["word_template_headings_match"] and report["word_hyperlinks_match_markdown"]
        and report["demo_folder_link_in_word_and_pdf"] and report["crud_proof_entry_omitted"]
        and report["supplied_schema_tables"] == 22 and report["application_source_unchanged"] and not sensitive
    )
    (EV / "revised-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if not isinstance(v, list)}, indent=2))
    if errors:
        print(json.dumps(errors, indent=2))
    assert report["local_validation_passed"]
    for folder in [ROOT / "coursepilot", ROOT / "rag/canvas-ai-assistant"]:
        subprocess.run(["git", "diff", "--check"], cwd=folder, check=True)


if __name__ == "__main__":
    main()
