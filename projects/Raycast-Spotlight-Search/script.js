"use strict";

const TYPE_META = {
  heading: {
    icon: "#",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    label: "HEADING",
  },
  link: {
    icon: "⌘",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.1)",
    label: "LINK",
  },
  text: {
    icon: "¶",
    color: "#8B8B9E",
    bg: "rgba(139,139,158,0.1)",
    label: "TEXT",
  },
  action: {
    icon: "⚡",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.1)",
    label: "ACTION",
  },
  meta: {
    icon: "◎",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.1)",
    label: "META",
  },
  code: {
    icon: "{}",
    color: "#2DD4BF",
    bg: "rgba(45,212,191,0.1)",
    label: "CODE",
  },
  section: {
    icon: "§",
    color: "#F87171",
    bg: "rgba(248,113,113,0.1)",
    label: "SECTION",
  },
};

const ACTIONS = [
  {
    id: "a-dark",
    title: "Toggle Dark Mode",
    sub: "Switch between light and dark themes",
    category: "actions",
    icon: "◑",
    keywords: ["theme", "dark", "light", "mode", "appearance"],
  },
  {
    id: "a-sidebar",
    title: "Toggle Sidebar",
    sub: "Show or hide the navigation sidebar",
    category: "actions",
    icon: "◧",
    keywords: ["sidebar", "navigation", "hide", "show", "panel"],
  },
  {
    id: "a-print",
    title: "Print Page",
    sub: "Open browser print dialog",
    category: "actions",
    icon: "⎙",
    keywords: ["print", "export", "pdf"],
  },
  {
    id: "a-reload",
    title: "Reload Page",
    sub: "Hard refresh the current page",
    category: "actions",
    icon: "↻",
    keywords: ["reload", "refresh", "reset"],
  },
  {
    id: "a-top",
    title: "Scroll to Top",
    sub: "Jump to the top of the page",
    category: "actions",
    icon: "⬆",
    keywords: ["scroll", "top", "jump", "back"],
  },
  {
    id: "a-bottom",
    title: "Scroll to Bottom",
    sub: "Jump to the bottom of the page",
    category: "actions",
    icon: "⬇",
    keywords: ["scroll", "bottom", "end", "jump"],
  },
  {
    id: "a-copy-url",
    title: "Copy Page URL",
    sub: "Copy the current URL to clipboard",
    category: "actions",
    icon: "⎘",
    keywords: ["copy", "url", "link", "clipboard"],
  },
  {
    id: "a-copy-sel",
    title: "Copy Selected Text",
    sub: "Copy current selection to clipboard",
    category: "actions",
    icon: "⎘",
    keywords: ["copy", "selection", "text", "clipboard"],
  },
  {
    id: "a-zoom-in",
    title: "Zoom In",
    sub: "Increase page zoom level",
    category: "actions",
    icon: "+",
    keywords: ["zoom", "in", "size", "larger"],
  },
  {
    id: "a-zoom-out",
    title: "Zoom Out",
    sub: "Decrease page zoom level",
    category: "actions",
    icon: "−",
    keywords: ["zoom", "out", "size", "smaller"],
  },
  {
    id: "a-zoom-reset",
    title: "Reset Zoom",
    sub: "Reset zoom to 100%",
    category: "actions",
    icon: "⊜",
    keywords: ["zoom", "reset", "100", "normal"],
  },
  {
    id: "a-fullscreen",
    title: "Toggle Fullscreen",
    sub: "Enter or exit fullscreen mode",
    category: "actions",
    icon: "⛶",
    keywords: ["fullscreen", "full", "screen", "expand"],
  },
  {
    id: "a-focus",
    title: "Focus Mode",
    sub: "Hide all UI chrome for distraction-free reading",
    category: "actions",
    icon: "◉",
    keywords: ["focus", "zen", "reading", "distraction"],
  },
  {
    id: "a-share",
    title: "Share Page",
    sub: "Open native share dialog",
    category: "actions",
    icon: "↑",
    keywords: ["share", "social", "send"],
  },
  {
    id: "a-source",
    title: "View Page Source",
    sub: "Open page source in a new tab",
    category: "actions",
    icon: "⟨⟩",
    keywords: ["source", "html", "code", "view"],
  },
  {
    id: "a-devtools",
    title: "Open DevTools",
    sub: "Open browser developer tools (F12)",
    category: "actions",
    icon: "⚙",
    keywords: ["devtools", "developer", "inspect", "debug", "console", "f12"],
  },
  {
    id: "a-index",
    title: "Rebuild Search Index",
    sub: "Force re-index of all page content",
    category: "actions",
    icon: "⟳",
    keywords: ["index", "rebuild", "search", "refresh"],
  },
];

