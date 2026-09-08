"use strict";

/**
 * ============================================================================
 * INFINITE VIRTUAL SCROLL ENGINE
 * 
 * Advanced Virtualization with O(1) math-based offset calculation,
 * Dynamic Data Generation, Searching, Filtering, and Theming.
 * ============================================================================
 */

const TOTAL = 1_000_000;
const BUFFER = 12;
const H_ROW = 52;
const MAX_SCROLL_HEIGHT = 30_000_000; // Cap to avoid browser div height overflow

// ============================================================================
// DATA DICTIONARIES & MOCK GENERATION
// ============================================================================

const STATUSES = ["open", "closed", "pending", "merged", "draft", "archived", "flagged", "review", "blocked", "stale"];
const CATS = ["feat", "fix", "chore", "docs", "refactor", "test", "perf", "build", "ci", "style", "revert"];
const USERS = ["AK", "SR", "JL", "MR", "TN", "PK", "DF", "CW", "BM", "LH", "JD", "AS", "RJ", "EL", "ZT"];

const AVATAR_COLORS = [
  ["#1d3f7c", "#60a5fa"], ["#3d1a5a", "#c084fc"], ["#0d3d28", "#34d399"],
  ["#5a3a00", "#fbbf24"], ["#2d3a4d", "#94a3b8"], ["#0c2e45", "#38bdf8"],
  ["#5a1e1e", "#f87171"], ["#1a3a1a", "#4ade80"], ["#3a1a3a", "#e879f9"],
  ["#1a2e1a", "#86efac"], ["#2d1a3a", "#e879f9"], ["#1a1a3a", "#818cf8"],
  ["#3a2e1a", "#fde047"], ["#1a3a2e", "#6ee7b7"], ["#3a1a2e", "#f9a8d4"]
];

const ACTION_VERBS = [
  "Implement", "Fix", "Refactor", "Update", "Remove", "Deprecate", "Add",
  "Optimize", "Resolve", "Consolidate", "Migrate", "Revert", "Review", "Test"
];

const DOMAINS = [
  "API gateway", "WebSocket connection pool", "OAuth 2.1", "microservices",
  "query builder", "TLS certificates", "Lambda functions", "event queue processor",
  "payment flow", "REST endpoints", "cursor-based pagination", "scheduler",
  "ingestion pipeline", "user dashboard", "feature flag service", "build toolchain",
  "S3 URLs", "search index", "order lifecycle", "webhook delivery", "CSV exports",
  "design system", "dependencies", "Postgres security", "CI pipeline", "data table"
];

const ADJECTIVES = [
  "adaptive", "memory", "distributed", "better", "cold start", "race", "E2E",
  "legacy", "timezone", "Prometheus", "N+1", "exponential", "presigned",
  "full-text", "UTF-8", "row-level", "flaky", "real-time", "unused"
];

const generateMockTitle = (i) => {
  const verb = ACTION_VERBS[(i * 3 + 1) % ACTION_VERBS.length];
  const adj = ADJECTIVES[(i * 7 + 2) % ADJECTIVES.length];
  const domain = DOMAINS[(i * 11 + 3) % DOMAINS.length];
  return `${verb} ${adj} logic for ${domain}`;
};

const generateCommitHash = (i) => {
  const chars = "0123456789abcdef";
  let hash = "";
  let seed = i * 1664525 + 1013904223;
  for (let j = 0; j < 7; j++) {
    hash += chars[(seed >>> (j * 4)) & 0xf];
  }
  return hash;
};

// ============================================================================
// SYSTEM STATE
// ============================================================================

const State = {
  totalRecords: TOTAL,
  totalHeight: TOTAL * H_ROW,
  searchQuery: "",
  sortColumn: null,
  sortOrder: "asc",
  theme: "light",
  isExporting: false,
  metrics: {
    renders: 0,
    scrollEvents: 0,
    lastRenderTime: 0
  }
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const scrollWrap = document.getElementById("scrollWrap");
const scrollInner = document.getElementById("scrollInner");
const spacerTop = document.getElementById("spacerTop");
const spacerBottom = document.getElementById("spacerBottom");
const rowPool = document.getElementById("rowPool");
const sRendered = document.getElementById("sRendered");
const sRow = document.getElementById("sRow");
const sOffset = document.getElementById("sOffset");
const sProgress = document.getElementById("sProgress");
const progFill = document.getElementById("progFill");

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
  setupVirtualScroll();
  attachEventListeners();
  loadThemePreference();
  render();
}

