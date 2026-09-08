"use strict";

const DIVIDER_PX = 5;
const SNAP_PCT = 5;
const SNAP_DIST = 3;
const MIN_PCT = 4;
const KEY_STEP = 1;
const KEY_STEP_BIG = 5;
const MAX_HISTORY = 40;

const PANE_COLORS = [
  { color: "#7C3AED", icon: "◆", label: "PANEL", bg: "rgba(124,58,237,0.04)" },
  { color: "#06B6D4", icon: "◉", label: "EDITOR", bg: "rgba(6,182,212,0.04)" },
  { color: "#EC4899", icon: "◈", label: "OUTPUT", bg: "rgba(236,72,153,0.04)" },
  { color: "#10B981", icon: "◎", label: "CONSOLE", bg: "rgba(16,185,129,0.04)" },
  { color: "#F59E0B", icon: "◇", label: "FILES", bg: "rgba(245,158,11,0.04)" },
  { color: "#EF4444", icon: "◆", label: "DEBUG", bg: "rgba(239,68,68,0.04)" },
  { color: "#8B5CF6", icon: "◉", label: "TERM", bg: "rgba(139,92,246,0.04)" },
  { color: "#14B8A6", icon: "◈", label: "GIT", bg: "rgba(20,184,166,0.04)" },
  { color: "#FB923C", icon: "◇", label: "SEARCH", bg: "rgba(251,146,60,0.04)" },
];

let paneColorIdx = 0;
let snapEnabled = true;
let historyStack = [];
let historyIndex = -1;
let paneRegistry = new Map();
let dividerRegistry = new Map();
let nodeIdCounter = 0;

function uid() { return `n${++nodeIdCounter}`; }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function snapToGrid(pct) {
  if (!snapEnabled) return pct;
  const snapped = Math.round(pct / SNAP_PCT) * SNAP_PCT;
  return Math.abs(pct - snapped) < SNAP_DIST ? snapped : pct;
}

function saveHistory(layout) {
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(JSON.parse(JSON.stringify(layout)));
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const sbSaved = document.getElementById("sbSaved");
  if (sbSaved) sbSaved.textContent = `Hist: ${historyIndex + 1}/${historyStack.length}`;
}

class SplitNode {
  constructor(type, direction, sizes, children, paneId) {
    this.id = uid();
    this.type = type;
    this.direction = direction || "horizontal";
    this.sizes = sizes || [];
    this.children = children || [];
    this.paneId = paneId || null;
    this.collapsed = [];
    this.colorData = PANE_COLORS[paneColorIdx++ % PANE_COLORS.length];
  }
}

let rootNode = null;

const PRESETS = {
  ide: () => {
    const root = new SplitNode("container", "horizontal", [16, 54, 30]);
    root.children = [
      new SplitNode("leaf"),
      new SplitNode("container", "vertical", [65, 35]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf")];
      }),
      new SplitNode("container", "vertical", [55, 45]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf")];
      }),
    ];
    root.collapsed = [false, false, false];
    return root;
  },
  columns2: () => {
    const root = new SplitNode("container", "horizontal", [50, 50]);
    root.children = [new SplitNode("leaf"), new SplitNode("leaf")];
    root.collapsed = [false, false];
    return root;
  },
  columns3: () => {
    const root = new SplitNode("container", "horizontal", [33, 34, 33]);
    root.children = [new SplitNode("leaf"), new SplitNode("leaf"), new SplitNode("leaf")];
    root.collapsed = [false, false, false];
    return root;
  },
  rows2: () => {
    const root = new SplitNode("container", "vertical", [50, 50]);
    root.children = [new SplitNode("leaf"), new SplitNode("leaf")];
    root.collapsed = [false, false];
    return root;
  },
  quad: () => {
    const root = new SplitNode("container", "horizontal", [50, 50]);
    root.children = [
      new SplitNode("container", "vertical", [50, 50]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf")];
      }),
      new SplitNode("container", "vertical", [50, 50]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf")];
      }),
    ];
    root.collapsed = [false, false];
    return root;
  },
  trinity: () => {
    const root = new SplitNode("container", "vertical", [60, 40]);
    root.children = [
      new SplitNode("container", "horizontal", [33, 34, 33]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf"), new SplitNode("leaf")];
      }),
      new SplitNode("leaf"),
    ];
    root.collapsed = [false, false];
    return root;
  },
  dashboard: () => {
    const root = new SplitNode("container", "vertical", [30, 70]);
    root.children = [
      new SplitNode("leaf"),
      new SplitNode("container", "horizontal", [25, 50, 25]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf"), new SplitNode("leaf")];
      }),
    ];
    root.collapsed = [false, false];
    return root;
  },
  mosaic: () => {
    const root = new SplitNode("container", "horizontal", [40, 60]);
    root.children = [
      new SplitNode("container", "vertical", [35, 35, 30]).tap(n => {
        n.children = [new SplitNode("leaf"), new SplitNode("leaf"), new SplitNode("leaf")];
      }),
      new SplitNode("container", "vertical", [55, 45]).tap(n => {
        n.children = [
          new SplitNode("container", "horizontal", [60, 40]).tap(n2 => {
            n2.children = [new SplitNode("leaf"), new SplitNode("leaf")];
          }),
          new SplitNode("leaf"),
        ];
      }),
    ];
    root.collapsed = [false, false];
    return root;
  },
};

