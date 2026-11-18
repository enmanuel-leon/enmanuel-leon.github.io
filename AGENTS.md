# AGENTS.md — Internal Engineering Standards for AI Agents

> This document defines the content model, build pipeline, design-system rules, and verification gates for every AI agent working on this repository.

---

## 1. Project Overview & Architecture

This repository is a dependency-free static CV/portfolio hosted on GitHub Pages at `https://enmanuel-leon.com/`. It is pre-rendered at build time; JavaScript only enhances the page.

### Source of truth
- `data/cv.es.json` and `data/cv.en.json`: the content model. Every user-visible fact, label, date, link, and metric lives here. The two files must stay in deep key/array parity.
- `src/template.html`: the HTML shell with `{{placeholders}}`.
- `src/og-template.html`: source for `img/og-banner.png` (rendered separately at 1200×630).
- `scripts/build-site.mjs`: generates the public pages and machine-readable artifacts.
- `assets/js/app.js`: progressive enhancement only (theme, mobile menu, native dialog, copy email, scroll affordances). It must not fetch CV data or render content.
- `assets/css/styles.css`: layered, token-based CSS. No terminal, particles, accent themes, or retired card system.
- `assets/fonts/`: self-hosted Geist Latin subsets plus `OFL.txt`. Do not reintroduce Google Fonts.
- `scripts/build-pdf.py`: converts the Markdown exports to ATS PDFs with headless Chrome and fails if either PDF is not 2 pages.
- `scripts/validate.mjs`: the repository gate (content parity, generated HTML, links, assets, Markdown/PDF parity, PDF budget).
- `.github/workflows/verify.yml`: CI for the HTML/data gate and the PDF gate.
- `tmp/`: private workspace. It is gitignored; never stage or commit files from it.

### Generated artifacts (do not edit by hand)
- `index.html` (English, `/`)
- `es/index.html` (Spanish, `/es/`)
- `sitemap.xml`, `llms.txt`, `llms-full.txt`, `site.webmanifest`

Regenerate them with:
```bash
node scripts/build-site.mjs
```

### Hand-maintained exports
- `export/Enmanuel_Leon_CV_ES.md`
- `export/Enmanuel_Leon_Resume_EN.md`
- `export/Enmanuel_Leon_CV_ES.pdf`
- `export/Enmanuel_Leon_Resume_EN.pdf`

The Markdown files are the PDF sources. They must contain the `<!-- pdf:pagebreak -->` marker before the Interfell/ePayco role. The PDF build consumes that marker; the 2-page budget is non-negotiable.

---

## 2. Core Mandates

1. **Content changes follow one path:**
   - Update both `data/cv.es.json` and `data/cv.en.json`.
   - Update `meta.lastUpdated` (YYYY-MM-DD) in both files; this drives the sitemap and `llms.txt` date.
   - Run `node scripts/build-site.mjs`.
   - Update both Markdown exports to match the new facts, keeping the bold lead-ins and the page-break marker.
   - Run `python3 scripts/build-pdf.py`.
   - Run `node scripts/validate.mjs`.
   - Commit the generated HTML/XML/llms/manifest, the Markdown, and the PDFs together.

2. **Never edit generated files directly.** If `index.html`, `es/index.html`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, or `site.webmanifest` need a change, change the JSON, `src/template.html`, or the build script and rebuild.

3. **Official role title:** `Software Engineer | Distributed & Agentic Systems | TypeScript · Python · AWS/GCP` (EN) / `Software Engineer | Sistemas Distribuidos y Agénticos | TypeScript · Python · AWS/GCP` (ES). The employer title in the experience entry stays factual; do not silently promote it.

4. **Experience bullets follow a problem → architecture → outcome shape.** Lead with what was built, name the architecture and tradeoffs, and close with a directional outcome. Never use passive phrasing (`responsible for`, `worked on`, `helped`). Prefer concrete scope and architecture terms over unverified performance metrics.

5. **Skills are categorized chips, not percentage bars.** Do not reintroduce progress bars or arbitrary proficiency scores.

6. **No placeholders or ghost sections.** If a section has no verified public asset, do not render it. Do not invent projects, employers, dates, metrics, or testimonials.

7. **Language routes:** English lives at `/`, Spanish at `/es/`. Both pages need reciprocal `hreflang` (`es`, `en`, `x-default`), a self-referencing canonical, and a link-based language switch. Do not reintroduce client-side language state or a JSON fetch.

8. **Claims need a basis.** Before changing a metric, confirm its scope (median vs. peak, p50 vs. p95, measured vs. estimated). Performance and availability claims (`65%`, `<50ms`, `99.9%`) require a reproducible method; if it cannot be defended publicly, do not publish the number. Scope counts (`20+ screens`, `15+ API contracts`, `3 applications`) are acceptable when they are defensible.
9. **The impact section is architecture, not a metrics strip.** Keep the four engineering-focus cards (Async, M2M, Payments, Events) and the `seo.roleAliases`/`seo.keywords` fields used by JSON-LD and `llms.txt`. Do not reintroduce unverified performance numbers, percentage bars, or a numeric impact band.

