# AGENTS.md — Internal Engineering Standards for AI Agents

> This document defines the engineering conventions, data-flow patterns, styling rules, and quality verification standards for all AI coding agents working on this repository.

---

## 1. Project Overview & Architecture

This repository is a high-performance, dependency-free static web portfolio and CV platform hosted on GitHub Pages (`https://enmanuel-leon.com/`).

### Directory Layout:
- `index.html`: Semantic entry point, OpenGraph metadata, JSON-LD Schema (`Person`), PWA links, `<noscript>` crawlable fallback.
- `data/cv.es.json` & `data/cv.en.json`: **Single Source of Truth (SSOT)**. All copy, work experience, skill taxonomies, and internationalization (i18n) strings live here.
- `export/`: Exportable formats (`Enmanuel_Leon_CV_ES.md`, `Enmanuel_Leon_Resume_EN.md`, `Enmanuel_Leon_CV_ES.pdf`, `Enmanuel_Leon_Resume_EN.pdf`).
- `assets/js/app.js`: Vanilla JavaScript (zero bundlers). Handles data hydration, theme switching, canvas particles, smooth scrolling, terminal emulator, and modal state management.
- `assets/css/styles.css`: Pure CSS3. Design tokens, glassmorphism, responsive breakpoints, print styles, and terminal theme palettes.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`: Machine discoverability, AI scrapers, and SEO.
- `scripts/`: Automation and build utilities (`scripts/build-pdf.py` for headless PDF generation).
- `tmp/`: Private workspace, playbooks, notes, and strategy documents. **Always ignored by git (`.gitignore`). Never stage or commit files from `tmp/`.**

---

## 2. Core Mandates for AI Agents

1. **Content Synchronization (SSOT):**
   - Whenever profile data, roles, dates, or skills change, **always update both `data/cv.es.json` and `data/cv.en.json`**.
   - Ensure corresponding Markdown files (`export/Enmanuel_Leon_CV_ES.md` and `export/Enmanuel_Leon_Resume_EN.md`) are updated to maintain exact parity.
   - Maintain JSON key parity between language files.
   - **Mandatory PDF Compilation:** Whenever profile data, roles, skills, or links change, **always recompile exportable PDFs** using:
     ```bash
     python3 scripts/build-pdf.py
     ```
     *Script Behavior & Contract:*
     - Converts Markdown files to standalone HTML using `pandoc`.
     - Injects ATS-optimized typography and A4 layout (`Liberation Sans`, 8.8pt body, 1.34 line-height, 12mm/14mm margins).
     - Injects an automated page break before the third role (*Interfell - ePayco*), guaranteeing that **Page 1** contains the contact header, professional summary, and high-impact recent roles (Entropy Systems, Fintech Scale-up), while **Page 2** contains previous roles (ePayco, Intelix), technical skills, education, and additional info.
     - Compiles to PDF via headless Google Chrome (`google-chrome --headless --no-pdf-header-footer --print-to-pdf`).
     - Strictly enforces the **2-page budget** (`pages == 2`), exiting with error code 1 if page count deviates.

2. **Grammar & Linguistic Precision:**
   - **Spanish:** Never invent anglicisms (e.g., do NOT use *"Arquitecté"*; use *"Diseñé la arquitectura de..."* or *"Estructuré..."*). Ensure proper conjugation (*"Garanticé"*, not *"Garantizé"*).
   - **English:** Use established engineering action verbs (*Architected, Engineered, Orchestrated, Streamlined, Spearheaded*).
   - **Official Role Title:** Always use `Senior Software Engineer | Distributed & Agentic Systems | TypeScript · Python · AWS/GCP` (EN) / `Senior Software Engineer | Sistemas Distribuidos & Agénticos | TypeScript · Python · AWS/GCP` (ES).

3. **Experience Bullet Formula (Google XYZ):**
   - Every bullet point must follow: *"Accomplished [X] measured by [Y] by doing [Z]"*.
   - Never use passive phrasing (*"responsible for"*, *"worked on"*, *"helped"*).
   - Metrics must be concrete (e.g., `p95 latency -38%`, `15,000+ ops/min`, `99.9% uptime`, `500,000+ monthly transactions`).

4. **Skill Categorization (No Percentage Bars):**
   - Skills must be categorized into functional chips (Backend, Databases, Queues/Async, Cloud, Frontend).
   - Never reintroduce arbitrary percentage progress bars.

5. **No Placeholders or Ghost Sections:**
   - Never display placeholder text ("Lorem ipsum", empty project cards).
   - If a section lacks verified public assets (e.g., open-source showcase projects), keep it commented out with an explicit `TODO` comment.

---

## 3. Frontend & Styling Rules

1. **Z-Index Hierarchy:**
   - Main navbar / sticky elements: `z-index: 100` to `1000`.
   - Mobile quick action bar (`.mobile-cta-bar`): `z-index: 10000`.
   - Floating utility buttons (`.back-to-top`, `.terminal-trigger`): `z-index: 9999`.
   - Modals and full-screen overlays (`.modal-overlay`, `.terminal-overlay`): `z-index: 20000+`.

2. **Mobile Layout & Safe Areas:**
   - Always position floating buttons safely above the mobile sticky action bar:
     ```css
     bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)) !important;
     ```
   - On screens `<= 768px`, reduce floating button sizes to `38px × 38px` to preserve screen real estate.

3. **Reactive Modal Behavior:**
   - When any modal or terminal overlay is active (`aria-hidden="false"`), floating buttons and mobile action bars must automatically hide (`opacity: 0; pointer-events: none;`) to prevent stacking clashes.
   - Both CSS `:has()` rules and JavaScript `MutationObserver` on `body.modal-open` are required for universal browser compatibility.

4. **Security & Link Hygiene:**
   - Every external link (`target="_blank"`) MUST include `rel="noopener noreferrer"`.
   - All interactive buttons must have accessible names (`aria-label` or visible text).

---

## 4. Verification Workflow for Agents

Before completing any task, run the following verification checks:

```bash
# 1. Validate JavaScript syntax
node --check assets/js/app.js

# 2. Validate JSON structure & parity
node -e "
const fs = require('fs');
const es = JSON.parse(fs.readFileSync('data/cv.es.json'));
const en = JSON.parse(fs.readFileSync('data/cv.en.json'));
console.log('Parity check:', Object.keys(es).sort().join(',') === Object.keys(en).sort().join(','));
"

# 3. Check for unescaped or unsafe external links
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const unsafe = [...html.matchAll(/<a [^>]*href=[\"'](https?:\/\/[^\"']+)[\"'][^>]*>/g)]
  .filter(m => !m[0].includes('rel=') || !m[0].includes('noopener'));
if (unsafe.length) console.error('Unsafe links found:', unsafe);
else console.log('All external links safe.');
"

# 4. Compile and verify exportable PDFs (strict 2-page budget check)
python3 scripts/build-pdf.py

# 5. Check git status to ensure private/tmp files are not tracked
git status
```