SplitNode.prototype.tap = function (fn) { fn(this); return this; };

function normalizeNode(node) {
  if (node.type === "leaf") return;
  const total = node.sizes.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) {
    node.sizes = node.sizes.map(s => (s / total) * 100);
  }
  while (node.collapsed.length < node.children.length) node.collapsed.push(false);
  node.children.forEach(normalizeNode);
}

function renderTree(node, container) {
  container.innerHTML = "";
  paneRegistry.clear();
  dividerRegistry.clear();
  renderNode(node, container);
  updateStatusBar();
}

function renderNode(node, container) {
  if (node.type === "leaf") {
    const pane = createLeafPane(node);
    container.appendChild(pane);
    paneRegistry.set(node.id, { node, el: pane });
    return pane;
  }

  const wrap = document.createElement("div");
  wrap.className = `split-container dir-${node.direction}`;
  wrap.dataset.nodeId = node.id;

  normalizeNode(node);
  const visibleSizes = getVisibleSizes(node);

  node.children.forEach((child, i) => {
    if (i > 0) {
      const div = createDivider(node, i - 1);
      wrap.appendChild(div);
    }

    const paneWrap = document.createElement("div");
    paneWrap.className = "split-pane";
    paneWrap.dataset.paneIdx = i;
    paneWrap.dataset.parentId = node.id;

    if (node.collapsed[i]) {
      paneWrap.classList.add("collapsed");
      paneWrap.style.flexBasis = "0%";
    } else {
      paneWrap.style.flexBasis = visibleSizes[i] + "%";
    }

    if (node.direction === "horizontal") {
      paneWrap.style.height = "100%";
    } else {
      paneWrap.style.width = "100%";
    }

    if (child.type === "leaf") {
      const content = createLeafContent(child, node, i);
      const collapsedBar = createCollapsedBar(node, i);
      paneWrap.appendChild(content);
      paneWrap.appendChild(collapsedBar);
      paneRegistry.set(child.id, { node: child, el: paneWrap, parent: node, idx: i });
    } else {
      const collapsedBar = createCollapsedBar(node, i);
      renderNode(child, paneWrap);
      paneWrap.appendChild(collapsedBar);
    }

    wrap.appendChild(paneWrap);
  });

  container.appendChild(wrap);
  return wrap;
}

function getVisibleSizes(node) {
  const sizes = [...node.sizes];
  const total = sizes.reduce((a, b) => a + b, 0);
  return sizes.map(s => (s / total) * 100);
}

function createLeafPane(node) {
  const wrap = document.createElement("div");
  wrap.className = "split-pane";
  wrap.style.flexBasis = "100%";
  wrap.appendChild(createLeafContent(node, null, 0));
  return wrap;
}

