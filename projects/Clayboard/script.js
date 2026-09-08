"use strict";

const COL_COLORS = [
  "#C4714A",
  "#5E8B6D",
  "#8B6D8B",
  "#B89040",
  "#3E8B8B",
  "#7A6B62",
  "#9A5070",
  "#4A7A9B",
];

const MEMBERS = [
  { id: "m1", name: "Alex Kim", initials: "AK", color: "#C4714A" },
  { id: "m2", name: "Sarah Chen", initials: "SC", color: "#5E8B6D" },
  { id: "m3", name: "Marcus Lee", initials: "ML", color: "#8B6D8B" },
  { id: "m4", name: "Priya Nair", initials: "PN", color: "#B89040" },
  { id: "m5", name: "James Wu", initials: "JW", color: "#3E8B8B" },
  { id: "m6", name: "Lena Kovac", initials: "LK", color: "#9A5070" },
];

const LABEL_META = {
  bug: { color: "#C4714A", bg: "rgba(196,113,74,0.12)" },
  feature: { color: "#5E8B6D", bg: "rgba(94,139,109,0.12)" },
  design: { color: "#8B6D8B", bg: "rgba(139,109,139,0.12)" },
  research: { color: "#B89040", bg: "rgba(184,144,64,0.12)" },
  devops: { color: "#3E8B8B", bg: "rgba(62,139,139,0.12)" },
};

const PRIORITY_META = {
  critical: { color: "#E53E3E", emoji: "🔴" },
  high: { color: "#DD6B20", emoji: "🟠" },
  medium: { color: "#D69E2E", emoji: "🟡" },
  low: { color: "#38A169", emoji: "🟢" },
  none: { color: "#A0AEC0", emoji: "⚪" },
};

const DEFAULT_DATA = {
  boardTitle: "Product Roadmap Q1",
  columns: [
    {
      id: "col-backlog",
      title: "Backlog",
      color: "#7A6B62",
      wip: null,
      cards: [
        {
          id: "c1",
          title: "User research synthesis",
          desc: "Compile and analyze findings from 12 user interviews conducted last sprint.",
          label: "research",
          priority: "high",
          assignees: ["m1", "m4"],
          due: "2024-02-15",
          points: 5,
          pinned: false,
          checklist: [
            { id: "cl1", text: "Transcribe interviews", done: true },
            { id: "cl2", text: "Affinity mapping", done: false },
            { id: "cl3", text: "Write report", done: false },
          ],
          comments: [
            {
              id: "co1",
              author: "m2",
              text: "Great interviews — lots of signals around onboarding friction.",
              ts: "2h ago",
            },
          ],
        },
        {
          id: "c2",
          title: "Mobile breakpoints audit",
          desc: "Document all existing breakpoints and identify inconsistencies.",
          label: "design",
          priority: "medium",
          assignees: ["m3"],
          due: null,
          points: 3,
          pinned: false,
          checklist: [],
          comments: [],
        },
        {
          id: "c3",
          title: "Dependency upgrade — React 18",
          desc: null,
          label: "devops",
          priority: "low",
          assignees: [],
          due: null,
          points: 8,
          pinned: false,
          checklist: [],
          comments: [],
        },
        {
          id: "c4",
          title: "API rate limiting",
          desc: "Implement sliding window rate limiter on /api/v2 endpoints.",
          label: "feature",
          priority: "critical",
          assignees: ["m5"],
          due: "2024-02-10",
          points: 13,
          pinned: true,
          checklist: [
            { id: "cl4", text: "Design algorithm", done: true },
            { id: "cl5", text: "Implement middleware", done: true },
            { id: "cl6", text: "Load test", done: false },
          ],
          comments: [],
        },
      ],
    },
    {
      id: "col-inprogress",
      title: "In Progress",
      color: "#C4714A",
      wip: 4,
      cards: [
        {
          id: "c5",
          title: "Redesign onboarding flow",
          desc: "Create a new step-by-step onboarding experience based on user research insights.",
          label: "design",
          priority: "high",
          assignees: ["m3", "m2"],
          due: "2024-02-20",
          points: 8,
          pinned: false,
          checklist: [
            { id: "cl7", text: "Wireframes", done: true },
            { id: "cl8", text: "High-fi mockups", done: false },
            { id: "cl9", text: "Developer handoff", done: false },
          ],
          comments: [
            {
              id: "co2",
              author: "m1",
              text: "Latest iteration looks great — ship it!",
              ts: "45m ago",
            },
          ],
        },
        {
          id: "c6",
          title: "Fix memory leak in WebSocket handler",
          desc: null,
          label: "bug",
          priority: "critical",
          assignees: ["m5"],
          due: "2024-02-08",
          points: 5,
          pinned: false,
          checklist: [],
          comments: [],
        },
        {
          id: "c7",
          title: "Analytics dashboard v2",
          desc: "Add cohort analysis, funnel visualization, and export to CSV.",
          label: "feature",
          priority: "medium",
          assignees: ["m1", "m6"],
          due: "2024-03-01",
          points: 13,
          pinned: false,
          checklist: [
            { id: "cl10", text: "Cohort table component", done: false },
            { id: "cl11", text: "Funnel chart", done: false },
          ],
          comments: [],
        },
      ],
    },
    {
      id: "col-review",
      title: "In Review",
      color: "#8B6D8B",
      wip: 3,
      cards: [
        {
          id: "c8",
          title: "Dark mode implementation",
          desc: "CSS custom properties approach, system preference detection, and manual toggle.",
          label: "feature",
          priority: "medium",
          assignees: ["m3"],
          due: null,
          points: 5,
          pinned: false,
          checklist: [
            { id: "cl12", text: "Core tokens", done: true },
            { id: "cl13", text: "Component audit", done: true },
            { id: "cl14", text: "QA pass", done: true },
          ],
          comments: [
            {
              id: "co3",
              author: "m4",
              text: "Found one issue with chart colors in dark mode — left a Figma comment.",
              ts: "3h ago",
            },
          ],
        },
        {
          id: "c9",
          title: "GDPR data export endpoint",
          desc: null,
          label: "devops",
          priority: "high",
          assignees: ["m5", "m1"],
          due: "2024-02-12",
          points: 8,
          pinned: false,
          checklist: [],
          comments: [],
        },
      ],
    },
    {
      id: "col-done",
      title: "Done",
      color: "#5E8B6D",
      wip: null,
      cards: [
        {
          id: "c10",
          title: "Set up CI/CD pipeline",
          desc: "GitHub Actions with staging and production deploy targets.",
          label: "devops",
          priority: "none",
          assignees: ["m5"],
          due: null,
          points: 5,
          pinned: false,
          checklist: [
            { id: "cl15", text: "Staging pipeline", done: true },
            { id: "cl16", text: "Production pipeline", done: true },
            { id: "cl17", text: "Docs", done: true },
          ],
          comments: [],
        },
        {
          id: "c11",
          title: "Password reset flow fix",
          desc: null,
          label: "bug",
          priority: "none",
          assignees: ["m6"],
          due: null,
          points: 2,
          pinned: false,
          checklist: [],
          comments: [],
        },
        {
          id: "c12",
          title: "Pricing page A/B test setup",
          desc: null,
          label: "research",
          priority: "none",
          assignees: ["m4", "m2"],
          due: null,
          points: 3,
          pinned: false,
          checklist: [],
          comments: [],
        },
      ],
    },
  ],
};

