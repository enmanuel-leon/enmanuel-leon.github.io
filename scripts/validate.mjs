#!/usr/bin/env node
/**
 * Repository validation. No dependencies.
 *
 * Checks content parity, generated HTML, metadata, links, assets, Markdown/PDF
 * parity and the absence of the retired UI subsystems. Run with:
 *
 *   node scripts/validate.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://enmanuel-leon.com";
const LANGS = ["es", "en"];

let passed = 0;
let failed = 0;

function ok(message) {
  passed += 1;
  console.log(`✓ ${message}`);
}

function fail(message) {
  failed += 1;
  console.error(`✗ ${message}`);
}

function check(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

function hasCommand(name) {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

async function readText(relative) {
  return readFile(path.join(ROOT, relative), "utf8");
}

async function readJson(relative) {
  return JSON.parse(await readText(relative));
}

function get(object, dotted) {
  return dotted.split(".").reduce((value, key) => value?.[key], object);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function deepParity(left, right, prefix = "") {
  const errors = [];

  if (typeof left !== typeof right) {
    errors.push(`${prefix || "<root>"}: type ${typeof left} != ${typeof right}`);
    return errors;
  }

  if (Array.isArray(left)) {
    if (!Array.isArray(right)) {
      errors.push(`${prefix}: array != object`);
      return errors;
    }
    if (left.length !== right.length) {
      errors.push(`${prefix}: length ${left.length} != ${right.length}`);
    }
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      errors.push(...deepParity(left[index], right[index], `${prefix}[${index}]`));
    }
    return errors;
  }

  if (left && typeof left === "object") {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    const missing = leftKeys.filter((key) => !rightKeys.includes(key));
    const extra = rightKeys.filter((key) => !leftKeys.includes(key));
    if (missing.length) errors.push(`${prefix}: missing keys ${missing.join(", ")}`);
    if (extra.length) errors.push(`${prefix}: extra keys ${extra.join(", ")}`);
    for (const key of leftKeys.filter((key) => rightKeys.includes(key))) {
      errors.push(...deepParity(left[key], right[key], `${prefix}.${key}`));
    }
  }

  return errors;
}

function pngSize(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function resolveLocal(pageFile, rawValue) {
  const href = rawValue.split("#")[0].split("?")[0].trim();
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(href)) return null;

  const base = href.startsWith("/")
    ? ROOT
    : path.dirname(path.join(ROOT, pageFile));
  const resolved = path.resolve(base, href.replace(/^\/+/, ""));

  if (href.endsWith("/") || !path.extname(resolved)) {
    const indexFile = path.join(resolved, "index.html");
    if (existsSync(indexFile)) return indexFile;
  }

  return resolved;
}

async function checkData() {
  const [es, en] = await Promise.all([
    readJson("data/cv.es.json"),
    readJson("data/cv.en.json"),
  ]);

  const parity = deepParity(es, en);
  check(parity.length === 0, "ES/EN content model has deep key and array parity");
  parity.slice(0, 10).forEach((error) => console.error(`    ${error}`));

  for (const [lang, data] of [
    ["es", es],
    ["en", en],
  ]) {
    const title = get(data, "meta.title");
    const description = get(data, "meta.description");
    const lastUpdated = get(data, "meta.lastUpdated");
    check(
      typeof title === "string" && title.length > 15 && title.length <= 70,
      `${lang}: meta.title is ${title?.length ?? 0} chars (15–70)`,
    );
    check(
      typeof description === "string" &&
        description.length >= 120 &&
        description.length <= 160,
      `${lang}: meta.description is ${description?.length ?? 0} chars (120–160)`,
    );
    check(
      typeof lastUpdated === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lastUpdated),
      `${lang}: meta.lastUpdated is a YYYY-MM-DD date`,
    );

    for (const key of [
      "profile.name",
      "profile.role",
      "profile.specialty",
      "profile.stackLine",
      "profile.location",
      "profile.availability",
      "profile.citizenship",
      "profile.workMode",
      "profile.languages",
      "hero.statement",
      "impact.title",
      "experience.title",
      "skills.title",
      "education.title",
      "contact.title",
      "footer",
    ]) {
      const value = get(data, key);
      check(
        typeof value === "string" && value.trim().length > 0,
        `${lang}: ${key} is present`,
      );
    }

    check(
      Array.isArray(data.impact.items) && data.impact.items.length === 4,
      `${lang}: 4 impact metrics`,
    );
    check(
      Array.isArray(data.experience.items) && data.experience.items.length >= 4,
      `${lang}: at least 4 experience entries`,
    );
    check(
      Array.isArray(data.skills.categories) &&
        data.skills.categories.length >= 6,
      `${lang}: at least 6 skill categories`,
    );
    check(
      Array.isArray(data.contact.items) && data.contact.items.length >= 3,
      `${lang}: at least 3 contact channels`,
    );
    check(
      data.nav.items.every((item) => item.id && item.label),
      `${lang}: every nav item has id and label`,
    );
    check(
      data.experience.items.every(
        (job) =>
          job.role &&
          job.company &&
          job.period &&
          Array.isArray(job.bullets) &&
          job.bullets.length > 0,
      ),
      `${lang}: every experience entry is complete`,
    );
  }
}

async function checkGeneratedPage(relative, lang) {
  const html = await readText(relative);
  const data = await readJson(`data/cv.${lang}.json`);

  check(html.includes(`<html lang="${lang}"`), `${relative}: html lang is ${lang}`);
  check(
    (html.match(/<h1\b/gi) || []).length === 1,
    `${relative}: exactly one h1`,
  );
  check(/<main\b[^>]*id="main"/.test(html), `${relative}: main landmark`);
  check(/class="skip-link"/.test(html), `${relative}: skip link`);
  check(
    html.includes(`<title>${escapeHtml(data.meta.title)}</title>`),
    `${relative}: title matches the content model`,
  );
  check(
    html.includes(`name="description" content="${escapeHtml(data.meta.description)}"`),
    `${relative}: description matches the content model`,
  );
  check(
    html.includes(`<link rel="canonical" href="${lang === "es" ? `${SITE}/es/` : `${SITE}/`}">`),
    `${relative}: canonical URL`,
  );
  check(html.includes('hreflang="es"'), `${relative}: hreflang es`);
  check(html.includes('hreflang="en"'), `${relative}: hreflang en`);
  check(html.includes('hreflang="x-default"'), `${relative}: hreflang x-default`);
  check(
    /application\/ld\+json/.test(html) && html.includes('"@type":"Person"'),
    `${relative}: Person JSON-LD`,
  );
  check(
    !/name="keywords"|rel="author"|rel="sitemap"/.test(html),
    `${relative}: obsolete head hints removed`,
  );
  check(!/fonts\.googleapis|fonts\.gstatic/.test(html), `${relative}: no third-party fonts`);
  check(!/elevation|projectsGrid|particles-canvas|terminalOverlay|accent-dot/.test(html), `${relative}: retired UI absent`);
  check(!/style="/.test(html), `${relative}: no inline style attributes`);

  for (const item of data.nav.items) {
    check(
      html.includes(`id="${item.id}"`),
      `${relative}: nav target #${item.id} exists`,
    );
  }

  for (const job of data.experience.items) {
    check(
      html.includes(job.company) && html.includes(job.period),
      `${relative}: ${job.company} and its dates are rendered`,
    );
  }

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  check(duplicates.length === 0, `${relative}: no duplicate ids`);
  if (duplicates.length) console.error(`    duplicates: ${[...new Set(duplicates)].join(", ")}`);

  const externalAnchors = [
    ...html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g),
  ].map((match) => match[0]);
  const unsafe = externalAnchors.filter(
    (tag) => !/rel="[^"]*noopener/.test(tag) || !/rel="[^"]*noreferrer"/.test(tag),
  );
  check(
    unsafe.length === 0,
    `${relative}: all ${externalAnchors.length} external links have rel=noopener noreferrer`,
  );
  unsafe.slice(0, 5).forEach((tag) => console.error(`    ${tag}`));

  const tags = [
    ...html.matchAll(/<(a|link|img|source|script)\b[^>]*>/gi),
  ].map((match) => match[0]);
  const missing = [];

  for (const tag of tags) {
    for (const attribute of ["href", "src"]) {
      const match = tag.match(new RegExp(`${attribute}="([^"]+)"`));
      if (!match) continue;
      const target = resolveLocal(relative, match[1]);
      if (target && !existsSync(target)) missing.push(`${match[1]} (${attribute})`);
    }

    const srcset = tag.match(/srcset="([^"]+)"/);
    if (srcset) {
      for (const candidate of srcset[1].split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        const target = resolveLocal(relative, url);
        if (target && !existsSync(target)) missing.push(`${url} (srcset)`);
      }
    }
  }

  check(
    missing.length === 0,
    `${relative}: all local href/src/srcset targets exist`,
  );
  [...new Set(missing)].slice(0, 10).forEach((item) => console.error(`    missing: ${item}`));

  const fragmentLinks = [
    ...html.matchAll(/<a\b[^>]*href="([^"]*#[^"]+)"[^>]*>/g),
  ];
  const brokenFragments = [];
  for (const match of fragmentLinks) {
    const raw = match[1];
    const [pathPart, fragment] = raw.split("#");
    if (!fragment) continue;
    let targetHtml = html;
    if (pathPart) {
      const targetPath = resolveLocal(relative, pathPart);
      if (!targetPath || !existsSync(targetPath)) continue;
      targetHtml = await readFile(targetPath, "utf8");
    }
    if (!targetHtml.includes(`id="${fragment}"`)) brokenFragments.push(raw);
  }
  check(
    brokenFragments.length === 0,
    `${relative}: all in-page fragment links resolve`,
  );
  [...new Set(brokenFragments)].slice(0, 5).forEach((item) => console.error(`    broken: ${item}`));
}

async function checkAssetsAndMarkdown() {
  const required = [
    "404.html",
    "assets/css/styles.css",
    "assets/js/app.js",
    "assets/fonts/geist-latin.woff2",
    "assets/fonts/geist-mono-latin.woff2",
    "assets/fonts/OFL.txt",
    "img/profile-400.jpg",
    "img/profile-400.webp",
    "img/profile-800.jpg",
    "img/profile-800.webp",
    "img/og-banner.png",
    "img/icon-192.png",
    "img/icon-512.png",
    "img/icon-maskable-512.png",
    "img/apple-touch-icon.png",
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "site.webmanifest",
    "export/Enmanuel_Leon_CV_ES.md",
    "export/Enmanuel_Leon_Resume_EN.md",
    "export/Enmanuel_Leon_CV_ES.pdf",
    "export/Enmanuel_Leon_Resume_EN.pdf",
  ];

  for (const relative of required) {
    check(existsSync(path.join(ROOT, relative)), `${relative} exists`);
  }

  const notFound = await readText("404.html");
  check(/name="robots"[^>]*noindex/.test(notFound), "404.html: noindex");
  check(notFound.includes('href="/"'), "404.html: recovery link to the home page");

  const css = await readText("assets/css/styles.css");
  check(!/transition:\s*all/.test(css), "CSS has no transition: all");
  check(/prefers-reduced-motion/.test(css), "CSS respects prefers-reduced-motion");
  check(/@layer\s+reset,\s*tokens/.test(css), "CSS uses cascade layers");
  check(/--text-muted/.test(css), "CSS exposes a semantic text-muted token");

  const js = await readText("assets/js/app.js");
  check(!/\bfetch\s*\(/.test(js), "app.js performs no content fetch");
  check(!/innerHTML/.test(js), "app.js avoids innerHTML");
  check(!/mousemove/.test(js), "app.js has no pointer-spotlight listener");
  check(!/no-store/.test(js), "app.js does not disable caching");
  check(!/__typingTimer|cv-lang/.test(js), "app.js has no retired typing/lang state");

  check(
    !existsSync(path.join(ROOT, "assets/js/terminal.js")),
    "retired terminal module is removed",
  );

  const manifest = await readJson("site.webmanifest");
  check(manifest.id === "/" && manifest.scope === "/", "manifest id and scope");
  check(manifest.lang === "en" && manifest.dir === "ltr", "manifest language and direction");
  check(
    typeof manifest.theme_color === "string" &&
      typeof manifest.background_color === "string",
    "manifest has theme and background colors",
  );
  check(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "manifest has 3+ icons");

  for (const icon of manifest.icons ?? []) {
    const file = path.join(ROOT, icon.src.replace(/^\//, ""));
    check(existsSync(file), `manifest icon ${icon.src} exists`);
    if (!existsSync(file)) continue;
    const buffer = await readFile(file);
    const size = pngSize(buffer);
    check(
      Boolean(size) && `${size.width}x${size.height}` === icon.sizes,
      `manifest icon ${icon.src} is ${icon.sizes}`,
    );
  }

  const og = await readFile(path.join(ROOT, "img/og-banner.png"));
  const ogSize = pngSize(og);
  check(
    Boolean(ogSize) && ogSize.width === 1200 && ogSize.height === 630,
    "OG banner is 1200×630",
  );

  const sitemap = await readText("sitemap.xml");
  check(/<urlset\b/.test(sitemap), "sitemap has urlset");
  check(sitemap.includes(`<loc>${SITE}/</loc>`), "sitemap includes the EN home");
  check(sitemap.includes(`<loc>${SITE}/es/</loc>`), "sitemap includes the ES home");
  check(
    sitemap.includes('hreflang="es"') &&
      sitemap.includes('hreflang="en"') &&
      sitemap.includes('hreflang="x-default"'),
    "sitemap has reciprocal hreflang",
  );
  check(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap), "sitemap has a valid lastmod");
  const enData = await readJson("data/cv.en.json");
  check(
    sitemap.includes(`<lastmod>${enData.meta.lastUpdated}</lastmod>`),
    "sitemap lastmod matches meta.lastUpdated",
  );

  const robots = await readText("robots.txt");
  check(
    robots.includes(`Sitemap: ${SITE}/sitemap.xml`),
    "robots.txt points at the sitemap",
  );

  const llms = await readText("llms.txt");
  check(llms.includes("Enmanuel Leon"), "llms.txt names the owner");
  check(llms.includes(`Portfolio (EN): ${SITE}/`), "llms.txt links the English home");
  check(llms.includes(`Portfolio (ES): ${SITE}/es/`), "llms.txt links the Spanish home");
  check(
    llms.includes("/export/Enmanuel_Leon_Resume_EN.pdf"),
    "llms.txt links the English resume",
  );
  check(
    llms.includes("/export/Enmanuel_Leon_CV_ES.pdf"),
    "llms.txt links the Spanish CV",
  );
  check(
    llms.includes(`Last updated: ${enData.meta.lastUpdated}`),
    "llms.txt last-updated date matches meta.lastUpdated",
  );

  for (const lang of LANGS) {
    const data = await readJson(`data/cv.${lang}.json`);
    const mdPath = `export/${lang === "es" ? "Enmanuel_Leon_CV_ES" : "Enmanuel_Leon_Resume_EN"}.md`;
    const md = await readText(mdPath);
    check(md.includes("<!-- pdf:pagebreak -->"), `${mdPath}: page-break marker`);
    for (const job of data.experience.items) {
      check(md.includes(job.company), `${mdPath}: company "${job.company}"`);
      check(md.includes(job.period), `${mdPath}: period "${job.period}"`);
      check(md.includes(job.role), `${mdPath}: role "${job.role}"`);
    }
    check(
      md.includes(data.education.items[0].degree),
      `${mdPath}: degree "${data.education.items[0].degree}"`,
    );
  }
}

function checkPdfs() {
  if (!hasCommand("pdfinfo")) {
    console.log("• pdfinfo not found; skipping PDF page-budget check");
    return;
  }

  for (const relative of [
    "export/Enmanuel_Leon_CV_ES.pdf",
    "export/Enmanuel_Leon_Resume_EN.pdf",
  ]) {
    const file = path.join(ROOT, relative);
    if (!existsSync(file)) {
      fail(`${relative}: missing`);
      continue;
    }
    const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    const title = info.match(/^Title:\s+(.+)$/m)?.[1]?.trim();
    check(pages === 2, `${relative}: ${pages} pages (expected 2)`);
    check(
      Boolean(title) && !title.includes("_"),
      `${relative}: human title (${title ?? "missing"})`,
    );
  }
}

function checkBuildIsCurrent() {
  const result = spawnSync(process.execPath, ["scripts/build-site.mjs", "--check"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status === 0) {
    ok("generated HTML, sitemap, llms.txt and manifest are current");
  } else {
    fail("generated files are stale — run: npm run build");
    if (result.stderr) console.error(result.stderr.trim());
  }
}

async function main() {
  console.log("Validating repository…\n");
  await checkData();
  console.log("");
  await checkGeneratedPage("index.html", "en");
  console.log("");
  await checkGeneratedPage("es/index.html", "es");
  console.log("");
  await checkAssetsAndMarkdown();
  console.log("");
  checkPdfs();
  checkBuildIsCurrent();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
