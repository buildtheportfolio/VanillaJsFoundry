"use strict";

const CATEGORY_META = {
  navigation: {
    label: "Navigation",
    color: "#93C5FD",
    bg: "rgba(147,197,253,0.1)",
  },
  actions: { label: "Actions", color: "#6EE7B7", bg: "rgba(110,231,183,0.1)" },
  settings: { label: "Settings", color: "#FCD34D", bg: "rgba(252,211,77,0.1)" },
  theme: { label: "Theme", color: "#C4B5FD", bg: "rgba(196,181,253,0.1)" },
  view: { label: "View", color: "#F9A8D4", bg: "rgba(249,168,212,0.1)" },
  developer: { label: "Dev", color: "#FC8181", bg: "rgba(252,129,129,0.1)" },
};

const COMMANDS = [
  {
    id: "nav-dashboard",
    category: "navigation",
    icon: "⊞",
    title: "Go to Dashboard",
    sub: "Main workspace overview",
    kbd: ["G", "D"],
    action: () => navigate("Dashboard"),
  },
  {
    id: "nav-projects",
    category: "navigation",
    icon: "⊡",
    title: "Go to Projects",
    sub: "Browse all projects",
    kbd: ["G", "P"],
    action: () => navigate("Projects"),
  },
  {
    id: "nav-team",
    category: "navigation",
    icon: "⊞",
    title: "Go to Team",
    sub: "Team members and roles",
    kbd: ["G", "T"],
    action: () => navigate("Team"),
  },
  {
    id: "nav-settings",
    category: "navigation",
    icon: "⚙",
    title: "Go to Settings",
    sub: "Account and workspace settings",
    kbd: ["G", "S"],
    action: () => navigate("Settings"),
  },
  {
    id: "nav-inbox",
    category: "navigation",
    icon: "⊟",
    title: "Go to Inbox",
    sub: "Your notifications and mentions",
    kbd: ["G", "I"],
    action: () => navigate("Inbox"),
  },
  {
    id: "nav-starred",
    category: "navigation",
    icon: "◇",
    title: "Go to Starred",
    sub: "Your starred items",
    kbd: ["G", "F"],
    action: () => navigate("Starred"),
  },
  {
    id: "nav-back",
    category: "navigation",
    icon: "←",
    title: "Go Back",
    sub: "Navigate to previous page",
    kbd: ["⌥", "←"],
    action: () => notify("Navigation", "Going back…", "⬅"),
  },
  {
    id: "nav-forward",
    category: "navigation",
    icon: "→",
    title: "Go Forward",
    sub: "Navigate to next page",
    kbd: ["⌥", "→"],
    action: () => notify("Navigation", "Going forward…", "➡"),
  },

  {
    id: "act-new-issue",
    category: "actions",
    icon: "＋",
    title: "Create New Issue",
    sub: "Open issue creation dialog",
    kbd: ["C"],
    action: () => createIssue(),
  },
  {
    id: "act-new-project",
    category: "actions",
    icon: "＋",
    title: "Create New Project",
    sub: "Start a new project",
    kbd: ["⌘", "⇧", "P"],
    action: () => notify("Action", "Opening project creator…", "📁"),
  },
  {
    id: "act-new-label",
    category: "actions",
    icon: "◈",
    title: "Create New Label",
    sub: "Add a new label to workspace",
    kbd: [],
    action: () => notify("Action", "Opening label creator…", "🏷"),
  },
  {
    id: "act-assign",
    category: "actions",
    icon: "⇒",
    title: "Assign Issue",
    sub: "Assign current issue to team member",
    kbd: ["A"],
    action: () => notify("Action", "Opening assignee picker…", "👤"),
  },
  {
    id: "act-label",
    category: "actions",
    icon: "◇",
    title: "Add Label",
    sub: "Apply label to selected issue",
    kbd: ["L"],
    action: () => notify("Action", "Opening label picker…", "🏷"),
  },
  {
    id: "act-close",
    category: "actions",
    icon: "✓",
    title: "Close Issue",
    sub: "Mark current issue as done",
    kbd: ["⌘", "⇧", "D"],
    action: () => closeIssue(),
  },
  {
    id: "act-reopen",
    category: "actions",
    icon: "↻",
    title: "Reopen Issue",
    sub: "Reopen a previously closed issue",
    kbd: [],
    action: () => notify("Action", "Issue reopened", "🔓"),
  },
  {
    id: "act-duplicate",
    category: "actions",
    icon: "⧉",
    title: "Duplicate Issue",
    sub: "Create a copy of current issue",
    kbd: ["⌘", "D"],
    action: () => notify("Action", "Issue duplicated", "📋"),
  },
  {
    id: "act-delete",
    category: "actions",
    icon: "✕",
    title: "Delete Issue",
    sub: "Permanently delete selected issue",
    kbd: ["⌘", "⌫"],
    action: () => notify("Action", "Issue deleted", "🗑", "error"),
  },
  {
    id: "act-copy-url",
    category: "actions",
    icon: "⎘",
    title: "Copy Issue URL",
    sub: "Copy current URL to clipboard",
    kbd: ["⌘", "⇧", "C"],
    action: () => copyURL(),
  },
  {
    id: "act-copy-id",
    category: "actions",
    icon: "⎘",
    title: "Copy Issue ID",
    sub: "Copy issue ID to clipboard",
    kbd: [],
    action: () => notify("Copied", "Issue ID copied", "📋"),
  },
  {
    id: "act-move",
    category: "actions",
    icon: "⇄",
    title: "Move to Project",
    sub: "Move issue to a different project",
    kbd: ["⌘", "⇧", "M"],
    action: () => notify("Action", "Opening project picker…", "📦"),
  },
  {
    id: "act-set-priority",
    category: "actions",
    icon: "⬆",
    title: "Set Priority",
    sub: "Change priority: urgent / high / low",
    kbd: ["P"],
    action: () => notify("Action", "Priority updated", "⚡"),
  },
  {
    id: "act-set-status",
    category: "actions",
    icon: "◉",
    title: "Set Status",
    sub: "Change issue status",
    kbd: ["S"],
    action: () => notify("Action", "Opening status picker…", "🔄"),
  },
  {
    id: "act-estimate",
    category: "actions",
    icon: "⏱",
    title: "Set Estimate",
    sub: "Add time or point estimate",
    kbd: [],
    action: () => notify("Action", "Opening estimate picker…", "⏱"),
  },
  {
    id: "act-comment",
    category: "actions",
    icon: "💬",
    title: "Add Comment",
    sub: "Open comment editor",
    kbd: ["⌘", "M"],
    action: () => notify("Action", "Comment editor opened", "💬"),
  },
  {
    id: "act-subscribe",
    category: "actions",
    icon: "🔔",
    title: "Subscribe to Issue",
    sub: "Get notifications for this issue",
    kbd: [],
    action: () => notify("Action", "Subscribed to issue", "🔔"),
  },
  {
    id: "act-export",
    category: "actions",
    icon: "↓",
    title: "Export Issues",
    sub: "Export as CSV or JSON",
    kbd: [],
    action: () => notify("Action", "Preparing export…", "📄"),
  },
  {
    id: "act-import",
    category: "actions",
    icon: "↑",
    title: "Import Issues",
    sub: "Bulk import from CSV or GitHub",
    kbd: [],
    action: () => notify("Action", "Opening import wizard…", "📤"),
  },
  {
    id: "act-filter",
    category: "actions",
    icon: "⊡",
    title: "Filter Issues",
    sub: "Apply advanced filters",
    kbd: ["F"],
    action: () => notify("Action", "Filter panel opened", "🔍"),
  },
  {
    id: "act-sort",
    category: "actions",
    icon: "⇅",
    title: "Sort Issues",
    sub: "Change sort order",
    kbd: [],
    action: () => notify("Action", "Sort options opened", "↕"),
  },
  {
    id: "act-group",
    category: "actions",
    icon: "⊞",
    title: "Group Issues",
    sub: "Group by status, assignee, or label",
    kbd: [],
    action: () => notify("Action", "Group options opened", "📊"),
  },
  {
    id: "act-search",
    category: "actions",
    icon: "⌕",
    title: "Search Everything",
    sub: "Full-text search across all content",
    kbd: ["⌘", "F"],
    action: () => notify("Action", "Search opened", "🔍"),
  },

  {
    id: "set-notifications",
    category: "settings",
    icon: "🔔",
    title: "Notification Preferences",
    sub: "Manage alerts and email frequency",
    kbd: [],
    action: () => notify("Settings", "Opening notification settings…", "🔔"),
  },
  {
    id: "set-profile",
    category: "settings",
    icon: "👤",
    title: "Edit Profile",
    sub: "Update name, avatar, and bio",
    kbd: [],
    action: () => notify("Settings", "Profile editor opened", "✏️"),
  },
  {
    id: "set-billing",
    category: "settings",
    icon: "💳",
    title: "Manage Billing",
    sub: "View plan, invoices, and payment",
    kbd: [],
    action: () => notify("Settings", "Billing page opened", "💳"),
  },
  {
    id: "set-workspace",
    category: "settings",
    icon: "⚙",
    title: "Workspace Settings",
    sub: "Rename, icon, and workspace-wide rules",
    kbd: [],
    action: () => notify("Settings", "Workspace settings opened", "⚙️"),
  },
  {
    id: "set-integrations",
    category: "settings",
    icon: "⟿",
    title: "Manage Integrations",
    sub: "GitHub, Slack, Figma, and more",
    kbd: [],
    action: () => notify("Settings", "Integrations page opened", "🔌"),
  },
  {
    id: "set-api",
    category: "settings",
    icon: "⌨",
    title: "API Keys",
    sub: "Generate and revoke API tokens",
    kbd: [],
    action: () => notify("Settings", "API keys page opened", "🔑"),
  },
  {
    id: "set-shortcuts",
    category: "settings",
    icon: "⌘",
    title: "Keyboard Shortcuts",
    sub: "View all keyboard shortcuts",
    kbd: ["?"],
    action: () => showShortcutGuide(),
  },
  {
    id: "set-members",
    category: "settings",
    icon: "👥",
    title: "Manage Members",
    sub: "Invite, remove, and assign roles",
    kbd: [],
    action: () => notify("Settings", "Member management opened", "👥"),
  },
  {
    id: "set-security",
    category: "settings",
    icon: "🔒",
    title: "Security Settings",
    sub: "2FA, SSO, and audit log",
    kbd: [],
    action: () => notify("Settings", "Security settings opened", "🔒"),
  },
  {
    id: "set-accessibility",
    category: "settings",
    icon: "♿",
    title: "Accessibility Settings",
    sub: "Motion, contrast, and font size",
    kbd: [],
    action: () => notify("Settings", "Accessibility settings opened", "♿"),
  },

  {
    id: "theme-dark",
    category: "theme",
    icon: "●",
    title: "Switch to Dark Theme",
    sub: "Use the default dark appearance",
    kbd: [],
    action: () => setTheme("dark"),
  },
  {
    id: "theme-light",
    category: "theme",
    icon: "○",
    title: "Switch to Light Theme",
    sub: "Use a bright, high-contrast mode",
    kbd: [],
    action: () => setTheme("light"),
  },
  {
    id: "theme-midnight",
    category: "theme",
    icon: "◉",
    title: "Midnight Theme",
    sub: "Deep black with violet accents",
    kbd: [],
    action: () => setTheme("midnight"),
  },
  {
    id: "theme-forest",
    category: "theme",
    icon: "◈",
    title: "Forest Theme",
    sub: "Warm greens, editorial tone",
    kbd: [],
    action: () => setTheme("forest"),
  },
  {
    id: "theme-ocean",
    category: "theme",
    icon: "◇",
    title: "Ocean Theme",
    sub: "Cool blues and deep navy",
    kbd: [],
    action: () => setTheme("ocean"),
  },
  {
    id: "theme-auto",
    category: "theme",
    icon: "⊛",
    title: "Auto Theme",
    sub: "Follow system appearance",
    kbd: [],
    action: () => setTheme("auto"),
  },
  {
    id: "theme-contrast",
    category: "theme",
    icon: "⊜",
    title: "High Contrast Mode",
    sub: "Increase contrast for accessibility",
    kbd: [],
    action: () => notify("Theme", "High contrast enabled", "⚡"),
  },
  {
    id: "theme-compact",
    category: "theme",
    icon: "▣",
    title: "Compact Density",
    sub: "Reduce spacing for more content",
    kbd: [],
    action: () => notify("Theme", "Compact mode enabled", "📐"),
  },
  {
    id: "theme-comfortable",
    category: "theme",
    icon: "□",
    title: "Comfortable Density",
    sub: "Default generous spacing",
    kbd: [],
    action: () => notify("Theme", "Comfortable mode enabled", "🪑"),
  },

  {
    id: "view-list",
    category: "view",
    icon: "≡",
    title: "List View",
    sub: "Display issues as a flat list",
    kbd: ["⌘", "⇧", "1"],
    action: () => notify("View", "Switched to list view", "📋"),
  },
  {
    id: "view-board",
    category: "view",
    icon: "⊞",
    title: "Board View",
    sub: "Display issues as a Kanban board",
    kbd: ["⌘", "⇧", "2"],
    action: () => notify("View", "Switched to board view", "📊"),
  },
  {
    id: "view-timeline",
    category: "view",
    icon: "⟶",
    title: "Timeline View",
    sub: "Visualize issues on a timeline",
    kbd: ["⌘", "⇧", "3"],
    action: () => notify("View", "Switched to timeline view", "📅"),
  },
  {
    id: "view-table",
    category: "view",
    icon: "⊟",
    title: "Table View",
    sub: "Spreadsheet-style issue table",
    kbd: ["⌘", "⇧", "4"],
    action: () => notify("View", "Switched to table view", "📋"),
  },
  {
    id: "view-zoom-in",
    category: "view",
    icon: "+",
    title: "Zoom In",
    sub: "Increase interface scale",
    kbd: ["⌘", "+"],
    action: () => zoomUI(1),
  },
  {
    id: "view-zoom-out",
    category: "view",
    icon: "−",
    title: "Zoom Out",
    sub: "Decrease interface scale",
    kbd: ["⌘", "−"],
    action: () => zoomUI(-1),
  },
  {
    id: "view-zoom-reset",
    category: "view",
    icon: "⊜",
    title: "Reset Zoom",
    sub: "Return to 100% scale",
    kbd: ["⌘", "0"],
    action: () => zoomUI(0),
  },
  {
    id: "view-sidebar",
    category: "view",
    icon: "⊡",
    title: "Toggle Sidebar",
    sub: "Show or hide the left sidebar",
    kbd: ["⌘", "\\"],
    action: () => toggleSidebar(),
  },
  {
    id: "view-fullscreen",
    category: "view",
    icon: "⛶",
    title: "Toggle Fullscreen",
    sub: "Enter or exit fullscreen mode",
    kbd: ["F11"],
    action: () => toggleFullscreen(),
  },
  {
    id: "view-focus",
    category: "view",
    icon: "◎",
    title: "Focus Mode",
    sub: "Hide all UI chrome for writing",
    kbd: ["⌘", "⇧", "F"],
    action: () => notify("View", "Focus mode enabled", "🎯"),
  },

  {
    id: "dev-reload",
    category: "developer",
    icon: "↻",
    title: "Reload Application",
    sub: "Hard reload, bypassing cache",
    kbd: ["⌘", "⇧", "R"],
    action: () => location.reload(),
  },
  {
    id: "dev-console",
    category: "developer",
    icon: "⌨",
    title: "Open DevTools",
    sub: "Open browser developer tools",
    kbd: ["F12"],
    action: () => notify("Dev", "Open DevTools with F12", "🛠"),
  },
  {
    id: "dev-clear-cache",
    category: "developer",
    icon: "✕",
    title: "Clear Cache",
    sub: "Clear localStorage and sessionStorage",
    kbd: [],
    action: () => clearCache(),
  },
  {
    id: "dev-log-state",
    category: "developer",
    icon: "◉",
    title: "Log App State",
    sub: "Print current state to console",
    kbd: [],
    action: () => logState(),
  },
  {
    id: "dev-feature-flags",
    category: "developer",
    icon: "⚑",
    title: "Feature Flags",
    sub: "Toggle experimental features",
    kbd: [],
    action: () => notify("Dev", "Feature flags panel opened", "🏁"),
  },
  {
    id: "dev-perf",
    category: "developer",
    icon: "⏱",
    title: "Performance Profile",
    sub: "Start a performance recording",
    kbd: [],
    action: () => notify("Dev", "Performance profiler started", "⚡"),
  },
  {
    id: "dev-a11y",
    category: "developer",
    icon: "♿",
    title: "Accessibility Audit",
    sub: "Run axe-core accessibility check",
    kbd: [],
    action: () =>
      notify("Dev", "Accessibility audit complete: 0 violations", "✅"),
  },
  {
    id: "dev-copy-state",
    category: "developer",
    icon: "⎘",
    title: "Copy State to Clipboard",
    sub: "Copy serialized app state as JSON",
    kbd: [],
    action: () => copyState(),
  },
];