let board = null;
let historyStack = [];
let historyIndex = -1;
let dragState = null;
let activeFilter = "all";
let searchQuery = "";
let activeMemberFilter = null;
let openModalCardId = null;
let activeColId = null;
let saveTimer = null;
let colorIdxCounter = COL_COLORS.length - 1;

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadData() {
  try {
    const raw = localStorage.getItem("clayboard_data");
    return raw ? JSON.parse(raw) : deepClone(DEFAULT_DATA);
  } catch {
    return deepClone(DEFAULT_DATA);
  }
}

function saveData() {
  clearTimeout(saveTimer);
  const sbSave = document.getElementById("sbSave");
  if (sbSave) {
    sbSave.textContent = "Saving…";
    sbSave.classList.add("dirty");
  }
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem("clayboard_data", JSON.stringify(board));
    } catch {}
    if (sbSave) {
      sbSave.textContent = "Saved";
      sbSave.classList.remove("dirty");
    }
  }, 400);
}

function pushHistory() {
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(deepClone(board));
  if (historyStack.length > 60) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateHistoryButtons();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  board = deepClone(historyStack[historyIndex]);
  renderBoard(false);
  saveData();
  toast("Undo", "↩");
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  board = deepClone(historyStack[historyIndex]);
  renderBoard(false);
  saveData();
  toast("Redo", "↪");
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const btnUndo = document.getElementById("btnUndo");
  const btnRedo = document.getElementById("btnRedo");
  if (btnUndo) btnUndo.disabled = historyIndex <= 0;
  if (btnRedo) btnRedo.disabled = historyIndex >= historyStack.length - 1;
}

function getCardById(id) {
  for (const col of board.columns) {
    const card = col.cards.find((c) => c.id === id);
    if (card) return { card, col };
  }
  return null;
}

function getColById(id) {
  return board.columns.find((c) => c.id === id) || null;
}

function toast(msg, icon = "◆", type = "default") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span>${escHtml(msg)}`;
  container.prepend(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 220);
  }, 2400);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due - now) / 86400000);
}

function formatDue(dateStr) {
  if (!dateStr) return "";
  const d = getDaysUntil(dateStr);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${dateStr}`;
}

