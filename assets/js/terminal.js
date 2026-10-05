/**
 * Terminal Emulator Module
 * Self-mounting module: Dynamically injects DOM and binds interactions
 * when CONFIG.enableTerminal is true.
 */

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mountTerminalDOM() {
  if (document.getElementById("terminalTrigger") && document.getElementById("terminalOverlay")) {
    return;
  }
  const root = document.createElement("div");
  root.id = "terminal-mount-root";
  root.innerHTML = `
    <button class="terminal-trigger" id="terminalTrigger" aria-label="Abrir terminal de desarrollo" title="Abrir terminal (Ctrl + \`)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
    </button>
    <div class="terminal-overlay" id="terminalOverlay" aria-hidden="true" role="dialog">
      <div class="terminal-container" style="elevation: 2">
        <div class="terminal-header">
          <div class="terminal-buttons">
            <span class="t-btn t-close" id="terminalCloseBtn" role="button" tabindex="0" aria-label="Cerrar terminal" title="Cerrar (Esc)"></span>
            <span class="t-btn t-minimize" id="terminalMinBtn" role="button" tabindex="0" aria-label="Minimizar terminal" title="Minimizar"></span>
            <span class="t-btn t-maximize" id="terminalMaxBtn" role="button" tabindex="0" aria-label="Pantalla completa" title="Pantalla completa"></span>
          </div>
          <div class="terminal-title">enmanuel-leon-shell &middot; zsh</div>
          <button class="terminal-sync-btn" id="terminalSyncBtn" title="Cambiar tema de terminal (Oscuro / Claro)" aria-label="Cambiar tema de terminal">🌓</button>
        </div>
        <div class="terminal-body" id="terminalBody">
          <div class="terminal-output" id="terminalOutput"></div>
          <div class="terminal-input-line">
            <span class="terminal-prompt">enmanuel@guest ~ %</span>
            <input type="text" class="terminal-input" id="terminalInput" autocomplete="off" spellcheck="false" aria-label="Línea de comandos" />
          </div>
        </div>
        <div class="terminal-footer-guide">
          <span><b>Ctrl + \`</b> Alternar</span>
          <span><b>Esc</b> Cerrar</span>
          <span><b>Ctrl + L</b> Limpiar</span>
          <span><b>Ctrl + D</b> Salir</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);
}

export function applyTerminalTheme(theme) {
  const container = document.querySelector(".terminal-container");
  if (!container) return;
  container.classList.remove("theme-classic-light");
  if (theme === "light") {
    container.classList.add("theme-classic-light");
  }
}

export function initTerminal(state) {
  mountTerminalDOM();

  const trigger = document.getElementById("terminalTrigger");
  const overlay = document.getElementById("terminalOverlay");
  const closeBtn = document.getElementById("terminalCloseBtn");
  const minBtn = document.getElementById("terminalMinBtn");
  const maxBtn = document.getElementById("terminalMaxBtn");
  const input = document.getElementById("terminalInput");
  const output = document.getElementById("terminalOutput");
  const container = document.querySelector(".terminal-container");
  const syncBtn = document.getElementById("terminalSyncBtn");

  if (!trigger || !overlay || !input) return;

  const cmdHistory = JSON.parse(sessionStorage.getItem("terminal-history")) || [];

  function print(text, type = "normal") {
    const div = document.createElement("div");
    div.className = `terminal-line type-${type}`;
    div.innerHTML = text;
    if (output) output.appendChild(div);
    const body = document.getElementById("terminalBody");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function printWelcome() {
    if (output) output.innerHTML = "";
    print("Welcome to Enmanuel's Interactive Shell (v1.0.0)", "welcome");
    print("Type <span class='cmd'>help</span> to list all available commands.", "info");
    print("");
  }

  const getVirtualFiles = () => {
    const paragraphs = state.data ? state.data.about.paragraphs.join("\n\n") : "Enmanuel Leon — Senior Software Engineer | Sistemas Distribuidos & Agentic AI | Cloud Architecture (AWS/GCP)";
    
    let skillsStr = "--- TECHNICAL STACK ---\n";
    if (state.data && state.data.skills) {
      state.data.skills.categories.forEach(cat => {
        skillsStr += `${cat.title}:\n`;
        const items = cat.items.map(i => typeof i === "string" ? `  • ${i}` : `  • ${i.name || i}`).join("\n");
        skillsStr += `${items}\n\n`;
      });
    } else {
      skillsStr += "JavaScript, TypeScript, Node.js, Python, Fastify, AWS, GCP, Redis, BullMQ, React\n";
    }

    let expStr = "--- EXPERIENCE TIMELINE ---\n";
    if (state.data && state.data.experience) {
      state.data.experience.items.forEach(job => {
        expStr += `[${job.period}] ${job.role} at ${job.company}\n`;
        job.bullets.forEach(b => {
          expStr += `  • ${b}\n`;
        });
        expStr += "\n";
      });
    } else {
      expStr += "Senior Software Engineer | Sistemas Distribuidos & Agentic AI | Cloud Architecture (AWS/GCP)\n";
    }

    let eduStr = "--- EDUCATION ---\n";
    if (state.data && state.data.education) {
      state.data.education.items.forEach(edu => {
        eduStr += `[${edu.period}] ${edu.degree}\n  ${edu.school}\n\n`;
      });
    } else {
      eduStr += "Ingeniería de Computación - Universidad José Antonio Páez (2017 - 2020)\n";
    }

    let contactStr = "--- CONTACT DETAILS ---\n";
    contactStr += "Email: contact@enmanuel-leon.com\nLinkedIn: linkedin.com/in/enmanuel-leon\nGitHub: github.com/enmanuel-leon\n";

    return {
      "about.txt": paragraphs,
      "skills.txt": skillsStr.trim(),
      "experience.txt": expStr.trim(),
      "education.txt": eduStr.trim(),
      "contact.txt": contactStr.trim()
    };
  };

  const commands = {
    help: () => {
      print("Available commands:");
      print("  <span class='cmd'>cat &lt;file&gt;</span>         - Display content of a file");
      print("  <span class='cmd'>ls</span>                  - List files in virtual filesystem");
      print("  <span class='cmd'>whoami</span>              - Show current role and status");
      print("  <span class='cmd'>skills</span>              - Print structured technical skills");
      print("  <span class='cmd'>experience</span>          - Print career trajectory");
      print("  <span class='cmd'>contact</span>             - Show direct reach out channels");
      print("  <span class='cmd'>theme &lt;dark|light&gt;</span>  - Toggle terminal visual theme");
      print("  <span class='cmd'>clear</span>               - Clear terminal screen (Ctrl + L)");
      print("  <span class='cmd'>exit</span>                - Close terminal overlay (Esc)");
    },
    ls: () => {
      const files = Object.keys(getVirtualFiles()).join("   ");
      print(files, "info");
    },
    cat: (args) => {
      if (!args || !args[0]) {
        print("cat: missing file operand. Example: cat skills.txt", "error");
        return;
      }
      const files = getVirtualFiles();
      const filename = args[0].toLowerCase();
      if (files[filename]) {
        print(escapeHtml(files[filename]).replace(/\n/g, "<br/>"));
      } else {
        print(`cat: ${escapeHtml(args[0])}: No such file or directory`, "error");
      }
    },
    whoami: () => {
      print("Enmanuel Leon — Senior Software Engineer | Sistemas Distribuidos & Agentic AI | Cloud Architecture (AWS/GCP)", "info");
    },
    skills: () => {
      commands.cat(["skills.txt"]);
    },
    experience: () => {
      commands.cat(["experience.txt"]);
    },
    contact: () => {
      commands.cat(["contact.txt"]);
    },
    theme: (args) => {
      const choice = args && args[0] ? args[0].toLowerCase() : "";
      if (choice === "light") {
        applyTerminalTheme("light");
        print("Terminal theme set to: <b>Light Mode ☀️</b>", "info");
      } else if (choice === "dark") {
        applyTerminalTheme("dark");
        print("Terminal theme set to: <b>Dark Mode 🌙</b>", "info");
      } else {
        const isCurrentlyLight = container ? container.classList.contains("theme-classic-light") : false;
        const newTheme = isCurrentlyLight ? "dark" : "light";
        applyTerminalTheme(newTheme);
        print(`Terminal theme toggled to: <b>${newTheme === "light" ? "Light Mode ☀️" : "Dark Mode 🌙"}</b>`, "info");
      }
    },
    clear: () => {
      if (output) output.innerHTML = "";
    },
    exit: () => {
      overlay.setAttribute("aria-hidden", "true");
    }
  };

  trigger.addEventListener("click", () => {
    overlay.setAttribute("aria-hidden", "false");
    if (container) {
      container.classList.remove("minimized");
      overlay.classList.remove("minimized-mode");
    }
    printWelcome();
    setTimeout(() => input.focus(), 50);
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.setAttribute("aria-hidden", "true");
    });
  }

  if (minBtn) {
    minBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (container) {
        container.classList.toggle("minimized");
        overlay.classList.toggle("minimized-mode");
      }
    });
  }

  if (maxBtn) {
    maxBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (container) {
        container.classList.toggle("fullscreen");
      }
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isCurrentlyLight = container ? container.classList.contains("theme-classic-light") : false;
      const nextTheme = isCurrentlyLight ? "dark" : "light";
      applyTerminalTheme(nextTheme);
      print(`Terminal theme changed to: <b>${nextTheme === "light" ? "Light Mode ☀️" : "Dark Mode 🌙"}</b>`, "info");
    });
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const line = input.value.trim();
      input.value = "";
      if (!line) return;

      print(`<span class='terminal-prompt'>enmanuel@guest ~ %</span> <span class='user-input-line'>${escapeHtml(line)}</span>`);
      cmdHistory.push(line);
      sessionStorage.setItem("terminal-history", JSON.stringify(cmdHistory));
      
      const tokens = line.split(/\s+/);
      const cmd = tokens[0].toLowerCase();
      const args = tokens.slice(1);
      
      if (commands[cmd]) {
        commands[cmd](args);
      } else {
        print(`zsh: command not found: ${escapeHtml(tokens[0])}. Type 'help' for options.`, "error");
      }
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.setAttribute("aria-hidden", "true");
    } else if (container && !container.classList.contains("minimized")) {
      input.focus();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "`") {
      e.preventDefault();
      const isHidden = overlay.getAttribute("aria-hidden") === "true";
      if (isHidden) {
        trigger.click();
      } else {
        overlay.setAttribute("aria-hidden", "true");
      }
    }
    if (e.key === "Escape" && overlay.getAttribute("aria-hidden") === "false") {
      overlay.setAttribute("aria-hidden", "true");
    }
    if (document.activeElement === input) {
      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        commands.clear();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        commands.exit();
      }
    }
  });
}
