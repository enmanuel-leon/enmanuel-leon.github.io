# enmanuel-leon.com

Static, pre-rendered CV and portfolio for **Enmanuel Leon**, Software Engineer (distributed systems and agentic AI). Deployed as a static site on Cloudflare Workers at [enmanuel-leon.com](https://enmanuel-leon.com/).

The site has **no runtime dependencies**: no framework, no bundler, no analytics, no third-party requests. JavaScript is progressive enhancement only.

## Stack

- **Content:** `data/cv.es.json` and `data/cv.en.json`
- **Templates:** `src/template.html`
- **Static build:** `scripts/build-site.mjs` → `index.html`, `es/index.html`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `site.webmanifest`
- **Runtime:** vanilla JavaScript (`assets/js/app.js`) + layered CSS (`assets/css/styles.css`)
- **Fonts:** self-hosted Geist Latin subsets (`assets/fonts/`)
- **Exports:** Markdown → ATS PDFs via `scripts/build-pdf.py`
- **Validation:** `scripts/validate.mjs`
- **CI:** `.github/workflows/verify.yml`

## Commands

```bash
node scripts/build-site.mjs          # regenerate the static pages and machine-readable files
python3 scripts/build-pdf.py         # rebuild the two ATS PDFs (strict 2-page budget)
node scripts/validate.mjs            # full repository gate
node scripts/build-site.mjs --check  # verify generated files are committed and current
```

Local preview:

```bash
python3 -m http.server 8099
# http://localhost:8099/      (English)
# http://localhost:8099/es/   (Spanish)
```

## Content changes

1. Edit both language files in `data/`. They must keep deep key/array parity.
2. Update `meta.lastUpdated` (YYYY-MM-DD) in both files; it drives the sitemap and `llms.txt` date.
3. Run `node scripts/build-site.mjs`.
4. Update the matching Markdown exports in `export/`, keeping the `<!-- pdf:pagebreak -->` marker.
5. Run `python3 scripts/build-pdf.py` and `node scripts/validate.mjs`.
6. Commit the JSON, generated pages, Markdown, and PDFs together.

Do not edit `index.html`, `es/index.html`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, or `site.webmanifest` by hand: they are generated.

Public copy avoids unverified performance and availability metrics. The impact section uses four architecture cards (Async, M2M, Payments, Events), while defensible scope counts (for example `20+ screens`, `15+ API contracts`, `3 applications`) can stay. JSON-LD adds `dateModified`, `hasOccupation`, and `hasCredential`; `llms.txt` carries role aliases, architecture keywords, and a preferred citation.

## Structure

```
data/                 ES/EN content model
src/template.html     HTML shell
src/og-template.html  source for the 1200×630 social image
scripts/              site builder, PDF builder, validator
assets/css/           design tokens + layered CSS
assets/js/            progressive enhancement
assets/fonts/         self-hosted Geist + OFL license
img/                  portrait variants, icons, OG banner
export/               Markdown + ATS PDFs
es/                   generated Spanish page
404.html              static not-found page
llms.txt              LLM-oriented summary + keywords + citation
llms-full.txt         generated full English resume for LLMs
```

## Notes

- Browser baseline: evergreen 2024+ (Chrome/Edge 120+, Safari 17+, Firefox 120+), with readable fallbacks.
- The site ships English at `/` and Spanish at `/es/`, with reciprocal `hreflang` and canonicals.
- `img/Profile-pic.jpeg` is the source portrait; `profile-400/800` are the optimized WebP/JPEG derivatives used by the page.
- The PDF build fails if either export is not exactly 2 pages and checks the expected roles per page when `pdftotext` is available.
- Personal content and portrait are © Enmanuel Leon. The code is provided for reference; do not reuse the CV content or images as your own.
