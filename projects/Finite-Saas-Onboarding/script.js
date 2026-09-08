"use strict";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const THEMES = {
  green: {
    l1: "#0E4429",
    l2: "#006D32",
    l3: "#26A641",
    l4: "#39D353",
    accent: "#39D353",
    accent2: "#2EA042",
  },
  orange: {
    l1: "#5C2B0E",
    l2: "#9A4B1A",
    l3: "#D47420",
    l4: "#FFA500",
    accent: "#FFA500",
    accent2: "#D97F00",
  },
  blue: {
    l1: "#0C2D50",
    l2: "#1558A0",
    l3: "#2E7FE0",
    l4: "#58A6FF",
    accent: "#58A6FF",
    accent2: "#3A8AE0",
  },
  purple: {
    l1: "#2D1B6E",
    l2: "#5B3A9E",
    l3: "#8B6FD8",
    l4: "#BD93F9",
    accent: "#BD93F9",
    accent2: "#9A72D8",
  },
  pink: {
    l1: "#6D1B4E",
    l2: "#A03080",
    l3: "#D860B0",
    l4: "#FF79C6",
    accent: "#FF79C6",
    accent2: "#D860B0",
  },
  fire: {
    l1: "#5C1A0E",
    l2: "#A03020",
    l3: "#D05030",
    l4: "#FF6B35",
    accent: "#FF6B35",
    accent2: "#D04A18",
  },
  ice: {
    l1: "#0E3A5C",
    l2: "#1A6A9A",
    l3: "#30A0D0",
    l4: "#70D7FF",
    accent: "#70D7FF",
    accent2: "#40C0F0",
  },
};

const MODES = {
  commits: { label: "Commits", unit: "commits", emoji: "⬡", maxBase: 20 },
  prs: { label: "Pull Requests", unit: "PRs", emoji: "⟳", maxBase: 8 },
  reviews: { label: "Code Reviews", unit: "reviews", emoji: "✎", maxBase: 12 },
  issues: { label: "Issues", unit: "issues", emoji: "⊡", maxBase: 10 },
  hours: { label: "Coding Hours", unit: "hours", emoji: "◷", maxBase: 14 },
  custom: { label: "Custom", unit: "activity pts", emoji: "◆", maxBase: 100 },
};

const CELL_SIZES = { sm: 10, md: 13, lg: 17 };
const CELL_GAPS = { sm: 2, md: 3, lg: 4 };

let state = {
  year: new Date().getFullYear(),
  mode: "commits",
  theme: "green",
  cellSize: 13,
  cellGap: 3,
  data: {},
  showWeekends: true,
  animateCells: true,
  selectedDay: null,
  colorMode: "cluster",
  hoverLevel: null,
};

const seeds = {};

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(year, mode) {
  const key = `${year}-${mode}`;
  if (!seeds[key])
    seeds[key] = mulberry32(
      year * 37 +
        mode.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0),
    );
  return seeds[key];
}

function generateYearData(year, mode) {
  const rng = mulberry32(
    year * 137 + mode.charCodeAt(0) * 31 + mode.charCodeAt(mode.length - 1) * 7,
  );
  const data = {};
  const modeConf = MODES[mode];
  const maxVal = modeConf.maxBase;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  let momentum = 0.4;
  const seasonalPeak = [5, 6];
  const weeklyBase = [0.3, 1.0, 1.0, 1.0, 1.0, 1.0, 0.4];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    const month = d.getMonth();
    const dow = d.getDay();
    const dayOfYear = Math.floor((d - start) / 86400000);

    const seasonal =
      0.5 + 0.5 * Math.sin((dayOfYear / 365) * Math.PI * 2 - Math.PI / 2);
    const weekFac = weeklyBase[dow];
    const sprintFac = rng() < 0.15 ? 2.0 + rng() : 1.0;
    const vacFac = rng() < 0.04 ? 0.0 : 1.0;

    momentum = momentum * 0.85 + rng() * 0.15;

    if (rng() < 0.05 + weekFac * 0.05) {
      data[key] = 0;
      continue;
    }

    const raw =
      rng() *
      maxVal *
      weekFac *
      (0.5 + seasonal * 0.8) *
      sprintFac *
      vacFac *
      (0.7 + momentum * 0.6);
    data[key] = Math.round(Math.max(0, raw));
  }
  return data;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getLevelThresholds(values) {
  const nonZero = values.filter((v) => v > 0);
  if (!nonZero.length) return [0, 1, 2, 3];
  nonZero.sort((a, b) => a - b);
  const q1 = nonZero[Math.floor(nonZero.length * 0.25)];
  const q2 = nonZero[Math.floor(nonZero.length * 0.5)];
  const q3 = nonZero[Math.floor(nonZero.length * 0.75)];
  return [0, q1, q2, q3];
}

function getLevel(value, thresholds) {
  if (value <= 0) return 0;
  if (value <= thresholds[1]) return 1;
  if (value <= thresholds[2]) return 2;
  if (value <= thresholds[3]) return 3;
  return 4;
}

