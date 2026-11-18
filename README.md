# enmanuel-leon.com

Static, pre-rendered CV and portfolio for **Enmanuel Leon**, Software Engineer (distributed systems and agentic AI). Hosted on GitHub Pages at [enmanuel-leon.com](https://enmanuel-leon.com/).

The site has **no runtime dependencies**: no framework, no bundler, no analytics, no third-party requests. JavaScript is progressive enhancement only.

## Stack

- **Content:** `data/cv.es.json` and `data/cv.en.json`
- **Templates:** `src/template.html`
- **Static build:** `scripts/build-site.mjs` → `index.html`, `es/index.html`, `sitemap.xml`, `llms.txt`, `site.webmanifest`
- **Runtime:** vanilla JavaScript (`assets/js/app.js`) + layered CSS (`assets/css/styles.css`)
- **Fonts:** self-hosted Geist Latin subsets (`assets/fonts/`)
- **Exports:** Markdown → ATS PDFs via `scripts/build-pdf.py`
- **Validation:** `scripts/validate.mjs`
- **CI:** `.github/workflows/verify.yml`

## Commands

```bash
npm run build        # regenerate the static pages and machine-readable files
npm run build:pdf    # rebuild the two ATS PDFs (strict 2-page budget)
npm run check        # full repository gate
npm run build:check  # verify generated files are committed and current
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
3. Run `npm run build`.
4. Update the matching Markdown exports in `export/`, keeping the `<!-- pdf:pagebreak -->` marker.
5. Run `npm run build:pdf` and `npm run check`.
6. Commit the JSON, generated pages, Markdown, and PDFs together.

Do not edit `index.html`, `es/index.html`, `sitemap.xml`, `llms.txt`, or `site.webmanifest` by hand: they are generated.

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
```

## Notes

- Browser baseline: evergreen 2024+ (Chrome/Edge 120+, Safari 17+, Firefox 120+), with readable fallbacks.
- The site ships English at `/` and Spanish at `/es/`, with reciprocal `hreflang` and canonicals.
- `img/Profile-pic.jpeg` is the source portrait; `profile-400/800` are the optimized WebP/JPEG derivatives used by the page.
- The PDF build fails if either export is not exactly 2 pages and checks the expected roles per page when `pdftotext` is available.
- Personal content and portrait are © Enmanuel Leon. The code is provided for reference; do not reuse the CV content or images as your own.