function setupVirtualScroll() {
  scrollInner.style.minHeight = Math.min(State.totalHeight, MAX_SCROLL_HEIGHT) + "px";
  scrollInner.style.position = "relative";
  rowPool.style.position = "absolute";
  rowPool.style.left = "0";
  rowPool.style.right = "0";
  if (spacerTop) spacerTop.style.display = "none";
  if (spacerBottom) spacerBottom.style.display = "none";
}

// ============================================================================
// ROW CREATION & RECYCLING
// ============================================================================

function makeRow() {
  const el = document.createElement("div");
  el.className = "vrow";
  el.setAttribute("role", "row");

  const idEl = document.createElement("span"); idEl.className = "vrow-id";
  const statEl = document.createElement("span"); statEl.className = "vrow-status";
  const badge = document.createElement("span"); badge.className = "badge";
  const bodyEl = document.createElement("span"); bodyEl.className = "vrow-body";
  const titleEl = document.createElement("span"); titleEl.className = "vrow-title";
  const subEl = document.createElement("span"); subEl.className = "vrow-sub";
  const catEl = document.createElement("span"); catEl.className = "vrow-cat";
  const tag = document.createElement("span"); tag.className = "tag";
  const userEl = document.createElement("span"); userEl.className = "vrow-user";
  const avatar = document.createElement("span"); avatar.className = "avatar";
  const timeEl = document.createElement("span"); timeEl.className = "vrow-time";

  statEl.appendChild(badge);
  bodyEl.appendChild(titleEl);
  bodyEl.appendChild(subEl);
  catEl.appendChild(tag);
  userEl.appendChild(avatar);

  el.appendChild(idEl);
  el.appendChild(statEl);
  el.appendChild(bodyEl);
  el.appendChild(catEl);
  el.appendChild(userEl);
  el.appendChild(timeEl);

  el._id = idEl;
  el._badge = badge;
  el._title = titleEl;
  el._sub = subEl;
  el._tag = tag;
  el._avatar = avatar;
  el._time = timeEl;

  // Accessibility
  el.tabIndex = 0;
  
  return el;
}

function fillRow(el, rawIndex) {
  // Add some deterministic pseudo-random logic
  const i = Math.abs(rawIndex ^ (State.sortOrder === "desc" ? 0xFFFFFF : 0));
  
  const statusIdx = (i * 7 + 3) % STATUSES.length;
  const catIdx = (i * 11 + 7) % CATS.length;
  const userIdx = (i * 13) % USERS.length;
  const hh = (i * 3 + 8) % 24;
  const mm = (i * 17) % 60;
  
  const status = STATUSES[statusIdx];
  const cat = CATS[catIdx];
  const user = USERS[userIdx];
  const [avatarBg, avatarFg] = AVATAR_COLORS[userIdx];

  el.style.height = H_ROW + "px";
  el.classList.toggle("alt", (rawIndex & 1) === 0);

  el._id.textContent = "#" + (rawIndex + 1).toLocaleString("en-US");

  el._badge.textContent = status;
  el._badge.className = "badge s-" + status;

  el._title.textContent = generateMockTitle(i);
  el._sub.textContent = `Commit: ${generateCommitHash(i)} • Region: us-east-${(i % 4) + 1}`;
  el._sub.style.display = "block";
  el._sub.style.opacity = "0.7";

  el._tag.textContent = cat;
  el._tag.className = "tag c-" + (CATS.includes(cat) ? cat : "default");

  el._avatar.textContent = user;
  el._avatar.style.background = avatarBg;
  el._avatar.style.color = avatarFg;
  el._avatar.setAttribute("aria-label", `User ${user}`);

  el._time.textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  
  // Interactive hooks
  el.onclick = () => handleRowClick(rawIndex, el);
}

function handleRowClick(index, el) {
  console.log(`Row ${index} clicked!`, el._title.textContent);
  el.style.background = "var(--blue-subtle)";
  setTimeout(() => {
    el.style.background = "";
  }, 200);
}

// ============================================================================
// CORE RENDERING ENGINE
// ============================================================================

let lastStart = -1;
let lastEnd = -1;
let rafId = null;

