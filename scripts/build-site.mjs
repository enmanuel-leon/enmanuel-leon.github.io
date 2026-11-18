#!/usr/bin/env node
/**
 * Static site builder.
 *
 * Source of truth:
 *   data/cv.es.json, data/cv.en.json, src/template.html
 *
 * Generated (committed):
 *   index.html, es/index.html, sitemap.xml, llms.txt, llms-full.txt, site.webmanifest
 *
 * Usage:
 *   node scripts/build-site.mjs          # write generated files
 *   node scripts/build-site.mjs --check  # fail if generated files are stale
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://enmanuel-leon.com";
const LANGS = ["es", "en"];
const CHECK = process.argv.includes("--check");

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
const jsonScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const itemName = (item) => (typeof item === "string" ? item : item.name);

function lastModified(data) {
  return data?.meta?.lastUpdated || new Date().toISOString().slice(0, 10);
}

async function loadData(lang) {
  const file = path.join(ROOT, `data/cv.${lang}.json`);
  return JSON.parse(await readFile(file, "utf8"));
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing template value: {{${key}}}`);
    return values[key];
  });
}

function navList(data) {
  return data.nav.items
    .map(
      (item) =>
        `<li><a href="#${esc(item.id)}" data-nav="${esc(item.id)}">${esc(item.label)}</a></li>`,
    )
    .join("");
}

function head(data, lang) {
  const isEn = lang === "en";
  const canonical = isEn ? `${SITE}/` : `${SITE}/es/`;
  const ogLocale = isEn ? "en_US" : "es_ES";
  const ogLocaleAlt = isEn ? "es_ES" : "en_US";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: "Enmanuel Leon",
        inLanguage: ["es", "en"],
      },
      {
        "@type": "ProfilePage",
        "@id": `${canonical}#profilepage`,
        url: canonical,
        name: data.meta.title,
        description: data.meta.description,
        dateModified: data.meta.lastUpdated,
        inLanguage: lang,
        isPartOf: { "@id": `${SITE}/#website` },
        mainEntity: { "@id": `${SITE}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${SITE}/#person`,
        name: data.profile.name,
        jobTitle: data.profile.role,
        description: data.meta.description,
        url: SITE,
        image: `${SITE}/img/profile-800.jpg`,
        email: "mailto:contact@enmanuel-leon.com",
        nationality: [
          { "@type": "Country", name: "Italy" },
          { "@type": "Country", name: "Venezuela" },
        ],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Valencia",
          addressCountry: "VE",
        },
        sameAs: [
          "https://www.linkedin.com/in/enmanuel-leon/",
          "https://github.com/enmanuel-leon",
        ],
        knowsLanguage: [
          { "@type": "Language", name: "Spanish" },
          { "@type": "Language", name: "English" },
        ],
        knowsAbout: [
          ...new Set([
            ...data.skills.categories.flatMap((category) =>
              category.items.map(itemName),
            ),
            ...data.seo.roleAliases,
            ...data.seo.keywords,
          ]),
        ],
        hasOccupation: {
          "@type": "Occupation",
          name: data.profile.role,
          occupationalCategory: "Software Engineering",
          skills: data.seo.keywords.join(", "),
        },
        hasCredential: {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "degree",
          name: data.education.items[0].degree,
          recognizedBy: {
            "@type": "CollegeOrUniversity",
            name: "Universidad José Antonio Páez",
          },
        },
        worksFor: {
          "@type": "Organization",
          name: data.experience.items[0].company,
        },
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Universidad José Antonio Páez",
        },
      },
    ],
  };

  return `<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(data.meta.title)}</title>
    <meta name="description" content="${esc(data.meta.description)}">
    <meta name="author" content="Enmanuel Leon">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#0b1018" media="(prefers-color-scheme: dark)">
    <meta name="theme-color" content="#f4f6f9" media="(prefers-color-scheme: light)">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="es" href="${SITE}/es/">
    <link rel="alternate" hreflang="en" href="${SITE}/">
    <link rel="alternate" hreflang="x-default" href="${SITE}/">
    <link rel="me" href="https://www.linkedin.com/in/enmanuel-leon/">
    <link rel="me" href="https://github.com/enmanuel-leon">
    <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/img/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <script>
      (() => {
        const root = document.documentElement;
        let stored = null;
        try {
          stored = localStorage.getItem("theme");
        } catch {
          stored = null;
        }
        const system = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        const theme = stored === "light" || stored === "dark" ? stored : system;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
          meta.content = theme === "dark" ? "#0b1018" : "#f4f6f9";
        });
      })();
    </script>
    <link rel="preload" href="/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/geist-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" as="image" href="/img/profile-400.webp" imagesrcset="/img/profile-400.webp 400w, /img/profile-800.webp 800w" imagesizes="(max-width: 900px) 144px, 220px" fetchpriority="high">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="expect" href="#main" blocking="render">
    <noscript><style>.theme-toggle,[data-open-download],.copy-btn{display:none}</style></noscript>
    <script type="application/json" id="ui-data">${jsonScript(data.ui)}</script>
    <script type="application/ld+json">${jsonScript(jsonLd)}</script>
    <link rel="alternate" type="application/pdf" href="/export/Enmanuel_Leon_CV_ES.pdf" title="CV Enmanuel Leon (PDF, español)">
    <link rel="alternate" type="application/pdf" href="/export/Enmanuel_Leon_Resume_EN.pdf" title="Resume Enmanuel Leon (PDF, English)">
    <link rel="alternate" type="text/markdown" href="/export/Enmanuel_Leon_CV_ES.md" title="CV Enmanuel Leon (Markdown, español)">
    <link rel="alternate" type="text/markdown" href="/export/Enmanuel_Leon_Resume_EN.md" title="Resume Enmanuel Leon (Markdown, English)">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="Enmanuel Leon">
    <meta property="og:title" content="${esc(data.meta.title)}">
    <meta property="og:description" content="${esc(data.meta.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE}/img/og-banner.png">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Enmanuel Leon — Software Engineer">
    <meta property="og:locale" content="${ogLocale}">
    <meta property="og:locale:alternate" content="${ogLocaleAlt}">
    <meta property="og:profile:first_name" content="Enmanuel">
    <meta property="og:profile:last_name" content="Leon">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(data.meta.title)}">
    <meta name="twitter:description" content="${esc(data.meta.description)}">
    <meta name="twitter:image" content="${SITE}/img/og-banner.png">
    <meta name="twitter:image:alt" content="Enmanuel Leon — Software Engineer">`;
}

function header(data, lang) {
  const isEn = lang === "en";
  const langLinks = [
    { code: "es", href: "/es/", label: "ES" },
    { code: "en", href: "/", label: "EN" },
  ]
    .map((link) => {
      const current = link.code === lang;
      return `<a class="lang-link${current ? " is-current" : ""}" href="${link.href}" hreflang="${link.code}" lang="${link.code}"${current ? ' aria-current="page"' : ""}>${link.label}</a>`;
    })
    .join("");
  const email = data.contact.items.find((item) => item.href.startsWith("mailto:"));
  const pdf = isEn
    ? "/export/Enmanuel_Leon_Resume_EN.pdf"
    : "/export/Enmanuel_Leon_CV_ES.pdf";

  return `<a class="skip-link" href="#main">${esc(data.ui.skipToContent)}</a>
  <div class="top-sentinel" id="topSentinel" aria-hidden="true"></div>
  <header class="site-header" id="siteHeader">
    <div class="header-inner">
      <a class="brand" href="#top" aria-label="${esc(data.profile.name)}">
        <span class="brand-mark" aria-hidden="true">${esc(data.nav.brand)}</span>
        <span class="brand-name">${esc(data.profile.name)}</span>
      </a>
      <nav class="site-nav" id="siteNav" aria-label="${esc(data.ui.primaryNav)}">
        <ul>${navList(data)}</ul>
      </nav>
      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label="${esc(data.ui.language)}" data-active="${lang}">
          ${langLinks}
        </div>
        <button class="icon-btn theme-toggle" id="themeToggle" type="button" aria-label="${esc(data.ui.themeToggle)}">
          <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>
          <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>
        </button>
        <button class="icon-btn menu-btn" id="menuBtn" type="button" popovertarget="mobileNav" aria-label="${esc(data.ui.menuOpen)}" aria-expanded="false" aria-controls="mobileNav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobileNav" popover aria-label="${esc(data.ui.mobileNav)}">
      <ul>${navList(data)}</ul>
      <div class="mobile-nav-meta">
        <a href="${esc(email.href)}">${esc(email.value)}</a>
        <a href="${pdf}" target="_blank" rel="noopener noreferrer">${esc(data.ui.downloadCv)}</a>
      </div>
    </nav>
  </header>`;
}

function rail(data) {
  const profile = data.profile;
  const ui = data.ui;
  return `<aside class="profile-rail" aria-label="${esc(ui.profileAndContact)}">
      <div class="portrait">
        <picture>
          <source type="image/webp" srcset="/img/profile-400.webp 400w, /img/profile-800.webp 800w" sizes="(max-width: 900px) 144px, 220px">
          <img src="/img/profile-400.jpg" srcset="/img/profile-400.jpg 400w, /img/profile-800.jpg 800w" sizes="(max-width: 900px) 144px, 220px" width="800" height="800" alt="${esc(profile.name)}" fetchpriority="high" decoding="async">
        </picture>
      </div>
      <div class="rail-intro">
        <h1>${esc(profile.name)}</h1>
        <p class="rail-role">${esc(profile.role)}</p>
        <p class="rail-specialty">${esc(profile.specialty)}</p>
        <p class="rail-stack">${esc(profile.stackLine)}</p>
      </div>
      <dl class="rail-meta">
        <div><dt>${esc(ui.location)}</dt><dd>${esc(profile.location)}</dd></div>
        <div><dt>${esc(ui.citizenship)}</dt><dd>${esc(profile.citizenship)}</dd></div>
        <div><dt>${esc(ui.workMode)}</dt><dd>${esc(profile.workMode)}</dd></div>
        <div><dt>${esc(ui.languagesLabel)}</dt><dd>${esc(profile.languages)}</dd></div>
      </dl>
      <div class="rail-actions" id="railActions">
        <button class="btn btn-primary" id="downloadBtn" type="button" data-open-download>${esc(ui.downloadCv)}</button>
        <a class="btn btn-secondary" href="#contact">${esc(ui.contactMe)}</a>
      </div>
      <ul class="rail-links">
        ${data.contact.items
          .map(
            (item) =>
              `<li><a href="${esc(item.href)}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(item.label)}</a></li>`,
          )
          .join("")}
      </ul>
    </aside>`;
}

function intro(data) {
  return `<div class="intro">
        <p class="statement">${esc(data.hero.statement)}</p>
        ${data.hero.paragraphs.map((p) => `<p class="summary">${esc(p)}</p>`).join("")}
        <p class="competencies"><span class="competencies-label">${esc(data.hero.competenciesLabel)}</span> ${esc(data.hero.competencies)}</p>
      </div>`;
}

function impact(data) {
  return `<section class="section" id="impact" aria-labelledby="impactTitle">
        <div class="section-head">
          <h2 id="impactTitle">${esc(data.impact.title)}</h2>
          <p>${esc(data.impact.subtitle)}</p>
        </div>
        <ul class="impact-grid">
          ${data.impact.items
            .map(
              (item) => `<li class="impact-item">
            <span class="impact-kicker">${esc(item.eyebrow)}</span>
            <span class="impact-title">${esc(item.title)}</span>
            <span class="impact-detail">${esc(item.detail)}</span>
          </li>`,
            )
            .join("")}
        </ul>
      </section>`;
}

function experience(data) {
  return `<section class="section" id="experience" aria-labelledby="experienceTitle">
        <div class="section-head">
          <h2 id="experienceTitle">${esc(data.experience.title)}</h2>
          <p>${esc(data.experience.subtitle)}</p>
        </div>
        <div class="experience-list">
          ${data.experience.items
            .map(
              (job) => `<article class="job" id="${esc(job.id)}">
            <p class="job-period">${esc(job.period)}</p>
            <div class="job-body">
              <h3 class="job-role">${esc(job.role)}</h3>
              <p class="job-company">${esc(job.company)} <span class="sep" aria-hidden="true">·</span> ${esc(job.location)}</p>
              <ul class="job-list">${job.bullets.map((bullet) => `<li>${esc(bullet)}</li>`).join("")}</ul>
              <ul class="tag-list">${job.tags.map((tag) => `<li class="tag">${esc(tag)}</li>`).join("")}</ul>
            </div>
          </article>`,
            )
            .join("")}
        </div>
      </section>`;
}

function skills(data) {
  return `<section class="section" id="stack" aria-labelledby="skillsTitle">
        <div class="section-head">
          <h2 id="skillsTitle">${esc(data.skills.title)}</h2>
          <p>${esc(data.skills.desc)}</p>
        </div>
        <dl class="stack-grid">
          ${data.skills.categories
            .map(
              (category) => `<div class="stack-row">
            <dt>${esc(category.title)}</dt>
            <dd><ul class="chip-list">${category.items
              .map((item) => `<li class="chip">${esc(itemName(item))}</li>`)
              .join("")}</ul></dd>
          </div>`,
            )
            .join("")}
        </dl>
      </section>`;
}

function education(data) {
  return `<section class="section" id="education" aria-labelledby="educationTitle">
        <div class="section-head">
          <h2 id="educationTitle">${esc(data.education.title)}</h2>
        </div>
        <div class="education-list">
          ${data.education.items
            .map(
              (edu) => `<article class="edu">
            <p class="edu-period">${esc(edu.period)}</p>
            <div class="edu-body">
              <h3 class="edu-degree">${esc(edu.degree)}</h3>
              <p class="edu-school">${esc(edu.school)}</p>
              <p class="edu-desc">${esc(edu.description)}</p>
            </div>
          </article>`,
            )
            .join("")}
        </div>
      </section>`;
}

function contact(data) {
  return `<section class="section contact" id="contact" aria-labelledby="contactTitle">
        <div class="section-head">
          <h2 id="contactTitle">${esc(data.contact.title)}</h2>
          <p>${esc(data.contact.subtitle)}</p>
        </div>
        <ul class="contact-list">
          ${data.contact.items
            .map((item) => {
              const isEmail = item.href.startsWith("mailto:");
              return `<li class="contact-item">
            <a class="contact-link" href="${esc(item.href)}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ""}>
              <span class="contact-label">${esc(item.label)}</span>
              <span class="contact-value">${esc(item.value)}</span>
              <svg class="contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
            </a>
            ${
              isEmail
                ? `<button class="copy-btn" type="button" data-copy-email="${esc(item.value)}" aria-label="${esc(data.ui.copyEmail)}: ${esc(item.value)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="copy-label">${esc(data.ui.copyEmail)}</span></button>`
                : ""
            }
          </li>`;
            })
            .join("")}
        </ul>
        <div class="contact-actions">
          <button class="btn btn-primary" type="button" data-open-download>${esc(data.ui.downloadCv)}</button>
        </div>
      </section>`;
}

function noScript(data) {
  return `<noscript>
      <div class="noscript">
        <p class="noscript-title"><strong>${esc(data.ui.noscriptTitle)}</strong></p>
        <p>${esc(data.ui.noscriptText)}</p>
        <p>
          <a href="/export/Enmanuel_Leon_CV_ES.pdf" target="_blank" rel="noopener noreferrer">CV · Español (PDF)</a>
          <span aria-hidden="true">·</span>
          <a href="/export/Enmanuel_Leon_Resume_EN.pdf" target="_blank" rel="noopener noreferrer">Resume · English (PDF)</a>
          <span aria-hidden="true">·</span>
          <a href="/export/Enmanuel_Leon_CV_ES.md">CV · Markdown</a>
          <span aria-hidden="true">·</span>
          <a href="/export/Enmanuel_Leon_Resume_EN.md">Resume · Markdown</a>
        </p>
      </div>
    </noscript>`;
}

function main(data, lang) {
  return `<main id="main" tabindex="-1">
    ${noScript(data)}
    <div class="page">
      ${rail(data)}
      <div class="content">
        ${intro(data)}
        <div class="section-sentinel" id="sectionSentinel" aria-hidden="true"></div>
        ${impact(data)}
        ${experience(data)}
        ${skills(data)}
        ${education(data)}
        ${contact(data)}
      </div>
    </div>
  </main>`;
}

function dialog(data, lang) {
  const ui = data.ui;
  const links = [
    {
      href: "/export/Enmanuel_Leon_CV_ES.pdf",
      download: "Enmanuel_Leon_CV_ES.pdf",
      lang: "es",
      format: "PDF",
      title: "CV · Español",
      meta: ui.downloadPdfMeta,
    },
    {
      href: "/export/Enmanuel_Leon_Resume_EN.pdf",
      download: "Enmanuel_Leon_Resume_EN.pdf",
      lang: "en",
      format: "PDF",
      title: "Resume · English",
      meta: ui.downloadPdfMeta,
    },
    {
      href: "/export/Enmanuel_Leon_CV_ES.md",
      download: "Enmanuel_Leon_CV_ES.md",
      lang: "es",
      format: "MD",
      title: "CV · Español",
      meta: ui.downloadMdMeta,
    },
    {
      href: "/export/Enmanuel_Leon_Resume_EN.md",
      download: "Enmanuel_Leon_Resume_EN.md",
      lang: "en",
      format: "MD",
      title: "Resume · English",
      meta: ui.downloadMdMeta,
    },
  ].sort((a, b) => Number(b.lang === lang) - Number(a.lang === lang));

  return `<dialog class="download-dialog" id="downloadDialog" aria-labelledby="downloadTitle" closedby="any">
    <div class="dialog-head">
      <h2 id="downloadTitle">${esc(ui.downloadTitle)}</h2>
      <form method="dialog">
        <button class="icon-btn dialog-close" type="submit" aria-label="${esc(ui.downloadClose)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </form>
    </div>
    <p class="dialog-desc">${esc(ui.downloadDesc)}</p>
    <ul class="download-list">
      ${links
        .map(
          (link) => `<li><a href="${esc(link.href)}"${link.format === "PDF" ? ' target="_blank" rel="noopener noreferrer"' : ` download="${esc(link.download)}"`} hreflang="${link.lang}">
        <span class="download-format">${link.format}</span>
        <span class="download-title">${esc(link.title)}</span>
        <span class="download-meta">${esc(link.meta)}</span>
      </a></li>`,
        )
        .join("")}
    </ul>
    <p class="dialog-note">${esc(ui.downloadNote)}</p>
  </dialog>`;
}

function footer(data) {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <p>${esc(data.footer.replace("{year}", String(new Date().getFullYear())))}</p>
      <a href="#top">${esc(data.ui.backToTop)}</a>
    </div>
  </footer>`;
}

function floating(data, lang) {
  const pdf =
    lang === "es"
      ? "/export/Enmanuel_Leon_CV_ES.pdf"
      : "/export/Enmanuel_Leon_Resume_EN.pdf";
  return `<div class="mobile-cta" id="mobileCta">
    <a class="btn btn-primary" href="${pdf}" target="_blank" rel="noopener noreferrer">${esc(data.ui.downloadCv)}</a>
    <a class="btn btn-secondary" href="#contact">${esc(data.ui.contactMe)}</a>
  </div>
  <p class="visually-hidden" id="liveStatus" role="status" aria-live="polite"></p>
  <a class="back-to-top" id="backToTop" href="#top" aria-label="${esc(data.ui.backToTop)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
  </a>`;
}

function sitemap(data) {
  const lastmod = lastModified(data);
  const alternates = `    <xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/" />
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`;
  const page = (loc, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${alternates}
  </url>`;
  const asset = (loc, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${page(`${SITE}/`, "1.0")}
${page(`${SITE}/es/`, "0.9")}
${asset(`${SITE}/export/Enmanuel_Leon_CV_ES.pdf`, "0.8")}
${asset(`${SITE}/export/Enmanuel_Leon_Resume_EN.pdf`, "0.8")}
${asset(`${SITE}/export/Enmanuel_Leon_CV_ES.md`, "0.7")}
${asset(`${SITE}/export/Enmanuel_Leon_Resume_EN.md`, "0.7")}
</urlset>
`;
}

function llms(data) {
  const lines = [];
  lines.push(`# ${data.profile.name} — ${data.profile.role}`);
  lines.push("");
  lines.push(`> ${data.meta.description}`);
  lines.push("");
  lines.push("## Canonical");
  lines.push(`- Portfolio (EN): ${SITE}/`);
  lines.push(`- Portfolio (ES): ${SITE}/es/`);
  lines.push(`- CV (ES, PDF): ${SITE}/export/Enmanuel_Leon_CV_ES.pdf`);
  lines.push(`- Resume (EN, PDF): ${SITE}/export/Enmanuel_Leon_Resume_EN.pdf`);
  lines.push(`- CV (ES, Markdown): ${SITE}/export/Enmanuel_Leon_CV_ES.md`);
  lines.push(`- Resume (EN, Markdown): ${SITE}/export/Enmanuel_Leon_Resume_EN.md`);
  lines.push("");
  lines.push("## Profile");
  lines.push(`- Location: ${data.profile.location}`);
  lines.push(`- Citizenship: ${data.profile.citizenship}`);
  lines.push(`- Work mode: ${data.profile.workMode}`);
  lines.push(`- Languages: ${data.profile.languages}`);
  data.contact.items.forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
  lines.push("");
  lines.push("## Engineering focus");
  data.impact.items.forEach((item) => {
    lines.push(`- **${item.eyebrow} — ${item.title}:** ${item.detail}`);
  });
  lines.push("");
  lines.push("## Keywords");
  lines.push(`- Roles: ${data.seo.roleAliases.join(", ")}`);
  lines.push(`- Architecture: ${data.seo.keywords.join(", ")}`);
  lines.push("");
  lines.push("## Preferred citation");
  lines.push(`- ${data.profile.name} — ${data.profile.role} · ${data.profile.specialty}`);
  lines.push(`- Canonical: ${SITE}/`);
  lines.push(`- Summary: ${data.meta.description}`);
  lines.push("");
  lines.push("## Full text");
  lines.push(`- ${SITE}/llms-full.txt`);
  lines.push("");
  lines.push("## Stack");
  data.skills.categories.forEach((category) => {
    lines.push(`- **${category.title}:** ${category.items.map(itemName).join(", ")}`);
  });
  lines.push("");
  lines.push("## Experience");
  data.experience.items.forEach((job) => {
    lines.push(`### ${job.role} — ${job.company}`);
    lines.push(`*${job.period} · ${job.location}*`);
    job.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
    lines.push("");
  });
  lines.push("## Education");
  data.education.items.forEach((edu) => {
    lines.push(`- **${edu.degree}** — ${edu.school} (${edu.period})`);
    if (edu.description) lines.push(`  ${edu.description}`);
  });
  lines.push("");
  lines.push(`Last updated: ${lastModified(data)}`);
  return `${lines.join("\n")}\n`;
}

function llmsFull(data, markdown) {
  const body = markdown
    .replace("<!-- pdf:pagebreak -->", "")
    .replace(/^#\s+Enmanuel Leon\s*\n+/, "")
    .replace(/[ \t]+$/gm, "")
    .trim();
  return `# ${data.profile.name} — ${data.profile.role}

> Canonical: ${SITE}/
> Spanish: ${SITE}/es/
> PDFs: ${SITE}/export/Enmanuel_Leon_Resume_EN.pdf · ${SITE}/export/Enmanuel_Leon_CV_ES.pdf
> Markdown: ${SITE}/export/Enmanuel_Leon_Resume_EN.md · ${SITE}/export/Enmanuel_Leon_CV_ES.md

${body}

Last updated: ${lastModified(data)}
`;
}

function manifest(data) {
  return `${JSON.stringify(
    {
      id: "/",
      name: `${data.profile.name} — ${data.profile.role}`,
      short_name: data.profile.name,
      description: data.meta.description,
      lang: "en",
      dir: "ltr",
      start_url: "/",
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      background_color: "#0b1018",
      theme_color: "#0b1018",
      categories: ["business", "portfolio", "productivity"],
      icons: [
        {
          src: "/img/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/img/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/img/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Download CV (ES)",
          short_name: "CV ES",
          url: "/export/Enmanuel_Leon_CV_ES.pdf",
        },
        {
          name: "Download Resume (EN)",
          short_name: "Resume EN",
          url: "/export/Enmanuel_Leon_Resume_EN.pdf",
        },
        {
          name: "Contact",
          short_name: "Contact",
          url: "/#contact",
        },
      ],
    },
    null,
    2,
  )}\n`;
}

async function build() {
  const template = await readFile(path.join(ROOT, "src/template.html"), "utf8");
  const data = Object.fromEntries(
    await Promise.all(LANGS.map(async (lang) => [lang, await loadData(lang)])),
  );

  const outputs = new Map();
  for (const lang of LANGS) {
    const page = fill(template, {
      lang,
      head: head(data[lang], lang),
      header: header(data[lang], lang),
      main: main(data[lang], lang),
      footer: footer(data[lang]),
      dialog: dialog(data[lang], lang),
      floating: floating(data[lang], lang),
    });
    outputs.set(lang === "en" ? "index.html" : "es/index.html", page.replace(/[ \t]+$/gm, ""));
  }
  const resumeMarkdown = await readFile(
    path.join(ROOT, "export/Enmanuel_Leon_Resume_EN.md"),
    "utf8",
  );
  outputs.set("sitemap.xml", sitemap(data.en));
  outputs.set("llms.txt", llms(data.en));
  outputs.set("llms-full.txt", llmsFull(data.en, resumeMarkdown));
  outputs.set("site.webmanifest", manifest(data.en));

  const stale = [];
  for (const [relative, content] of outputs) {
    const file = path.join(ROOT, relative);
    if (CHECK) {
      const current = existsSync(file) ? await readFile(file, "utf8") : "";
      if (current !== content) stale.push(relative);
      continue;
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    console.log(`wrote ${relative}`);
  }

  if (CHECK && stale.length > 0) {
    console.error(`Out of date: ${stale.join(", ")}. Run: node scripts/build-site.mjs`);
    process.exitCode = 1;
    return;
  }

  if (CHECK) console.log("Generated files are up to date.");
}

await build();