function createLeafContent(node, parentNode, idx) {
  const colorData = node.colorData || PANE_COLORS[paneColorIdx++ % PANE_COLORS.length];
  const content = document.createElement("div");
  content.className = "pane-content";
  content.dataset.leafId = node.id;

  const header = document.createElement("div");
  header.className = "pane-header";
  header.style.borderBottom = `1px solid ${colorData.color}22`;

  const left = document.createElement("div");
  left.className = "ph-left";

  const dots = document.createElement("div");
  dots.className = "pane-dots";
  ["pd-close", "pd-min", "pd-max"].forEach(cls => {
    const d = document.createElement("div");
    d.className = `pd ${cls}`;
    dots.appendChild(d);
  });

  const title = document.createElement("div");
  title.className = "pane-title";
  title.style.color = colorData.color;
  title.textContent = `${colorData.icon} ${colorData.label}`;

  left.append(dots, title);

  const right = document.createElement("div");
  right.className = "ph-right";

  const sizeBadge = document.createElement("div");
  sizeBadge.className = "pane-size-badge";
  sizeBadge.dataset.sizeBadge = node.id;
  sizeBadge.textContent = "—";

  const splitHBtn = document.createElement("button");
  splitHBtn.className = "ph-btn"; splitHBtn.title = "Split Horizontal"; splitHBtn.textContent = "⟺";
  splitHBtn.addEventListener("click", e => { e.stopPropagation(); splitPane(node, parentNode, idx, "horizontal"); });

  const splitVBtn = document.createElement("button");
  splitVBtn.className = "ph-btn"; splitVBtn.title = "Split Vertical"; splitVBtn.textContent = "⟷";
  splitVBtn.style.transform = "rotate(90deg)";
  splitVBtn.addEventListener("click", e => { e.stopPropagation(); splitPane(node, parentNode, idx, "vertical"); });

  right.append(sizeBadge, splitHBtn, splitVBtn);
  header.append(left, right);

  const body = document.createElement("div");
  body.className = "pane-body";
  body.style.background = colorData.bg;

  const stars = createStarField(colorData.color);
  const nebula = createNebula(colorData.color);
  const demo = createDemoContent(node, colorData, parentNode, idx);

  body.append(stars, nebula, demo);
  content.append(header, body);

  header.addEventListener("dblclick", () => {
    if (!parentNode) return;
    toggleCollapse(parentNode, idx);
  });

  dots.querySelector(".pd-close").addEventListener("click", e => {
    e.stopPropagation();
    if (!parentNode) return;
    removePane(parentNode, idx);
  });
  dots.querySelector(".pd-max").addEventListener("click", e => {
    e.stopPropagation();
    if (!parentNode) return;
    toggleCollapse(parentNode, idx);
  });

  content.addEventListener("contextmenu", e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, node, parentNode, idx);
  });

  return content;
}

function createCollapsedBar(parentNode, idx) {
  const bar = document.createElement("div");
  bar.className = "pane-collapsed-bar";
  const label = document.createElement("span");
  label.className = "pcb-label";
  label.textContent = "COLLAPSED — click to expand";
  bar.appendChild(label);
  bar.addEventListener("click", () => toggleCollapse(parentNode, idx));
  return bar;
}

function createStarField(accentColor) {
  const sf = document.createElement("div");
  sf.className = "star-field";
  const count = 20 + Math.floor(Math.random() * 15);
  for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.className = "star";
    const size = Math.random() * 2 + 0.5;
    star.style.cssText = `
      left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
      width: ${size}px; height: ${size}px;
      --dur: ${2 + Math.random() * 4}s; --delay: ${-Math.random() * 4}s;
      --base: ${0.1 + Math.random() * 0.3}; --peak: ${0.4 + Math.random() * 0.5};
    `;
    sf.appendChild(star);
  }
  return sf;
}

function createNebula(accentColor) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
  const blob = document.createElement("div");
  blob.className = "nebula-blob";
  blob.style.cssText = `
    width: 200px; height: 200px;
    left: ${Math.random() * 60}%; top: ${Math.random() * 60}%;
    background: ${accentColor};
  `;
  wrap.appendChild(blob);
  return wrap;
}

