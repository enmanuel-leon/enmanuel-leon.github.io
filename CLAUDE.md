# Engineering Standards & Agent Instructions

See full internal standards, conventions, and verification workflows in:
[AGENTS.md](./AGENTS.md)

### Key Rules for Agents:
1. **SSOT Parity:** All content changes must be applied to `data/cv.es.json` and `data/cv.en.json`.
2. **Markdown Parity:** Sychronize corresponding Markdown files in `export/Enmanuel_Leon_CV_ES.md` and `export/Enmanuel_Leon_Resume_EN.md`.
3. **Mandatory PDF Rebuild:** Always run `python3 scripts/build-pdf.py` after editing CV content to keep PDFs synchronized and strictly within the 2-page budget.
4. **No Edits in `tmp/` Tracking:** Never stage or commit files from `tmp/` (`.gitignore`).

### Verification Commands:
```bash
# 1. Validate JavaScript syntax
node --check assets/js/app.js

# 2. Validate JSON structure & parity
node -e "const fs = require('fs'); const es = JSON.parse(fs.readFileSync('data/cv.es.json')); const en = JSON.parse(fs.readFileSync('data/cv.en.json')); console.log('Parity check:', Object.keys(es).sort().join(',') === Object.keys(en).sort().join(','));"

# 3. Compile and verify PDFs (strict 2 pages)
python3 scripts/build-pdf.py

# 4. Link security audit
node -e "const fs = require('fs'); const html = fs.readFileSync('index.html', 'utf8'); const unsafe = [...html.matchAll(/<a [^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/g)].filter(m => !m[0].includes('rel=') || !m[0].includes('noopener')); if (unsafe.length) console.error('Unsafe links found:', unsafe); else console.log('All external links safe.');"
```