const META_ENTRIES = (() => {
  const getMeta = (name) =>
    document.querySelector(`meta[name="${name}"]`)?.content ||
    document.querySelector(`meta[property="${name}"]`)?.content ||
    "";
  return [
    {
      id: "meta-title",
      title: "Page Title",
      value: document.title,
      category: "meta",
    },
    {
      id: "meta-desc",
      title: "Meta Description",
      value: getMeta("description"),
      category: "meta",
    },
    {
      id: "meta-author",
      title: "Author",
      value: getMeta("author"),
      category: "meta",
    },
    {
      id: "meta-kw",
      title: "Keywords",
      value: getMeta("keywords"),
      category: "meta",
    },
    {
      id: "meta-url",
      title: "Page URL",
      value: location.href,
      category: "meta",
    },
    {
      id: "meta-lang",
      title: "Language",
      value: document.documentElement.lang,
      category: "meta",
    },
    {
      id: "meta-chars",
      title: "Character Count",
      value: (document.body.innerText?.length || 0) + " characters",
      category: "meta",
    },
  ].filter((m) => m.value);
})();

let pageIndex = [];
let indexVersion = 0;
let mutationObserver = null;
let selIdx = -1;
let activeMode = "all";
let spOpen = false;
let zoomLevel = 100;
let sidebarHidden = false;
let reindexTimer = null;
let searchHistory = JSON.parse(localStorage.getItem("sp_history") || "[]");
let recentItems = JSON.parse(localStorage.getItem("sp_recents") || "[]");

function uid() {
  return "si_" + Math.random().toString(36).slice(2, 9);
}
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildIndex() {
  const startT = performance.now();
  const items = [];
  const root = document.getElementById("doc-content") || document.body;

  const seen = new WeakSet();

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          const tag = el.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT")
            return NodeFilter.FILTER_REJECT;
          if (el.closest(".spotlight-backdrop"))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let node;
  while ((node = walker.nextNode())) {
    if (seen.has(node)) continue;
    seen.add(node);

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      const tag = el.tagName;

      if (/^H[1-6]$/.test(tag)) {
        const level = parseInt(tag[1]);
        const text = el.textContent.trim();
        if (!text) continue;
        const anchor = el.id || el.closest("[id]")?.id;
        items.push({
          id: uid(),
          type: "heading",
          title: text,
          sub: `Level ${level} heading` + (anchor ? ` · #${anchor}` : ""),
          level,
          anchor: anchor || null,
          href: anchor ? "#" + anchor : null,
          el,
          section:
            el.closest("section")?.querySelector("h1,h2,h3")?.textContent || "",
          raw: text.toLowerCase(),
        });
        continue;
      }

      if (tag === "A") {
        const text = el.textContent.trim();
        const href = el.getAttribute("href");
        if (!text || !href || seen.has(el)) continue;
        items.push({
          id: uid(),
          type: "link",
          title: text,
          sub: href,
          href,
          el,
          isExternal: /^https?:\/\//.test(href),
          raw: (text + " " + href).toLowerCase(),
        });
        continue;
      }

      if (tag === "CODE" && el.parentElement?.tagName === "PRE") {
        const text = el.textContent.trim().slice(0, 120);
        if (!text) continue;
        items.push({
          id: uid(),
          type: "code",
          title: text.split("\n")[0].slice(0, 60) || "Code block",
          sub: `${el.textContent.trim().split("\n").length} lines`,
          el,
          raw: text.toLowerCase(),
        });
        continue;
      }

      if (tag === "P") {
        const text = el.textContent.trim();
        if (!text || text.length < 20) continue;
        if (items.some((i) => i.el === el)) continue;
        const section =
          el.closest("section")?.querySelector("h1,h2,h3")?.textContent || "";
        items.push({
          id: uid(),
          type: "text",
          title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
          sub: section || "Paragraph",
          fullText: text,
          el,
          section,
          raw: text.toLowerCase(),
        });
        continue;
      }
    }
  }

  ACTIONS.forEach((a) => {
    items.push({
      id: a.id,
      type: "action",
      title: a.title,
      sub: a.sub,
      icon: a.icon,
      keywords: a.keywords,
      raw: [a.title, a.sub, ...(a.keywords || [])].join(" ").toLowerCase(),
    });
  });

  META_ENTRIES.forEach((m) => {
    items.push({
      id: m.id,
      type: "meta",
      title: m.title,
      sub: m.value,
      raw: (m.title + " " + m.value).toLowerCase(),
    });
  });

  pageIndex = items;
  indexVersion++;

  const elapsed = (performance.now() - startT).toFixed(1);
  const statEl = document.getElementById("spIndexStat");
  if (statEl) statEl.textContent = `${items.length} items indexed`;

  return { count: items.length, elapsed };
}

