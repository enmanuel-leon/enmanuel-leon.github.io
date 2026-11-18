#!/usr/bin/env python3
"""Build the CV/Resume PDFs from the Markdown exports.

Contract:
- Both Markdown files must contain the ``<!-- pdf:pagebreak -->`` marker.
- Pandoc renders a standalone HTML file; headless Chrome prints it to A4 PDF.
- The build fails if either PDF is not exactly 2 pages.
- When ``pdftotext`` is available, it also asserts the expected roles per page.
"""

import base64
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CSS = """
@font-face {
  font-family: 'Geist';
  src: url(data:font/woff2;base64,__GEIST_FONT__) format('woff2');
  font-weight: 100 900;
  font-style: normal;
}
@page {
  size: A4;
  margin: 12mm 14mm 12mm 14mm;
}
* {
  box-sizing: border-box;
}
body {
  font-family: 'Geist', 'Liberation Sans', Arial, Helvetica, sans-serif;
  font-size: 8.8pt;
  line-height: 1.34;
  color: #111827;
  margin: 0;
  padding: 0;
  background: #ffffff;
}
h1 {
  font-size: 19.5pt;
  font-weight: 700;
  margin: 0 0 2pt 0;
  color: #111827;
  letter-spacing: -0.5px;
}
p {
  margin: 0 0 4pt 0;
}
hr {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 6pt 0;
}
h2 {
  font-size: 10.5pt;
  font-weight: 700;
  text-transform: uppercase;
  color: #111827;
  border-bottom: 1.5px solid #d1d5db;
  padding-bottom: 2pt;
  margin: 8pt 0 4pt 0;
  letter-spacing: 0.5px;
}
h3 {
  font-size: 9.6pt;
  font-weight: 700;
  color: #111827;
  margin: 6pt 0 1.5pt 0;
  page-break-after: avoid;
}
ul {
  margin: 0 0 4.5pt 0;
  padding-left: 14pt;
}
li {
  margin-bottom: 2.2pt;
}
em {
  color: #4b5563;
  font-size: 8.5pt;
  font-style: italic;
}
a {
  color: #1d4ed8;
  text-decoration: none;
}
strong {
  color: #111827;
}
.page-break {
  page-break-before: always;
  break-before: page;
}
#title-block-header {
  display: none;
}
"""

FONT_PATH = Path(__file__).resolve().parent.parent / "assets/fonts/geist-latin.woff2"
GEIST_FONT = base64.b64encode(FONT_PATH.read_bytes()).decode("ascii")
CSS = CSS.replace("__GEIST_FONT__", GEIST_FONT)

TARGETS = [
    {
        "name": "Enmanuel_Leon_CV_ES",
        "title": "Enmanuel Leon — CV (ES)",
        "lang": "es",
        "md": "export/Enmanuel_Leon_CV_ES.md",
        "pdf": "export/Enmanuel_Leon_CV_ES.pdf",
        "page1": ["Entropy Systems", "Fintech"],
        "page2": ["Interfell", "Intelix"],
    },
    {
        "name": "Enmanuel_Leon_Resume_EN",
        "title": "Enmanuel Leon — Resume (EN)",
        "lang": "en",
        "md": "export/Enmanuel_Leon_Resume_EN.md",
        "pdf": "export/Enmanuel_Leon_Resume_EN.pdf",
        "page1": ["Entropy Systems", "Fintech"],
        "page2": ["Interfell", "Intelix"],
    },
]

PAGE_BREAK_MARKER = "<!-- pdf:pagebreak -->"
PAGE_BREAK_HTML = '<div class="page-break"></div>'


def require_tool(name: str, hint: str) -> None:
    if shutil.which(name) is None:
        print(f"ERROR: '{name}' is required but was not found in PATH. {hint}", file=sys.stderr)
        sys.exit(1)


def pdf_page_count(pdf_path: str) -> int:
    """Prefer pdfinfo; fall back to the PDF object regex when unavailable."""
    if shutil.which("pdfinfo"):
        result = subprocess.run(
            ["pdfinfo", pdf_path], capture_output=True, text=True, check=True
        )
        match = re.search(r"^Pages:\s+(\d+)", result.stdout, re.MULTILINE)
        if match:
            return int(match.group(1))

    pdf_bytes = Path(pdf_path).read_bytes()
    return len(re.findall(rb"/Type\s*/Page[^s]", pdf_bytes))