function buildCardEl(card) {
  const el = document.createElement("div");
  el.className = "card";
  el.setAttribute("draggable", "true");
  el.dataset.cardId = card.id;
  el.setAttribute("role", "listitem");
  el.setAttribute("aria-label", card.title || "Untitled card");

  const priorityColor =
    PRIORITY_META[card.priority || "none"]?.color || "#A0AEC0";

  let html = `<div class="card-accent-strip" style="background:${priorityColor}20; border-top:3px solid ${priorityColor}"></div>`;

  html += `<div class="card-top-row">
    <div class="card-priority-dot" style="background:${priorityColor}" title="${card.priority || "no priority"}"></div>
    <div class="card-title">${escHtml(card.title || "Untitled")}</div>
    ${card.pinned ? `<div class="card-pin-icon" title="Pinned">📌</div>` : ""}
  </div>`;

  if (card.desc) html += `<div class="card-desc">${escHtml(card.desc)}</div>`;

  if (card.label && LABEL_META[card.label]) {
    const lm = LABEL_META[card.label];
    html += `<div class="card-label" style="background:${lm.bg};color:${lm.color}">${escHtml(card.label)}</div>`;
  }

  const metaItems = [];
  if (card.due) {
    const days = getDaysUntil(card.due);
    const cls = days < 0 ? "overdue" : days <= 2 ? "due-soon" : "";
    const emoji = days < 0 ? "⚠ " : "📅 ";
    metaItems.push(
      `<span class="card-meta-item ${cls}" title="${card.due}">${emoji}${escHtml(formatDue(card.due))}</span>`,
    );
  }
  if (card.checklist && card.checklist.length) {
    const done = card.checklist.filter((i) => i.done).length;
    metaItems.push(
      `<span class="card-meta-item" title="Checklist">☑ ${done}/${card.checklist.length}</span>`,
    );
  }
  if (card.comments && card.comments.length) {
    metaItems.push(
      `<span class="card-meta-item" title="Comments">💬 ${card.comments.length}</span>`,
    );
  }
  if (metaItems.length)
    html += `<div class="card-meta">${metaItems.join("")}</div>`;

  html += `<div class="card-footer">`;
  if (card.assignees && card.assignees.length) {
    html += `<div class="card-assignees">`;
    card.assignees.slice(0, 3).forEach((mid) => {
      const m = MEMBERS.find((m) => m.id === mid);
      if (m)
        html += `<div class="card-av" style="background:${m.color}" title="${escHtml(m.name)}">${escHtml(m.initials)}</div>`;
    });
    if (card.assignees.length > 3)
      html += `<div class="card-av" style="background:#888">+${card.assignees.length - 3}</div>`;
    html += `</div>`;
  } else {
    html += `<div></div>`;
  }
  if (card.points > 0) html += `<div class="card-pts">${card.points}pt</div>`;
  html += `</div>`;

  if (card.checklist && card.checklist.length) {
    const pct =
      (card.checklist.filter((i) => i.done).length / card.checklist.length) *
      100;
    html += `<div class="card-checklist-bar"><div class="ccb-fill" style="width:${pct}%"></div></div>`;
  }

  html += `<div class="card-actions-row">
    <button class="card-action-btn" data-action="edit"      data-card-id="${card.id}">✎ Edit</button>
    <button class="card-action-btn" data-action="duplicate" data-card-id="${card.id}">⧉ Dup</button>
    <button class="card-action-btn danger" data-action="delete" data-card-id="${card.id}">✕</button>
  </div>`;

  el.innerHTML = html;

  applyCardFilterVisibility(el, card);

  el.addEventListener("click", (e) => {
    if (e.target.closest(".card-action-btn")) return;
    openCardModal(card.id);
  });

  el.addEventListener("dragstart", onCardDragStart);
  el.addEventListener("dragend", onCardDragEnd);

  return el;
}

function applyCardFilterVisibility(el, card) {
  const filteredOut = activeFilter !== "all" && card.label !== activeFilter;
  const memberFilteredOut =
    activeMemberFilter && !card.assignees.includes(activeMemberFilter);
  const searchMiss = searchQuery && !cardMatchesSearch(card, searchQuery);
  el.classList.toggle("filtered-out", filteredOut || memberFilteredOut);
  el.classList.toggle(
    "search-miss",
    searchMiss && !filteredOut && !memberFilteredOut,
  );
}

function cardMatchesSearch(card, query) {
  const q = query.toLowerCase();
  return (
    (card.title || "").toLowerCase().includes(q) ||
    (card.desc || "").toLowerCase().includes(q) ||
    (card.label || "").toLowerCase().includes(q)
  );
}

function buildColumnEl(col) {
  const colEl = document.createElement("div");
  colEl.className = "column";
  colEl.dataset.colId = col.id;
  colEl.setAttribute("role", "region");
  colEl.setAttribute("aria-label", col.title);

  const wipOver = col.wip && col.cards.length > col.wip;
  const doneCards = col.cards.filter(
    (c) => c.checklist?.length && c.checklist.every((i) => i.done),
  ).length;
  const totalPts = col.cards.reduce((a, c) => a + (c.points || 0), 0);
  const progressPct = col.wip
    ? Math.min(100, (col.cards.length / col.wip) * 100)
    : 0;
  const progressColor = wipOver ? "#C4714A" : col.color;

  let html = `<div class="col-header">
    <div class="col-header-row">
      <div class="col-color-strip" style="background:${col.color}" data-col-color title="Change color"></div>
      <input class="col-title-input" value="${escHtml(col.title)}" aria-label="Column title" data-col-title/>
      <div class="col-count-badge">${col.cards.length}${col.wip ? "/" + col.wip : ""}</div>
      <div class="col-header-actions">
        <button class="col-ha-btn" data-col-action="collapse" title="Collapse column">⊟</button>
        <button class="col-ha-btn" data-col-action="sort"    title="Sort cards">⇅</button>
        <button class="col-ha-btn" data-col-action="delete"  title="Delete column" style="color:var(--terracotta)">✕</button>
      </div>
    </div>`;

  if (col.wip) {
    html += `<div class="col-progress-wrap">
      <div class="col-progress-fill" style="width:${progressPct}%;background:${progressColor}"></div>
    </div>
    <div class="col-wip-label${wipOver ? " over" : ""}">WIP ${col.cards.length}/${col.wip}${wipOver ? " — OVER LIMIT" : ""}</div>`;
  }

  html += `</div>`;

  html += `<div class="col-stats">
    <div class="cst-item">⭐ <span class="cst-val">${totalPts}</span>pts</div>
    <div class="cst-item">☑ <span class="cst-val">${doneCards}</span>done</div>
    <div class="cst-item">👥 <span class="cst-val">${new Set(col.cards.flatMap((c) => c.assignees || [])).size}</span>mem</div>
  </div>`;

  html += `<div class="col-cards" role="list" data-col-cards="${col.id}"></div>`;

  html += `<div class="col-footer">
    <button class="add-card-btn" data-col-id="${col.id}">
      <span class="acb-icon">+</span> Add card
    </button>
  </div>`;

  colEl.innerHTML = html;

  const cardsEl = colEl.querySelector(`[data-col-cards]`);

  col.cards.forEach((card) => cardsEl.appendChild(buildCardEl(card)));

  cardsEl.addEventListener("dragover", onColDragOver);
  cardsEl.addEventListener("dragenter", onColDragEnter);
  cardsEl.addEventListener("dragleave", onColDragLeave);
  cardsEl.addEventListener("drop", onColDrop);

  const titleInput = colEl.querySelector("[data-col-title]");
  titleInput?.addEventListener("change", () => {
    pushHistory();
    const c = getColById(col.id);
    if (c) c.title = titleInput.value.trim() || "Unnamed";
    saveData();
    updateStatusBar();
  });

  const colorStrip = colEl.querySelector("[data-col-color]");
  colorStrip?.addEventListener("click", (e) => {
    e.stopPropagation();
    showColColorPicker(colEl, col.id);
  });

  colEl.querySelectorAll("[data-col-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleColAction(btn.dataset.colAction, col.id, colEl);
    });
  });

  return colEl;
}