function createDemoContent(node, colorData, parentNode, idx) {
  const demo = document.createElement("div");
  demo.className = "pane-demo-content";
  demo.dataset.demoId = node.id;

  const icon = document.createElement("div");
  icon.className = "pdc-icon";
  icon.style.color = colorData.color;
  icon.textContent = colorData.icon;

  const label = document.createElement("div");
  label.className = "pdc-label";
  label.style.color = colorData.color;
  label.textContent = colorData.label;

  const meta = document.createElement("div");
  meta.className = "pdc-meta";
  meta.dataset.sizeMeta = node.id;
  meta.textContent = "drag dividers to resize";

  const grid = document.createElement("div");
  grid.className = "pdc-grid";
  grid.dataset.statsGrid = node.id;

  [["W", "—", "pdc-w"], ["H", "—", "pdc-h"]].forEach(([lbl, val, cls]) => {
    const s = document.createElement("div"); s.className = "pdc-stat";
    const v = document.createElement("div"); v.className = `pdc-stat-val ${cls}`; v.textContent = val;
    const l = document.createElement("div"); l.className = "pdc-stat-lbl"; l.textContent = lbl;
    s.append(v, l); grid.appendChild(s);
  });

  demo.append(icon, label, meta, grid);
  return demo;
}

function createDivider(parentNode, afterIdx) {
  const divEl = document.createElement("div");
  const divId = uid();
  divEl.className = `divider dir-${parentNode.direction}`;
  divEl.setAttribute("tabindex", "0");
  divEl.setAttribute("role", "separator");
  divEl.setAttribute("aria-orientation", parentNode.direction === "horizontal" ? "vertical" : "horizontal");
  divEl.dataset.dividerId = divId;
  divEl.dataset.parentId = parentNode.id;
  divEl.dataset.afterIdx = afterIdx;

  const grip = document.createElement("div");
  grip.className = "divider-grip";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div"); dot.className = "dg-dot"; grip.appendChild(dot);
  }
  divEl.appendChild(grip);

  const isH = parentNode.direction === "horizontal";

  let startPointer = 0;
  let startSizes = [];
  let containerSize = 0;
  let isDragging = false;

  divEl.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    divEl.setPointerCapture(e.pointerId);
    isDragging = true;
    startPointer = isH ? e.clientX : e.clientY;

    const containerEl = divEl.parentElement;
    const rect = containerEl.getBoundingClientRect();
    const totalDividerPx = (parentNode.children.length - 1) * DIVIDER_PX;
    containerSize = (isH ? rect.width : rect.height) - totalDividerPx;

    startSizes = [...parentNode.sizes];
    divEl.classList.add("dragging");
    document.body.classList.add(isH ? "resizing-h" : "resizing-v");

    const dragInd = document.getElementById("dragIndicator");
    if (dragInd) dragInd.classList.remove("hidden");

    saveHistory(serializeLayout());
  });

  divEl.addEventListener("pointermove", e => {
    if (!isDragging) return;
    e.preventDefault();

    const currentPointer = isH ? e.clientX : e.clientY;
    const deltaPx = currentPointer - startPointer;
    const deltaPct = (deltaPx / containerSize) * 100;

    const leftIdx = afterIdx;
    const rightIdx = afterIdx + 1;

    let newLeft = startSizes[leftIdx] + deltaPct;
    let newRight = startSizes[rightIdx] - deltaPct;

    const leftMin = MIN_PCT;
    const rightMin = MIN_PCT;
    const leftMax = startSizes[leftIdx] + startSizes[rightIdx] - rightMin;
    const rightMax = startSizes[leftIdx] + startSizes[rightIdx] - leftMin;

    newLeft = clamp(newLeft, leftMin, leftMax);
    newRight = clamp(newRight, rightMin, rightMax);

    newLeft = snapToGrid(newLeft);
    newRight = startSizes[leftIdx] + startSizes[rightIdx] - newLeft;

    const snapping = snapEnabled && (
      Math.abs(newLeft - Math.round(newLeft / SNAP_PCT) * SNAP_PCT) < 0.5 ||
      Math.abs(newRight - Math.round(newRight / SNAP_PCT) * SNAP_PCT) < 0.5
    );
    divEl.classList.toggle("snapping", snapping);

    parentNode.sizes[leftIdx] = newLeft;
    parentNode.sizes[rightIdx] = newRight;

    applyPaneSizes(divEl.parentElement, parentNode);
    updateSizeBadges(parentNode, divEl.parentElement);
    updateDragIndicator(newLeft, newRight, isH);
  });

  divEl.addEventListener("pointerup", e => {
    if (!isDragging) return;
    isDragging = false;
    divEl.releasePointerCapture(e.pointerId);
    divEl.classList.remove("dragging", "snapping");
    document.body.classList.remove("resizing-h", "resizing-v");
    const dragInd = document.getElementById("dragIndicator");
    if (dragInd) dragInd.classList.add("hidden");
    updateStatusBar();
  });

  divEl.addEventListener("lostpointercapture", () => {
    if (!isDragging) return;
    isDragging = false;
    divEl.classList.remove("dragging", "snapping");
    document.body.classList.remove("resizing-h", "resizing-v");
    const dragInd = document.getElementById("dragIndicator");
    if (dragInd) dragInd.classList.add("hidden");
  });

  divEl.addEventListener("dblclick", () => {
    saveHistory(serializeLayout());
    const leftIdx = afterIdx;
    const rightIdx = afterIdx + 1;
    const total = parentNode.sizes[leftIdx] + parentNode.sizes[rightIdx];
    parentNode.sizes[leftIdx] = total / 2;
    parentNode.sizes[rightIdx] = total / 2;
    applyPaneSizes(divEl.parentElement, parentNode);
    updateSizeBadges(parentNode, divEl.parentElement);
    updateStatusBar();
  });

  divEl.addEventListener("keydown", e => {
    const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const leftIdx = afterIdx;
    const rightIdx = afterIdx + 1;

    const isForward = (isH && e.key === "ArrowRight") || (!isH && e.key === "ArrowDown");
    const isBack = (isH && e.key === "ArrowLeft") || (!isH && e.key === "ArrowUp");

    if (!isForward && !isBack) return;
    e.preventDefault();
    saveHistory(serializeLayout());

    const delta = isForward ? step : -step;
    let newLeft = clamp(parentNode.sizes[leftIdx] + delta, MIN_PCT, parentNode.sizes[leftIdx] + parentNode.sizes[rightIdx] - MIN_PCT);
    let newRight = parentNode.sizes[leftIdx] + parentNode.sizes[rightIdx] - newLeft;
    parentNode.sizes[leftIdx] = newLeft;
    parentNode.sizes[rightIdx] = newRight;

    applyPaneSizes(divEl.parentElement, parentNode);
    updateSizeBadges(parentNode, divEl.parentElement);
    updateStatusBar();
  });

  dividerRegistry.set(divId, { el: divEl, parentNode, afterIdx });
  return divEl;
}