def pdf_title(pdf_path: str) -> str | None:
    if shutil.which("pdfinfo") is None:
        return None
    result = subprocess.run(
        ["pdfinfo", pdf_path], capture_output=True, text=True, check=True
    )
    match = re.search(r"^Title:\s+(.+)$", result.stdout, re.MULTILINE)
    return match.group(1).strip() if match else None


def assert_page_text(pdf_path: str, page: int, needles: list[str]) -> None:
    if shutil.which("pdftotext") is None:
        return
    result = subprocess.run(
        ["pdftotext", "-f", str(page), "-l", str(page), "-layout", pdf_path, "-"],
        capture_output=True,
        text=True,
        check=True,
    )
    text = re.sub(r"\s+", " ", result.stdout)
    missing = [needle for needle in needles if needle not in text]
    if missing:
        print(
            f"ERROR: page {page} of {pdf_path} is missing {missing}. "
            "The PDF content split regressed.",
            file=sys.stderr,
        )
        sys.exit(1)


def build() -> None:
    require_tool("pandoc", "Install pandoc: https://pandoc.org/installing.html")
    chrome = (
        os.environ.get("CHROME_PATH")
        or shutil.which("google-chrome")
        or shutil.which("chromium")
        or shutil.which("chromium-browser")
    )
    if not chrome:
        print(
            "ERROR: Chrome/Chromium was not found. Set CHROME_PATH or install "
            "'google-chrome'.",
            file=sys.stderr,
        )
        sys.exit(1)

    root = Path(__file__).resolve().parent.parent
    os.chdir(root)

    for target in TARGETS:
        md_path = Path(target["md"])
        pdf_path = Path(target["pdf"])
        source = md_path.read_text(encoding="utf-8")

        if PAGE_BREAK_MARKER not in source:
            print(
                f"ERROR: {md_path} is missing {PAGE_BREAK_MARKER}. "
                "The 2-page PDF split cannot be guaranteed.",
                file=sys.stderr,
            )
            sys.exit(1)

        print(f"Generating {pdf_path} from {md_path}...")

        with tempfile.TemporaryDirectory(prefix="cv-pdf-") as temp_dir:
            temp = Path(temp_dir)
            prepared_md = temp / f"{target['name']}.md"
            prepared_md.write_text(
                source.replace(PAGE_BREAK_MARKER, PAGE_BREAK_HTML),
                encoding="utf-8",
            )
            html_tmp = temp / f"{target['name']}.html"

            subprocess.run(
                [
                    "pandoc",
                    str(prepared_md),
                    "-s",
                    "--metadata",
                    f"title={target['title']}",
                    "--metadata",
                    "author=Enmanuel Leon",
                    "--metadata",
                    f"lang={target['lang']}",
                    "-o",
                    str(html_tmp),
                ],
                check=True,
            )

            html = html_tmp.read_text(encoding="utf-8")
            html = html.replace("</head>", f"<style>{CSS}</style></head>")
            html_tmp.write_text(html, encoding="utf-8")

            subprocess.run(
                [
                    chrome,
                    "--headless",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--no-pdf-header-footer",
                    "--run-all-compositor-stages-before-draw",
                    f"--print-to-pdf={pdf_path}",
                    str(html_tmp),
                ],
                check=True,
            )

        pages = pdf_page_count(str(pdf_path))
        size = pdf_path.stat().st_size
        title = pdf_title(str(pdf_path))
        print(f"✓ {pdf_path}: {pages} pages, {size} bytes, title={title!r}")

        if pages != 2:
            print(f"ERROR: Expected 2 pages, got {pages}!", file=sys.stderr)
            sys.exit(1)

        assert_page_text(str(pdf_path), 1, target["page1"])
        assert_page_text(str(pdf_path), 2, target["page2"])


if __name__ == "__main__":
    build()
