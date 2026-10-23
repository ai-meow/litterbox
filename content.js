// Litterbox — hide files from the GitHub PR "changes" view and recount lines.
//
// Data source: GitHub's embedded React payload (diffSummaries) gives, per file,
// path, pathDigest (diff block id = "diff-<pathDigest>"), linesAdded, linesDeleted.
// Hiding is done with a generated <style> so it survives React re-renders and
// virtualized diffs mounting later.

(() => {
  const STORAGE_KEY = "excludePatterns";
  const DEFAULT_PATTERNS = "*.test.*, *.spec.*, *.snap, **/__snapshots__/**";
  const PR_CHANGES_RE = /^\/[^/]+\/[^/]+\/pull\/\d+\/(changes|files)/;

  let patterns = DEFAULT_PATTERNS;
  let summariesCache = { url: null, data: null };
  let styleEl = null;

  // ---------- storage (chrome.storage when available, localStorage fallback) ----------

  const store = {
    async get() {
      try {
        if (globalThis.chrome?.storage?.sync) {
          const r = await chrome.storage.sync.get(STORAGE_KEY);
          return r[STORAGE_KEY];
        }
      } catch {}
      try { return localStorage.getItem("litterbox:" + STORAGE_KEY); } catch {}
    },
    async set(value) {
      try {
        if (globalThis.chrome?.storage?.sync) return void (await chrome.storage.sync.set({ [STORAGE_KEY]: value }));
      } catch {}
      try { localStorage.setItem("litterbox:" + STORAGE_KEY, value); } catch {}
    },
  };

  // ---------- pattern matching ----------

  // Comma/newline separated. Supports * (no slash), ** (anything), ?.
  // Pattern without "/" matches the file name; with "/" matches the full path
  // (anchored at a directory boundary). Plain text without wildcards = substring.
  function compile(raw) {
    return raw
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        if (!/[*?]/.test(p)) return (path) => path.includes(p);
        const re = globToRegExp(p.replace(/^\/+/, ""));
        if (!p.includes("/")) return (path) => re.test(path.slice(path.lastIndexOf("/") + 1));
        return (path) => re.test(path);
      });
  }

  function globToRegExp(glob) {
    let re = "";
    for (let i = 0; i < glob.length; i++) {
      const c = glob[i];
      if (c === "*") {
        if (glob[i + 1] === "*") {
          i++;
          if (glob[i + 1] === "/") { i++; re += "(?:.*/)?"; } else re += ".*";
        } else re += "[^/]*";
      } else if (c === "?") re += "[^/]";
      else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp("^(?:.*/)?" + re + "$");
  }

  // ---------- diff summaries ----------

  function extractSummaries(json) {
    return json?.payload?.pullRequestsChangesRoute?.diffSummaries ?? null;
  }

  function summariesFromDocument(doc) {
    for (const s of doc.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
      try {
        const d = extractSummaries(JSON.parse(s.textContent));
        if (d) return d;
      } catch {}
    }
    return null;
  }

  async function getSummaries() {
    const url = location.pathname;
    if (summariesCache.url === url && summariesCache.data) return summariesCache.data;

    // After a soft (SPA) navigation the embedded script can belong to another
    // page, so only trust it if the paths match the rendered file tree.
    let data = summariesFromDocument(document);
    if (data && !matchesTree(data)) data = null;

    if (!data) {
      try {
        const html = await (await fetch(location.href, { credentials: "include" })).text();
        data = summariesFromDocument(new DOMParser().parseFromString(html, "text/html"));
      } catch {}
    }
    if (data) summariesCache = { url, data };
    return data;
  }

  function matchesTree(data) {
    const leaf = document.querySelector('[role="tree"] [role="treeitem"]:not([aria-expanded])');
    return !leaf || data.some((d) => d.path === leaf.id);
  }

  // ---------- UI ----------

  function ensureBar() {
    let bar = document.getElementById("for-bar");
    if (bar && bar.isConnected) return bar;

    const filter = document.getElementById("diff-file-tree-filter");
    if (!filter) return null;

    bar = document.createElement("div");
    bar.id = "for-bar";
    bar.innerHTML = `<div id="for-stats"></div>`;
    filter.insertAdjacentElement("afterend", bar);
    return bar;
  }

  // Adds an "Exclude files" group with a textarea to the file filter dropdown
  // (the ActionMenu next to "Filter files…"). It is re-created on every open.
  function injectIntoFilterMenu(menu) {
    if (menu.querySelector("#for-exclude")) return;

    const divider = menu.querySelector(':scope > li[class*="ActionList-Divider"]')?.cloneNode(false);
    const heading = menu.querySelector('[class*="ActionList-GroupHeadingWrap"]');

    const group = document.createElement("li");
    group.setAttribute("role", "none");
    group.id = "for-group";
    group.innerHTML = `
      <div class="${heading?.className ?? ""}" role="presentation">
        <label for="for-exclude" class="${heading?.firstElementChild?.className ?? ""}">Exclude files</label>
      </div>
      <textarea id="for-exclude" rows="3" spellcheck="false"
                placeholder="*.test.tsx, **/__snapshots__/**"
                title="Comma or newline separated. * = any chars except /, ** = any path. No wildcard = substring."></textarea>`;

    const textarea = group.querySelector("textarea");
    textarea.value = patterns;

    // Keep the menu's keyboard navigation / typeahead / Escape-to-close from
    // eating keystrokes meant for the textarea.
    for (const type of ["keydown", "keyup", "keypress"]) {
      textarea.addEventListener(type, (e) => {
        if (e.key !== "Escape") e.stopPropagation();
      });
    }

    let t;
    textarea.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        patterns = textarea.value;
        store.set(patterns);
        apply();
      }, 150);
    });

    if (divider) menu.append(divider);
    menu.append(group);
  }

  function findFilterMenu() {
    const btn = document.querySelector('#diff-file-tree-filter button[aria-haspopup]');
    if (btn?.getAttribute("aria-expanded") !== "true") return null;
    const menus = [...document.querySelectorAll('ul[role="menu"]')];
    return menus.find((m) => /File extensions/.test(m.textContent)) ?? (menus.length === 1 ? menus[0] : null);
  }

  function renderStats(total, kept, hiddenCount) {
    const el = document.getElementById("for-stats");
    if (!el) return;
    const fmt = (n) => n.toLocaleString();
    el.innerHTML = "";
    const add = Object.assign(document.createElement("span"), { className: "for-add", textContent: "+" + fmt(kept.add) });
    const del = Object.assign(document.createElement("span"), { className: "for-del", textContent: "−" + fmt(kept.del) });
    const info = document.createElement("span");
    info.textContent = hiddenCount
      ? `${kept.files}/${total.files} files · ${hiddenCount} hidden (+${fmt(total.add - kept.add)} −${fmt(total.del - kept.del)})`
      : `${total.files} files`;
    el.append(add, del, info);
  }

  // ---------- apply ----------

  async function apply() {
    if (!PR_CHANGES_RE.test(location.pathname)) {
      if (styleEl) styleEl.textContent = "";
      return;
    }
    if (!ensureBar()) return;

    const data = await getSummaries();
    if (!data) return;

    const matchers = compile(patterns);
    const hidden = data.filter((d) => matchers.some((m) => m(d.path)));
    const hiddenSet = new Set(hidden.map((d) => d.path));

    const sum = (arr) => arr.reduce(
      (a, d) => ({ add: a.add + (d.linesAdded || 0), del: a.del + (d.linesDeleted || 0), files: a.files + 1 }),
      { add: 0, del: 0, files: 0 }
    );
    const kept = data.filter((d) => !hiddenSet.has(d.path));
    renderStats(sum(data), sum(kept), hidden.length);

    // Directories whose every file is hidden.
    const dirs = new Set();
    for (const d of data) {
      const parts = d.path.split("/");
      for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
    }
    const hiddenDirs = [...dirs].filter((dir) =>
      data.every((d) => !d.path.startsWith(dir + "/") || hiddenSet.has(d.path))
    );

    const selectors = [];
    for (const d of hidden) {
      selectors.push(`[role="tree"] li[id="${CSS.escape(d.path)}"]`);
      if (d.pathDigest) {
        const id = `#diff-${CSS.escape(d.pathDigest)}`;
        // The wrapper reserves height via contain-intrinsic-size, hide it too.
        selectors.push(id, `[class*="diffEntry__"]:has(> ${id})`);
      }
    }
    for (const dir of hiddenDirs) selectors.push(`[role="tree"] li[id="${CSS.escape(dir)}"]`);

    if (!styleEl || !styleEl.isConnected) {
      styleEl = document.createElement("style");
      styleEl.id = "for-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = selectors.length ? selectors.join(",\n") + " { display: none !important; }" : "";
  }

  // ---------- bootstrap & SPA navigation ----------

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!PR_CHANGES_RE.test(location.pathname)) return;
      // Only re-run when our bar is missing (React re-render / navigation).
      if (!document.getElementById("for-bar")) apply();
      const menu = findFilterMenu();
      if (menu) injectIntoFilterMenu(menu);
    });
  }

  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      apply();
    }
    schedule();
  }).observe(document.body, { childList: true, subtree: true });

  store.get().then((v) => {
    if (typeof v === "string") patterns = v;
    apply();
  });
})();