function applyPaneSizes(containerEl, node) {
  const paneEls = [...containerEl.querySelectorAll(`:scope > .split-pane`)];
  const totalDividers = (node.children.length - 1) * DIVIDER_PX;

  paneEls.forEach((paneEl, i) => {
    if (node.collapsed[i]) {
      paneEl.style.flexBasis = "0%";
      paneEl.style.overflow = "hidden";
    } else {
      paneEl.style.flexBasis = node.sizes[i] + "%";
      paneEl.style.overflow = "hidden";
    }
  });
  updatePanePhysicalSizes(containerEl, node);
}

function updatePanePhysicalSizes(containerEl, node) {
  const rect = containerEl.getBoundingClientRect();
  const isH = node.direction === "horizontal";
  const totalSize = isH ? rect.width : rect.height;
  const totalDividerPx = (node.children.length - 1) * DIVIDER_PX;
  const available = totalSize - totalDividerPx;

  const paneEls = [...containerEl.querySelectorAll(":scope > .split-pane")];
  paneEls.forEach((paneEl, i) => {
    const pxSize = Math.round((node.sizes[i] / 100) * available);
    const demoW = paneEl.querySelector("[data-stats-grid] .pdc-w");
    const demoH = paneEl.querySelector("[data-stats-grid] .pdc-h");
    const pr = paneEl.getBoundingClientRect();
    if (demoW) demoW.textContent = Math.round(pr.width) + "px";
    if (demoH) demoH.textContent = Math.round(pr.height) + "px";
  });
}

function updateSizeBadges(node, containerEl) {
  const paneEls = [...containerEl.querySelectorAll(":scope > .split-pane")];
  paneEls.forEach((paneEl, i) => {
    const badge = paneEl.querySelector(".pane-size-badge");
    if (badge) {
      const pct = node.collapsed[i] ? 0 : Math.round(node.sizes[i] * 10) / 10;
      badge.textContent = pct + "%";
      badge.classList.toggle("active", !node.collapsed[i]);
    }
    const metaEl = paneEl.querySelector("[data-size-meta]");
    if (metaEl) {
      const pct = node.collapsed[i] ? 0 : Math.round(node.sizes[i] * 10) / 10;
      metaEl.textContent = pct + "% · drag dividers to resize";
    }
  });
}