let isOpen = false;
let selectedIndex = -1;
let activeScope = "all";
let activeResults = [];
let recentIds = JSON.parse(localStorage.getItem("cmd_recent") || "[]");
let pinnedIds = JSON.parse(localStorage.getItem("cmd_pinned") || "[]");
let searchHistory = JSON.parse(
  localStorage.getItem("cmd_search_history") || "[]",
);
let frequencyMap = JSON.parse(localStorage.getItem("cmd_freq") || "{}");
let currentQuery = "";
let kbdNavActive = false;
let previewCmdId = null;
let globalZoom = 100;
let sidebarVisible = true;
let nextIssueNum = 252;
let openIssueCount = 24;

function smithWatermanScore(query, target) {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q)
    return {
      score: 2000,
      indices: Array.from({ length: q.length }, (_, i) => i),
    };
  if (t.startsWith(q))
    return {
      score: 1800,
      indices: Array.from({ length: q.length }, (_, i) => i),
    };

  const GAP_OPEN = -3;
  const GAP_EXTEND = -1;
  const MATCH = 10;
  const MISMATCH = -4;
  const WORD_BONUS = 6;
  const CONSEC_BONUS = 4;
  const START_BONUS = 8;

  const m = q.length;
  const n = t.length;

  const H = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
  const traceback = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));

  let maxScore = 0;
  let maxI = 0,
    maxJ = 0;

  const wordStarts = new Set([0]);
  for (let j = 1; j < n; j++) {
    if (
      t[j - 1] === " " ||
      t[j - 1] === "-" ||
      t[j - 1] === "_" ||
      t[j - 1] === "/"
    )
      wordStarts.add(j);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let matchScore = q[i - 1] === t[j - 1] ? MATCH : MISMATCH;

      if (q[i - 1] === t[j - 1]) {
        if (wordStarts.has(j - 1)) matchScore += WORD_BONUS;
        if (j === 1) matchScore += START_BONUS;
        if (i > 1 && j > 1 && traceback[i - 1][j - 1] !== 0)
          matchScore += CONSEC_BONUS;
      }

      const diag = H[i - 1][j - 1] + matchScore;
      const up =
        H[i - 1][j] + (traceback[i - 1][j] === 2 ? GAP_EXTEND : GAP_OPEN);
      const left =
        H[i][j - 1] + (traceback[i][j - 1] === 3 ? GAP_EXTEND : GAP_OPEN);

      H[i][j] = Math.max(0, diag, up, left);

      if (H[i][j] === 0) traceback[i][j] = 0;
      else if (H[i][j] === diag) traceback[i][j] = 1;
      else if (H[i][j] === up) traceback[i][j] = 2;
      else traceback[i][j] = 3;

      if (H[i][j] > maxScore) {
        maxScore = H[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }

  const indices = [];
  let ci = maxI,
    cj = maxJ;
  while (ci > 0 && cj > 0 && H[ci][cj] > 0) {
    const tb = traceback[ci][cj];
    if (tb === 1) {
      if (q[ci - 1] === t[cj - 1]) indices.unshift(cj - 1);
      ci--;
      cj--;
    } else if (tb === 2) ci--;
    else cj--;
  }

  const idxInTitle = t.indexOf(q);
  const substrBonus =
    idxInTitle !== -1 ? 300 + (idxInTitle === 0 ? 200 : 0) : 0;
  const coverageRatio = indices.length / q.length;
  const coverageBonus = coverageRatio * 100;

  return { score: maxScore + substrBonus + coverageBonus, indices };
}

function searchCommands(query, scope) {
  if (!query.trim()) {
    const pinned = COMMANDS.filter((c) => pinnedIds.includes(c.id));
    const recents = recentIds
      .map((id) => COMMANDS.find((c) => c.id === id))
      .filter(Boolean);
    const frequent = [...COMMANDS]
      .sort((a, b) => (frequencyMap[b.id] || 0) - (frequencyMap[a.id] || 0))
      .slice(0, 6);
    const combined = [
      ...new Map(
        [...pinned, ...recents, ...frequent].map((c) => [c.id, c]),
      ).values(),
    ];
    const filtered =
      scope === "all" ? combined : combined.filter((c) => c.category === scope);
    return filtered.slice(0, 15).map((c) => ({
      cmd: c,
      score: 0,
      indices: [],
      isPinned: pinnedIds.includes(c.id),
      isRecent: recentIds.includes(c.id),
    }));
  }

  const results = [];
  const scopedCmds =
    scope === "all" ? COMMANDS : COMMANDS.filter((c) => c.category === scope);

  scopedCmds.forEach((cmd) => {
    const titleScore = smithWatermanScore(query, cmd.title);
    const subScore = smithWatermanScore(query, cmd.sub || "");
    const catScore = smithWatermanScore(query, cmd.category);
    const freqBonus = Math.min((frequencyMap[cmd.id] || 0) * 8, 80);
    const recentBonus =
      recentIds.indexOf(cmd.id) !== -1 ? 50 - recentIds.indexOf(cmd.id) * 5 : 0;
    const pinnedBonus = pinnedIds.includes(cmd.id) ? 30 : 0;

    const bestScore = Math.max(
      titleScore.score,
      subScore.score * 0.6,
      catScore.score * 0.4,
    );

    if (bestScore > 0) {
      results.push({
        cmd,
        score: bestScore + freqBonus + recentBonus + pinnedBonus,
        indices:
          titleScore.score >= subScore.score * 0.6 ? titleScore.indices : [],
        isPinned: pinnedIds.includes(cmd.id),
        isRecent: recentIds.includes(cmd.id),
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

function buildHighlightedTitle(title, indices) {
  if (!indices || !indices.length) return escHtml(title);
  let html = "";
  const indexSet = new Set(indices);
  for (let i = 0; i < title.length; i++) {
    const ch = escHtml(title[i]);
    html += indexSet.has(i) ? `<span class="match-char">${ch}</span>` : ch;
  }
  return html;
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResults(results, query) {
  const container = document.getElementById("paletteResults");
  const countEl = document.getElementById("pfCount");
  if (!container) return;

  activeResults = results;

  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">⌕</div><div class="es-title">No commands found</div><div class="es-sub">Try a different query or check the scope filter</div></div>`;
    if (countEl) countEl.textContent = "0 results";
    return;
  }

  if (countEl)
    countEl.textContent = `${results.length} result${results.length !== 1 ? "s" : ""}`;

  const groups = new Map();

  if (!query.trim()) {
    const pinned = results.filter((r) => r.isPinned);
    const recents = results.filter((r) => r.isRecent && !r.isPinned);
    const others = results.filter((r) => !r.isPinned && !r.isRecent);
    if (pinned.length) groups.set("pinned", pinned);
    if (recents.length) groups.set("recent", recents);
    if (others.length) groups.set("frequent", others);
  } else {
    results.forEach((r) => {
      const cat = r.cmd.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(r);
    });
  }

  const frag = document.createDocumentFragment();
  const maxScore = Math.max(...results.map((r) => r.score), 1);

  let globalIdx = 0;

  groups.forEach((items, groupKey) => {
    const groupEl = document.createElement("div");
    groupEl.className = "results-group";

    const labelEl = document.createElement("div");
    labelEl.className = "rg-label";
    const groupLabels = {
      pinned: "📌 Pinned",
      recent: "🕐 Recent",
      frequent: "⭐ Suggested",
      ...Object.fromEntries(
        Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label]),
      ),
    };
    labelEl.textContent = groupLabels[groupKey] || groupKey;
    groupEl.appendChild(labelEl);

    items.forEach((result) => {
      const { cmd, score, indices, isPinned, isRecent } = result;
      const catMeta = CATEGORY_META[cmd.category] || {};
      const normScore = Math.round((score / maxScore) * 100);
      const idx = globalIdx++;

      const item = document.createElement("div");
      item.className = "cmd-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.dataset.idx = idx;
      item.dataset.cmdId = cmd.id;

      const iconWrap = document.createElement("div");
      iconWrap.className = "ci-icon-wrap";
      iconWrap.textContent = cmd.icon;
      if (catMeta.color) iconWrap.style.color = catMeta.color;

      const body = document.createElement("div");
      body.className = "ci-body";

      const titleEl = document.createElement("div");
      titleEl.className = "ci-title";
      titleEl.innerHTML = buildHighlightedTitle(
        cmd.title,
        query ? indices : [],
      );

      const subEl = document.createElement("div");
      subEl.className = "ci-sub";
      subEl.textContent = cmd.sub || "";

      if (query && score > 0) {
        const bar = document.createElement("div");
        bar.className = "ci-score-bar";
        const fill = document.createElement("div");
        fill.className = "ci-score-fill";
        fill.style.width = normScore + "%";
        bar.appendChild(fill);
        body.append(titleEl, subEl, bar);
      } else {
        body.append(titleEl, subEl);
      }

      const right = document.createElement("div");
      right.className = "ci-right";

      if (isPinned) {
        const star = document.createElement("span");
        star.className = "ci-star";
        star.title = "Pinned";
        star.textContent = "📌";
        right.appendChild(star);
      }
      if (isRecent && !isPinned) {
        const rec = document.createElement("span");
        rec.className = "ci-recency";
        rec.textContent = "recent";
        right.appendChild(rec);
      }

      if (cmd.kbd && cmd.kbd.length) {
        const kbdGroup = document.createElement("div");
        kbdGroup.className = "ci-kbd-group";
        cmd.kbd.forEach((k) => {
          const kbd = document.createElement("kbd");
          kbd.className = "ci-kbd";
          kbd.textContent = k;
          kbdGroup.appendChild(kbd);
        });
        right.appendChild(kbdGroup);
      }

      const catTag = document.createElement("span");
      catTag.className = "ci-category-tag";
      catTag.textContent = catMeta.label || cmd.category;
      catTag.style.background = catMeta.bg || "rgba(255,255,255,0.05)";
      catTag.style.color = catMeta.color || "#999";
      right.appendChild(catTag);

      item.append(iconWrap, body, right);

      item.addEventListener("mouseenter", () => {
        selectedIndex = idx;
        updateSelectedState();
        kbdNavActive = false;
      });

      item.addEventListener("click", () => executeCommand(cmd));

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showItemContextMenu(e.clientX, e.clientY, cmd);
      });

      groupEl.appendChild(item);
    });

    frag.appendChild(groupEl);
  });

  container.innerHTML = "";
  container.appendChild(frag);

  if (selectedIndex === -1 && results.length) {
    selectedIndex = 0;
    updateSelectedState();
  }
}

function updateSelectedState() {
  const items = document.querySelectorAll(".cmd-item");
  items.forEach((item, i) => {
    const isSelected = parseInt(item.dataset.idx) === selectedIndex;
    item.classList.toggle("selected", isSelected);
    item.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected && kbdNavActive) {
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

function executeCommand(cmd) {
  if (!cmd) return;

  recentIds = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(0, 10);
  frequencyMap[cmd.id] = (frequencyMap[cmd.id] || 0) + 1;
  if (currentQuery.trim() && !searchHistory.includes(currentQuery.trim())) {
    searchHistory = [currentQuery.trim(), ...searchHistory].slice(0, 20);
    localStorage.setItem("cmd_search_history", JSON.stringify(searchHistory));
  }
  localStorage.setItem("cmd_recent", JSON.stringify(recentIds));
  localStorage.setItem("cmd_freq", JSON.stringify(frequencyMap));

  closePalette();

  try {
    cmd.action();
  } catch (e) {
    console.error("Command error:", e);
    notify("Error", e.message, "❌", "error");
  }
}

function getSelectedCommand() {
  const found = activeResults.find((_, i) => {
    const items = document.querySelectorAll(".cmd-item");
    return items[i] && parseInt(items[i].dataset.idx) === selectedIndex;
  });
  return found?.cmd || null;
}

function showItemContextMenu(x, y, cmd) {
  document.getElementById("paletteContextMenu")?.remove();
  const menu = document.createElement("div");
  menu.id = "paletteContextMenu";
  menu.className = "context-menu";
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;background:var(--bg-3);border:1px solid var(--border-3);border-radius:var(--r-lg);padding:6px;min-width:170px;box-shadow:var(--shadow-xl)`;

  const isPinned = pinnedIds.includes(cmd.id);
  const items = [
    {
      label: isPinned ? "📌 Unpin command" : "📌 Pin command",
      action: () => {
        if (isPinned) pinnedIds = pinnedIds.filter((id) => id !== cmd.id);
        else pinnedIds = [cmd.id, ...pinnedIds].slice(0, 10);
        localStorage.setItem("cmd_pinned", JSON.stringify(pinnedIds));
        refreshResults();
      },
    },
    {
      label: "⎘ Copy command name",
      action: () => {
        navigator.clipboard.writeText(cmd.title);
        notify("Copied", "Command name copied", "📋");
      },
    },
    {
      label: "⌨ Show shortcut",
      action: () => {
        notify(
          "Shortcut",
          cmd.kbd?.length ? cmd.kbd.join(" + ") : "No shortcut assigned",
          "⌨",
        );
      },
    },
  ];

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "cm-item";
    el.style.cssText =
      "display:flex;align-items:center;padding:7px 12px;border-radius:var(--r);cursor:pointer;font-size:12px;color:var(--text-2);transition:all .1s ease";
    el.textContent = item.label;
    el.addEventListener(
      "mouseenter",
      () => (el.style.background = "var(--bg-4)"),
    );
    el.addEventListener("mouseleave", () => (el.style.background = ""));
    el.addEventListener("click", () => {
      menu.remove();
      item.action();
    });
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = x - rect.width + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = y - rect.height + "px";

  setTimeout(
    () =>
      document.addEventListener("click", () => menu.remove(), { once: true }),
    0,
  );
}

function refreshResults() {
  const results = searchCommands(currentQuery, activeScope);
  renderResults(results, currentQuery);
}

function openPalette() {
  if (isOpen) return;
  isOpen = true;
  selectedIndex = -1;
  currentQuery = "";
  kbdNavActive = false;

  const backdrop = document.getElementById("paletteBackdrop");
  const input = document.getElementById("paletteInput");
  backdrop.removeAttribute("aria-hidden");
  backdrop.classList.add("open");

  if (input) {
    input.value = "";
    input.focus();
  }

  refreshResults();

  const bodyEls = document.querySelectorAll(".app");
  bodyEls.forEach((el) => el.setAttribute("aria-hidden", "true"));
}

function closePalette() {
  if (!isOpen) return;
  isOpen = false;

  const backdrop = document.getElementById("paletteBackdrop");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");

  document.querySelector(".app")?.removeAttribute("aria-hidden");

  const previewPanel = document.getElementById("previewPanel");
  previewPanel?.classList.add("hidden");
  previewCmdId = null;
  document.getElementById("paletteContextMenu")?.remove();
}

function togglePalette() {
  if (isOpen) closePalette();
  else openPalette();
}

function navigate(section) {
  document
    .querySelectorAll(".nav-link")
    .forEach((el) =>
      el.classList.toggle(
        "active",
        el.dataset.section === section.toLowerCase(),
      ),
    );
  document
    .querySelectorAll(".sb-item")
    .forEach((el) => el.classList.remove("active"));
  const titleEl = document.getElementById("pageTitle");
  const bcEl = document.getElementById("bcCurrent");
  if (titleEl) titleEl.textContent = section;
  if (bcEl) bcEl.textContent = section;
  notify("Navigation", `Navigated to ${section}`, "🧭");
  updateViewVisibility(section);
}

function updateViewVisibility(name) {
  const views = [
    "dashboardView",
    "dynamicView",
    "projectsView",
    "teamView",
    "settingsView",
    "inboxView",
  ];
  views.forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.style.display = "none";
  });

  const nl = name.toLowerCase();

  if (nl === "dashboard" || nl === "overview") {
    const el = document.getElementById("dashboardView");
    if (el) el.style.display = "block";
  } else if (nl === "projects") {
    const el = document.getElementById("projectsView");
    if (el) el.style.display = "block";
  } else if (nl === "team") {
    const el = document.getElementById("teamView");
    if (el) el.style.display = "block";
  } else if (nl === "settings") {
    const el = document.getElementById("settingsView");
    if (el) el.style.display = "block";
  } else if (nl === "inbox") {
    const el = document.getElementById("inboxView");
    if (el) el.style.display = "block";
  } else {
    const dynView = document.getElementById("dynamicView");
    const dynTitle = document.getElementById("dvTitle");
    const dynIcon = document.getElementById("dvIcon");
    const dynSub = document.getElementById("dvSub");

    if (dynView) {
      dynView.style.display = "flex";
      dynView.style.flexDirection = "column";
      if (dynTitle) dynTitle.textContent = name;

      let icon = "⊡";
      let sub = "Content for this section is not yet available.";
      if (nl === "starred") {
        icon = "◇";
        sub = "Your starred items will appear here.";
      } else if (["alpha", "beta", "gamma", "delta"].includes(nl)) {
        icon = "📦";
        sub = `Viewing active issues for project ${name}.`;
      } else if (["bug", "feature", "design"].includes(nl)) {
        icon = "🏷";
        sub = `Showing all issues tagged with ${name}.`;
      }

      if (dynIcon) dynIcon.textContent = icon;
      if (dynSub) dynSub.textContent = sub;
    }
  }
}

function notify(title, sub, icon = "◆", type = "success") {
  const stack = document.getElementById("notificationStack");
  if (!stack) return;
  const n = document.createElement("div");
  n.className = `notif notif-${type}`;
  n.innerHTML = `<span class="notif-icon" aria-hidden="true">${icon}</span><div class="notif-body"><div class="notif-title">${escHtml(title)}</div><div class="notif-sub">${escHtml(sub)}</div></div>`;
  n.setAttribute("role", "status");
  n.setAttribute("aria-live", "polite");
  stack.prepend(n);
  setTimeout(() => {
    n.classList.add("out");
    setTimeout(() => n.remove(), 220);
  }, 3200);
}

function createIssue() {
  const num = nextIssueNum++;
  openIssueCount++;
  const kpiVal = document.getElementById("kpiOpenVal");
  if (kpiVal) kpiVal.textContent = openIssueCount;
  const list = document.getElementById("activityList");
  if (list) {
    const item = document.createElement("div");
    item.className = "al-item";
    item.innerHTML = `<span class="ali-dot" style="--c:#6EE7B7"></span><span class="ali-text">New issue <strong>#${num}</strong> created</span><span class="ali-time">now</span>`;
    item.style.animation = "notifIn 0.25s ease both";
    list.prepend(item);
  }
  notify("Issue Created", `Issue #${num} created successfully`, "✨");
}

function closeIssue() {
  openIssueCount = Math.max(0, openIssueCount - 1);
  const kpiVal = document.getElementById("kpiOpenVal");
  if (kpiVal) kpiVal.textContent = openIssueCount;
  const doneVal = document.getElementById("kpiDoneVal");
  if (doneVal) doneVal.textContent = parseInt(doneVal.textContent || "0") + 1;
  notify("Issue Closed", "Issue marked as done", "✅");
}

function copyURL() {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => notify("Copied", "URL copied to clipboard", "📋"));
}

function setTheme(name) {
  document.documentElement.setAttribute("data-theme", name);
  notify("Theme", `Switched to ${name} theme`, "🎨");
}

function zoomUI(delta) {
  if (delta === 0) {
    globalZoom = 100;
  } else {
    globalZoom = Math.max(80, Math.min(150, globalZoom + delta * 10));
  }
  document.documentElement.style.fontSize = (globalZoom / 100) * 13.5 + "px";
  notify("Zoom", `Zoom: ${globalZoom}%`, "🔍");
}

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = sidebarVisible ? "" : "none";
  notify("View", `Sidebar ${sidebarVisible ? "shown" : "hidden"}`, "◧");
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    notify("View", "Entered fullscreen", "⛶");
  } else {
    document.exitFullscreen?.();
    notify("View", "Exited fullscreen", "⊡");
  }
}

function clearCache() {
  localStorage.clear();
  recentIds = [];
  frequencyMap = {};
  pinnedIds = [];
  notify("Dev", "Cache cleared. Refresh to reset.", "🧹");
}

function logState() {
  console.log("App State:", {
    recentIds,
    frequencyMap,
    pinnedIds,
    activeScope,
    globalZoom,
    sidebarVisible,
  });
  notify("Dev", "State logged to console", "🖨");
}

function copyState() {
  const state = {
    recentIds,
    frequencyMap,
    pinnedIds,
    activeScope,
    globalZoom,
    timestamp: new Date().toISOString(),
  };
  navigator.clipboard
    .writeText(JSON.stringify(state, null, 2))
    .then(() => notify("Copied", "State JSON copied to clipboard", "📋"));
}

function showShortcutGuide() {
  const previewPanel = document.getElementById("previewPanel");
  const ppBody = document.getElementById("ppBody");
  const ppTitle = document.getElementById("ppTitle");
  if (!previewPanel || !ppBody) return;

  ppTitle.textContent = "KEYBOARD SHORTCUTS";
  const cats = ["navigation", "actions", "settings", "view", "developer"];
  let html = "";
  cats.forEach((cat) => {
    const meta = CATEGORY_META[cat];
    const cmds = COMMANDS.filter((c) => c.category === cat && c.kbd?.length);
    if (!cmds.length) return;
    html += `<div style="margin-bottom:10px"><div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:${meta.color};text-transform:uppercase;margin-bottom:4px">${meta.label}</div>`;
    cmds.forEach((c) => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);"><span style="font-size:11px;color:var(--text-2)">${escHtml(c.title)}</span><span style="display:flex;gap:2px">${c.kbd.map((k) => `<kbd style="font-family:var(--font-mono);font-size:9px;background:var(--bg-4);border:1px solid var(--border-3);border-radius:3px;padding:1px 5px;color:var(--text-2)">${escHtml(k)}</kbd>`).join("")}</span></div>`;
    });
    html += "</div>";
  });
  ppBody.innerHTML = html;
  previewPanel.classList.remove("hidden");
}

