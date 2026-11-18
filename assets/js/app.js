/**
 * Progressive enhancement for the static CV pages.
 *
 * The pages are pre-rendered by scripts/build-site.mjs. This module only adds
 * stateful UI: theme persistence, the mobile menu, the native download dialog,
 * copy-to-clipboard, and scroll-aware affordances. No CV data is fetched here.
 */

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const liveStatus = document.getElementById("liveStatus");

const ui = (() => {
  const element = document.getElementById("ui-data");
  if (!element) return {};
  try {
    return JSON.parse(element.textContent);
  } catch {
    return {};
  }
})();

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private/locked-down contexts; the UI still works.
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage; the in-memory theme still changes.
  }
}

function systemTheme() {
  return systemDark.matches ? "dark" : "light";
}

function applyTheme(theme, { persist = false, clear = false } = {}) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  themeMetas.forEach((meta) => {
    meta.content = theme === "dark" ? "#0b1018" : "#f4f6f9";
  });
  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? ui.themeLight || "Switch to light theme" : ui.themeDark || "Switch to dark theme",
    );
  }
  if (persist) storageSet("theme", theme);
  if (clear) storageRemove("theme");
}

function announce(message) {
  if (!liveStatus || !message) return;
  liveStatus.textContent = "";
  window.requestAnimationFrame(() => {
    liveStatus.textContent = message;
  });
}

function initTheme() {
  const initial =
    root.dataset.theme === "light" || root.dataset.theme === "dark"
      ? root.dataset.theme
      : systemTheme();
  applyTheme(initial);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = root.dataset.theme === "light" ? "light" : "dark";
      const next = current === "dark" ? "light" : "dark";
      if (next === systemTheme()) {
        applyTheme(next, { clear: true });
      } else {
        applyTheme(next, { persist: true });
      }
    });
  }

  const onSystemChange = (event) => {
    if (storageGet("theme") === null) {
      applyTheme(event.matches ? "dark" : "light");
    }
  };

  if (typeof systemDark.addEventListener === "function") {
    systemDark.addEventListener("change", onSystemChange);
  } else if (typeof systemDark.addListener === "function") {
    systemDark.addListener(onSystemChange);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== "theme") return;
    const stored = event.newValue;
    applyTheme(
      stored === "light" || stored === "dark" ? stored : systemTheme(),
    );
  });
}

function initMenu() {
  const menu = document.getElementById("mobileNav");
  const button = document.getElementById("menuBtn");
  if (!menu || !button) return;

  menu.addEventListener("toggle", (event) => {
    const open = event.newState === "open";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? ui.menuClose || "Close menu" : ui.menuOpen || "Open menu");
  });

  button.addEventListener("click", () => {
    const willOpen = !menu.matches(":popover-open");
    button.setAttribute("aria-expanded", String(willOpen));
    button.setAttribute("aria-label", willOpen ? ui.menuClose || "Close menu" : ui.menuOpen || "Open menu");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (menu.matches(":popover-open")) menu.hidePopover();
    });
  });
}

function initDialog() {
  const dialog = document.getElementById("downloadDialog");
  if (!dialog) return;

  document.querySelectorAll("[data-open-download]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) dialog.close();
  });

  dialog.querySelectorAll("a[download]").forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(() => {
        if (dialog.open) dialog.close();
      }, 150);
    });
  });
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Copy failed");
}

function initCopyEmail() {
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    const label = button.querySelector(".copy-label");
    const original = label ? label.textContent : "";

    button.addEventListener("click", async () => {
      try {
        await copyText(button.dataset.copyEmail || "");
        button.classList.add("is-copied");
        if (label) label.textContent = ui.copied || "Copied";
        announce(ui.copied || "Copied");
        window.setTimeout(() => {
          button.classList.remove("is-copied");
          if (label) label.textContent = original;
        }, 2000);
      } catch {
        if (label) label.textContent = ui.copyFailed || "Copy failed";
        announce(ui.copyFailed || "Copy failed");
        window.setTimeout(() => {
          if (label) label.textContent = original;
        }, 2000);
      }
    });
  });
}

function initVisibility() {
  const header = document.getElementById("siteHeader");
  const backToTop = document.getElementById("backToTop");
  const mobileCta = document.getElementById("mobileCta");
  const topSentinel = document.getElementById("topSentinel");
  const sectionSentinel = document.getElementById("sectionSentinel");
  const railActions = document.getElementById("railActions");

  if (header && topSentinel) {
    new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-scrolled", !entry.isIntersecting),
      { threshold: 0 },
    ).observe(topSentinel);
  }

  if (backToTop && sectionSentinel) {
    new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = entry.boundingClientRect.top < 0;
        backToTop.classList.toggle("is-visible", !entry.isIntersecting && scrolledPast);
      },
      { threshold: 0 },
    ).observe(sectionSentinel);
  }

  if (mobileCta && railActions) {
    new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = entry.boundingClientRect.top < 0;
        const visible = !entry.isIntersecting && scrolledPast;
        mobileCta.classList.toggle("is-visible", visible);
        document.body.classList.toggle("cta-visible", visible);
      },
      { threshold: 0 },
    ).observe(railActions);
  }
}

function initScrollSpy() {
  const links = [...document.querySelectorAll("[data-nav]")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (sections.length === 0) return;

  const header = document.getElementById("siteHeader");
  const offset = () => (header ? header.offsetHeight : 64) + 24;
  let ticking = false;

  const setActive = (id) => {
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const update = () => {
    let current = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset()) current = section.id;
    }
    setActive(current);
    ticking = false;
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", update, { passive: true });
  }
  update();
}

function init() {
  initTheme();
  initMenu();
  initDialog();
  initCopyEmail();
  initVisibility();
  initScrollSpy();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