function updateDragIndicator(leftPct, rightPct, isH) {
  const label = document.getElementById("diLabel");
  const size = document.getElementById("diSize");
  if (label) label.textContent = isH ? "⟺ Horizontal" : "⟷ Vertical";
  if (size) size.textContent = `${Math.round(leftPct)}% | ${Math.round(rightPct)}%`;
}

function toggleCollapse(parentNode, idx) {
  saveHistory(serializeLayout());
  const containerEl = findContainerEl(parentNode.id);
  if (!containerEl) return;

  const wasCollapsed = parentNode.collapsed[idx];
  parentNode.collapsed[idx] = !wasCollapsed;

  if (!wasCollapsed) {
    const activeCount = parentNode.collapsed.filter(c => !c).length;
    if (activeCount === 0) { parentNode.collapsed[idx] = false; return; }

    const budget = parentNode.sizes[idx];
    const others = parentNode.children.map((_, i) => i).filter(i => i !== idx && !parentNode.collapsed[i]);
    const perOther = budget / others.length;
    others.forEach(i => { parentNode.sizes[i] += perOther; });
    parentNode.sizes[idx] = 0;
  } else {
    const restoreSize = 100 / parentNode.children.length;
    const active = parentNode.children.map((_, i) => i).filter(i => !parentNode.collapsed[i]);
    const steal = restoreSize / active.length;
    active.forEach(i => { parentNode.sizes[i] = Math.max(MIN_PCT, parentNode.sizes[i] - steal); });
    parentNode.sizes[idx] = restoreSize;
  }

  normalizeNode(parentNode);
  const paneEl = containerEl.querySelectorAll(":scope > .split-pane")[idx];
  if (paneEl) {
    paneEl.classList.add("animating");
    paneEl.classList.toggle("collapsed", parentNode.collapsed[idx]);
    setTimeout(() => paneEl.classList.remove("animating"), 300);
  }

  applyPaneSizes(containerEl, parentNode);
  updateSizeBadges(parentNode, containerEl);
  updateStatusBar();
}

function findContainerEl(nodeId) {
  return document.querySelector(`[data-node-id="${nodeId}"]`) || document.getElementById("splitRoot").firstElementChild;
}

function splitPane(leafNode, parentNode, idx, direction) {
  saveHistory(serializeLayout());

  if (!parentNode) {
    const newContainer = new SplitNode("container", direction, [50, 50]);
    newContainer.children = [leafNode, new SplitNode("leaf")];
    newContainer.collapsed = [false, false];
    rootNode = newContainer;
    renderTree(rootNode, document.getElementById("splitRoot"));
    updateStatusBar();
    return;
  }

  const newLeaf = new SplitNode("leaf");
  const currentSize = parentNode.sizes[idx];

  if (parentNode.direction === direction) {
    parentNode.children.splice(idx + 1, 0, newLeaf);
    parentNode.sizes.splice(idx, 1, currentSize / 2, currentSize / 2);
    parentNode.collapsed.splice(idx + 1, 0, false);
  } else {
    const newContainer = new SplitNode("container", direction, [50, 50]);
    newContainer.children = [leafNode, newLeaf];
    newContainer.collapsed = [false, false];
    parentNode.children[idx] = newContainer;
  }

  renderTree(rootNode, document.getElementById("splitRoot"));
  updateStatusBar();
}

function removePane(parentNode, idx) {
  if (parentNode.children.length <= 1) return;
  saveHistory(serializeLayout());

  const removedSize = parentNode.sizes[idx];
  parentNode.children.splice(idx, 1);
  parentNode.sizes.splice(idx, 1);
  parentNode.collapsed.splice(idx, 1);

  const activeOthers = parentNode.sizes.map((_, i) => i).filter(i => !parentNode.collapsed[i]);
  if (activeOthers.length) {
    const perOther = removedSize / activeOthers.length;
    activeOthers.forEach(i => { parentNode.sizes[i] += perOther; });
  }

  normalizeNode(parentNode);
  renderTree(rootNode, document.getElementById("splitRoot"));
  updateStatusBar();
}