function scheduleReindex() {
  clearTimeout(reindexTimer);
  reindexTimer = setTimeout(() => {
    const r = buildIndex();
    spToast(`Index rebuilt: ${r.count} items`, "⟳");
  }, 300);
}

function initMutationObserver() {
  if (mutationObserver) mutationObserver.disconnect();
  const root = document.getElementById("doc-content") || document.body;
  mutationObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some(
      (m) =>
        (m.type === "childList" &&
          (m.addedNodes.length || m.removedNodes.length)) ||
        (m.type === "characterData" &&
          m.target.parentElement?.matches?.("h1,h2,h3,h4,h5,h6,p,a")),
    );
    if (relevant) scheduleReindex();
  });
  mutationObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function trigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const tg = (s) => {
    const t = new Set();
    for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3));
    return t;
  };
  const ta = tg(a),
    tb = tg(b);
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  return (2 * inter) / (ta.size + tb.size);
}

function scoreItem(item, query) {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, indices: [] };

  const title = item.title.toLowerCase();
  const raw = item.raw || title;
  const keywords = (item.keywords || []).join(" ").toLowerCase();

  if (title === q)
    return {
      score: 3000,
      indices: Array.from({ length: q.length }, (_, i) => i),
    };
  if (title.startsWith(q))
    return {
      score: 2500,
      indices: Array.from({ length: q.length }, (_, i) => i),
    };
  if (raw.includes(q))
    return { score: 2000 - raw.indexOf(q) * 0.5, indices: [] };
  if (keywords.includes(q)) return { score: 1600, indices: [] };

  const swScore = smithWatermanScore(q, title);
  if (swScore.score > 0) {
    const kwBonus = keywords.includes(q.split("").join("")) ? 100 : 0;
    const tg = trigramSimilarity(q, title) * 200;
    return { score: swScore.score + tg + kwBonus, indices: swScore.indices };
  }

  const tg = trigramSimilarity(q, raw);
  if (tg > 0.2) return { score: tg * 300, indices: [] };

  return { score: 0, indices: [] };
}

