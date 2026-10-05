#!/usr/bin/env python3
import os
import re
import subprocess
import sys

CSS = """
@page {
  size: A4;
  margin: 12mm 14mm 12mm 14mm;
}
* {
  box-sizing: border-box;
}
body {
  font-family: 'Liberation Sans', Arial, Helvetica, sans-serif;
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
"""

TARGETS = [
    ("ES", "Enmanuel_Leon_CV_ES", "export/Enmanuel_Leon_CV_ES.md", "export/Enmanuel_Leon_CV_ES.pdf"),
    ("EN", "Enmanuel_Leon_Resume_EN", "export/Enmanuel_Leon_Resume_EN.md", "export/Enmanuel_Leon_Resume_EN.pdf"),
]

def build():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)
    os.chdir(root_dir)

    for lang, title, md_rel, pdf_rel in TARGETS:
        html_tmp = f"/tmp/{title}.html"
        pdf_out = os.path.join(root_dir, pdf_rel)

        print(f"Generating {pdf_rel} from {md_rel}...")
        subprocess.run(["pandoc", md_rel, "-s", "--metadata", f"title={title}", "-o", html_tmp], check=True)

        with open(html_tmp, "r", encoding="utf-8") as f:
            html = f.read()

        html = html.replace("</head>", f"<style>{CSS}</style></head>")

        match = re.search(r"(<h3 id=\"(?:interfell|fullstack-developer-interfell)[^\"]*\">)", html, re.IGNORECASE)
        if match:
            html = html.replace(match.group(1), f"<div class=\"page-break\"></div>\n{match.group(1)}")
        else:
            print(f"Warning: page-break target not found for {lang}")

        with open(html_tmp, "w", encoding="utf-8") as f:
            f.write(html)

        chrome_cmd = [
            "google-chrome",
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_out}",
            html_tmp,
        ]
        subprocess.run(chrome_cmd, check=True)

        with open(pdf_out, "rb") as f:
            pdf_bytes = f.read()
        pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf_bytes))
        print(f"✓ {pdf_rel}: {pages} pages, {len(pdf_bytes)} bytes")
        if pages != 2:
            print(f"ERROR: Expected 2 pages, got {pages}!", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    build()