---

## 3. Frontend & Styling Rules

1. **Design tokens and cascade layers:** colors, spacing, radii, shadows, and type live in `@layer tokens`. Use semantic tokens, not raw hex values, in components. Do not add `transition: all`.
2. **Native dialog:** the download picker is a native `<dialog>` opened with `showModal()`. Do not add a custom focus trap, `aria-hidden` overlay, `role="dialog"`, or body scroll lock. Style `::backdrop` and use `closedby="any"` as progressive enhancement.
3. **Z-index tiers:** sticky header `50`; mobile CTA `40`; back-to-top `30`; skip link `100`; dialogs use the native top layer. Do not add new arbitrary values.
4. **Mobile layout:** reserve space for the fixed CTA bar with `padding-block-end` on `body`; use `env(safe-area-inset-bottom, 0px)`; keep floating buttons above the bar. Use `100svh`/`100dvh`, not `100vh`.
5. **Accessibility:** one `<h1>` per page, `<header>`/`<nav>`/`<main>`/`<footer>` landmarks, skip link, named sections with `aria-labelledby`, `aria-current` on the active nav link, `aria-expanded` on the menu button, visible `:focus-visible` rings, 24×24 px minimum targets, 4.5:1 text contrast, and `prefers-reduced-motion` support.
6. **Security and link hygiene:** every external link opened in a new tab needs `rel="noopener noreferrer"`. No inline event handlers or inline style attributes. Escape text and attributes in the build script. Keep the theme bootstrap as the only inline script; it must remain small and `localStorage` access must be guarded.
7. **Performance:** self-hosted fonts only; responsive `profile-400/800` WebP/JPEG images; explicit image dimensions; no third-party runtime requests; no unthrottled scroll or pointer listeners. Use `requestAnimationFrame` and passive listeners when a scroll listener is unavoidable.
8. **Browser baseline:** evergreen 2024+ (Chrome/Edge 120+, Safari 17+, Firefox 120+). Use progressive enhancement for newer platform features; older engines must still receive readable, navigable content.

---

## 4. Verification Workflow

Run this before declaring a task complete:

```bash
# 1. Regenerate the static pages and machine-readable files
node scripts/build-site.mjs

# 2. Full repository gate (parity, links, assets, Markdown/PDF parity, PDF budget)
node scripts/validate.mjs

# 3. Compile the ATS PDFs (strict 2-page budget + per-page content assertions)
python3 scripts/build-pdf.py

# 4. JavaScript syntax
node --check assets/js/app.js

# 5. HTML validity
npx --yes html-validate@11.21.1 index.html es/index.html 404.html

# 6. Confirm private/tmp files are not tracked
git status
```

`node scripts/validate.mjs` runs the repository gate. `node scripts/build-site.mjs` regenerates the site. `python3 scripts/build-pdf.py` rebuilds the PDFs.

The validator checks, among other things:
- deep ES/EN key and array parity;
- title/description lengths;
- one `<h1>`, skip link, `<main>`, canonical, reciprocal `hreflang`, Person JSON-LD;
- no inline styles, obsolete head hints, third-party fonts, or retired UI;
- every local `href`/`src`/`srcset` target and in-page fragment;
- duplicate IDs and external-link `rel` hygiene;
- manifest icon files and their real dimensions; OG banner 1200×630;
- sitemap URLs/hreflang, `llms.txt` links, robots sitemap;
- Markdown parity for companies, roles, dates, and degree;
- PDF page count == 2 and human PDF titles;
- generated files are current (`build-site.mjs --check`).

---

## 5. Open Owner Decisions

Do not silently resolve these; flag them in the PR/plan:
- The performance and availability figures (`65%`, `<50ms`, `99.9%`, `28% p95`, `35% cold-start`, `−62%`, `~40%`) are not public. Do not reintroduce them without a reproducible method; keep the private interview framing in `tmp/claims-notes.md`. Defensible scope counts (`20+ screens`, `15+ API contracts`, `3 applications`) may remain.
- Whether a formal credential evaluation (CIMEA/ENIC-NARIC) exists for the UJAP degree. The public wording uses the official title, **Ingeniero en Computación** (program: Ingeniería en Computación), and does not claim automatic B.Sc. equivalence.
- The NDA client cannot be named; the role stays anonymized as a confidential fintech scale-up. Do not add identifying details.

---

## 6. Grammar & Language

- **Spanish:** avoid invented anglicisms (`Arquitecté` → `Diseñé la arquitectura`; `containerizando` → `empaquetando en contenedores`). Use `codiseñé` (no hyphen), `1,5 días`, `99,9%`, `2.000 documentos`.
- **English:** use established engineering action verbs (`Architected`, `Engineered`, `Orchestrated`, `Streamlined`, `Spearheaded`).
- Keep both language files in the same tone and tense.