function render() {
  const t0 = performance.now();
  State.metrics.renders++;

  const scrollTop = scrollWrap.scrollTop;
  const vh = scrollWrap.clientHeight;

  // Handle case where total height is less than max native height
  const scrollableNative = Math.max(0, scrollInner.clientHeight - vh);
  const scrollableTrue = Math.max(0, State.totalHeight - vh);
  
  let pct = scrollableNative > 0 ? scrollTop / scrollableNative : 0;
  pct = Math.max(0, Math.min(1, pct));
  
  const trueScrollTop = pct * scrollableTrue;

  const rawStart = Math.floor(trueScrollTop / H_ROW);
  const startIdx = Math.max(0, rawStart - BUFFER);
  const endIdx = Math.min(State.totalRecords, rawStart + Math.ceil(vh / H_ROW) + BUFFER);

  const partialOffset = trueScrollTop - (startIdx * H_ROW);
  const visualTop = scrollTop - partialOffset;
  rowPool.style.top = visualTop + "px";

  const count = endIdx - startIdx;

  if (startIdx !== lastStart || endIdx !== lastEnd) {
    // Balance DOM nodes
    while (rowPool.children.length < count) rowPool.appendChild(makeRow());
    while (rowPool.children.length > count) rowPool.removeChild(rowPool.lastChild);

    const kids = rowPool.children;
    for (let i = 0; i < count; i++) {
      fillRow(kids[i], startIdx + i);
    }

    lastStart = startIdx;
    lastEnd = endIdx;
  }

  // Update Telemetry & UI
  updateTelemetry(count, startIdx, trueScrollTop, pct);
  
  State.metrics.lastRenderTime = performance.now() - t0;
}

function updateTelemetry(count, startIdx, trueScrollTop, pct) {
  flashStat(sRendered, count);
  flashStat(sRow, (startIdx + 1).toLocaleString("en-US"));
  flashStat(sOffset, Math.round(trueScrollTop).toLocaleString("en-US") + " px");
  flashStat(sProgress, (pct * 100).toFixed(3) + "%");
  if (progFill) progFill.style.width = (pct * 100).toFixed(4) + "%";
}

function flashStat(el, val) {
  if (!el) return;
  const s = String(val);
  if (el.textContent === s) return;
  el.textContent = s;
  el.classList.remove("flash");
  void el.offsetWidth; // trigger reflow
  el.classList.add("flash");
}

// ============================================================================
// EVENT LISTENERS & DEBOUNCING
// ============================================================================

function attachEventListeners() {
  scrollWrap.addEventListener("scroll", handleScroll, { passive: true });
  
  window.addEventListener("resize", debounce(() => {
    lastStart = -1;
    lastEnd = -1;
    setupVirtualScroll();
    render();
  }, 100));

  document.addEventListener("keydown", handleKeyboardNav);
}