function lerpColor(c1, c2, t) {
  const h1 = parseInt(c1.slice(1, 3), 16),
    s1 = parseInt(c1.slice(3, 5), 16),
    l1 = parseInt(c1.slice(5, 7), 16);
  const h2 = parseInt(c2.slice(1, 3), 16),
    s2 = parseInt(c2.slice(3, 5), 16),
    l2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(h1 + (h2 - h1) * t),
    g = Math.round(s1 + (s2 - s1) * t),
    b = Math.round(l1 + (l2 - l1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function getColor(level, theme) {
  const t = THEMES[theme];
  if (level === 0) return "#161B25";
  if (level === 1) return t.l1;
  if (level === 2) return t.l2;
  if (level === 3) return t.l3;
  return t.l4;
}

function getColorForValue(value, maxValue, theme) {
  if (value <= 0) return "#161B25";
  const t = Math.min(value / maxValue, 1);
  const t2 = THEMES[theme];
  if (t < 0.25) return lerpColor("#161B25", t2.l1, t * 4);
  if (t < 0.5) return lerpColor(t2.l1, t2.l2, (t - 0.25) * 4);
  if (t < 0.75) return lerpColor(t2.l2, t2.l3, (t - 0.5) * 4);
  return lerpColor(t2.l3, t2.l4, (t - 0.75) * 4);
}

function getDaysInYear(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function getWeekNumber(date) {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - jan1) / 86400000);
  const jan1Dow = jan1.getDay();
  return Math.floor((dayOfYear + jan1Dow) / 7);
}

function buildWeekColumns(year) {
  const days = getDaysInYear(year);
  const jan1 = new Date(year, 0, 1);
  const jan1Dow = jan1.getDay();

  const weeks = [];
  days.forEach((d) => {
    const dayOfYear = Math.floor((d - jan1) / 86400000);
    const weekIdx = Math.floor((dayOfYear + jan1Dow) / 7);
    while (weeks.length <= weekIdx) weeks.push([]);
    weeks[weekIdx].push(d);
  });
  return { weeks, jan1Dow };
}

function buildCalendar() {
  const svg = document.getElementById("heatmapSvg");
  const mlWrap = document.getElementById("monthLabels");
  svg.innerHTML = "";
  mlWrap.innerHTML = "";

  if (!state.data || Object.keys(state.data).length === 0) {
    state.data = generateYearData(state.year, state.mode);
  }

  const values = Object.values(state.data).filter((v) => v > 0);
  const thresholds = getLevelThresholds(values);
  const maxValue = Math.max(...Object.values(state.data), 1);
  const cellSz = state.cellSize;
  const cellGap = state.cellGap;
  const step = cellSz + cellGap;

  const { weeks, jan1Dow } = buildWeekColumns(state.year);
  const numWeeks = weeks.length;

  const svgWidth = numWeeks * step - cellGap + 1;
  const svgHeight = 7 * step - cellGap;
  svg.setAttribute("width", svgWidth);
  svg.setAttribute("height", svgHeight);
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  mlWrap.style.position = "relative";
  mlWrap.style.height = "18px";
  mlWrap.style.width = svgWidth + "px";

  const dayLabels = document.getElementById("dayLabels");
  dayLabels.style.setProperty("--cell-sz", cellSz + "px");
  dayLabels.style.setProperty("--cell-gap", cellGap + "px");

  const monthPositions = {};
  const todayKey = dateKey(new Date());

  let delayIdx = 0;
  const cells = [];

  weeks.forEach((weekDays, weekIdx) => {
    const x = weekIdx * step;

    weekDays.forEach((d) => {
      const dow = d.getDay();
      const y = dow * step;
      const key = dateKey(d);
      const val = state.data[key] || 0;
      const level = getLevel(val, thresholds);
      const color = getColorForValue(val, maxValue, state.theme);

      const monthKey = d.getMonth();
      if (!monthPositions[monthKey] || d.getDate() <= 7) {
        if (!monthPositions[monthKey] || weekIdx < monthPositions[monthKey]) {
          monthPositions[monthKey] = weekIdx;
        }
      }

      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", x);
      r.setAttribute("y", y);
      r.setAttribute("width", cellSz);
      r.setAttribute("height", cellSz);
      r.setAttribute("rx", Math.max(1, cellSz * 0.18));
      r.setAttribute("fill", color);
      r.setAttribute("data-key", key);
      r.setAttribute("data-val", val);
      r.setAttribute("data-level", level);
      r.setAttribute("class", "hm-cell");
      r.setAttribute("aria-label", `${key}: ${val} ${MODES[state.mode].unit}`);
      r.setAttribute("role", "gridcell");
      r.setAttribute("tabindex", "0");

      if (key === todayKey) {
        r.setAttribute("stroke", THEMES[state.theme].accent);
        r.setAttribute("stroke-width", "1.5");
        r.setAttribute("stroke-opacity", "0.8");
      }

      if (state.animateCells) {
        r.style.animationDelay = delayIdx * 3 + "ms";
        r.classList.add("animate");
        delayIdx++;
      }

      r.addEventListener("mouseenter", (e) =>
        showTooltip(e, d, key, val, level, thresholds),
      );
      r.addEventListener("mouseleave", hideTooltip);
      r.addEventListener("mousemove", (e) => moveTooltip(e));
      r.addEventListener("click", () => selectDay(key, r));
      r.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectDay(key, r);
        }
      });

      svg.appendChild(r);
      cells.push({ r, d, val, level, key });
    });
  });

  Object.entries(monthPositions)
    .sort(([a], [b]) => +a - +b)
    .forEach(([month, weekIdx]) => {
      const label = document.createElement("div");
      label.className = "month-label";
      label.textContent = MONTHS[+month];
      label.style.left = weekIdx * step + "px";
      label.style.top = "0";
      mlWrap.appendChild(label);
    });

  buildLegend(thresholds, maxValue);
  updateDayLabels();
  return cells;
}

