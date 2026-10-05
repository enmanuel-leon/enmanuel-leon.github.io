const CONFIG = {
  enableTerminal: false, // Set to true to dynamically load assets/js/terminal.js
};

const DEFAULT_TYPING = {
  es: [
    "Diseño arquitecturas distribuidas y resilientes.",
    "Optimizo motores asíncronos y procesamiento de colas.",
    "Construyo plataformas cloud de alta disponibilidad.",
    "Orquesto sistemas agénticos y flujos autónomos.",
  ],
  en: [
    "Architecting distributed and resilient systems.",
    "Optimizing asynchronous engines and queue processing.",
    "Building high-availability cloud platforms.",
    "Orchestrating agentic systems and autonomous workflows.",
  ],
};

const state = {
  lang:
    localStorage.getItem("cv-lang") ||
    (navigator.language.startsWith("es") ? "es" : "en"),
  data: null,
};

async function loadData(lang) {
  const res = await fetch(`data/cv.${lang}.json`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar data/cv.${lang}.json`);
  }
  return res.json();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadFile(fileUrl, fileName) {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 200);
}

function renderStatic(data) {
  document.title = `${data.profile.name} — ${data.profile.role}`;
  document.getElementById("navLogo").innerHTML = `<svg class="logo-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="var(--bg-card)" stroke="var(--border)" stroke-width="1.5"/><text x="16" y="21" font-family="var(--font-mono)" font-size="13" font-weight="700" fill="var(--text-primary)" text-anchor="middle" letter-spacing="-0.5">EL</text></svg>`;

  data.nav.items.forEach((item) => {
    const el = document.querySelector(`[data-nav="${item.id}"]`);
    if (el) el.textContent = item.label;
  });

  document.getElementById("heroAvatar").src = data.profile.photo;
  document.getElementById("heroAvatar").alt = data.profile.name;
  document.getElementById("heroName").textContent = data.profile.name;
  document.getElementById("heroSubtitle").textContent = data.profile.role;
  document.getElementById("heroSummary").textContent = data.hero.summary;
  document.getElementById("heroGreeting").textContent =
    state.lang === "es" ? "Hola, soy" : "Hi, I am";

  const heroBadgeEl = document.getElementById("heroBadgeText");
  if (heroBadgeEl && data.hero && data.hero.badge) {
    heroBadgeEl.textContent = data.hero.badge;
  }

  const emailIcon = `<svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
  const codeIcon = `<svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;

  document.getElementById("heroBtnContact").innerHTML = `${emailIcon} ${data.ui.contactMe}`;
  const heroBtnProjects = document.getElementById("heroBtnProjects");
  if (heroBtnProjects) {
    heroBtnProjects.innerHTML = `${codeIcon} ${data.ui.viewSkills}`;
    heroBtnProjects.setAttribute("href", "#skills");
  }

  document.getElementById("aboutLabel").textContent = data.about.label;
  document.getElementById("aboutTitle").textContent = data.about.title;
  document.getElementById("aboutText").innerHTML = data.about.paragraphs
     .map((p) => `<p>${escapeHtml(p)}</p>`)
     .join("");
  document.getElementById("aboutStats").innerHTML = data.about.stats
     .map(
       (s) => `
     <div class="stat-card" style="elevation: 2">
       <div class="stat-number" data-count="${escapeHtml(s.value)}">${escapeHtml(s.value)}</div>
       <div class="stat-label">${escapeHtml(s.label)}</div>
     </div>
   `,
     )
     .join("");

  const highlightMetrics = (text) => {
    return escapeHtml(text).replace(
      /(?:\b\d+(?:\.\d+)?%|&lt;50ms|<50ms|&gt;2\.000|>2\.000|&gt;500\.000|>500\.000|1\.5 días|1\.5 days|p95|10\.000\+|10,000\+|2,000\+|500,000\+|20\+|6\+|zero-downtime|zero|cero)/gi,
      '<span class="metric-chip">$&</span>',
    );
  };

  document.getElementById("expLabel").textContent = data.experience.label;
  document.getElementById("expTitle").textContent = data.experience.title;
  document.getElementById("expDesc").textContent =
    data.experience.subtitle;
  document.getElementById("experienceTimeline").innerHTML =
    data.experience.items
      .map(
        (job) => `
    <div class="timeline-item reveal">
      <div class="timeline-dot"></div>
      <div class="timeline-card" style="elevation: 2">
        <span class="timeline-date">${escapeHtml(job.period)}</span>
        <h3 class="timeline-role">${escapeHtml(job.role)}</h3>
        <p class="timeline-company">${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)}</p>
        <ul class="timeline-desc">
          ${job.bullets.map((b) => `<li>${highlightMetrics(b)}</li>`).join("")}
        </ul>
        <div class="timeline-tags">
          ${job.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
    </div>
  `,
      )
      .join("");

  document.getElementById("skillsLabel").textContent = data.skills.label;
  document.getElementById("skillsTitle").textContent = data.skills.title;
  document.getElementById("skillsDesc").textContent = data.skills.desc;

  const categoryIcons = {
    architecture: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    cloud: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
    backend: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`,
    data: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>`,
    ai: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path><circle cx="12" cy="12" r="4"></circle></svg>`,
    frontend: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    devops: `<svg class="skill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  };

  document.getElementById("skillsGrid").innerHTML = data.skills.categories
    .map(
      (cat) => {
        const iconSvg = categoryIcons[cat.icon] || categoryIcons.backend;
        const tagsHtml = cat.items
          .map((item) => {
            const name = typeof item === "string" ? item : (item.name || "");
            return `<span class="stack-tag">${escapeHtml(name)}</span>`;
          })
          .join("");

        return `
        <div class="skill-category stack-card" style="elevation: 2">
          <div class="skill-category-header">
            <div class="skill-icon" style="background: rgba(37, 99, 235, 0.1); color: var(--accent);">${iconSvg}</div>
            <h3 class="skill-category-title">${escapeHtml(cat.title)}</h3>
          </div>
          <div class="stack-tags-container">
            ${tagsHtml}
          </div>
        </div>
        `;
      }
    )
    .join("");

  const projectsGrid = document.getElementById("projectsGrid");
  if (projectsGrid) {
    document.getElementById("projectsLabel").textContent =
      data.projects.label;
    document.getElementById("projectsTitle").textContent =
      data.projects.title;
    document.getElementById("projectsDesc").textContent =
      data.projects.subtitle;

    const projectGradients = [
      "linear-gradient(135deg, #6c63ff, #3b82f6)",
      "linear-gradient(135deg, #e942f5, #f97316)",
      "linear-gradient(135deg, #06b6d4, #6c63ff)",
    ];

    projectsGrid.innerHTML = data.projects.items
      .map(
        (project, idx) => `
      <div class="project-card" style="elevation: 2">
        <div class="project-image" style="background:${projectGradients[idx % projectGradients.length]};">
          <span class="project-icon">${escapeHtml(project.icon || "🚀")}</span>
        </div>
        <div class="project-content">
          <p class="project-type">${escapeHtml(project.type)}</p>
          <h3 class="project-title">${escapeHtml(project.title)}</h3>
          <p class="project-desc">${escapeHtml(project.description)}</p>
          <div class="project-tech">
            ${project.tech.map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join("")}
          </div>
          <div class="project-links">
            <a href="${project.demo || "#"}" class="project-link" target="_blank" rel="noopener noreferrer">🔗 Demo →</a>
            <a href="${project.github || "#"}" class="project-link" target="_blank" rel="noopener noreferrer">📂 GitHub →</a>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  document.getElementById("eduLabel").textContent = data.education.label;
  document.getElementById("eduTitle").textContent = data.education.title;
  document.getElementById("educationGrid").innerHTML =
    data.education.items
      .map(
        (edu) => `
    <div class="edu-card" style="elevation: 2">
      <span class="edu-year">${escapeHtml(edu.period)}</span>
      <h3 class="edu-degree">${escapeHtml(edu.degree)}</h3>
      <p class="edu-school">${escapeHtml(edu.school)}</p>
    </div>
  `,
      )
      .join("");

  document.getElementById("contactLabel").textContent =
    data.contact.label;
  document.getElementById("contactTitle").textContent =
    data.contact.title;
  document.getElementById("contactText").textContent =
    data.contact.subtitle;

  const contactIcons = {
    Email: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    Telefono: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></svg>`,
    Teléfono: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></svg>`,
    Phone: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></svg>`,
    LinkedIn: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`,
    GitHub: `<svg class="contact-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`,
  };

  document.getElementById("contactLinks").innerHTML = data.contact.items
    .filter(
      (item) =>
        !["Ubicacion", "Ubicación", "Location"].includes(item.label),
    )
    .map((item) => {
      const icon = contactIcons[item.label] || "🔗";
      const href = item.href || "#";
      const isEmail = item.label.toLowerCase().includes("email");
      const targetAttr = item.external ? 'target="_blank" rel="noopener noreferrer"' : "";
      const cardClass = isEmail ? "contact-card contact-card-email" : "contact-card";
      const actionHtml = isEmail
        ? `<button type="button" class="contact-copy-btn" data-email="${escapeHtml(item.value)}" title="${state.lang === "es" ? "Copiar email" : "Copy email"}" aria-label="${state.lang === "es" ? "Copiar email" : "Copy email"}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span class="copy-btn-label">${state.lang === "es" ? "Copiar" : "Copy"}</span>
          </button>`
        : `<a href="${href}" ${targetAttr} class="contact-arrow" aria-label="${escapeHtml(item.label)}" title="${escapeHtml(item.value)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-svg"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </a>`;
      return `
      <div class="${cardClass}" style="elevation: 2">
        <span class="contact-card-icon">${icon}</span>
        <div class="contact-card-info">
          <span class="contact-card-label">${escapeHtml(item.label)}</span>
          <a href="${href}" ${targetAttr} class="contact-card-value">${escapeHtml(item.value)}</a>
        </div>
        ${actionHtml}
      </div>
    `;
    })
    .join("");

  // Attach event listener for copy email buttons
  document.querySelectorAll(".contact-copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const email = btn.getAttribute("data-email");
      if (navigator.clipboard && email) {
        navigator.clipboard.writeText(email).then(() => {
          btn.classList.add("copied");
          const label = btn.querySelector(".copy-btn-label");
          const origText = label ? label.textContent : "";
          if (label) label.textContent = state.lang === "es" ? "¡Copiado!" : "Copied!";
          setTimeout(() => {
            btn.classList.remove("copied");
            if (label) label.textContent = origText;
          }, 2000);
        });
      }
    });
  });

  const mobileDownloadText = document.getElementById("mobileCtaDownloadText");
  if (mobileDownloadText && data.ui) {
    mobileDownloadText.textContent = data.ui.downloadCv;
  }
  const mobileContactText = document.getElementById("mobileCtaContactText");
  if (mobileContactText && data.ui) {
    mobileContactText.textContent = data.ui.contactMe.replace(/^[^\w\s]+/, "").trim();
  }

  const year = new Date().getFullYear();
  document.getElementById("footerText").innerHTML = data.footer.replace(
    "{year}",
    year,
  );
  document.documentElement.setAttribute("lang", state.lang);

  const langSelectEl = document.getElementById("langSelect");
  if (langSelectEl) {
    langSelectEl.querySelectorAll(".lang-switch-btn").forEach(btn => {
      const isCurrent = btn.getAttribute("data-lang") === state.lang;
      btn.classList.toggle("active", isCurrent);

      // Highly specific tooltips per button!
      if (btn.getAttribute("data-lang") === "es") {
        btn.setAttribute("data-tooltip", state.lang === "es" ? "Idioma: Español (Activo)" : "Switch to Spanish");
      } else {
        btn.setAttribute("data-tooltip", state.lang === "es" ? "Cambiar a Inglés" : "Language: English (Active)");
      }
    });
  }

  // Translate dynamic UI labels & attributes for premium accessibility (a11y)
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", data.ui.themeToggle);
    themeToggle.setAttribute("data-tooltip", data.ui.themeToggle);
  }
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.setAttribute("aria-label", data.ui.langSelect);
    // Removed parent data-tooltip to avoid clashing with specific button tooltips!
  }
  const hamburger = document.getElementById("hamburger");
  if (hamburger) hamburger.setAttribute("aria-label", data.ui.hamburger);

  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    backToTop.setAttribute("aria-label", data.ui.backToTop);
    backToTop.setAttribute("data-tooltip", data.ui.backToTop);
  }

  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.setAttribute("data-tooltip", data.ui.downloadCv);
  }

  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = data.ui.modalTitle;
  const modalCloseBtn = document.getElementById("modalClose");
  if (modalCloseBtn) modalCloseBtn.setAttribute("aria-label", data.ui.modalClose);

  // Subtitles inside download modal cards
  const descLightES = document.querySelector("#modalDownloadMDes p");
  if (descLightES) descLightES.textContent = state.lang === "es" ? "Formato de texto ligero" : "Lightweight text format";
  const descLightEN = document.querySelector("#modalDownloadMDen p");
  if (descLightEN) descLightEN.textContent = state.lang === "es" ? "Formato de texto ligero" : "Lightweight text format";
  const descPrintES = document.querySelector("#modalDownloadPDFes p");
  if (descPrintES) descPrintES.textContent = state.lang === "es" ? "Formato listo para impresión" : "Print-ready format";
  const descPrintEN = document.querySelector("#modalDownloadPDFen p");
  if (descPrintEN) descPrintEN.textContent = state.lang === "es" ? "Formato listo para impresión" : "Print-ready format";

  // ── CV Download Logic ──
  const downloadText = document.getElementById("downloadText");
  const modal = document.getElementById("downloadModal");
  const modalClose = document.getElementById("modalClose");

  const downloadIcon = `<svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

  if (downloadText) downloadText.textContent = data.ui.downloadCv;

  // Trigger modal visibility
  if (downloadBtn) downloadBtn.onclick = () => modal.setAttribute("aria-hidden", "false");

  if (modalClose) modalClose.onclick = () => modal.setAttribute("aria-hidden", "true");
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) modal.setAttribute("aria-hidden", "true");
    };
  }

  // Bind individual download selections inside modal
  const mDes = document.getElementById("modalDownloadMDes");
  const mDen = document.getElementById("modalDownloadMDen");
  const pDes = document.getElementById("modalDownloadPDFes");
  const pDen = document.getElementById("modalDownloadPDFen");

  if (mDes) mDes.onclick = () => { downloadFile("./export/Enmanuel_Leon_CV_ES.md", "Enmanuel_Leon_CV_ES.md"); modal.setAttribute("aria-hidden", "true"); };
  if (mDen) mDen.onclick = () => { downloadFile("./export/Enmanuel_Leon_Resume_EN.md", "Enmanuel_Leon_Resume_EN.md"); modal.setAttribute("aria-hidden", "true"); };
  if (pDes) pDes.onclick = () => { downloadFile("./export/Enmanuel_Leon_CV_ES.pdf", "Enmanuel_Leon_CV_ES.pdf"); modal.setAttribute("aria-hidden", "true"); };
  if (pDen) pDen.onclick = () => { downloadFile("./export/Enmanuel_Leon_Resume_EN.pdf", "Enmanuel_Leon_Resume_EN.pdf"); modal.setAttribute("aria-hidden", "true"); };
}

function startTyping(data) {
  const el = document.getElementById("typingText");
  const phrases =
    data.hero.typingPhrases && data.hero.typingPhrases.length
      ? data.hero.typingPhrases
      : DEFAULT_TYPING[state.lang];
  let phraseIdx = 0;
  let charIdx = 0;
  let deleting = false;

  if (window.__typingTimer) {
    clearTimeout(window.__typingTimer);
  }

  function type() {
    const current = phrases[phraseIdx];
    if (!deleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx += 1;
      if (charIdx === current.length) {
        deleting = true;
        window.__typingTimer = setTimeout(type, 2000);
        return;
      }
      window.__typingTimer = setTimeout(type, 60 + Math.random() * 40);
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx -= 1;
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        window.__typingTimer = setTimeout(type, 500);
        return;
      }
      window.__typingTimer = setTimeout(type, 30);
    }
  }
  type();
}

function observeReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");

          entry.target.querySelectorAll(".skill-fill").forEach((bar) => {
            bar.style.width = bar.dataset.width;
          });

          entry.target
            .querySelectorAll(".stat-number[data-count]")
            .forEach((counter) => {
              counter.textContent = counter.dataset.count;
            });
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  document
    .querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .stagger-children"
    )
    .forEach((el) => {
      observer.observe(el);
    });
}

/**
 * Initializes a highly refined, slow-moving ambient floating sky particle logic
 * replacing the busy "AI slop" constellation web lines with high-end minimalism.
 */
function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  let w, h;
  const PARTICLE_COUNT = 30; // Fewer particles for a cleaner look

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = 40; // Soft density
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, // Softer drift
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 2.8 + 1.2, // Slightly larger, soft glowing points
        alpha: Math.random() * 0.3 + 0.1, // More visible glowing opacity
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    // Is dark theme active? Let's check html attribute
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const particleColor = isDark ? "99, 102, 241" : "79, 70, 229"; // Indigo matching our palette

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  resize();
  createParticles();
  animate();
  window.addEventListener("resize", () => {
    resize();
    createParticles();
  });
}

function applyTerminalTheme(theme) {
  if (CONFIG.enableTerminal) {
    import("./terminal.js").then((mod) => mod.applyTerminalTheme(theme));
  }
}

function initGlobalInteractions() {
  const nav = document.getElementById("navbar");
  const backToTop = document.getElementById("backToTop");
  const links = document.querySelectorAll(".nav-links a");
  const sections = document.querySelectorAll("section[id]");
  const themeToggle = document.getElementById("themeToggle");
  const html = document.documentElement;
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const langSelect = document.getElementById("langSelect");

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;

    // Dynamic Scroll Progress Bar calculation
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    const progressBar = document.getElementById("scrollProgress");
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    nav.classList.toggle("scrolled", scrollY > 50);
    if (backToTop) {
      backToTop.classList.toggle("visible", scrollY > 500);
    }
    const mobileCta = document.getElementById("mobileCtaBar");
    if (mobileCta) {
      mobileCta.classList.toggle("visible", scrollY > 150);
    }

    let current = "";
    sections.forEach((section) => {
      const top = section.offsetTop - 120;
      if (scrollY >= top) current = section.getAttribute("id");
    });

    links.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });
  });

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const mobileDownloadBtn = document.getElementById("mobileCtaDownload");
  if (mobileDownloadBtn) {
    mobileDownloadBtn.addEventListener("click", () => {
      const mainDownload = document.getElementById("downloadBtn");
      if (mainDownload) mainDownload.click();
    });
  }

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    html.setAttribute("data-theme", savedTheme);
    setTimeout(() => applyTerminalTheme(savedTheme), 100);
  } else {
    const systemIsLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const initialTheme = systemIsLight ? "light" : "dark";
    html.setAttribute("data-theme", initialTheme);
    setTimeout(() => applyTerminalTheme(initialTheme), 100);
  }

  const savedAccentTheme = localStorage.getItem("accent-theme") || "indigo";
  const accentDots = document.querySelectorAll(".accent-dot");

  if (savedAccentTheme && savedAccentTheme !== "indigo") {
    html.classList.add(`theme-${savedAccentTheme}`);
  }

  if (accentDots.length > 0) {
    accentDots.forEach(dot => {
      if (dot.getAttribute("data-theme") === savedAccentTheme) {
        dot.classList.add("active");
      }

      dot.addEventListener("click", () => {
        const themeChoice = dot.getAttribute("data-theme");

        accentDots.forEach(d => d.classList.remove("active"));
        dot.classList.add("active");

        html.classList.remove("theme-matrix", "theme-dracula", "theme-cyber", "theme-classic");
        if (themeChoice !== "indigo") {
          html.classList.add(`theme-${themeChoice}`);
          localStorage.setItem("accent-theme", themeChoice);
        } else {
          localStorage.removeItem("accent-theme");
        }
      });
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = html.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      applyTerminalTheme(next);
    });
  }

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  // Smooth scroll for all internal hash links with accurate navbar offset
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        navLinks.classList.remove("open");
        const nav = document.getElementById("navbar");
        const navHeight = nav ? nav.offsetHeight : 70;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - (navHeight + 14);
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: "smooth",
        });
        history.pushState(null, null, href);
      }
    });
  });

  if (langSelect) {
    const langButtons = langSelect.querySelectorAll(".lang-switch-btn");
    langButtons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const nextLang = btn.getAttribute("data-lang");
        if (state.lang === nextLang) return;

        state.lang = nextLang;
        localStorage.setItem("cv-lang", state.lang);
        await hydrate();
      });
    });
  }

  // Reactive body class to hide floating buttons whenever a modal is active
  const downloadModal = document.getElementById("downloadModal");
  const terminalOverlay = document.getElementById("terminalOverlay");
  const syncModalOpenClass = () => {
    const isDownloadOpen = downloadModal && downloadModal.getAttribute("aria-hidden") === "false";
    const isTerminalOpen = terminalOverlay && terminalOverlay.getAttribute("aria-hidden") === "false" && !terminalOverlay.classList.contains("minimized-mode");
    document.body.classList.toggle("modal-open", Boolean(isDownloadOpen || isTerminalOpen));
  };
  const modalObserver = new MutationObserver(syncModalOpenClass);
  if (downloadModal) modalObserver.observe(downloadModal, { attributes: true, attributeFilter: ["aria-hidden"] });
  if (terminalOverlay) modalObserver.observe(terminalOverlay, { attributes: true, attributeFilter: ["aria-hidden", "class"] });
}

function initTagHighlighting() {
  document.addEventListener("mouseover", (e) => {
    const tag = e.target.closest(".tag");
    if (!tag) return;
    const tagText = tag.textContent.trim().toLowerCase();
    document.querySelectorAll(".tag").forEach((t) => {
      if (t.textContent.trim().toLowerCase() === tagText) {
        t.classList.add("tag-highlight");
      }
    });
  });

  document.addEventListener("mouseout", (e) => {
    const tag = e.target.closest(".tag");
    if (!tag) return;
    document.querySelectorAll(".tag").forEach((t) => {
      t.classList.remove("tag-highlight");
    });
  });
}

function initSpotlightHighlighting() {
  document.addEventListener("mousemove", (e) => {
    const card = e.target.closest(".stat-card, .timeline-card, .skill-category, .edu-card, .contact-card, .modal-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
}

function initKeyboardShortcuts() {
  const trigger = document.getElementById("terminalTrigger");
  const overlay = document.getElementById("terminalOverlay");
  const input = document.getElementById("terminalInput");
  const themeToggle = document.getElementById("themeToggle");
  const langSelect = document.getElementById("langSelect");

  document.addEventListener("keydown", (e) => {
    // 1. Ctrl + ` (Backtick) - Toggle Terminal Overlay (VS Code Standard)
    if (e.ctrlKey && e.key === "`") {
      e.preventDefault();
      if (overlay) {
        const isHidden = overlay.getAttribute("aria-hidden") === "true";
        if (isHidden && trigger) {
          trigger.click();
        } else {
          overlay.setAttribute("aria-hidden", "true");
        }
      }
    }

    // 2. Escape - Minimize or Close Terminal, or Close Modal
    if (e.key === "Escape") {
      const container = document.querySelector(".terminal-container");
      if (overlay && overlay.getAttribute("aria-hidden") === "false" && container) {
        if (!container.classList.contains("minimized")) {
          // Stage 1: Minimize terminal to status bar
          container.classList.add("minimized");
          overlay.classList.add("minimized-mode");
        } else {
          // Stage 2: Close completely
          overlay.setAttribute("aria-hidden", "true");
          container.classList.remove("minimized");
          overlay.classList.remove("minimized-mode");
        }
      }
      const modal = document.getElementById("downloadModal");
      if (modal && modal.getAttribute("aria-hidden") === "false") {
        modal.setAttribute("aria-hidden", "true");
      }
    }

    // 3. Shortcuts active ONLY when terminal input has focus
    if (document.activeElement === input) {
      // Ctrl + L - Clear terminal screen (zsh Standard)
      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const output = document.getElementById("terminalOutput");
        if (output) output.innerHTML = "";
      }
      // Ctrl + D - Close terminal overlay (zsh standard exit)
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (overlay) overlay.setAttribute("aria-hidden", "true");
      }
    }

    // 4. Global hotkeys (active only when not typing inside an input)
    if (document.activeElement !== input && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      // Ctrl + Shift + T - Toggle Site Theme
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (themeToggle) themeToggle.click();
      }
      // Ctrl + Shift + L - Switch Page Language
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        if (langSelect) {
          const nextLang = state.lang === "es" ? "en" : "es";
          const btn = langSelect.querySelector(`.lang-switch-btn[data-lang="${nextLang}"]`);
          if (btn) btn.click();
        }
      }
    }
  });
}