function smithWatermanScore(query, target) {
  const q = query,
    t = target;
  const m = q.length,
    n = t.length;
  if (m === 0 || n === 0) return { score: 0, indices: [] };

  const MATCH = 10;
  const MISMATCH = -4;
  const GAP_OPEN = -3;
  const GAP_EXT = -1;
  const WORD_BONUS = 7;
  const CONSEC_B = 5;
  const START_B = 9;

  const H = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
  const T = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));

  const wordBoundaries = new Set([0]);
  for (let j = 1; j < n; j++) {
    const c = t[j - 1];
    if (
      c === " " ||
      c === "-" ||
      c === "_" ||
      c === "/" ||
      c === "." ||
      c === "("
    )
      wordBoundaries.add(j);
  }

  let maxH = 0,
    maxI = 0,
    maxJ = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let ms = q[i - 1] === t[j - 1] ? MATCH : MISMATCH;
      if (q[i - 1] === t[j - 1]) {
        if (wordBoundaries.has(j - 1)) ms += WORD_BONUS;
        if (j === 1) ms += START_B;
        if (i > 1 && j > 1 && T[i - 1][j - 1] !== 0) ms += CONSEC_B;
      }
      const d = H[i - 1][j - 1] + ms;
      const u = H[i - 1][j] + (T[i - 1][j] === 2 ? GAP_EXT : GAP_OPEN);
      const l = H[i][j - 1] + (T[i][j - 1] === 3 ? GAP_EXT : GAP_OPEN);
      H[i][j] = Math.max(0, d, u, l);
      if (H[i][j] === 0) T[i][j] = 0;
      else if (H[i][j] === d) T[i][j] = 1;
      else if (H[i][j] === u) T[i][j] = 2;
      else T[i][j] = 3;
      if (H[i][j] > maxH) {
        maxH = H[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }

  const indices = [];
  let ci = maxI,
    cj = maxJ;
  while (ci > 0 && cj > 0 && H[ci][cj] > 0) {
    if (T[ci][cj] === 1) {
      if (q[ci - 1] === t[cj - 1]) indices.unshift(cj - 1);
      ci--;
      cj--;
    } else if (T[ci][cj] === 2) ci--;
    else cj--;
  }
  return { score: maxH, indices };
}

function search(query, mode) {
  if (!query.trim()) return { results: [], query: "" };

  const q = query.trim();
  const modesMap = {
    all: null,
    headings: "heading",
    links: "link",
    text: "text",
    actions: "action",
    meta: "meta",
    code: "code",
  };
  const filterType = modesMap[mode] || null;

  const candidates = filterType
    ? pageIndex.filter((i) => i.type === filterType)
    : pageIndex;

  const scored = [];
  candidates.forEach((item) => {
    const { score, indices } = scoreItem(item, q);
    if (score > 0) scored.push({ item, score, indices });
  });

  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score || 1;
  return {
    results: scored
      .slice(0, 50)
      .map((r) => ({ ...r, normScore: r.score / topScore })),
    query: q,
  };
}

function highlightTitle(title, indices) {
  if (!indices || !indices.length) return esc(title);
  const set = new Set(indices);
  let html = "";
  for (let i = 0; i < title.length; i++) {
    const ch = esc(title[i]);
    html += set.has(i) ? `<span class="sp-match-char">${ch}</span>` : ch;
  }
  return html;
}

