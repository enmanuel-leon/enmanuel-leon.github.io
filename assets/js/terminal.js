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
    <button class="terminal-trigger" id="terminalTrigger" aria-label="Abrir terminal de desarrollo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
    </button>
    <div class="terminal-overlay" id="terminalOverlay" aria-hidden="true" role="dialog">
      <div class="terminal-container" style="elevation: 2">
        <div class="terminal-header">
          <div class="terminal-buttons">
            <span class="t-btn t-close" id="terminalCloseBtn" role="button" tabindex="0" aria-label="Cerrar terminal" title="Cerrar terminal">✕</span>
            <span class="t-btn t-minimize" aria-hidden="true"></span>
            <span class="t-btn t-maximize" aria-hidden="true"></span>
          </div>
          <div class="terminal-title">enmanuel-leon-shell &middot; zsh</div>
          <button class="terminal-sync-btn" id="terminalSyncBtn" title="Sync with System Theme" aria-label="Sincronizar con tema del sistema">🌓</button>
        </div>
        <div class="terminal-body" id="terminalBody">
          <div class="terminal-output" id="terminalOutput"></div>
          <div class="terminal-input-line">
            <span class="terminal-prompt">enmanuel@guest ~ %</span>
            <input type="text" class="terminal-input" id="terminalInput" autocomplete="off" spellcheck="false" aria-label="Línea de comandos" />
          </div>
        </div>
        <div class="terminal-footer-guide">
          <span><b>Ctrl + \`</b> Toggle</span>
          <span><b>Esc</b> Close</span>
          <span><b>Ctrl + L</b> Clear</span>
          <span><b>Ctrl + D</b> Exit</span>
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
  const input = document.getElementById("terminalInput");
  const output = document.getElementById("terminalOutput");
  const minBtn = document.querySelector(".t-minimize");
  const maxBtn = document.querySelector(".t-maximize");
  const container = document.querySelector(".terminal-container");
  const header = document.querySelector(".terminal-header");
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
    const paragraphs = state.data ? state.data.about.paragraphs.join("\n\n") : "Enmanuel Leon — Senior Fullstack Engineer";
    
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
    if (state.data) {
      state.data.experience.items.forEach(job => {
        expStr += `[${job.period}] ${job.role} at ${job.company}\n`;
        job.bullets.forEach(b => {
          expStr += `  • ${b}\n`;
        });
        expStr += "\n";
      });
    } else {
      expStr += "Senior Fullstack Engineer\n";
    }

    let eduStr = "--- EDUCATION ---\n";
    if (state.data && state.data.education) {
      state.data.education.items.forEach(edu => {
        eduStr += `[${edu.period}] ${edu.degree}\n  ${edu.school}\n  ${edu.description}\n\n`;
      });
    } else {
      eduStr += "Ingeniería de Computación - Universidad José Antonio Páez (2017 - 2020)\n";
    }

    let contactStr = "--- CONTACT DETAILS ---\n";
    if (state.data && state.data.contact) {
      contactStr += `Location: ${state.data.contact.items[0] ? state.data.contact.items[0].value : "Remote"}\n`;
      contactStr += `Email: contact@enmanuel-leon.com\nLinkedIn: linkedin.com/in/enmanuel-leon\nGitHub: github.com/enmanuel-leon\n`;
    }

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
      print("  <span class='cmd'>experience</span>          - Print concise career overview");
      print("  <span class='cmd'>contact</span>             - Show direct reach out channels");
      print("  <span class='cmd'>clear</span>               - Clear terminal screen (Ctrl + L)");
      print("  <span class='cmd'>exit</span>                - Close terminal overlay (Ctrl + D / Esc)");
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
      print("Enmanuel Leon — Senior Fullstack & Distributed Systems Engineer", "info");
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
    clear: () => {
      if (output) output.innerHTML = "";
    },
    exit: () => {
      overlay.setAttribute("aria-hidden", "true");
    }
  };

  trigger.addEventListener("click", () => {
    overlay.setAttribute("aria-hidden", "false");
    printWelcome();
    input.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      overlay.setAttribute("aria-hidden", "true");
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

  overlay.addEventListener("click", () => {
    if (container && !container.classList.contains("minimized")) {
      input.focus();
    }
  });

  // Self-contained keyboard shortcuts for terminal
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
  });
}