function scrollToCurrentHash(behavior = "smooth") {
  const hash = window.location.hash;
  if (!hash || hash === "#") return;
  try {
    const target = document.querySelector(hash);
    if (!target) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        const nav = document.getElementById("navbar");
        const navHeight = nav ? nav.offsetHeight : 70;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - (navHeight + 14);
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: behavior,
        });
        const mobileCta = document.getElementById("mobileCtaBar");
        if (mobileCta) {
          mobileCta.classList.toggle("visible", targetTop > 150);
        }
      }, 100);
    });
  } catch (err) {
    console.warn("Could not scroll to hash target:", hash, err);
  }
}

async function hydrate() {
  state.data = await loadData(state.lang);
  renderStatic(state.data);
  startTyping(state.data);
  observeReveal();
  if (window.location.hash) {
    scrollToCurrentHash("smooth");
  }
}

(async function init() {
  if ("scrollRestoration" in history && window.location.hash) {
    history.scrollRestoration = "manual";
  }
  initParticles();
  initGlobalInteractions();
  initTagHighlighting();
  initSpotlightHighlighting();
  if (CONFIG.enableTerminal) {
    try {
      const mod = await import("./terminal.js");
      mod.initTerminal(state);
    } catch (err) {
      console.error("Error loading terminal module:", err);
    }
  }
  initKeyboardShortcuts();

  window.addEventListener("hashchange", () => {
    scrollToCurrentHash("smooth");
  });

  window.addEventListener("load", () => {
    if (window.location.hash) {
      scrollToCurrentHash("smooth");
    }
  });

  try {
    await hydrate();
  } catch (error) {
    console.error(error);
  }
})();