function handleScroll() {
  State.metrics.scrollEvents++;
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    render();
    rafId = null;
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

function handleKeyboardNav(e) {
  const scrollAmount = H_ROW * 3;
  const pageAmount = scrollWrap.clientHeight * 0.8;
  
  switch(e.key) {
    case "ArrowDown":
      scrollWrap.scrollBy({ top: scrollAmount, behavior: "smooth" });
      e.preventDefault();
      break;
    case "ArrowUp":
      scrollWrap.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      e.preventDefault();
      break;
    case "PageDown":
      scrollWrap.scrollBy({ top: pageAmount, behavior: "smooth" });
      e.preventDefault();
      break;
    case "PageUp":
      scrollWrap.scrollBy({ top: -pageAmount, behavior: "smooth" });
      e.preventDefault();
      break;
    case "Home":
      scrollWrap.scrollTo({ top: 0, behavior: "smooth" });
      e.preventDefault();
      break;
    case "End":
      scrollWrap.scrollTo({ top: scrollInner.clientHeight, behavior: "smooth" });
      e.preventDefault();
      break;
  }
}

// ============================================================================
// ADVANCED FEATURES: SEARCH, FILTER & SORT
// ============================================================================

const FilterEngine = {
  applyFilter: function(query) {
    State.searchQuery = query.toLowerCase();
    console.log(`Filtering for: ${State.searchQuery}`);
    // In a real DB, this would trigger an async fetch.
    // For our math-based mock, we'll simulate a dataset reduction.
    if (query.length > 0) {
      State.totalRecords = Math.max(100, Math.floor(TOTAL * 0.05)); // Simulate 5% match
    } else {
      State.totalRecords = TOTAL;
    }
    
    State.totalHeight = State.totalRecords * H_ROW;
    setupVirtualScroll();
    scrollWrap.scrollTop = 0;
    lastStart = -1;
    render();
  },

  setSort: function(column) {
    if (State.sortColumn === column) {
      State.sortOrder = State.sortOrder === "asc" ? "desc" : "asc";
    } else {
      State.sortColumn = column;
      State.sortOrder = "asc";
    }
    console.log(`Sorting by ${State.sortColumn} ${State.sortOrder}`);
    lastStart = -1;
    render();
  }
};

// Expose globally for UI binding
window.applyFilter = FilterEngine.applyFilter;
window.setSort = FilterEngine.setSort;

// ============================================================================
// DATA EXPORT (CSV / JSON)
// ============================================================================

const ExportService = {
  generateCSV: async function(limit = 1000) {
    if (State.isExporting) return;
    State.isExporting = true;
    
    console.log(`Generating CSV for top ${limit} records...`);
    let csvContent = "ID,Status,Title,Category,User,Time\n";
    
    // Simulate async work to avoid blocking UI
    await new Promise(resolve => setTimeout(resolve, 100));
    
    for (let rawIndex = 0; rawIndex < limit; rawIndex++) {
      const i = Math.abs(rawIndex ^ (State.sortOrder === "desc" ? 0xFFFFFF : 0));
      
      const statusIdx = (i * 7 + 3) % STATUSES.length;
      const catIdx = (i * 11 + 7) % CATS.length;
      const userIdx = (i * 13) % USERS.length;
      const hh = (i * 3 + 8) % 24;
      const mm = (i * 17) % 60;
      
      const row = [
        rawIndex + 1,
        STATUSES[statusIdx],
        `"${generateMockTitle(i)}"`,
        CATS[catIdx],
        USERS[userIdx],
        `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
      ];
      
      csvContent += row.join(",") + "\n";
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    State.isExporting = false;
    console.log("CSV Export complete!");
  }
};

window.exportData = () => ExportService.generateCSV(5000);

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

const ThemeManager = {
  toggle: function() {
    State.theme = State.theme === "light" ? "dark" : "light";
    this.apply();
  },
  
  apply: function() {
    const root = document.documentElement;
    if (State.theme === "dark") {
      root.style.setProperty("--bg", "#080a0f");
      root.style.setProperty("--bg-panel", "#0c0f17");
      root.style.setProperty("--bg-row", "#0e1119");
      root.style.setProperty("--bg-row-alt", "#0b0d14");
      root.style.setProperty("--text", "#dde4f0");
      root.style.setProperty("--border", "#181e2e");
    } else {
      root.style.setProperty("--bg", "#f8fafc");
      root.style.setProperty("--bg-panel", "#ffffff");
      root.style.setProperty("--bg-row", "#ffffff");
      root.style.setProperty("--bg-row-alt", "#f1f5f9");
      root.style.setProperty("--text", "#0f172a");
      root.style.setProperty("--border", "#e2e8f0");
    }
    localStorage.setItem("appTheme", State.theme);
  }
};

function loadThemePreference() {
  const saved = localStorage.getItem("appTheme");
  if (saved) {
    State.theme = saved;
    ThemeManager.apply();
  }
}

window.toggleTheme = () => ThemeManager.toggle();

// ============================================================================
// DIAGNOSTICS & DEBUG
// ============================================================================

window.printDiagnostics = () => {
  console.group("Virtual Scroll Diagnostics");
  console.log("Total Records:", State.totalRecords.toLocaleString());
  console.log("Scroll Top:", scrollWrap.scrollTop);
  console.log("Viewport Height:", scrollWrap.clientHeight);
  console.log("DOM Nodes Rendered:", rowPool.children.length);
  console.log("Total Renders:", State.metrics.renders);
  console.log("Scroll Events Fired:", State.metrics.scrollEvents);
  console.log("Last Render Time (ms):", State.metrics.lastRenderTime.toFixed(2));
  console.groupEnd();
};

// ============================================================================
// BOOTSTRAP
// ============================================================================

initializeApp();