function updateDayLabels() {
  const show = state.showWeekends;
  document.querySelectorAll(".dl-item").forEach((item) => {
    const day = parseInt(item.dataset.day);
    if (day === 0 || day === 6) {
      item.style.opacity = show ? "1" : "0.2";
    }
  });
}

function buildLegend(thresholds, maxVal) {
  const container = document.getElementById("legendCells");
  container.innerHTML = "";
  const labels = [
    "No activity",
    `1–${thresholds[1]} ${MODES[state.mode].unit}`,
    `${thresholds[1] + 1}–${thresholds[2]}`,
    `${thresholds[2] + 1}–${thresholds[3]}`,
    `${thresholds[3] + 1}+`,
  ];

  for (let level = 0; level <= 4; level++) {
    const cell = document.createElement("div");
    cell.className = "legend-cell";
    cell.style.background = getColor(level, state.theme);
    cell.style.width = state.cellSize + "px";
    cell.style.height = state.cellSize + "px";
    cell.style.borderRadius = Math.max(1, state.cellSize * 0.18) + "px";
    cell.title = labels[level];
    cell.addEventListener("mouseenter", () => {
      state.hoverLevel = level;
      highlightByLevel(level);
      const ld = document.getElementById("levelDetail");
      ld.textContent = labels[level];
      ld.classList.add("visible");
    });
    cell.addEventListener("mouseleave", () => {
      state.hoverLevel = null;
      clearHighlight();
      document.getElementById("levelDetail").classList.remove("visible");
    });
    container.appendChild(cell);
  }
}

function highlightByLevel(level) {
  document.querySelectorAll(".hm-cell").forEach((cell) => {
    const cellLevel = parseInt(cell.dataset.level);
    cell.classList.toggle("dimmed", cellLevel !== level);
  });
}

function clearHighlight() {
  document
    .querySelectorAll(".hm-cell")
    .forEach((cell) => cell.classList.remove("dimmed"));
}

function showTooltip(e, date, key, val, level, thresholds) {
  const tt = document.getElementById("tooltip");
  const modeConf = MODES[state.mode];
  const dow = WEEKDAY_NAMES[date.getDay()];
  const mname = MONTH_NAMES[date.getMonth()];
  const levelNames = ["No activity", "Low", "Moderate", "High", "Very High"];

  const prevKey = dateKey(new Date(date.getTime() - 86400000));
  const prevVal = state.data[prevKey] || 0;
  const delta = val - prevVal;
  const deltaStr =
    delta > 0
      ? `▲ +${delta} vs prev day`
      : delta < 0
        ? `▼ ${delta} vs prev day`
        : "Same as prev day";

  tt.innerHTML = `
    <div class="tt-date">${dow}, ${mname} ${date.getDate()}, ${date.getFullYear()}</div>
    <div class="tt-val">${val}</div>
    <div class="tt-unit">${modeConf.unit}</div>
    <div class="tt-level">${levelNames[level]} activity</div>
    ${val > 0 ? `<div class="tt-extra">${deltaStr}</div>` : ""}
  `;
  tt.classList.add("visible");
  moveTooltip(e);
}

function moveTooltip(e) {
  const tt = document.getElementById("tooltip");
  const ttH = tt.offsetHeight;
  const ttW = tt.offsetWidth;
  let x = e.clientX,
    y = e.clientY - ttH - 14;
  if (y < 4) y = e.clientY + 14;
  if (x - ttW / 2 < 4) x = ttW / 2 + 4;
  if (x + ttW / 2 > window.innerWidth - 4) x = window.innerWidth - ttW / 2 - 4;
  tt.style.left = x + "px";
  tt.style.top = y + "px";
}

function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

function selectDay(key, rectEl) {
  document
    .querySelectorAll(".hm-cell.selected")
    .forEach((c) => c.classList.remove("selected"));
  if (state.selectedDay === key) {
    state.selectedDay = null;
    return;
  }
  state.selectedDay = key;
  rectEl.classList.add("selected");
}