function handleColAction(action, colId, colEl) {
  if (action === "delete") {
    if (
      !confirm(
        `Delete column "${getColById(colId)?.title}"? All cards will be lost.`,
      )
    )
      return;
    pushHistory();
    board.columns = board.columns.filter((c) => c.id !== colId);
    colEl.remove();
    saveData();
    renderBoard(false);
    toast("Column deleted", "✕");
  } else if (action === "sort") {
    pushHistory();
    const col = getColById(colId);
    if (!col) return;
    const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    col.cards.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority || "none"] || 4) -
        (PRIORITY_ORDER[b.priority || "none"] || 4),
    );
    renderBoard(false);
    saveData();
    toast("Sorted by priority", "⇅");
  } else if (action === "collapse") {
    const cardsEl = colEl.querySelector(".col-cards");
    const footerEl = colEl.querySelector(".col-footer");
    if (cardsEl && footerEl) {
      const isCollapsed = cardsEl.style.display === "none";
      cardsEl.style.display = isCollapsed ? "" : "none";
      footerEl.style.display = isCollapsed ? "" : "none";
      colEl.querySelector("[data-col-action='collapse']").textContent =
        isCollapsed ? "⊟" : "⊞";
    }
  }
}

function showColColorPicker(colEl, colId) {
  document.querySelectorAll(".color-picker-popup").forEach((p) => p.remove());
  const popup = document.createElement("div");
  popup.className = "color-picker-popup";
  const allColors = [...COL_COLORS, "#9A5070", "#4A7A9B", "#6B5B8B", "#5B8B5B"];
  allColors.forEach((c) => {
    const sw = document.createElement("div");
    sw.className =
      "color-swatch" + (getColById(colId)?.color === c ? " selected" : "");
    sw.style.background = c;
    sw.addEventListener("click", () => {
      pushHistory();
      const col = getColById(colId);
      if (col) col.color = c;
      popup.remove();
      renderBoard(false);
      saveData();
    });
    popup.appendChild(sw);
  });
  colEl.querySelector(".col-header").style.position = "relative";
  colEl.querySelector(".col-header").appendChild(popup);
  setTimeout(
    () =>
      document.addEventListener("click", () => popup.remove(), { once: true }),
    0,
  );
}

function showQuickAdd(colId, colEl) {
  const existing = colEl.querySelector(".card-quick-add");
  if (existing) {
    existing.remove();
    return;
  }
  const footer = colEl.querySelector(".col-footer");
  const addBtn = footer?.querySelector(".add-card-btn");
  const qa = document.createElement("div");
  qa.className = "card-quick-add";
  qa.innerHTML = `<textarea class="quick-add-input" placeholder="Card title…" rows="2"></textarea>
    <div class="quick-add-row">
      <button class="quick-add-submit">Add Card</button>
      <button class="quick-add-cancel">Cancel</button>
    </div>`;
  footer?.insertBefore(qa, addBtn);
  const textarea = qa.querySelector(".quick-add-input");
  textarea?.focus();
  const submit = () => {
    const title = textarea?.value.trim();
    if (!title) {
      qa.remove();
      return;
    }
    pushHistory();
    const col = getColById(colId);
    if (!col) return;
    const newCard = {
      id: uid(),
      title,
      desc: null,
      label: "feature",
      priority: "medium",
      assignees: [],
      due: null,
      points: 0,
      pinned: false,
      checklist: [],
      comments: [],
    };
    col.cards.push(newCard);
    qa.remove();
    const cardsEl = colEl.querySelector(".col-cards");
    if (cardsEl) {
      const cardEl = buildCardEl(newCard);
      cardsEl.appendChild(cardEl);
      flipAnimate(cardEl, { x: 0, y: 20 }, { x: 0, y: 0 });
    }
    updateColStats(colEl, col);
    saveData();
    updateStatusBar();
    toast("Card added", "✨");
  };
  qa.querySelector(".quick-add-submit")?.addEventListener("click", submit);
  qa.querySelector(".quick-add-cancel")?.addEventListener("click", () =>
    qa.remove(),
  );
  textarea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") qa.remove();
  });
}

function updateColStats(colEl, col) {
  const badge = colEl.querySelector(".col-count-badge");
  if (badge)
    badge.textContent = col.cards.length + (col.wip ? "/" + col.wip : "");
}