function showCommandPreview(cmd) {
  if (!cmd || previewCmdId === cmd.id) return;
  previewCmdId = cmd.id;
  const previewPanel = document.getElementById("previewPanel");
  const ppBody = document.getElementById("ppBody");
  const ppTitle = document.getElementById("ppTitle");
  if (!previewPanel || !ppBody) return;

  ppTitle.textContent = "COMMAND PREVIEW";
  const catMeta = CATEGORY_META[cmd.category] || {};
  ppBody.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="width:36px;height:36px;border-radius:8px;background:${catMeta.bg || "var(--bg-4)"};border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px">${cmd.icon}</div>
      <div><div style="font-size:14px;font-weight:600;color:var(--text)">${escHtml(cmd.title)}</div><div style="font-size:11px;color:var(--text-3)">${escHtml(cmd.category)} command</div></div>
    </div>
    <div style="font-size:12px;color:var(--text-2);line-height:1.6;margin-bottom:10px">${escHtml(cmd.sub || "No description available.")}</div>
    ${cmd.kbd?.length ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px"><span style="font-size:10px;color:var(--text-3);margin-right:4px">SHORTCUT</span>${cmd.kbd.map((k) => `<kbd style="font-family:var(--font-mono);font-size:11px;background:var(--bg-4);border:1px solid var(--border-3);border-bottom-width:2px;border-radius:4px;padding:3px 8px;color:var(--text-2)">${escHtml(k)}</kbd>`).join("")}</div>` : `<div style="font-size:10px;color:var(--text-3)">No keyboard shortcut assigned</div>`}
    <div style="margin-top:10px;display:flex;gap:6px"><span style="font-size:9px;font-weight:700;letter-spacing:0.1em;padding:2px 8px;border-radius:999px;background:${catMeta.bg || "var(--bg-4)"};color:${catMeta.color || "#999"};text-transform:uppercase">${catMeta.label || cmd.category}</span>${pinnedIds.includes(cmd.id) ? `<span style="font-size:9px;padding:2px 8px;border-radius:999px;background:rgba(252,211,77,0.1);color:#FCD34D;font-weight:700">📌 PINNED</span>` : ""}${recentIds.includes(cmd.id) ? `<span style="font-size:9px;padding:2px 8px;border-radius:999px;background:rgba(110,231,183,0.08);color:var(--sage);font-weight:700">RECENT</span>` : ""}</div>
    <div style="margin-top:8px;font-size:10px;color:var(--text-3)">Used ${frequencyMap[cmd.id] || 0} times</div>
  `;
  previewPanel.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cmdTrigger")?.addEventListener("click", openPalette);

  const backdrop = document.getElementById("paletteBackdrop");
  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) closePalette();
  });

  document.getElementById("pirEsc")?.addEventListener("click", closePalette);
  document.getElementById("ppClose")?.addEventListener("click", () => {
    document.getElementById("previewPanel")?.classList.add("hidden");
    previewCmdId = null;
  });

  document.getElementById("paletteScopes")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".scope-chip");
    if (!chip) return;
    activeScope = chip.dataset.scope;
    document
      .querySelectorAll(".scope-chip")
      .forEach((c) => c.classList.toggle("active", c === chip));
    selectedIndex = -1;
    refreshResults();
  });

  const input = document.getElementById("paletteInput");
  if (input) {
    input.addEventListener("input", () => {
      currentQuery = input.value;
      selectedIndex = -1;
      kbdNavActive = false;
      refreshResults();
    });

    input.addEventListener("keydown", (e) => {
      const items = document.querySelectorAll(".cmd-item");
      const itemCount = items.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        kbdNavActive = true;
        selectedIndex = (selectedIndex + 1) % itemCount;
        updateSelectedState();
        if (e.altKey) {
          const cmd = activeResults[selectedIndex]?.cmd;
          if (cmd) showCommandPreview(cmd);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        kbdNavActive = true;
        selectedIndex = (selectedIndex - 1 + itemCount) % itemCount;
        updateSelectedState();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = items[selectedIndex];
        if (sel) {
          const cmdId = sel.dataset.cmdId;
          const found = COMMANDS.find((c) => c.id === cmdId);
          if (found) executeCommand(found);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const sel = items[selectedIndex];
        const cmdId = sel?.dataset.cmdId;
        const found = COMMANDS.find((c) => c.id === cmdId);
        if (found) showCommandPreview(found);
      } else if (e.key === "Escape") {
        e.preventDefault();
        const previewPanel = document.getElementById("previewPanel");
        if (!previewPanel?.classList.contains("hidden")) {
          previewPanel.classList.add("hidden");
          previewCmdId = null;
        } else {
          closePalette();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault();
        const cmdId = items[selectedIndex]?.dataset.cmdId;
        if (cmdId) {
          if (!pinnedIds.includes(cmdId)) {
            pinnedIds = [cmdId, ...pinnedIds].slice(0, 10);
            localStorage.setItem("cmd_pinned", JSON.stringify(pinnedIds));
            notify("Pinned", "Command pinned", "📌");
            refreshResults();
          }
        }
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key === "k") {
      e.preventDefault();
      togglePalette();
      return;
    }
    if (isMeta && e.key === "p") {
      e.preventDefault();
      openPalette();
      return;
    }
    if (!isOpen) return;
  });

  document.addEventListener("keydown", (e) => {
    if (isOpen) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const shortcuts = {
      "g+d": () => navigate("Dashboard"),
      "g+p": () => navigate("Projects"),
      "g+t": () => navigate("Team"),
      "g+s": () => navigate("Settings"),
      c: () => createIssue(),
      "?": () => {
        openPalette();
        setTimeout(() => {
          const inp = document.getElementById("paletteInput");
          if (inp) {
            inp.value = "shortcut";
            inp.dispatchEvent(new Event("input"));
          }
        }, 50);
      },
    };

    if (e.key === "Escape") {
      const pp = document.getElementById("previewPanel");
      if (!pp?.classList.contains("hidden")) {
        pp.classList.add("hidden");
        previewCmdId = null;
      }
    }
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.textContent.trim());
    });
  });

  document
    .getElementById("btnNewIssue")
    ?.addEventListener("click", createIssue);

  document.querySelectorAll(".sb-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".sb-item")
        .forEach((el) => el.classList.remove("active"));
      item.classList.add("active");

      const itemName = item.textContent
        .trim()
        .replace(/^[⊞⊟◇]+/, "")
        .trim();
      const titleEl = document.getElementById("pageTitle");
      const bcEl = document.getElementById("bcCurrent");
      if (titleEl) titleEl.textContent = itemName;
      if (bcEl) bcEl.textContent = itemName;

      notify("Navigation", `Viewing ${itemName}`, "🧭");
      updateViewVisibility(itemName);
    });
  });

  document.querySelector(".user-avatar")?.addEventListener("click", () => {
    notify("Profile", "Opening user profile settings...", "👤");
  });

  document.querySelector(".cs-action")?.addEventListener("click", () => {
    notify("Activity", "Viewing all recent activity...", "📋");
  });

  document.querySelectorAll(".kpi-card").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const label = card.querySelector(".kpi-label")?.textContent || "KPI";
      notify("Filter", `Filtering by ${label}...`, "🔍");
    });
  });

  document.getElementById("activityList")?.addEventListener("click", (e) => {
    if (e.target.closest(".al-item")) {
      notify("Activity", "Opening item details...", "📄");
    }
  });

  const hintSection = document.getElementById("hintSection");
  if (hintSection) {
    hintSection.style.cursor = "pointer";
    hintSection.addEventListener("click", openPalette);
  }

  document.getElementById("prefixIcon").textContent = /Mac|iPhone|iPad/.test(
    navigator.userAgent,
  )
    ? "⌘"
    : "ctrl";
  document.querySelectorAll(".ct-kbd").forEach((kbd, i) => {
    if (i === 0)
      kbd.textContent = /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  });

  setTimeout(
    () => notify("Ready", "Press ⌘K to open the command palette", "⌘"),
    800,
  );
});