function equaliseAll(node) {
  if (!node) return;
  if (node.type === "container") {
    const n = node.children.length;
    const eq = 100 / n;
    node.sizes = node.children.map(() => eq);
    node.collapsed = node.children.map(() => false);
    node.children.forEach(equaliseAll);
  }
}

function serializeLayout() {
  return { root: serializeNode(rootNode), presetName: document.querySelector(".preset-btn.active")?.dataset.preset || "custom" };
}

function serializeNode(node) {
  if (!node) return null;
  const obj = { type: node.type, direction: node.direction, sizes: [...node.sizes], collapsed: [...node.collapsed], colorData: node.colorData };
  if (node.children) obj.children = node.children.map(serializeNode);
  return obj;
}

function deserializeLayout(data) {
  paneColorIdx = 0;
  rootNode = deserializeNode(data.root);
  return rootNode;
}

function deserializeNode(obj) {
  if (!obj) return null;
  const node = new SplitNode(obj.type, obj.direction, obj.sizes, null, null);
  node.collapsed = obj.collapsed || [];
  node.colorData = obj.colorData || PANE_COLORS[paneColorIdx++ % PANE_COLORS.length];
  if (obj.children) node.children = obj.children.map(deserializeNode);
  return node;
}

function showContextMenu(x, y, leafNode, parentNode, idx) {
  removeContextMenu();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.id = "contextMenu";
  menu.style.left = x + "px"; menu.style.top = y + "px";

  const items = [
    { icon: "⟺", label: "Split Horizontal", action: () => splitPane(leafNode, parentNode, idx, "horizontal") },
    { icon: "⟷", label: "Split Vertical", action: () => splitPane(leafNode, parentNode, idx, "vertical") },
    { type: "sep" },
    { icon: "⊜", label: "Equalise siblings", action: () => { if (parentNode) { saveHistory(serializeLayout()); equaliseAll(parentNode); renderTree(rootNode, document.getElementById("splitRoot")); updateStatusBar(); } } },
    { icon: "⬡", label: "Collapse panel", action: () => { if (parentNode) toggleCollapse(parentNode, idx); } },
    { type: "sep" },
    { icon: "✕", label: "Remove panel", action: () => { if (parentNode) removePane(parentNode, idx); }, danger: true },
  ];

  items.forEach(item => {
    if (item.type === "sep") { const sep = document.createElement("div"); sep.className = "cm-sep"; menu.appendChild(sep); return; }
    const el = document.createElement("div");
    el.className = "cm-item" + (item.danger ? " danger" : "");
    const icon = document.createElement("span"); icon.className = "ci-icon"; icon.textContent = item.icon;
    el.append(icon, item.label);
    el.addEventListener("click", () => { removeContextMenu(); item.action(); });
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width + 10) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height + 10) + "px";

  setTimeout(() => document.addEventListener("click", removeContextMenu, { once: true }), 0);
}

function removeContextMenu() {
  const menu = document.getElementById("contextMenu");
  if (menu) menu.remove();
}

function updateStatusBar() {
  let paneCount = 0;
  let dividerCount = 0;
  const countNodes = node => {
    if (!node) return;
    if (node.type === "leaf") { paneCount++; return; }
    dividerCount += node.children.length - 1;
    node.children.forEach(countNodes);
  };
  countNodes(rootNode);

  const sbPanes = document.getElementById("sbPanes");
  const sbDividers = document.getElementById("sbDividers");
  if (sbPanes) sbPanes.textContent = `${paneCount} panes`;
  if (sbDividers) sbDividers.textContent = `${dividerCount} dividers`;

  requestAnimationFrame(() => {
    const allPanes = document.querySelectorAll(".split-pane");
    allPanes.forEach(paneEl => {
      const pr = paneEl.getBoundingClientRect();
      const demoW = paneEl.querySelector(".pdc-w");
      const demoH = paneEl.querySelector(".pdc-h");
      if (demoW) demoW.textContent = Math.round(pr.width) + "px";
      if (demoH) demoH.textContent = Math.round(pr.height) + "px";
    });

    const allBadges = document.querySelectorAll(".pane-size-badge");
    allBadges.forEach(badge => {
      const paneEl = badge.closest(".split-pane");
      if (!paneEl) return;
      const parentEl = paneEl.parentElement;
      if (!parentEl) return;
      const nodeId = parentEl.dataset.nodeId;
      if (!nodeId) return;
      const parentNode = findNodeById(rootNode, nodeId);
      if (!parentNode) return;
      const idx = parseInt(paneEl.dataset.paneIdx ?? "0");
      const pct = parentNode.collapsed[idx] ? 0 : Math.round(parentNode.sizes[idx] * 10) / 10;
      badge.textContent = pct + "%";
    });
  });
}