function renderBoard(animate) {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;
  const prevRects = {};
  if (animate) {
    boardEl.querySelectorAll(".card").forEach((el) => {
      prevRects[el.dataset.cardId] = el.getBoundingClientRect();
    });
  }
  boardEl.innerHTML = "";
  board.columns.forEach((col) => boardEl.appendChild(buildColumnEl(col)));

  boardEl.appendChild(buildAddColGhost());

  if (animate) {
    boardEl.querySelectorAll(".card").forEach((el) => {
      const prev = prevRects[el.dataset.cardId];
      if (prev) {
        const curr = el.getBoundingClientRect();
        const dx = prev.left - curr.left;
        const dy = prev.top - curr.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          flipAnimate(el, { x: dx, y: dy }, { x: 0, y: 0 });
        }
      }
    });
  }
  updateStatusBar();
  const titleInput = document.getElementById("boardTitle");
  if (titleInput) titleInput.value = board.boardTitle || "Untitled Board";
}

function flipAnimate(el, from, to) {
  el.style.transition = "transform 320ms cubic-bezier(0.2, 0, 0, 1)";
  el.style.transform = `translate(${from.x}px, ${from.y}px)`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = `translate(${to.x}px, ${to.y}px)`;
      setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, 320);
    });
  });
}

function buildAddColGhost() {
  const ghost = document.createElement("div");
  ghost.className = "add-col-ghost";
  ghost.setAttribute("role", "button");
  ghost.setAttribute("tabindex", "0");
  ghost.setAttribute("aria-label", "Add new column");
  ghost.innerHTML = `<div class="add-col-ghost-icon" aria-hidden="true">⊞</div><span>Add column</span>`;
  ghost.addEventListener("click", () => addNewColumn());
  ghost.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") addNewColumn();
  });
  return ghost;
}

function addNewColumn(title) {
  pushHistory();
  colorIdxCounter = (colorIdxCounter + 1) % COL_COLORS.length;
  const newCol = {
    id: uid(),
    title: title || "New Column",
    color: COL_COLORS[colorIdxCounter],
    wip: null,
    cards: [],
  };
  board.columns.push(newCol);
  renderBoard(false);
  saveData();
  updateStatusBar();
  toast("Column added", "⊞");
  const newColEl = document.querySelector(
    `[data-col-id="${newCol.id}"] .col-title-input`,
  );
  if (newColEl) {
    newColEl.focus();
    newColEl.select();
  }
}

function updateStatusBar() {
  const totalCards = board.columns.reduce((a, c) => a + c.cards.length, 0);
  const sbCards = document.getElementById("sbCards");
  const sbCols = document.getElementById("sbCols");
  if (sbCards)
    sbCards.textContent = `${totalCards} card${totalCards !== 1 ? "s" : ""}`;
  if (sbCols)
    sbCols.textContent = `${board.columns.length} column${board.columns.length !== 1 ? "s" : ""}`;
}

let dragGhostEl, dropIndicatorEl;

function onCardDragStart(e) {
  e.stopPropagation();
  const cardEl = e.currentTarget;
  const cardId = cardEl.dataset.cardId;
  const colEl = cardEl.closest(".column");
  const colId = colEl?.dataset.colId;

  const { card, col } = getCardById(cardId);

  dragState = {
    cardId,
    fromColId: colId,
    cardEl,
    startX: e.clientX,
    startY: e.clientY,
    ghostX: 0,
    ghostY: 0,
  };

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", cardId);

  const ghost = document.getElementById("dragGhost");
  ghost.innerHTML = "";
  ghost.className = "drag-ghost";
  ghost.style.width = cardEl.getBoundingClientRect().width + "px";
  const clone = buildCardEl(card);
  clone.style.cssText =
    "width:100%;box-shadow:none;cursor:grabbing;border:none;";
  ghost.appendChild(clone);
  document.body.appendChild(ghost);
  ghost.classList.remove("hidden");
  ghost.style.left = e.clientX - 20 + "px";
  ghost.style.top = e.clientY - 20 + "px";
  e.dataTransfer.setDragImage(new Image(), 0, 0);

  setTimeout(() => {
    cardEl.classList.add("drag-source");
  }, 0);

  document.getElementById("sbDrag").textContent =
    `Dragging: ${card.title?.slice(0, 30) || "card"}`;
  document.getElementById("dropIndicator").classList.remove("hidden");
}

function onCardDragEnd(e) {
  const cardEl = e.currentTarget;
  cardEl.classList.remove("drag-source", "dragging");

  const ghost = document.getElementById("dragGhost");
  ghost.classList.add("hidden");

  const indicator = document.getElementById("dropIndicator");
  indicator.classList.add("hidden");

  document
    .querySelectorAll(".col-cards.drop-active")
    .forEach((el) => el.classList.remove("drop-active"));
  document
    .querySelectorAll(".column.drag-over-col")
    .forEach((el) => el.classList.remove("drag-over-col"));

  dragState = null;
  document.getElementById("sbDrag").textContent = "Ready";
}

document.addEventListener("dragover", (e) => {
  if (!dragState) return;
  const ghost = document.getElementById("dragGhost");
  ghost.style.left = e.clientX - 20 + "px";
  ghost.style.top = e.clientY - 20 + "px";
});

function onColDragEnter(e) {
  e.preventDefault();
  if (!dragState) return;
  const cardsEl = e.currentTarget;
  const colEl = cardsEl.closest(".column");
  cardsEl.classList.add("drop-active");
  colEl?.classList.add("drag-over-col");
}

function onColDragLeave(e) {
  const cardsEl = e.currentTarget;
  const related = e.relatedTarget;
  if (related && cardsEl.contains(related)) return;
  cardsEl.classList.remove("drop-active");
  const colEl = cardsEl.closest(".column");
  colEl?.classList.remove("drag-over-col");
}

function onColDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (!dragState) return;

  const cardsEl = e.currentTarget;
  const cards = [...cardsEl.querySelectorAll(".card:not(.drag-source)")];
  const indicator = document.getElementById("dropIndicator");
  const containerRect = cardsEl.getBoundingClientRect();

  let insertBefore = null;
  let indicatorY = containerRect.bottom - 2;
  let found = false;

  for (const card of cards) {
    const r = card.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (e.clientY < mid) {
      insertBefore = card;
      indicatorY = r.top - 2;
      found = true;
      break;
    }
  }

  if (!found && cards.length) {
    const last = cards[cards.length - 1].getBoundingClientRect();
    indicatorY = last.bottom + 2;
  }

  const leftEdge = containerRect.left + 6;
  const rightEdge = containerRect.right - 6;
  indicator.style.left = leftEdge + "px";
  indicator.style.width = rightEdge - leftEdge + "px";
  indicator.style.top = indicatorY + "px";
  indicator.classList.remove("hidden");

  dragState.insertBefore = insertBefore;
  dragState.toColId = cardsEl.dataset.colCards;
}

function onColDrop(e) {
  e.preventDefault();
  if (!dragState) return;

  const cardsEl = e.currentTarget;
  cardsEl.classList.remove("drop-active");
  cardsEl.closest(".column")?.classList.remove("drag-over-col");

  const toColId = cardsEl.dataset.colCards;
  const { cardId, fromColId, insertBefore } = dragState;

  const fromCol = getColById(fromColId);
  const toCol = getColById(toColId);
  if (!fromCol || !toCol) return;

  const cardIdx = fromCol.cards.findIndex((c) => c.id === cardId);
  if (fromColId === toColId) {
    if (insertBefore) {
      const beforeId = insertBefore.dataset.cardId;
      const insertIdx = toCol.cards.findIndex((c) => c.id === beforeId);
      if (cardIdx === insertIdx || cardIdx === insertIdx - 1) return;
    } else {
      if (cardIdx === fromCol.cards.length - 1) return;
    }
  }

  const prevRects = {};
  document.querySelectorAll(".card").forEach((el) => {
    prevRects[el.dataset.cardId] = el.getBoundingClientRect();
  });

  pushHistory();

  const [movedCard] = fromCol.cards.splice(cardIdx, 1);

  if (insertBefore) {
    const beforeId = insertBefore.dataset.cardId;
    let insertIdx = toCol.cards.findIndex((c) => c.id === beforeId);
    if (insertIdx < 0) insertIdx = toCol.cards.length;
    toCol.cards.splice(insertIdx, 0, movedCard);
  } else {
    toCol.cards.push(movedCard);
  }

  renderBoard(false);
  saveData();
  updateStatusBar();

  document.querySelectorAll(".card").forEach((el) => {
    const prev = prevRects[el.dataset.cardId];
    if (prev) {
      const curr = el.getBoundingClientRect();
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        flipAnimate(el, { x: dx, y: dy }, { x: 0, y: 0 });
    }
  });

  const fromName = fromCol.title,
    toName = toCol.title;
  if (fromColId !== toColId) toast(`Moved to ${toName}`, "⇒");
}