function computeStats() {
  const data = state.data;
  const keys = Object.keys(data).sort();
  const vals = keys.map((k) => data[k]);
  const total = vals.reduce((a, b) => a + b, 0);
  const nonZeroDays = vals.filter((v) => v > 0).length;
  const maxVal = Math.max(...vals, 0);
  const maxKey = keys[vals.indexOf(maxVal)];
  const avgActive = nonZeroDays > 0 ? total / nonZeroDays : 0;

  let curStreak = 0,
    maxStreak = 0,
    tmpStreak = 0;
  let curStreakStart = "",
    maxStreakStart = "",
    maxStreakEnd = "";
  const today = dateKey(new Date());

  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] > today) continue;
    if (data[keys[i]] > 0) {
      if (curStreak === 0) {
      }
      curStreak++;
    } else break;
  }

  for (let i = 0; i < keys.length; i++) {
    if (data[keys[i]] > 0) {
      tmpStreak++;
      if (tmpStreak === 1) curStreakStart = keys[i];
      if (tmpStreak > maxStreak) {
        maxStreak = tmpStreak;
        maxStreakStart = curStreakStart;
        maxStreakEnd = keys[i];
      }
    } else {
      tmpStreak = 0;
    }
  }

  const monthTotals = Array(12).fill(0);
  const weekdayTotals = Array(7).fill(0);
  const weekdayCounts = Array(7).fill(0);
  keys.forEach((k) => {
    const d = parseKey(k);
    monthTotals[d.getMonth()] += data[k];
    weekdayTotals[d.getDay()] += data[k];
    weekdayCounts[d.getDay()]++;
  });

  const weeklyTotals = [];
  const { weeks } = buildWeekColumns(state.year);
  weeks.forEach((wd, wi) => {
    const s = wd.reduce((a, d) => a + (data[dateKey(d)] || 0), 0);
    weeklyTotals.push({ weekIdx: wi, total: s, start: wd[0] });
  });

  const sortedWeeks = [...weeklyTotals]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const sortedMonths = monthTotals
    .map((t, i) => ({ month: i, total: t }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const q25 = getPercentileValue(vals, 25);
  const q50 = getPercentileValue(vals, 50);
  const q75 = getPercentileValue(vals, 75);
  const q90 = getPercentileValue(vals, 90);

  return {
    total,
    nonZeroDays,
    maxVal,
    maxKey,
    avgActive,
    curStreak,
    maxStreak,
    maxStreakStart,
    maxStreakEnd,
    monthTotals,
    weekdayTotals,
    weekdayCounts,
    weeklyTotals,
    sortedWeeks,
    sortedMonths,
    q25,
    q50,
    q75,
    q90,
    keys,
    vals,
  };
}

function getPercentileValue(sorted, pct) {
  const arr = [...sorted].sort((a, b) => a - b);
  return arr[Math.floor((arr.length * pct) / 100)] || 0;
}

function renderStats(stats) {
  renderBigStats(stats);
  renderSummaryGrid(stats);
  renderGoalProgress(stats);
  renderStreaks(stats);
  renderTopWeeks(stats);
  renderTopMonths(stats);
  renderPercentiles(stats);
  renderFacts(stats);
  renderHighlights(stats);
  renderMonthChart(stats);
  renderWeekdayChart(stats);
  renderTrendChart(stats);
  renderDistributionChart(stats);
  renderPunchCard(stats);
  renderProfileStrip(stats);
}

function renderGoalProgress(stats) {
  const el = document.getElementById("goalWrap");
  const mode = MODES[state.mode];
  const goals = [
    { name: "Yearly Target", target: mode.maxBase * 200, current: stats.total },
    { name: "Active Day Goal", target: 250, current: stats.nonZeroDays },
  ];

  el.innerHTML = goals
    .map((g) => {
      const pct = Math.min((g.current / g.target) * 100, 100);
      return `
      <div class="goal-item">
        <div class="goal-header">
          <span class="goal-name">${g.name}</span>
          <span class="goal-stats">${g.current.toLocaleString()} / ${g.target.toLocaleString()}</span>
        </div>
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width: ${pct}%"></div>
          <div class="goal-marker" style="left: 80%"></div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderPunchCard(stats) {
  const el = document.getElementById("punchCardBody");
  const W = 240, H = 100, pad = 20;
  const stepX = (W - pad * 2) / 23;
  const stepY = (H - pad * 2) / 6;

  const data = Array(7).fill(0).map(() => Array(24).fill(0));
  Object.entries(state.data).forEach(([key, val]) => {
    const d = parseKey(key);
    const dow = d.getDay();
    const rng = mulberry32(d.getTime());
    const hour = Math.floor(rng() * 24);
    data[dow][hour] += val;
  });

  let max = 0;
  data.forEach(row => row.forEach(v => { if (v > max) max = v; }));

  const circles = [];
  data.forEach((row, dow) => {
    row.forEach((v, h) => {
      if (v <= 0) return;
      const r = Math.max(1, (v / max) * 6);
      const x = pad + h * stepX;
      const y = pad + dow * stepY;
      const color = getColorForValue(v, max, state.theme);
      circles.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" class="pc-circle" title="${WEEKDAY_NAMES[dow]}, ${h}:00: ${v} units">
        <title>${WEEKDAY_NAMES[dow]}, ${h}:00: ${v} units</title>
      </circle>`);
    });
  });

  el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" class="punch-card-svg">
    ${circles.join("")}
    <text x="${pad}" y="${H - 2}" font-size="6" fill="var(--text-3)" font-family="var(--font-mono)">00:00</text>
    <text x="${W - pad}" y="${H - 2}" font-size="6" fill="var(--text-3)" font-family="var(--font-mono)" text-anchor="end">23:00</text>
  </svg>`;
}

function renderHighlights(stats) {
  const el = document.getElementById("highlightsList");
  const sorted = [...Object.entries(state.data)]
    .filter(([k, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const fmtDate = (k) => {
    const d = parseKey(k);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  };

  el.innerHTML = sorted.map(([key, val], i) => `
    <div class="highlight-card" onclick="selectDay('${key}', document.querySelector('[data-key=\\'${key}\\']'))">
      <span class="hc-tag">${i === 0 ? "All-time Peak" : "Major Milestone"}</span>
      <span class="hc-title">${val} ${MODES[state.mode].unit}</span>
      <span class="hc-date">${fmtDate(key)}, ${state.year}</span>
    </div>
  `).join("");
}

function renderBigStats(stats) {
  const el = document.getElementById("bigStats");
  const mode = MODES[state.mode];
  el.innerHTML = `
    <div class="bs-item"><div class="bs-val">${stats.total.toLocaleString()}</div><div class="bs-label">Total</div></div>
    <div class="bs-item"><div class="bs-val">${stats.nonZeroDays}</div><div class="bs-label">Active Days</div></div>
    <div class="bs-item"><div class="bs-val">${stats.curStreak}</div><div class="bs-label">Cur. Streak</div></div>
    <div class="bs-item"><div class="bs-val">${stats.maxStreak}</div><div class="bs-label">Best Streak</div></div>
    <div class="bs-item"><div class="bs-val">${stats.maxVal}</div><div class="bs-label">Best Day</div></div>
  `;
}

function renderProfileStrip(stats) {
  const avatar = document.getElementById("avatarEl");
  avatar.textContent = "AC";
  avatar.style.background = `linear-gradient(135deg, ${THEMES[state.theme].l2}, ${THEMES[state.theme].l4})`;

  const badge =
    document.getElementById("avatarBadge") ||
    document.getElementById("streakBadge");
  if (badge) {
    badge.textContent = `🔥${stats.curStreak}d`;
    badge.title = `Current streak: ${stats.curStreak} days`;
  }
}

function renderSummaryGrid(stats) {
  const mode = MODES[state.mode];
  const g = document.getElementById("summaryGrid");
  const pctActive = ((stats.nonZeroDays / stats.vals.length) * 100).toFixed(0);
  const avgPerDay = (stats.total / stats.vals.length).toFixed(1);
  g.innerHTML = `
    <div class="sg-cell"><div class="sgc-label">Total</div><div class="sgc-val">${stats.total.toLocaleString()}</div><div class="sgc-sub">${mode.unit}</div></div>
    <div class="sg-cell"><div class="sgc-label">Active</div><div class="sgc-val">${stats.nonZeroDays}</div><div class="sgc-sub">${pctActive}% of days</div></div>
    <div class="sg-cell"><div class="sgc-label">Peak Day</div><div class="sgc-val">${stats.maxVal}</div><div class="sgc-sub">${stats.maxKey}</div></div>
    <div class="sg-cell"><div class="sgc-label">Avg/Day</div><div class="sgc-val">${avgPerDay}</div><div class="sgc-sub">incl. rest days</div></div>
    <div class="sg-cell"><div class="sgc-label">Avg Active</div><div class="sgc-val">${stats.avgActive.toFixed(1)}</div><div class="sgc-sub">active days only</div></div>
    <div class="sg-cell"><div class="sgc-label">Q3 Day</div><div class="sgc-val">${stats.q75}</div><div class="sgc-sub">75th percentile</div></div>
  `;
}

function renderStreaks(stats) {
  const w = document.getElementById("streaksWrap");
  const fmtDate = (k) => {
    const d = parseKey(k);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  };
  w.innerHTML = `
    <div class="streak-item"><div><div class="sti-label">Current Streak</div><div class="sti-sub">ongoing</div></div><div class="sti-val">${stats.curStreak}d</div></div>
    <div class="streak-item"><div><div class="sti-label">Best Streak</div><div class="sti-sub">${stats.maxStreakStart ? fmtDate(stats.maxStreakStart) + " – " + fmtDate(stats.maxStreakEnd) : "—"}</div></div><div class="sti-val">${stats.maxStreak}d</div></div>
    <div class="streak-item"><div><div class="sti-label">Active Days</div><div class="sti-sub">${((stats.nonZeroDays / 365) * 100).toFixed(0)}% of year</div></div><div class="sti-val">${stats.nonZeroDays}</div></div>
  `;
}

function renderTopWeeks(stats) {
  const el = document.getElementById("topWeeks");
  const maxW = Math.max(...stats.sortedWeeks.map((w) => w.total), 1);
  el.innerHTML = stats.sortedWeeks
    .map((w, i) => {
      const d = w.start;
      const label = d
        ? `W${w.weekIdx + 1} (${MONTHS[d.getMonth()]} ${d.getDate()})`
        : `W${w.weekIdx + 1}`;
      return `<div class="rank-item">
      <div class="ri-num">${i + 1}</div>
      <div class="ri-label" style="font-size:10px;min-width:90px">${label}</div>
      <div class="ri-bar-wrap"><div class="ri-bar" style="width:${(w.total / maxW) * 100}%"></div></div>
      <div class="ri-val">${w.total}</div>
    </div>`;
    })
    .join("");
}

function renderTopMonths(stats) {
  const el = document.getElementById("topMonths");
  const maxM = Math.max(...stats.sortedMonths.map((m) => m.total), 1);
  el.innerHTML = stats.sortedMonths
    .map((m, i) => {
      return `<div class="rank-item">
      <div class="ri-num">${i + 1}</div>
      <div class="ri-label">${MONTHS[m.month]}</div>
      <div class="ri-bar-wrap"><div class="ri-bar" style="width:${(m.total / maxM) * 100}%"></div></div>
      <div class="ri-val">${m.total}</div>
    </div>`;
    })
    .join("");
}

function renderPercentiles(stats) {
  const el = document.getElementById("percentileBars");
  const max = stats.q90 || 1;
  const rows = [
    { label: "25th pct", val: stats.q25 },
    { label: "50th pct", val: stats.q50 },
    { label: "75th pct", val: stats.q75 },
    { label: "90th pct", val: stats.q90 },
    { label: "Max day", val: stats.maxVal },
  ];
  el.innerHTML = rows
    .map(
      (r) => `
    <div class="pct-item">
      <span class="pct-label">${r.label}</span>
      <div class="pct-track"><div class="pct-fill" style="width:${Math.min((r.val / stats.maxVal) * 100, 100)}%"></div></div>
      <span class="pct-val">${r.val}</span>
    </div>
  `,
    )
    .join("");
}

function renderFacts(stats) {
  const el = document.getElementById("factsList");
  const mode = MODES[state.mode];
  const bestDow = stats.weekdayTotals.indexOf(Math.max(...stats.weekdayTotals));
  const worstDow = stats.weekdayTotals.indexOf(
    Math.min(...stats.weekdayTotals),
  );
  const bestMonth = stats.monthTotals.indexOf(Math.max(...stats.monthTotals));
  const mostActive = stats.weekdayTotals[bestDow];

  const facts = [
    {
      icon: "📅",
      text: `Best day of week: <strong>${WEEKDAY_NAMES[bestDow]}</strong> (avg ${(stats.weekdayTotals[bestDow] / stats.weekdayCounts[bestDow] || 0).toFixed(1)} ${mode.unit})`,
    },
    {
      icon: "📆",
      text: `Best month: <strong>${MONTH_NAMES[bestMonth]}</strong> (${stats.monthTotals[bestMonth].toLocaleString()} total)`,
    },
    {
      icon: "🎯",
      text: `Best day ever: <strong>${stats.maxKey}</strong> with ${stats.maxVal} ${mode.unit}`,
    },
    {
      icon: "🧘",
      text: `Rest day: <strong>${WEEKDAY_NAMES[worstDow]}</strong> (lowest avg)`,
    },
    {
      icon: "⚡",
      text: `${((stats.nonZeroDays / stats.vals.length) * 100).toFixed(0)}% of days had any activity`,
    },
    {
      icon: "📊",
      text: `Median active day: <strong>${stats.q50}</strong> ${mode.unit}`,
    },
  ];
  el.innerHTML = facts
    .map(
      (f) =>
        `<div class="fact-item"><span class="fi-icon">${f.icon}</span><span>${f.text}</span></div>`,
    )
    .join("");
}

function renderMonthChart(stats) {
  const el = document.getElementById("monthChartBody");
  const max = Math.max(...stats.monthTotals, 1);
  const themeColor = THEMES[state.theme].l4;
  el.innerHTML =
    `<div class="bar-chart">` +
    stats.monthTotals
      .map((v, i) => {
        const h = Math.max((v / max) * 62, v > 0 ? 3 : 2);
        const col = v > 0 ? themeColor : "#161B25";
        return `<div class="bc-item">
      <div class="bc-bar" style="height:${h}px;background:${col}" title="${MONTH_NAMES[i]}: ${v}"></div>
      <div class="bc-lbl">${MONTHS[i][0]}</div>
    </div>`;
      })
      .join("") +
    `</div>`;
}

function renderWeekdayChart(stats) {
  const el = document.getElementById("weekdayChartBody");
  const max = Math.max(...stats.weekdayTotals, 1);
  const t = THEMES[state.theme];
  el.innerHTML =
    `<div class="bar-chart">` +
    stats.weekdayTotals
      .map((v, dow) => {
        const h = Math.max((v / max) * 62, v > 0 ? 3 : 2);
        const weekend = dow === 0 || dow === 6;
        const col = weekend ? t.l2 : t.l4;
        return `<div class="bc-item">
      <div class="bc-bar" style="height:${h}px;background:${col}${weekend ? "AA" : ""}" title="${WEEKDAY_NAMES[dow]}: ${v}"></div>
      <div class="bc-lbl">${DAYS[dow][0]}</div>
    </div>`;
      })
      .join("") +
    `</div>`;
}

function renderTrendChart(stats) {
  const el = document.getElementById("trendChartBody");
  const weeks = stats.weeklyTotals.slice(-12);
  const max = Math.max(...weeks.map((w) => w.total), 1);
  const W = 220,
    H = 70,
    pad = 6;
  const pts = weeks.map((w, i) => {
    const x = pad + (i / (weeks.length - 1)) * (W - pad * 2);
    const y = H - pad - (w.total / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  const area = [...pts];
  area.unshift(`${pad},${H - pad}`);
  area.push(`${W - pad},${H - pad}`);
  const accent = THEMES[state.theme].l4;
  el.innerHTML = `<svg width="${W}" height="${H}" class="sparkline">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area.join(" ")}" fill="url(#sg)"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${weeks
      .map((w, i) => {
        const x = pad + (i / (weeks.length - 1)) * (W - pad * 2);
        const y = H - pad - (w.total / max) * (H - pad * 2);
        return `<circle cx="${x}" cy="${y}" r="2.5" fill="${accent}" opacity="0.8"/>`;
      })
      .join("")}
  </svg>`;
}

function renderDistributionChart(stats) {
  const el = document.getElementById("distributionChartBody");
  const vals = stats.vals.filter((v) => v > 0);
  const max = Math.max(...vals, 1);
  const BINS = 20;
  const bins = Array(BINS).fill(0);
  vals.forEach((v) => {
    const bi = Math.min(Math.floor((v / max) * BINS), BINS - 1);
    bins[bi]++;
  });
  const maxBin = Math.max(...bins, 1);
  const accent = THEMES[state.theme].l4;
  el.innerHTML =
    `<div class="dist-bars">` +
    bins
      .map((b, i) => {
        const h = Math.max((b / maxBin) * 65, b > 0 ? 3 : 1);
        const t = i / BINS;
        const col = lerpColor(THEMES[state.theme].l1, accent, t);
        return `<div class="dist-bar" style="height:${h}px;background:${col}" title="Bin ${i}: ${b} days"></div>`;
      })
      .join("") +
    `</div>`;
}

function applyTheme(theme) {
  state.theme = theme;
  const t = THEMES[theme];
  const root = document.documentElement;
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-2", t.accent2);
  root.style.setProperty("--accent-dim", `rgba(${hexToRgb(t.accent)},0.12)`);
  root.style.setProperty("--accent-mid", `rgba(${hexToRgb(t.accent)},0.06)`);
  root.style.setProperty("--cell-l1", t.l1);
  root.style.setProperty("--cell-l2", t.l2);
  root.style.setProperty("--cell-l3", t.l3);
  root.style.setProperty("--cell-l4", t.l4);

  const bm = document.querySelector(".bm-cell.l4");
  if (bm) bm.style.background = t.l4;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function updateYearButtons() {
  document.getElementById("yearDisplay").textContent = state.year;
  [-2, -1, 0].forEach((offset) => {
    const y = new Date().getFullYear() + offset;
    const id =
      offset === -2
        ? "yearMinus2"
        : offset === -1
          ? "yearMinus1"
          : "yearCurrent";
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = y;
      btn.classList.toggle("active", y === state.year);
    }
  });
  document.getElementById("btnPrevYear").disabled = state.year <= 2000;
  document.getElementById("btnNextYear").disabled =
    state.year >= new Date().getFullYear();
}

function fullRender() {
  updateYearButtons();
  buildCalendar();
  const stats = computeStats();
  renderStats(stats);
}

function exportSVG() {
  const svg = document.getElementById("heatmapSvg");
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml",
  });
  download(blob, `heatmap-${state.year}-${state.mode}.svg`);
}

function exportPNG() {
  const svg = document.getElementById("heatmapSvg");
  const data = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = svg.clientWidth * 2;
    c.height = svg.clientHeight * 2;
    const ctx = c.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = "#0D0E11";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    c.toBlob((blob) =>
      download(blob, `heatmap-${state.year}-${state.mode}.png`),
    );
  };
  img.src = "data:image/svg+xml," + encodeURIComponent(data);
}

function exportJSON() {
  const blob = new Blob(
    [
      JSON.stringify(
        { year: state.year, mode: state.mode, data: state.data },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  download(blob, `heatmap-${state.year}-${state.mode}.json`);
}

function exportCSV() {
  const rows = ["date,value,weekday,month,week"];
  const { weeks } = buildWeekColumns(state.year);
  Object.entries(state.data)
    .sort()
    .forEach(([key, val]) => {
      const d = parseKey(key);
      const wk = getWeekNumber(d);
      rows.push(
        `${key},${val},${DAYS[d.getDay()]},${MONTHS[d.getMonth()]},${wk}`,
      );
    });
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  download(blob, `heatmap-${state.year}-${state.mode}.csv`);
}

function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

document.addEventListener("DOMContentLoaded", () => {
  state.data = generateYearData(state.year, state.mode);
  fullRender();

  document.getElementById("modeTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".mt-btn");
    if (!btn) return;
    document
      .querySelectorAll(".mt-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    state.data = generateYearData(state.year, state.mode);
    fullRender();
  });

  document.getElementById("themeRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-btn");
    if (!btn) return;
    document
      .querySelectorAll(".theme-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyTheme(btn.dataset.theme);
    fullRender();
  });

  document.getElementById("btnPrevYear").addEventListener("click", () => {
    if (state.year <= 2000) return;
    state.year--;
    state.data = generateYearData(state.year, state.mode);
    fullRender();
  });

  document.getElementById("btnNextYear").addEventListener("click", () => {
    if (state.year >= new Date().getFullYear()) return;
    state.year++;
    state.data = generateYearData(state.year, state.mode);
    fullRender();
  });

  document.querySelectorAll(".year-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const offset = parseInt(btn.dataset.yearOffset);
      state.year = new Date().getFullYear() + offset;
      state.data = generateYearData(state.year, state.mode);
      fullRender();
    });
  });

  document.querySelectorAll(".csz-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".csz-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const sz = btn.dataset.size;
      state.cellSize = CELL_SIZES[sz];
      state.cellGap = CELL_GAPS[sz];
      fullRender();
    });
  });

  document.getElementById("toggleWeekends").addEventListener("change", (e) => {
    state.showWeekends = e.target.checked;
    updateDayLabels();
    document.querySelectorAll(".hm-cell").forEach((cell) => {
      const d = parseKey(cell.dataset.key);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        cell.style.opacity = state.showWeekends ? "" : "0.12";
      }
    });
  });

  document.getElementById("toggleAnimation").addEventListener("change", (e) => {
    state.animateCells = e.target.checked;
  });

  document.getElementById("btnRandomize").addEventListener("click", () => {
    state.data = generateYearData(
      (state.year + Math.random() * 100) | 0,
      state.mode,
    );
    fullRender();
  });

  document.getElementById("btnSyncGH").addEventListener("click", () => {
    const user = document.getElementById("ghUsername").value.trim();
    if (user) fetchGitHubData(user);
  });

  document.getElementById("ghUsername").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btnSyncGH").click();
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    document.getElementById("exportModal").classList.remove("hidden");
  });
  document.getElementById("exportClose").addEventListener("click", () => {
    document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("exportModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("exportModal"))
      document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("exportSVG").addEventListener("click", () => {
    exportSVG();
    document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("exportPNG").addEventListener("click", () => {
    exportPNG();
    document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("exportJSON").addEventListener("click", () => {
    exportJSON();
    document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("exportCSV").addEventListener("click", () => {
    exportCSV();
    document.getElementById("exportModal").classList.add("hidden");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && (e.ctrlKey || e.metaKey)) {
      document.getElementById("btnPrevYear").click();
    }
    if (e.key === "ArrowRight" && (e.ctrlKey || e.metaKey)) {
      document.getElementById("btnNextYear").click();
    }
    if (e.key === "Escape") {
      state.selectedDay = null;
      document
        .querySelectorAll(".hm-cell.selected")
        .forEach((c) => c.classList.remove("selected"));
      document.getElementById("exportModal").classList.add("hidden");
    }
    if (e.key === "r" && !e.ctrlKey)
      document.getElementById("btnRandomize").click();
  });

  async function fetchGitHubData(username) {
  const btn = document.getElementById("btnSyncGH");
  const handle = document.getElementById("profileHandle");
  const nameEl = document.getElementById("profileName");

  btn.textContent = "...";
  btn.disabled = true;
  handle.textContent = `Fetching data for ${username}...`;

  try {
    const [userRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/events?per_page=100`),
    ]);

    if (!userRes.ok) throw new Error("User not found");
    const userData = await userRes.json();
    const events = await eventsRes.json();

    nameEl.textContent = userData.name || userData.login;
    handle.textContent = `@${userData.login} · ${userData.bio || "GitHub User"}`;
    if (userData.avatar_url) {
      const av = document.getElementById("avatarEl");
      av.style.backgroundImage = `url(${userData.avatar_url})`;
      av.style.backgroundSize = "cover";
      av.textContent = "";
    }

    const newData = {};
    events.forEach((ev) => {
      if (!ev.created_at) return;
      const date = new Date(ev.created_at);
      if (date.getFullYear() !== state.year) return;
      const key = dateKey(date);
      let weight = 1;
      if (ev.type === "PushEvent") weight = ev.payload.size || 1;
      if (ev.type === "PullRequestEvent") weight = 5;
      if (ev.type === "IssuesEvent") weight = 3;
      newData[key] = (newData[key] || 0) + weight;
    });

    state.data = { ...generateYearData(state.year, state.mode), ...newData };
    fullRender();

    btn.textContent = "✓ Done";
    setTimeout(() => (btn.textContent = "Sync"), 2000);
  } catch (err) {
    console.error(err);
    handle.textContent = "Error: " + err.message;
    btn.textContent = "!";
  } finally {
    btn.disabled = false;
  }
}

window.addEventListener("resize", () => {
  buildCalendar();
});
});