function renderResults(results, query) {
  const container = document.getElementById("spResults");
  const countEl = document.getElementById("spCount");
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<div class="sp-empty"><div class="sp-empty-icon">⌕</div><div class="sp-empty-title">No results for "${esc(query)}"</div><div class="sp-empty-sub">Try different keywords or switch the filter mode</div></div>`;
    if (countEl) {
      countEl.textContent = "0";
      countEl.classList.add("hidden");
    }
    return;
  }

  if (countEl) {
    countEl.textContent = `${results.length} result${results.length !== 1 ? "s" : ""}`;
    countEl.classList.remove("hidden");
  }

  const groups = new Map();
  results.forEach((r) => {
    const t = r.item.type;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(r);
  });

  const frag = document.createDocumentFragment();
  let globalIdx = 0;

  const TYPE_ORDER = ["action", "heading", "link", "text", "meta", "code"];
  const orderedGroups = TYPE_ORDER.filter((t) => groups.has(t)).map((t) => [
    t,
    groups.get(t),
  ]);
  groups.forEach((v, k) => {
    if (!TYPE_ORDER.includes(k)) orderedGroups.push([k, v]);
  });

  orderedGroups.forEach(([type, items]) => {
    const meta = TYPE_META[type] || {
      icon: "◆",
      color: "#888",
      label: type.toUpperCase(),
    };
    const groupEl = document.createElement("div");
    groupEl.className = "sp-group";

    const labelEl = document.createElement("div");
    labelEl.className = "sp-group-label";
    labelEl.innerHTML = `${esc(meta.label)} <span class="sp-group-count">${items.length}</span>`;
    groupEl.appendChild(labelEl);

    items.forEach((result) => {
      const { item, indices, normScore } = result;
      const idx = globalIdx++;
      const el = buildResultItem(item, indices, normScore, idx, meta);
      groupEl.appendChild(el);
    });

    frag.appendChild(groupEl);
  });

  container.innerHTML = "";
  container.appendChild(frag);
  selIdx = results.length > 0 ? 0 : -1;
  updateSelection();
}

function buildResultItem(item, indices, normScore, idx, meta) {
  const el = document.createElement("div");
  el.className = "sp-item";
  el.setAttribute("role", "option");
  el.setAttribute("aria-selected", "false");
  el.dataset.idx = idx;
  el.dataset.id = item.id;
  el.dataset.type = item.type;
  el.style.animationDelay = Math.min(idx * 12, 80) + "ms";

  const iconText = item.icon || meta.icon;
  const iconEl = document.createElement("div");
  iconEl.className = "sp-item-icon";
  iconEl.textContent = iconText;
  iconEl.style.color = meta.color;

  const bodyEl = document.createElement("div");
  bodyEl.className = "sp-item-body";
  const titleEl = document.createElement("div");
  titleEl.className = "sp-item-title";
  titleEl.innerHTML = highlightTitle(item.title, indices);
  const subEl = document.createElement("div");
  subEl.className = "sp-item-sub";
  subEl.textContent = item.sub || "";
  bodyEl.append(titleEl, subEl);

  const metaEl = document.createElement("div");
  metaEl.className = "sp-item-meta";
  const typeBadge = document.createElement("span");
  typeBadge.className = "sp-type-badge";
  typeBadge.textContent = meta.label;
  typeBadge.style.background = meta.bg;
  typeBadge.style.color = meta.color;

  if (item.level) {
    const lvl = document.createElement("span");
    lvl.className = "sp-level-badge";
    lvl.textContent = `H${item.level}`;
    metaEl.append(lvl);
  }

  const scoreBar = document.createElement("div");
  scoreBar.className = "sp-score-bar";
  const scoreFill = document.createElement("div");
  scoreFill.className = "sp-score-fill";
  scoreFill.style.width = Math.max(5, normScore * 100) + "%";
  scoreBar.appendChild(scoreFill);

  metaEl.append(typeBadge, scoreBar);
  el.append(iconEl, bodyEl, metaEl);

  el.addEventListener("mouseenter", () => {
    selIdx = idx;
    updateSelection();
  });
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const openNewTab = e.ctrlKey || e.metaKey;
    executeItem(item, openNewTab);
  });

  return el;
}

function renderHome() {
  const container = document.getElementById("spResults");
  const countEl = document.getElementById("spCount");
  if (!container) return;
  if (countEl) countEl.classList.add("hidden");

  const recentActions = recentItems
    .slice(0, 5)
    .map((id) => pageIndex.find((i) => i.id === id))
    .filter(Boolean);
  const headings = pageIndex
    .filter((i) => i.type === "heading" && i.level <= 2)
    .slice(0, 6);
  const topActions = pageIndex.filter((i) => i.type === "action").slice(0, 5);

  const frag = document.createDocumentFragment();
  let globalIdx = 0;

  const addGroup = (title, items) => {
    if (!items.length) return;
    const groupEl = document.createElement("div");
    groupEl.className = "sp-home-group";
    const labelEl = document.createElement("div");
    labelEl.className = "sp-home-group-title";
    labelEl.textContent = title;
    groupEl.appendChild(labelEl);
    items.forEach((item) => {
      const meta = TYPE_META[item.type] || TYPE_META.action;
      groupEl.appendChild(buildResultItem(item, [], 0.5, globalIdx++, meta));
    });
    frag.appendChild(groupEl);
  };

  if (recentActions.length) addGroup("⏱ Recent", recentActions);
  addGroup("📑 Page Sections", headings);
  addGroup("⚡ Quick Actions", topActions);

  container.innerHTML = "";
  container.appendChild(frag);
  selIdx = 0;
  updateSelection();
}

function updateSelection() {
  const items = document.querySelectorAll(".sp-item");
  items.forEach((el, i) => {
    const selected = i === selIdx;
    el.classList.toggle("selected", selected);
    el.setAttribute("aria-selected", selected ? "true" : "false");
    if (selected) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const id = el.dataset.id;
      const item = pageIndex.find((i) => i.id === id);
      if (item) updatePreview(item);
    }
  });
}

function updatePreview(item) {
  const preview = document.getElementById("spPreview");
  if (!preview) return;
  const meta = TYPE_META[item.type] || {};
  let html = `<div class="sp-preview-title" style="color:${meta.color}">${esc(meta.label || item.type)}</div>`;
  html += `<div class="sp-preview-content">`;
  const fullText = item.fullText || item.title || "";
  html += esc(fullText.slice(0, 300)) + (fullText.length > 300 ? "…" : "");
  html += `</div>`;
  if (item.href) html += `<div class="sp-preview-url">${esc(item.href)}</div>`;
  if (item.section)
    html += `<div class="sp-preview-url">§ ${esc(item.section)}</div>`;
  if (item.keywords) {
    html += `<div class="sp-preview-meta">`;
    item.keywords.slice(0, 6).forEach((kw) => {
      html += `<span class="sp-preview-tag" style="background:${meta.bg};color:${meta.color}">${esc(kw)}</span>`;
    });
    html += `</div>`;
  }
  preview.innerHTML = html;
  preview.classList.add("visible");
}

function executeItem(item, newTab = false) {
  recentItems = [item.id, ...recentItems.filter((id) => id !== item.id)].slice(
    0,
    20,
  );
  try {
    localStorage.setItem("sp_recents", JSON.stringify(recentItems));
  } catch {}
  closeSpotlight();

  if (item.type === "action") {
    handleAction(item.id);
    return;
  }

  if (item.href) {
    if (item.isExternal || newTab) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    } else if (item.href.startsWith("#")) {
      const target = document.querySelector(item.href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.focus?.();
        spToast("Navigated to section", "§");
      }
    } else {
      window.location.href = item.href;
    }
    return;
  }

  if (item.el) {
    item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    item.el.classList.add("sp-highlight-flash");
    setTimeout(() => item.el.classList.remove("sp-highlight-flash"), 1200);
    spToast("Found in page", "◉");
    return;
  }

  spToast(item.title, "◆");
}

function handleAction(id) {
  const actions = {
    "a-dark": () => {
      document.documentElement.classList.toggle("light-mode");
      spToast("Theme toggled", "◑");
    },
    "a-sidebar": () => {
      toggleSidebar();
    },
    "a-print": () => {
      window.print();
    },
    "a-reload": () => {
      location.reload();
    },
    "a-top": () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      spToast("Scrolled to top", "⬆");
    },
    "a-bottom": () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      spToast("Scrolled to bottom", "⬇");
    },
    "a-copy-url": () => {
      navigator.clipboard
        .writeText(location.href)
        .then(() => spToast("URL copied!", "⎘"));
    },
    "a-copy-sel": () => {
      const sel = window.getSelection()?.toString();
      if (sel) {
        navigator.clipboard.writeText(sel).then(() => spToast("Copied!", "⎘"));
      } else spToast("No text selected", "⚠");
    },
    "a-zoom-in": () => {
      zoomLevel = Math.min(200, zoomLevel + 10);
      document.body.style.zoom = zoomLevel + "%";
      spToast(`Zoom: ${zoomLevel}%`, "+");
    },
    "a-zoom-out": () => {
      zoomLevel = Math.max(50, zoomLevel - 10);
      document.body.style.zoom = zoomLevel + "%";
      spToast(`Zoom: ${zoomLevel}%`, "−");
    },
    "a-zoom-reset": () => {
      zoomLevel = 100;
      document.body.style.zoom = "100%";
      spToast("Zoom reset to 100%", "⊜");
    },
    "a-fullscreen": () => {
      document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen?.();
      spToast(
        document.fullscreenElement ? "Exited fullscreen" : "Entered fullscreen",
        "⛶",
      );
    },
    "a-focus": () => {
      document.getElementById("sidebar")?.classList.toggle("sp-hidden");
      spToast("Focus mode toggled", "◉");
    },
    "a-share": () => {
      navigator
        .share?.({ title: document.title, url: location.href })
        .catch(() => {});
      spToast("Share dialog opened", "↑");
    },
    "a-source": () => {
      window.open("view-source:" + location.href, "_blank");
    },
    "a-devtools": () => {
      spToast("Press F12 to open DevTools", "⚙");
    },
    "a-index": () => {
      const r = buildIndex();
      spToast(`Re-indexed: ${r.count} items`, "⟳");
    },
  };
  const fn = actions[id];
  if (fn) fn();
  else spToast("Action executed", "⚡");
}

function toggleSidebar() {
  sidebarHidden = !sidebarHidden;
  const sb = document.getElementById("sidebar");
  if (sb) sb.style.display = sidebarHidden ? "none" : "";
  spToast(`Sidebar ${sidebarHidden ? "hidden" : "shown"}`, "◧");
}

function openSpotlight() {
  if (spOpen) return;
  spOpen = true;
  const backdrop = document.getElementById("spotlightBackdrop");
  const input = document.getElementById("spInput");
  backdrop.classList.add("open");
  backdrop.removeAttribute("aria-hidden");
  backdrop.setAttribute("aria-modal", "true");
  if (input) {
    input.value = "";
    input.focus();
  }
  renderHome();
  document.getElementById("spPreview")?.classList.remove("visible");
  const timeEl = document.getElementById("spTimeStat");
  if (timeEl) timeEl.textContent = "";
  document.getElementById("pageRoot")?.setAttribute("aria-hidden", "true");
}

function closeSpotlight() {
  if (!spOpen) return;
  spOpen = false;
  const backdrop = document.getElementById("spotlightBackdrop");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.getElementById("pageRoot")?.removeAttribute("aria-hidden");
  document.getElementById("spCount")?.classList.add("hidden");
  document.getElementById("spPreview")?.classList.remove("visible");
}

function spToast(msg, icon = "◆") {
  const stack = document.getElementById("spToastStack");
  if (!stack) return;
  const t = document.createElement("div");
  t.className = "sp-toast";
  t.innerHTML = `<span style="opacity:0.7">${esc(icon)}</span>${esc(msg)}`;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 220);
  }, 2600);
}

let lastQuery = "",
  lastSearchResult = { results: [], query: "" };

function handleInput(value) {
  const q = value.trim();
  if (q === lastQuery) return;
  lastQuery = q;

  const startT = performance.now();
  if (!q) {
    renderHome();
    document.getElementById("spCount")?.classList.add("hidden");
    document.getElementById("spPreview")?.classList.remove("visible");
    document.getElementById("spTimeStat").textContent = "";
    return;
  }

  lastSearchResult = search(q, activeMode);
  renderResults(lastSearchResult.results, q);

  const elapsed = (performance.now() - startT).toFixed(1);
  const timeEl = document.getElementById("spTimeStat");
  if (timeEl) timeEl.textContent = `${elapsed}ms`;

  if (q && !searchHistory.includes(q)) {
    searchHistory = [q, ...searchHistory].slice(0, 50);
    try {
      localStorage.setItem("sp_history", JSON.stringify(searchHistory));
    } catch {}
  }
}

let inputTimer;
function handleInputDebounced(value) {
  clearTimeout(inputTimer);
  if (value.length <= 2) {
    handleInput(value);
    return;
  }
  inputTimer = setTimeout(() => handleInput(value), 60);
}

function addDynamicContent() {
  const container = document.getElementById("dynamicContent");
  if (!container) return;
  const items = [
    {
      tag: "New Feature Announcement",
      desc: "Introducing the experimental server components API for zero-JS rendering.",
      href: "#experimental",
    },
    {
      tag: "Community Plugin: HeliX Storybook Theme",
      desc: "A custom Storybook theme that matches the Helix design language exactly.",
      href: "https://github.com",
    },
    {
      tag: "Case Study: 40% Faster Load Times",
      desc: "How the team at Vercel reduced bundle size by migrating to Helix's CSS-first approach.",
      href: "#case-studies",
    },
    {
      tag: "Video Tutorial: Building with Tokens",
      desc: "A 20-minute walkthrough of designing with design tokens from Figma to production.",
      href: "https://youtube.com",
    },
    {
      tag: "Accessibility Audit Report Q1 2024",
      desc: "Full WCAG 2.1 audit results with zero critical violations across all 64 components.",
      href: "#accessibility",
    },
  ];
  const item = items[container.children.length % items.length];
  const card = document.createElement("div");
  card.className = "dyn-card";
  card.innerHTML = `<h4><a href="${esc(item.href)}">${esc(item.tag)}</a></h4><p>${esc(item.desc)}</p>`;
  container.prepend(card);
  spToast("Dynamic content added — MutationObserver detected change", "⟳");
}

document.addEventListener("DOMContentLoaded", () => {
  buildIndex();
  initMutationObserver();

  const backdrop = document.getElementById("spotlightBackdrop");
  const input = document.getElementById("spInput");

  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) closeSpotlight();
  });
  document
    .getElementById("spEscKey")
    ?.addEventListener("click", closeSpotlight);
  document
    .getElementById("sidebarTrigger")
    ?.addEventListener("click", openSpotlight);
  document
    .getElementById("sidebarTrigger")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openSpotlight();
    });
  document
    .getElementById("btnOpenSearch")
    ?.addEventListener("click", openSpotlight);
  document
    .getElementById("btnToggleDynamic")
    ?.addEventListener("click", addDynamicContent);

  document.getElementById("spModePills")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".sp-mode-pill");
    if (!pill) return;
    activeMode = pill.dataset.mode;
    document
      .querySelectorAll(".sp-mode-pill")
      .forEach((p) => p.classList.toggle("active", p === pill));
    handleInput(input?.value || "");
  });

  input?.addEventListener("input", (e) => handleInputDebounced(e.target.value));

  input?.addEventListener("keydown", (e) => {
    const items = document.querySelectorAll(".sp-item");
    const count = items.length;
    if (!count) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selIdx = (selIdx + 1) % count;
      updateSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selIdx = (selIdx - 1 + count) % count;
      updateSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedEl = document.querySelector(".sp-item.selected");
      const id = selectedEl?.dataset.id;
      const item = pageIndex.find((i) => i.id === id);
      if (item) executeItem(item, e.ctrlKey || e.metaKey);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const selectedEl = document.querySelector(".sp-item.selected");
      const id = selectedEl?.dataset.id;
      const item = pageIndex.find((i) => i.id === id);
      if (item) {
        updatePreview(item);
        document.getElementById("spPreview")?.classList.add("visible");
      }
    } else if (e.key === "Escape") {
      const preview = document.getElementById("spPreview");
      if (preview?.classList.contains("visible")) {
        preview.classList.remove("visible");
      } else {
        closeSpotlight();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      closeSpotlight();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key === "k") {
      e.preventDefault();
      spOpen ? closeSpotlight() : openSpotlight();
    }
    if (isMeta && e.key === "p") {
      e.preventDefault();
      openSpotlight();
    }
    if (e.key === "Escape" && spOpen) {
      e.preventDefault();
      closeSpotlight();
    }
    if (!spOpen && e.key === "/" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      openSpotlight();
    }
  });

  document.querySelectorAll(".sb-link, .doc-article a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          document
            .querySelectorAll(".sb-link")
            .forEach((l) => l.classList.toggle("active", l === link));
        }
      }
    });
  });

  const inpBox = document.getElementById("spInput");
  inpBox?.addEventListener("focus", () => {
    document.getElementById("spModeIcon").textContent = "⌕";
  });

  setTimeout(() => {
    const stat = document.getElementById("spIndexStat");
    if (stat) stat.textContent = `${pageIndex.length} items indexed`;
  }, 100);
});