function openCardModal(cardId) {
  const result = getCardById(cardId);
  if (!result) return;
  const { card, col } = result;
  openModalCardId = cardId;
  activeColId = col.id;

  const modal = document.getElementById("cardModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("modalColumnBadge").textContent = col.title;
  document.getElementById("modalTitle").value = card.title || "";
  document.getElementById("modalDesc").value = card.desc || "";

  const dueInput = document.getElementById("modalDue");
  if (dueInput) dueInput.value = card.due || "";

  document
    .querySelectorAll(".ps-btn")
    .forEach((btn) =>
      btn.classList.toggle(
        "active",
        btn.dataset.priority === (card.priority || "none"),
      ),
    );
  document
    .querySelectorAll(".ls-btn")
    .forEach((btn) =>
      btn.classList.toggle(
        "active",
        btn.dataset.label === (card.label || "none"),
      ),
    );
  document
    .querySelectorAll(".pts-btn")
    .forEach((btn) =>
      btn.classList.toggle(
        "active",
        Number(btn.dataset.pts) === (card.points || 0),
      ),
    );

  const modalPin = document.getElementById("modalPin");
  if (modalPin) {
    modalPin.textContent = card.pinned ? "★" : "☆";
    modalPin.classList.toggle("pinned", card.pinned);
  }

  buildAssigneeSelector(card);
  buildChecklist(card);
  buildComments(card);

  document.getElementById("modalTitle")?.focus();
}

function buildAssigneeSelector(card) {
  const container = document.getElementById("assigneeSelector");
  if (!container) return;
  container.innerHTML = "";
  MEMBERS.forEach((m) => {
    const btn = document.createElement("button");
    btn.className =
      "as-btn" + (card.assignees?.includes(m.id) ? " active" : "");
    btn.style.background = m.color;
    btn.title = m.name;
    btn.textContent = m.initials;
    btn.dataset.memberId = m.id;
    btn.addEventListener("click", () => btn.classList.toggle("active"));
    container.appendChild(btn);
  });

  const commentAv = document.getElementById("commentAvatar");
  if (commentAv) {
    commentAv.style.background = MEMBERS[0].color;
    commentAv.textContent = MEMBERS[0].initials;
  }
}

function buildChecklist(card) {
  const container = document.getElementById("checklist");
  const progress = document.getElementById("clProgress");
  if (!container) return;
  container.innerHTML = "";
  (card.checklist || []).forEach((item) => {
    const div = document.createElement("div");
    div.className = "cl-item";
    div.innerHTML = `<input type="checkbox" class="cl-check" id="cl-${item.id}" ${item.done ? "checked" : ""}/>
      <label class="cl-text${item.done ? " done" : ""}" for="cl-${item.id}">${escHtml(item.text)}</label>
      <button class="cl-del-btn" data-cl-id="${item.id}" aria-label="Delete item">✕</button>`;
    div.querySelector(".cl-check")?.addEventListener("change", (e) => {
      div.querySelector("label").classList.toggle("done", e.target.checked);
    });
    div
      .querySelector(".cl-del-btn")
      ?.addEventListener("click", () => div.remove());
    container.appendChild(div);
  });
  const updateProgress = () => {
    const all = container.querySelectorAll(".cl-check").length;
    const done = container.querySelectorAll(".cl-check:checked").length;
    if (progress) progress.textContent = all ? `${done}/${all}` : "";
  };
  container.addEventListener("change", updateProgress);
  updateProgress();
}

function buildComments(card) {
  const container = document.getElementById("commentsList");
  const count = document.getElementById("commentCount");
  if (!container) return;
  container.innerHTML = "";
  (card.comments || []).forEach((c) => {
    const m = MEMBERS.find((m) => m.id === c.author) || MEMBERS[0];
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `<div class="ci-av" style="background:${m.color}">${escHtml(m.initials)}</div>
      <div class="ci-body">
        <div class="ci-meta"><span class="ci-author">${escHtml(m.name)}</span><span class="ci-time">${escHtml(c.ts)}</span></div>
        <div class="ci-text">${escHtml(c.text)}</div>
      </div>`;
    container.appendChild(div);
  });
  if (count)
    count.textContent = card.comments?.length
      ? `(${card.comments.length})`
      : "";
}

function saveModal() {
  const result = getCardById(openModalCardId);
  if (!result) return;
  const { card } = result;

  pushHistory();

  card.title =
    document.getElementById("modalTitle")?.value.trim() || "Untitled";
  card.desc = document.getElementById("modalDesc")?.value.trim() || null;
  card.due = document.getElementById("modalDue")?.value || null;
  card.pinned =
    document.getElementById("modalPin")?.classList.contains("pinned") || false;

  const activePs = document.querySelector(".ps-btn.active");
  card.priority = activePs?.dataset.priority || "none";

  const activeLs = document.querySelector(".ls-btn.active");
  card.label = activeLs?.dataset.label || null;

  const activePts = document.querySelector(".pts-btn.active");
  card.points = Number(activePts?.dataset.pts || 0);

  card.assignees = [...document.querySelectorAll(".as-btn.active")].map(
    (b) => b.dataset.memberId,
  );

  const clItems = [];
  document.querySelectorAll(".cl-item").forEach((div) => {
    const check = div.querySelector(".cl-check");
    const label = div.querySelector(".cl-text");
    if (label?.textContent)
      clItems.push({
        id: uid(),
        text: label.textContent,
        done: !!check?.checked,
      });
  });
  card.checklist = clItems;

  renderBoard(true);
  saveData();
  closeModal();
  toast("Card saved", "✓");
}

function closeModal() {
  const modal = document.getElementById("cardModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  openModalCardId = null;
  activeColId = null;
}

function renderMemberStack() {
  const stack = document.getElementById("memberStack");
  if (!stack) return;
  stack.innerHTML = "";
  MEMBERS.forEach((m) => {
    const av = document.createElement("div");
    av.className = "member-av";
    if (activeMemberFilter === m.id) av.classList.add("active-filter");
    av.style.background = m.color;
    av.textContent = m.initials;
    av.title = m.name;
    av.addEventListener("click", () => {
      if (activeMemberFilter === m.id) {
        activeMemberFilter = null;
      } else {
        activeMemberFilter = m.id;
      }
      renderMemberStack();
      applyFilterToAllCards();
      toast(
        activeMemberFilter ? `Filtering by ${m.name}` : "Filter cleared",
        "👤",
      );
    });
    stack.appendChild(av);
  });
}

function renderActivity() {
  const container = document.getElementById("activityAvatars");
  if (!container) return;
  container.innerHTML = "";
  const count = 3;
  const actions = [
    "moved a card",
    "updated a description",
    "added a comment",
    "completed a task",
    "joined the board",
  ];
  const shuffled = [...MEMBERS].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  selected.forEach((m) => {
    const av = document.createElement("div");
    av.className = "activity-av";
    av.style.background = m.color;
    av.textContent = m.initials;
    av.title = `${m.name} is viewing`;
    av.style.display = "flex";
    av.style.alignItems = "center";
    av.style.justifyContent = "center";
    av.style.color = "white";
    av.style.fontSize = "9px";
    av.style.fontWeight = "800";

    av.addEventListener("click", () => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      toast(`${m.name} ${action} just now`, "⚡");
    });
    container.appendChild(av);
  });
}

function applyFilterToAllCards() {
  document.querySelectorAll(".card").forEach((el) => {
    const cardId = el.dataset.cardId;
    const res = getCardById(cardId);
    if (res) applyCardFilterVisibility(el, res.card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  board = loadData();
  pushHistory();
  renderBoard(false);
  renderMemberStack();
  renderActivity();

  document.getElementById("boardTitle")?.addEventListener("change", (e) => {
    pushHistory();
    board.boardTitle = e.target.value.trim() || "Untitled Board";
    saveData();
  });

  document
    .getElementById("btnAddColumn")
    ?.addEventListener("click", () => addNewColumn());
  document.getElementById("btnUndo")?.addEventListener("click", undo);
  document.getElementById("btnRedo")?.addEventListener("click", redo);

  document.getElementById("labelFilters")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".lf-btn");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    document
      .querySelectorAll(".lf-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    applyFilterToAllCards();
  });

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    applyFilterToAllCards();
  });

  document.getElementById("board")?.addEventListener("click", (e) => {
    const addCardBtn = e.target.closest(".add-card-btn");
    if (addCardBtn) {
      const colId = addCardBtn.dataset.colId;
      const colEl = addCardBtn.closest(".column");
      if (colId && colEl) showQuickAdd(colId, colEl);
    }

    const cardActionBtn = e.target.closest(".card-action-btn");
    if (cardActionBtn) {
      const action = cardActionBtn.dataset.action;
      const cardId = cardActionBtn.dataset.cardId;
      if (action === "edit") {
        openCardModal(cardId);
      }
      if (action === "duplicate") {
        duplicateCard(cardId);
      }
      if (action === "delete") {
        deleteCard(cardId);
      }
    }
  });

  document.getElementById("btnSettings")?.addEventListener("click", () => {
    document.getElementById("settingsModal").classList.add("active");
  });

  document.querySelectorAll(".modal-overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov) ov.classList.remove("active");
    });
  });

  document.querySelectorAll(".btn-close-modal")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay")?.classList.remove("active");
    });
  });

  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalSave")?.addEventListener("click", saveModal);

  document.getElementById("modalPin")?.addEventListener("click", () => {
    const btn = document.getElementById("modalPin");
    const pinned = !btn.classList.contains("pinned");
    btn.classList.toggle("pinned", pinned);
    btn.textContent = pinned ? "★" : "☆";
  });

  document
    .getElementById("prioritySelector")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest(".ps-btn");
      if (!btn) return;
      document
        .querySelectorAll(".ps-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });

  document.getElementById("labelSelector")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ls-btn");
    if (!btn) return;
    document
      .querySelectorAll(".ls-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

  document.getElementById("pointsSelector")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".pts-btn");
    if (!btn) return;
    document
      .querySelectorAll(".pts-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

  document.getElementById("clAddBtn")?.addEventListener("click", () => {
    const input = document.getElementById("clAddInput");
    const text = input?.value.trim();
    if (!text) return;
    const container = document.getElementById("checklist");
    const itemId = uid();
    const div = document.createElement("div");
    div.className = "cl-item";
    div.innerHTML = `<input type="checkbox" class="cl-check" id="cl-${itemId}"/>
      <label class="cl-text" for="cl-${itemId}">${escHtml(text)}</label>
      <button class="cl-del-btn" aria-label="Delete item">✕</button>`;
    div
      .querySelector(".cl-del-btn")
      ?.addEventListener("click", () => div.remove());
    div.querySelector(".cl-check")?.addEventListener("change", (e2) => {
      div.querySelector("label").classList.toggle("done", e2.target.checked);
    });
    container?.appendChild(div);
    if (input) input.value = "";
    input?.focus();
  });

  document.getElementById("clAddInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("clAddBtn")?.click();
    }
  });

  document.getElementById("commentSubmit")?.addEventListener("click", () => {
    const input = document.getElementById("commentInput");
    const text = input?.value.trim();
    if (!text) return;
    const result = getCardById(openModalCardId);
    if (!result) return;
    const { card } = result;
    const newComment = { id: uid(), author: "m1", text, ts: "just now" };
    if (!card.comments) card.comments = [];
    card.comments.push(newComment);
    buildComments(card);
    if (input) input.value = "";
    saveData();
  });

  document.getElementById("commentInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("commentSubmit")?.click();
    }
  });

  document.getElementById("btnDuplicateCard")?.addEventListener("click", () => {
    duplicateCard(openModalCardId);
    closeModal();
  });
  document.getElementById("btnArchiveCard")?.addEventListener("click", () => {
    toast("Card archived", "↓");
    closeModal();
  });
  document.getElementById("btnDeleteCard")?.addEventListener("click", () => {
    deleteCard(openModalCardId);
    closeModal();
  });

  document.getElementById("cardModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("cardModal")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    const isMeta = e.ctrlKey || e.metaKey;
    if (isMeta && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (isMeta && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      redo();
    }
    if (isMeta && e.key === "s") {
      e.preventDefault();
      saveData();
      toast("Saved!", "⬡");
    }
  });
});

function duplicateCard(cardId) {
  const result = getCardById(cardId);
  if (!result) return;
  const { card, col } = result;
  pushHistory();
  const newCard = deepClone(card);
  newCard.id = uid();
  newCard.title = card.title + " (copy)";
  newCard.checklist = newCard.checklist.map((i) => ({ ...i, id: uid() }));
  newCard.comments = [];
  const idx = col.cards.findIndex((c) => c.id === cardId);
  col.cards.splice(idx + 1, 0, newCard);
  renderBoard(true);
  saveData();
  updateStatusBar();
  toast("Card duplicated", "⧉");
}

function deleteCard(cardId) {
  if (!cardId) return;
  if (!confirm("Delete this card? This cannot be undone.")) return;
  pushHistory();
  for (const col of board.columns) {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      col.cards.splice(idx, 1);
      break;
    }
  }
  renderBoard(true);
  saveData();
  updateStatusBar();
  toast("Card deleted", "✕");
}