function findNodeById(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function loadPreset(name) {
  paneColorIdx = 0;
  const factory = PRESETS[name];
  if (!factory) return;
  rootNode = factory();
  normalizeNode(rootNode);
  renderTree(rootNode, document.getElementById("splitRoot"));

  document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.preset === name));
  const sbLayout = document.getElementById("sbLayout");
  if (sbLayout) sbLayout.textContent = `Layout: ${name.toUpperCase()}`;

  saveHistory(serializeLayout());
}

function handleWindowResize() {
  requestAnimationFrame(() => {
    const allContainers = document.querySelectorAll(".split-container");
    allContainers.forEach(containerEl => {
      const nodeId = containerEl.dataset.nodeId;
      if (!nodeId) return;
      const node = findNodeById(rootNode, nodeId);
      if (!node) return;
      updateSizeBadges(node, containerEl);
    });
    updateStatusBar();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const snapToggle = document.getElementById("snapToggle");
  if (snapToggle) {
    snapToggle.addEventListener("change", () => {
      snapEnabled = snapToggle.checked;
      const sbSnap = document.getElementById("sbSnap");
      if (sbSnap) sbSnap.textContent = snapEnabled ? "Snap: 5%" : "Snap: off";
    });
  }

  document.getElementById("presetRow")?.addEventListener("click", e => {
    const btn = e.target.closest(".preset-btn");
    if (!btn) return;
    loadPreset(btn.dataset.preset);
  });

  document.getElementById("btnEqualise")?.addEventListener("click", () => {
    saveHistory(serializeLayout());
    equaliseAll(rootNode);
    renderTree(rootNode, document.getElementById("splitRoot"));
    updateStatusBar();
  });

  document.getElementById("btnReset")?.addEventListener("click", () => {
    const activePreset = document.querySelector(".preset-btn.active")?.dataset.preset || "ide";
    loadPreset(activePreset);
  });

  document.getElementById("btnSave")?.addEventListener("click", () => {
    try {
      localStorage.setItem("splitforge_layout", JSON.stringify(serializeLayout()));
      const btn = document.getElementById("btnSave");
      const sbSaved = document.getElementById("sbSaved");
      if (btn) { btn.classList.add("flash"); setTimeout(() => btn.classList.remove("flash"), 800); }
      if (sbSaved) sbSaved.textContent = "Saved ✓";
    } catch { }
  });

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      document.getElementById("btnSave")?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        const saved = historyStack[historyIndex];
        if (saved) { paneColorIdx = 0; rootNode = deserializeNode(saved.root); normalizeNode(rootNode); renderTree(rootNode, document.getElementById("splitRoot")); updateStatusBar(); updateHistoryButtons(); }
      }
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const saved = historyStack[historyIndex];
        if (saved) { paneColorIdx = 0; rootNode = deserializeNode(saved.root); normalizeNode(rootNode); renderTree(rootNode, document.getElementById("splitRoot")); updateStatusBar(); updateHistoryButtons(); }
      }
    }
  });

  window.addEventListener("resize", handleWindowResize);

  const saved = (() => { try { const d = localStorage.getItem("splitforge_layout"); return d ? JSON.parse(d) : null; } catch { return null; } })();
  if (saved?.root) {
    rootNode = deserializeNode(saved.root);
    normalizeNode(rootNode);
    renderTree(rootNode, document.getElementById("splitRoot"));
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    const sbLayout = document.getElementById("sbLayout");
    if (sbLayout) sbLayout.textContent = `Layout: ${saved.presetName?.toUpperCase() || "SAVED"}`;
    const sbSaved = document.getElementById("sbSaved");
    if (sbSaved) sbSaved.textContent = "Restored ✓";
    saveHistory(serializeLayout());
  } else {
    loadPreset("ide");
  }
});