const BASE = "https://restcountries.com/v3.1";
let currentView = "grid";
let allCountriesCache = null;
let currentPage = "home";

const fmt = (n) => (n ? Number(n).toLocaleString() : "–");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (id) => document.getElementById(id);

function showToast(msg, duration = 2800) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

/* ---------- Safety helpers ---------- */
function escapeHtml(v, keepQuotes) {
  let s = String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!keepQuotes) s = s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return s;
}
// Only https URLs from the API may be used in href/src.
function safeUrl(u) {
  try {
    const url = new URL(String(u));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
// Country codes are alphanumeric; strip anything else (used inside inline handlers).
function safeCode(c) {
  return String(c ?? "").replace(/[^A-Za-z0-9]/g, "");
}

/* ---------- Network layer: timeout, cache, offline fallback ---------- */
const FETCH_TIMEOUT_MS = 10000;
const CACHE_PREFIX = "atlas:cache:v1:";
const MAX_CACHE_ENTRIES = 12;

function storageGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function cacheKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
  } catch {}
  return keys;
}
function evictOldest(except) {
  let oldest = null;
  let oldestT = Infinity;
  for (const k of cacheKeys()) {
    if (k === except) continue;
    let t = 0;
    try {
      t = JSON.parse(storageGet(k)).t || 0;
    } catch {}
    if (t < oldestT) {
      oldestT = t;
      oldest = k;
    }
  }
  if (!oldest) return false;
  try {
    localStorage.removeItem(oldest);
  } catch {}
  return true;
}
// Keep only the fields this app renders (used when the full payload will not fit).
function slimCountry(c) {
  if (!c || typeof c !== "object") return c;
  return {
    name: c.name && { common: c.name.common, official: c.name.official },
    capital: c.capital,
    flags: c.flags && { png: c.flags.png, svg: c.flags.svg, alt: c.flags.alt },
    population: c.population,
    area: c.area,
    region: c.region,
    subregion: c.subregion,
    cca2: c.cca2,
    cca3: c.cca3,
    languages: c.languages,
    currencies: c.currencies,
    timezones: c.timezones,
    independent: c.independent,
  };
}
function cacheWrite(url, data) {
  const key = CACHE_PREFIX + url;
  const t = Date.now();
  const variants = [data];
  if (Array.isArray(data)) variants.push(data.map(slimCountry));
  for (const payload of variants) {
    let json;
    try {
      json = JSON.stringify({ t, data: payload });
    } catch {
      return;
    }
    for (;;) {
      try {
        localStorage.setItem(key, json);
        // keep the number of entries bounded
        while (cacheKeys().length > MAX_CACHE_ENTRIES && evictOldest(key)) {}
        return;
      } catch {
        // quota exceeded or storage blocked: free space and retry, else try slimmer payload
        if (!evictOldest(key)) break;
      }
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}
function cacheRead(url) {
  try {
    const rec = JSON.parse(storageGet(CACHE_PREFIX + url));
    if (rec && rec.data != null && rec.t) return rec;
  } catch {}
  return null;
}

function netError(message, retryable) {
  const err = new Error(message);
  err.retryable = retryable;
  return err;
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) {
      throw netError(
        `API error ${r.status}${r.statusText ? ": " + r.statusText : ""}`,
        r.status >= 500 || r.status === 429 || r.status === 408,
      );
    }
    return await r.json();
  } catch (e) {
    if (e.retryable !== undefined) throw e;
    if (e.name === "AbortError")
      throw netError("The request timed out. Check your connection.", true);
    if (e instanceof SyntaxError)
      throw netError("The API returned an unreadable response.", true);
    throw netError(
      "Could not reach the REST Countries API. You may be offline.",
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

function showCacheBanner(ts) {
  let b = el("cacheBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "cacheBanner";
    b.className = "cache-banner";
    b.setAttribute("role", "status");
    const msg = document.createElement("span");
    msg.id = "cacheBannerMsg";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-ghost btn-sm";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => retryLoad());
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-ghost btn-sm";
    close.textContent = "Dismiss";
    close.addEventListener("click", hideCacheBanner);
    b.append(msg, retry, close);
    document.body.appendChild(b);
  }
  el("cacheBannerMsg").textContent =
    "Showing cached data from " + new Date(ts).toLocaleString();
  b.classList.add("show");
}
function hideCacheBanner() {
  const b = el("cacheBanner");
  if (b) b.classList.remove("show");
}

async function apiFetch(url) {
  try {
    const data = await fetchWithTimeout(url);
    cacheWrite(url, data);
    hideCacheBanner();
    return data;
  } catch (e) {
    if (e.retryable) {
      const rec = cacheRead(url);
      if (rec) {
        showCacheBanner(rec.t);
        return rec.data;
      }
    }
    throw e;
  }
}

// Re-run the load for whatever is currently on screen.
let modalCode = null;
window.retryLoad = function (btn) {
  if (btn && btn.closest && btn.closest("#modalContent") && modalCode)
    return showCountry(modalCode);
  const run = {
    home: loadHomeStats,
    all,
    regions: () => selectedRegion && loadRegion(selectedRegion, selectedSub),
    byName: () => el("nameInput")?.value && searchByName(),
    byCode: () => el("codeInput")?.value && searchByCode(),
    multiCode: () => el("multiInput")?.value && searchMultiCode(),
    byCurrency: () => el("curInput")?.value && searchByCurrency(),
    byLanguage: () => el("langInput")?.value && searchByLang(),
    byCapital: () => el("capInput")?.value && searchByCapital(),
    byDemonym: () => el("demInput")?.value && searchByDemonym(),
    byTranslation: () => el("transInput")?.value && searchByTrans(),
    independent: () => searchIndependent(),
    fieldFilter: () => runFieldFilter(),
    compare: () => el("compareA")?.value && runCompare(),
  }[currentPage];
  if (run) run();
};

window.addEventListener("online", () => {
  const needs =
    el("cacheBanner")?.classList.contains("show") ||
    document.querySelector("#mainContent .retry-btn, #modalContent .retry-btn");
  if (!needs) return;
  showToast("Back online – refreshing data…");
  retryLoad(document.querySelector("#modalContent .retry-btn") || undefined);
});

function loading() {
  return `<div class="loading" role="status" aria-live="polite"><div class="spinner"></div><p>Fetching from REST Countries API…</p></div>`;
}
function emptyState(
  msg = "No countries found",
  sub = "Try a different search term.",
) {
  return `<div class="empty-state"><div class="empty-icon">🌏</div><h3>${escapeHtml(msg)}</h3><p>${escapeHtml(sub)}</p></div>`;
}
// err may be an Error (retry button shown when err.retryable) or a string.
function errorBox(msg, err) {
  if (msg instanceof Error) {
    err = msg;
    msg = msg.message;
  }
  const retry =
    err && err.retryable
      ? ` <button type="button" class="btn btn-gold btn-sm retry-btn" onclick="retryLoad(this)">Retry</button>`
      : "";
  return `<div class="error-box" role="alert">⚠️ <span>${escapeHtml(msg)}</span>${retry}</div>`;
}

function countryCard(c) {
  const name = c.name?.common || "–";
  const official = c.name?.official || "";
  const flag = safeUrl(c.flags?.png || c.flags?.svg || "");
  const cap = c.capital?.[0] || "–";
  const pop = fmt(c.population);
  const region = c.region || "–";
  const code = safeCode(c.cca2);
  return `
    <div class="country-card fade-in" onclick="showCountry('${code}')">
<div class="card-flag-wrap">
  <img class="card-flag" src="${escapeHtml(flag)}" alt="Flag of ${escapeHtml(name)}" loading="lazy" onerror="this.style.display='none'"/>
  <span class="card-region-tag">${escapeHtml(region)}</span>
</div>
<div class="card-body">
  <div class="card-name">${escapeHtml(name)}</div>
  <div class="card-official">${official !== name ? escapeHtml(official) : "&nbsp;"}</div>
  <div class="card-stats">
    <div class="card-stat"><span>🏛️</span>${escapeHtml(cap)}</div>
    <div class="card-stat"><span>👥</span>${pop}</div>
    <div class="card-stat"><span>🔤</span>${escapeHtml(code)}</div>
  </div>
</div>
    </div>`;
}

function listRow(c) {
  const name = c.name?.common || "–";
  const flag = safeUrl(c.flags?.png || c.flags?.svg || "");
  const cap = c.capital?.[0] || "–";
  const pop = fmt(c.population);
  const region = c.region || "–";
  const code = safeCode(c.cca2);
  const lang = c.languages
    ? Object.values(c.languages).slice(0, 2).join(", ")
    : "–";
  return `
    <div class="list-row" onclick="showCountry('${code}')">
<img class="list-flag" src="${escapeHtml(flag)}" alt="${escapeHtml(name)}" loading="lazy"/>
<div>
  <div class="list-name">${escapeHtml(name)}</div>
  <div class="list-meta">${escapeHtml(lang)}</div>
</div>
<div class="list-capital">${escapeHtml(cap)}</div>
<div class="list-meta">${escapeHtml(region)}</div>
<div class="list-pop">${pop}</div>
<div class="list-code">${escapeHtml(code)}</div>
    </div>`;
}

function renderCards(countries, container) {
  if (!countries?.length) {
    container.innerHTML = emptyState();
    return;
  }
  const sorted = [...countries].sort((a, b) =>
    (a.name?.common || "").localeCompare(b.name?.common || ""),
  );
  if (currentView === "list") {
    container.className = "cards-list stagger";
    container.innerHTML = sorted.map(listRow).join("");
  } else {
    container.className = "cards-grid stagger";
    container.innerHTML = sorted.map(countryCard).join("");
  }
}

function resultsBar(countries, onSort) {
  return `
    <div class="results-meta">
<span class="results-count">${countries.length}</span>
<span>countries found</span>
<div class="sort-row">
  <select id="sortSelect" onchange="handleSort()">
    <option value="name">Sort by Name</option>
    <option value="pop-desc">Population ↓</option>
    <option value="pop-asc">Population ↑</option>
    <option value="area-desc">Area ↓</option>
  </select>
  <div class="view-toggle">
    <button class="view-btn ${currentView === "grid" ? "active" : ""}" onclick="setView('grid')">⊞</button>
    <button class="view-btn ${currentView === "list" ? "active" : ""}" onclick="setView('list')">☰</button>
  </div>
</div>
    </div>`;
}

window.handleSort = function () {
  const v = el("sortSelect")?.value;
  const container = el("cardsContainer");
  if (!container) return;
  const cards = [...container.children];
};

window.setView = function (v) {
  currentView = v;
  document
    .querySelectorAll(".view-btn")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.textContent.trim() === (v === "grid" ? "⊞" : "☰"),
      ),
    );
  const container = el("cardsContainer");
  if (container && container._data)
    renderCards(container._data, container);
};

function navigate(page) {
  currentPage = page;
  document
    .querySelectorAll(".nav-item")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.page === page),
    );
  const pages = {
    home,
    all,
    regions,
    byName,
    byCode,
    byCurrency,
    byLanguage,
    byCapital,
    byDemonym,
    byTranslation,
    independent,
    fieldFilter,
    compare,
    multiCode,
  };
  if (pages[page]) pages[page]();
}

function home() {
  el("mainContent").innerHTML = `
    <div class="welcome-hero fade-in">
<h2>Explore the <em>World</em></h2>
<p>A comprehensive explorer built on the REST Countries v3.1 API — covering every endpoint, every field, 250+ countries.</p>
<div class="welcome-actions">
  <button class="btn btn-gold" onclick="navigate('all')">🌍 Browse All Countries</button>
  <button class="btn btn-ghost" onclick="navigate('regions')">🗺️ Explore by Region</button>
  <button class="btn btn-ghost" onclick="navigate('compare')">⚖️ Compare Countries</button>
</div>
    </div>
    <div class="stats-grid" id="homeStats" aria-busy="true">
<div class="stat-card"><div class="sv">…</div><div class="sl">Total Countries</div></div>
<div class="stat-card"><div class="sv">…</div><div class="sl">Regions</div></div>
<div class="stat-card"><div class="sv">…</div><div class="sl">Languages</div></div>
<div class="stat-card"><div class="sv">…</div><div class="sl">Currencies</div></div>
<div class="stat-card"><div class="sv">…</div><div class="sl">Capital Cities</div></div>
<div class="stat-card"><div class="sv">…</div><div class="sl">Timezones</div></div>
    </div>
    <div class="page-header"><h2>API <em>Endpoints</em></h2><p>Jump to any feature below.</p></div>
    <div class="api-overview">
${[
  ["📋", "All Countries", "/all?fields=…", "all"],
  ["🔤", "By Name", "/name/{name}", "byName"],
  ["#️⃣", "By Code", "/alpha/{code}", "byCode"],
  ["📦", "Multiple Codes", "/alpha?codes=…", "multiCode"],
  ["💱", "By Currency", "/currency/{cur}", "byCurrency"],
  ["💬", "By Language", "/lang/{lang}", "byLanguage"],
  ["🏛️", "By Capital", "/capital/{city}", "byCapital"],
  ["🗺️", "By Region", "/region/{region}", "regions"],
  ["🧭", "By Subregion", "/subregion/{sub}", "regions"],
  ["👤", "By Demonym", "/demonym/{dem}", "byDemonym"],
  ["🌐", "By Translation", "/translation/{t}", "byTranslation"],
  ["🏳️", "Independent", "/independent?status=…", "independent"],
  ["⚙️", "Field Filter", "?fields=a,b,c", "fieldFilter"],
  ["⚖️", "Compare", "multi-fetch", "compare"],
]
  .map(
    ([icon, label, ep, page]) => `
  <div class="api-card" onclick="navigate('${page}')">
    <div class="ac-icon">${icon}</div>
    <div class="ac-label">${label}</div>
    <div class="ac-ep">${ep}</div>
  </div>`,
  )
  .join("")}
    </div>`;
  loadHomeStats();
}

async function loadHomeStats() {
  try {
    const data = await apiFetch(
      `${BASE}/all?fields=name,region,languages,currencies,capital,timezones`,
    );
    allCountriesCache = data;
    const regions = new Set(data.map((c) => c.region).filter(Boolean));
    const langs = new Set(
      data.flatMap((c) => Object.keys(c.languages || {})),
    );
    const currs = new Set(
      data.flatMap((c) => Object.keys(c.currencies || {})),
    );
    const caps = new Set(
      data.flatMap((c) => c.capital || []).filter(Boolean),
    );
    const tzs = new Set(
      data.flatMap((c) => c.timezones || []).filter(Boolean),
    );
    const stats = el("homeStats");
    if (stats) {
      stats.removeAttribute("aria-busy");
      stats.innerHTML = `
  <div class="stat-card"><div class="sv">${data.length}</div><div class="sl">Total Countries</div></div>
  <div class="stat-card"><div class="sv">${regions.size}</div><div class="sl">Regions</div></div>
  <div class="stat-card"><div class="sv">${langs.size}</div><div class="sl">Languages</div></div>
  <div class="stat-card"><div class="sv">${currs.size}</div><div class="sl">Currencies</div></div>
  <div class="stat-card"><div class="sv">${caps.size}</div><div class="sl">Capital Cities</div></div>
  <div class="stat-card"><div class="sv">${tzs.size}</div><div class="sl">Timezones</div></div>`;
    }
    el("allBadge").textContent = data.length;
    el("countryCountBadge").textContent = `${data.length} countries`;
  } catch (e) {
    console.warn("Stats load failed", e);
  }
}

async function all() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>All <em>Countries</em></h2>
<p>All countries from the REST Countries API with field filtering.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/all?fields=name,capital,flags,population,region,cca2,languages,currencies</div>
    </div>
    <div class="search-panel">
<h3>🔎 Filter</h3>
<div class="search-row">
  <input type="text" id="allFilter" placeholder="Filter by name…" oninput="filterAll()"/>
  <select id="regionFilter" onchange="filterAll()">
    <option value="">All Regions</option>
    <option>Africa</option><option>Americas</option><option>Asia</option>
    <option>Europe</option><option>Oceania</option><option>Antarctic</option>
  </select>
</div>
    </div>
    <div id="allMeta"></div>
    <div id="cardsContainer" class="cards-grid">${loading()}</div>`;

  try {
    const data = await apiFetch(
      `${BASE}/all?fields=name,capital,flags,population,region,cca2,languages,currencies,area`,
    );
    const container = el("cardsContainer");
    container._data = data;
    window._allData = data;
    filterAll();
  } catch (e) {
    el("cardsContainer").innerHTML = errorBox(e);
  }
}

window.filterAll = function () {
  const filter = el("allFilter")?.value.toLowerCase() || "";
  const region = el("regionFilter")?.value || "";
  let data = window._allData || [];
  if (filter)
    data = data.filter(
      (c) =>
        (c.name?.common || "").toLowerCase().includes(filter) ||
        (c.name?.official || "").toLowerCase().includes(filter),
    );
  if (region) data = data.filter((c) => c.region === region);
  const sortVal = el("sortSelect")?.value || "name";
  data = [...data].sort((a, b) => {
    if (sortVal === "pop-desc")
      return (b.population || 0) - (a.population || 0);
    if (sortVal === "pop-asc")
      return (a.population || 0) - (b.population || 0);
    if (sortVal === "area-desc") return (b.area || 0) - (a.area || 0);
    return (a.name?.common || "").localeCompare(b.name?.common || "");
  });
  const meta = el("allMeta");
  if (meta) meta.innerHTML = resultsBar(data);
  const container = el("cardsContainer");
  if (container) {
    container._data = data;
    renderCards(data, container);
  }
};

const REGIONS = [
  {
    name: "Africa",
    emoji: "🌍",
    sub: [
      "Northern Africa",
      "Eastern Africa",
      "Western Africa",
      "Middle Africa",
      "Southern Africa",
    ],
  },
  {
    name: "Americas",
    emoji: "🌎",
    sub: [
      "Northern America",
      "Central America",
      "Caribbean",
      "South America",
    ],
  },
  {
    name: "Asia",
    emoji: "🌏",
    sub: [
      "Eastern Asia",
      "South-Eastern Asia",
      "Southern Asia",
      "Central Asia",
      "Western Asia",
    ],
  },
  {
    name: "Europe",
    emoji: "🇪🇺",
    sub: [
      "Northern Europe",
      "Western Europe",
      "Southern Europe",
      "Eastern Europe",
    ],
  },
  {
    name: "Oceania",
    emoji: "🏝️",
    sub: [
      "Australia and New Zealand",
      "Melanesia",
      "Micronesia",
      "Polynesia",
    ],
  },
  { name: "Antarctic", emoji: "🧊", sub: [] },
];

let selectedRegion = null;
let selectedSub = null;

function regions() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Browse by <em>Region</em></h2>
<p>Filter countries by region or subregion.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/region/{region} &nbsp;|&nbsp; /v3.1/subregion/{subregion}</div>
    </div>
    <div class="region-cards">
${REGIONS.map(
  (r) => `
  <div class="region-card ${selectedRegion === r.name ? "selected" : ""}" onclick="selectRegion('${r.name}')">
    <div class="rc-emoji">${r.emoji}</div>
    <div class="rc-name">${r.name}</div>
    <div class="rc-count" id="rc-${r.name}">click to explore</div>
  </div>`,
).join("")}
    </div>
    <div id="subregionArea"></div>
    <div id="regionResultsMeta"></div>
    <div id="regionCards" class="cards-grid"></div>`;
  if (selectedRegion) selectRegion(selectedRegion);
}

window.selectRegion = async function (name) {
  selectedRegion = name;
  document.querySelectorAll(".region-card").forEach((c) => {
    c.classList.toggle(
      "selected",
      c.querySelector(".rc-name").textContent === name,
    );
  });
  const reg = REGIONS.find((r) => r.name === name);
  const subArea = el("subregionArea");
  subArea.innerHTML = "";
  if (reg?.sub?.length) {
    subArea.innerHTML = `
<div class="page-header" style="margin-bottom:14px"><h2 style="font-size:20px">${reg.emoji} ${name} <em>Subregions</em></h2></div>
<div class="subregion-pills">
  <span class="filter-chip ${!selectedSub ? "active" : ""}" onclick="loadRegion('${name}',null)">All ${name}</span>
  ${reg.sub.map((s) => `<span class="filter-chip ${selectedSub === s ? "active" : ""}" onclick="loadRegion('${name}','${s}')">${s}</span>`).join("")}
</div>`;
  }
  loadRegion(name, null);
};

async function loadRegion(region, sub) {
  selectedSub = sub;
  document
    .querySelectorAll(".subregion-pills .filter-chip")
    .forEach((c) => {
      const t = c.textContent;
      c.classList.toggle("active", sub ? t === sub : t.startsWith("All"));
    });
  const container = el("regionCards");
  const meta = el("regionResultsMeta");
  container.innerHTML = loading();
  try {
    const url = sub
      ? `${BASE}/subregion/${encodeURIComponent(sub)}?fields=name,capital,flags,population,region,cca2,subregion`
      : `${BASE}/region/${encodeURIComponent(region)}?fields=name,capital,flags,population,region,cca2,subregion`;
    const data = await apiFetch(url);
    const rcEl = document.getElementById(`rc-${region}`);
    if (rcEl) rcEl.textContent = `${data.length} countries`;
    meta.innerHTML = resultsBar(data);
    container._data = data;
    renderCards(data, container);
  } catch (e) {
    container.innerHTML = errorBox(e);
  }
}

function byName() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Name</em></h2>
<p>Search countries by their common or official name. Toggle full-text mode for exact matching.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/name/{name} &nbsp;|&nbsp; ?fullText=true</div>
    </div>
    <div class="search-panel">
<h3>🔤 Name Search</h3>
<div class="search-row">
  <input type="text" id="nameInput" placeholder="e.g. Germany, España, Perú…" onkeydown="if(event.key==='Enter')searchByName()"/>
  <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);cursor:pointer;flex-shrink:0">
    <input type="checkbox" id="fullText" style="accent-color:var(--gold)"/> Full text match
  </label>
  <button class="btn btn-gold" onclick="searchByName()">Search</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    "Germany",
    "Japan",
    "Brazil",
    "India",
    "Australia",
    "Egypt",
    "Canada",
  ]
    .map(
      (n) => `
    <button class="filter-chip" onclick="el('nameInput').value='${n}';searchByName()">${n}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="nameResults"></div>`;
}

window.searchByName = async function () {
  const q = el("nameInput")?.value?.trim();
  if (!q) return showToast("Please enter a country name");
  const full = el("fullText")?.checked;
  const res = el("nameResults");
  res.innerHTML = loading();
  try {
    const url = `${BASE}/name/${encodeURIComponent(q)}${full ? "?fullText=true" : ""}`;
    const data = await apiFetch(url);
    res.innerHTML = resultsBar(data);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(data, container);
  } catch (e) {
    res.innerHTML = errorBox(
      e.message + " – try a different spelling or toggle full text",
      e,
    );
  }
};

function byCode() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Code</em></h2>
<p>Look up a country by its ISO 3166-1 alpha-2, alpha-3, numeric, or IOC code.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/alpha/{code}</div>
    </div>
    <div class="search-panel">
<h3>#️⃣ Code Lookup</h3>
<div class="search-row">
  <input type="text" id="codeInput" placeholder="e.g. US, DEU, 276, COL…" onkeydown="if(event.key==='Enter')searchByCode()"/>
  <button class="btn btn-gold" onclick="searchByCode()">Look up</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${["US", "GBR", "276", "JP", "BRA", "IND", "AU"]
    .map(
      (c) => `
    <button class="filter-chip" onclick="el('codeInput').value='${c}';searchByCode()">${c}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="codeResults"></div>`;
}

window.searchByCode = async function () {
  const q = el("codeInput")?.value?.trim();
  if (!q) return showToast("Enter a country code");
  const res = el("codeResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(`${BASE}/alpha/${encodeURIComponent(q)}`);
    const arr = Array.isArray(data) ? data : [data];
    res.innerHTML = resultsBar(arr);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(arr, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function multiCode() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Multi-Code <em>Lookup</em></h2>
<p>Search multiple countries by their codes in a single request.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/alpha?codes={code},{code},{code}</div>
    </div>
    <div class="search-panel">
<h3>📦 Multiple Codes</h3>
<div class="search-row">
  <input type="text" id="multiInput" placeholder="e.g. US,DEU,JP,BRA,IND" onkeydown="if(event.key==='Enter')searchMultiCode()"/>
  <button class="btn btn-gold" onclick="searchMultiCode()">Fetch All</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  <button class="filter-chip" onclick="el('multiInput').value='US,GBR,DEU,FRA,JPN';searchMultiCode()">G5 Nations</button>
  <button class="filter-chip" onclick="el('multiInput').value='CN,US,DE,JP,IN,GB,FR,BR,IT,CA';searchMultiCode()">G10 Economies</button>
  <button class="filter-chip" onclick="el('multiInput').value='BR,RU,IN,CN,ZA';searchMultiCode()">BRICS</button>
  <button class="filter-chip" onclick="el('multiInput').value='AU,CA,NZ,GB,US';searchMultiCode()">Five Eyes</button>
</div>
    </div>
    <div id="multiResults"></div>`;
}

window.searchMultiCode = async function () {
  const q = el("multiInput")?.value?.trim();
  if (!q) return showToast("Enter comma-separated codes");
  const res = el("multiResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/alpha?codes=${encodeURIComponent(q)}`,
    );
    res.innerHTML = resultsBar(data);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(data, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function byCurrency() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Currency</em></h2>
<p>Find all countries that use a specific currency code or name.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/currency/{currency}</div>
    </div>
    <div class="search-panel">
<h3>💱 Currency Search</h3>
<div class="search-row">
  <input type="text" id="curInput" placeholder="e.g. USD, EUR, dollar, yen…" onkeydown="if(event.key==='Enter')searchByCurrency()"/>
  <button class="btn btn-gold" onclick="searchByCurrency()">Search</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    ["USD", "US Dollar"],
    ["EUR", "Euro"],
    ["GBP", "Pound"],
    ["JPY", "Yen"],
    ["INR", "Rupee"],
    ["XOF", "CFA Franc"],
  ]
    .map(
      ([c, l]) => `
    <button class="filter-chip" onclick="el('curInput').value='${c}';searchByCurrency()">${c} – ${l}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="curResults"></div>`;
}

window.searchByCurrency = async function () {
  const q = el("curInput")?.value?.trim();
  if (!q) return showToast("Enter a currency code or name");
  const res = el("curResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/currency/${encodeURIComponent(q)}`,
    );
    res.innerHTML = `<div class="results-meta"><span class="results-count">${Number(data.length) || 0}</span> countries use this currency</div>`;
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(data, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function byLanguage() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Language</em></h2>
<p>Find all countries where a specific language is spoken.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/lang/{language}</div>
    </div>
    <div class="search-panel">
<h3>💬 Language Search</h3>
<div class="search-row">
  <input type="text" id="langInput" placeholder="e.g. spanish, arabic, french, swahili…" onkeydown="if(event.key==='Enter')searchByLang()"/>
  <button class="btn btn-gold" onclick="searchByLang()">Search</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    "Spanish",
    "French",
    "Arabic",
    "Portuguese",
    "Chinese",
    "English",
    "German",
    "Swahili",
    "Hindi",
    "Russian",
  ]
    .map(
      (l) => `
    <button class="filter-chip" onclick="el('langInput').value='${l}';searchByLang()">${l}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="langResults"></div>`;
}

window.searchByLang = async function () {
  const q = el("langInput")?.value?.trim();
  if (!q) return showToast("Enter a language");
  const res = el("langResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(`${BASE}/lang/${encodeURIComponent(q)}`);
    res.innerHTML = `<div class="results-meta"><span class="results-count">${Number(data.length) || 0}</span> countries speak this language</div>`;
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(data, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function byCapital() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Capital City</em></h2>
<p>Find a country by its capital city.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/capital/{capital}</div>
    </div>
    <div class="search-panel">
<h3>🏛️ Capital Search</h3>
<div class="search-row">
  <input type="text" id="capInput" placeholder="e.g. Paris, Tokyo, Nairobi, Canberra…" onkeydown="if(event.key==='Enter')searchByCapital()"/>
  <button class="btn btn-gold" onclick="searchByCapital()">Find</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    "Paris",
    "Tokyo",
    "Berlin",
    "Canberra",
    "Cairo",
    "Brasília",
    "Nairobi",
    "Wellington",
  ]
    .map(
      (c) => `
    <button class="filter-chip" onclick="el('capInput').value='${c}';searchByCapital()">${c}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="capResults"></div>`;
}

window.searchByCapital = async function () {
  const q = el("capInput")?.value?.trim();
  if (!q) return showToast("Enter a capital city");
  const res = el("capResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/capital/${encodeURIComponent(q)}`,
    );
    const arr = Array.isArray(data) ? data : [data];
    res.innerHTML = resultsBar(arr);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(arr, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function byDemonym() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Demonym</em></h2>
<p>Find countries by how their citizens are called.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/demonym/{demonym}</div>
    </div>
    <div class="search-panel">
<h3>👤 Demonym Search</h3>
<div class="search-row">
  <input type="text" id="demInput" placeholder="e.g. Peruvian, German, Japanese…" onkeydown="if(event.key==='Enter')searchByDemonym()"/>
  <button class="btn btn-gold" onclick="searchByDemonym()">Find</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    "Peruvian",
    "German",
    "Japanese",
    "Brazilian",
    "Australian",
    "Egyptian",
    "French",
    "Indian",
  ]
    .map(
      (d) => `
    <button class="filter-chip" onclick="el('demInput').value='${d}';searchByDemonym()">${d}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="demResults"></div>`;
}

window.searchByDemonym = async function () {
  const q = el("demInput")?.value?.trim();
  if (!q) return showToast("Enter a demonym");
  const res = el("demResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/demonym/${encodeURIComponent(q)}`,
    );
    const arr = Array.isArray(data) ? data : [data];
    res.innerHTML = resultsBar(arr);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(arr, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function byTranslation() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Search by <em>Translation</em></h2>
<p>Search countries using their native-language name translations.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/translation/{translation}</div>
    </div>
    <div class="search-panel">
<h3>🌐 Translation Search</h3>
<div class="search-row">
  <input type="text" id="transInput" placeholder="e.g. Alemania, Deutschland, Allemagne…" onkeydown="if(event.key==='Enter')searchByTrans()"/>
  <button class="btn btn-gold" onclick="searchByTrans()">Search</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  ${[
    ["Alemania", "(Germany in Spanish)"],
    ["Deutschland", "(Germany in German)"],
    ["Allemagne", "(Germany in French)"],
    ["Nippon", "(Japan in Japanese)"],
    ["Rossiya", "(Russia in Russian)"],
  ]
    .map(
      ([t, hint]) => `
    <button class="filter-chip" onclick="el('transInput').value='${t}';searchByTrans()" title="${hint}">${t}</button>`,
    )
    .join("")}
</div>
    </div>
    <div id="transResults"></div>`;
}

window.searchByTrans = async function () {
  const q = el("transInput")?.value?.trim();
  if (!q) return showToast("Enter a translation");
  const res = el("transResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/translation/${encodeURIComponent(q)}`,
    );
    const arr = Array.isArray(data) ? data : [data];
    res.innerHTML = resultsBar(arr);
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(arr, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

function independent() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2><em>Independence</em> Status</h2>
<p>Filter countries by their independence status and combine with field filters.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/independent?status=true&fields=name,capital,flags</div>
    </div>
    <div class="search-panel">
<h3>🏳️ Independence Filter</h3>
<div class="search-row">
  <select id="indepStatus">
    <option value="true">Independent Countries</option>
    <option value="false">Non-Independent Territories</option>
  </select>
  <button class="btn btn-gold" onclick="searchIndependent()">Filter</button>
</div>
    </div>
    <div id="indepResults"></div>`;
  searchIndependent();
}

window.searchIndependent = async function () {
  const status = el("indepStatus")?.value;
  const res = el("indepResults");
  res.innerHTML = loading();
  try {
    const data = await apiFetch(
      `${BASE}/independent?status=${status}&fields=name,capital,flags,population,region,cca2,independent`,
    );
    res.innerHTML = `<div class="results-meta">
<span class="results-count">${data.length}</span>
<span>${status === "true" ? "independent" : "non-independent"} countries/territories</span>
    </div>`;
    const container = document.createElement("div");
    container.id = "cardsContainer";
    res.appendChild(container);
    renderCards(data, container);
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

const AVAILABLE_FIELDS = [
  "name",
  "cca2",
  "cca3",
  "ccn3",
  "cioc",
  "independent",
  "status",
  "unMember",
  "currencies",
  "idd",
  "capital",
  "altSpellings",
  "region",
  "subregion",
  "languages",
  "translations",
  "latlng",
  "landlocked",
  "borders",
  "area",
  "demonyms",
  "flag",
  "maps",
  "population",
  "gini",
  "fifa",
  "car",
  "timezones",
  "continents",
  "flags",
  "coatOfArms",
  "startOfWeek",
  "capitalInfo",
  "postalCode",
];

function fieldFilter() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Field <em>Filter</em></h2>
<p>Specify exactly which fields to include in the API response. Reduces payload size.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/all?fields={field},{field},{field}</div>
    </div>
    <div class="search-panel">
<h3>⚙️ Choose Fields (max 10)</h3>
<div class="field-select-grid">
  ${AVAILABLE_FIELDS.map(
    (f) => `
    <label class="field-checkbox">
      <input type="checkbox" name="fieldChk" value="${f}" ${["name", "flags", "capital", "population", "region", "cca2"].includes(f) ? "checked" : ""}/>
      ${f}
    </label>`,
  ).join("")}
</div>
<div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
  <button class="btn btn-gold" onclick="runFieldFilter()">Fetch with Selected Fields</button>
  <button class="btn btn-ghost btn-sm" onclick="document.querySelectorAll('[name=fieldChk]').forEach(c=>c.checked=false)">Clear All</button>
  <span id="fieldCount" style="font-size:12px;color:var(--text-dim);font-family:var(--font-mono)"></span>
</div>
    </div>
    <div id="fieldPreview" style="margin-bottom:16px"></div>
    <div id="fieldResults"></div>`;

  document
    .querySelectorAll("[name=fieldChk]")
    .forEach((c) => c.addEventListener("change", updateFieldCount));
  updateFieldCount();
}

function updateFieldCount() {
  const checked = [
    ...document.querySelectorAll("[name=fieldChk]:checked"),
  ].length;
  const cnt = el("fieldCount");
  if (cnt) cnt.textContent = `${checked} / 10 fields selected`;
}

window.runFieldFilter = async function () {
  const selected = [
    ...document.querySelectorAll("[name=fieldChk]:checked"),
  ].map((c) => c.value);
  if (!selected.length) return showToast("Select at least one field");
  if (selected.length > 10) return showToast("Maximum 10 fields allowed");
  const url = `${BASE}/all?fields=${selected.join(",")}`;
  const res = el("fieldResults");
  const preview = el("fieldPreview");
  preview.innerHTML = `<div class="endpoint-pill" style="margin-bottom:12px"><span class="method-get">GET</span> ${escapeHtml(url)}</div>`;
  res.innerHTML = loading();
  try {
    const data = await apiFetch(url);
    showToast(
      `✓ Fetched ${selected.length} fields for ${data.length} countries`,
    );

    const raw = escapeHtml(JSON.stringify(data[0], null, 2), true);
    const colored = raw
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
      .replace(/: "([^"]+)"/g, ': <span class="json-str">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-num">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>');
    preview.innerHTML += `
<div style="margin-bottom:16px">
  <div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em">
    Sample response (first country)
  </div>
  <div class="json-preview">${colored}</div>
</div>`;

    if (selected.includes("name") && selected.includes("flags")) {
      res.innerHTML = resultsBar(data);
      const container = document.createElement("div");
      container.id = "cardsContainer";
      res.appendChild(container);
      renderCards(data, container);
    } else {
      res.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:20px 0">
  Select <code style="color:var(--accent)">name</code> and <code style="color:var(--accent)">flags</code> fields to show cards. Raw JSON preview shown above.
</div>`;
    }
  } catch (e) {
    res.innerHTML = errorBox(e);
  }
};

let compareA = null,
  compareB = null;

function compare() {
  el("mainContent").innerHTML = `
    <div class="page-header">
<h2>Compare <em>Countries</em></h2>
<p>Side-by-side country comparison using multi-fetch from the API.</p>
<div class="endpoint-pill"><span class="method-get">GET</span> /v3.1/alpha/{code} (×2)</div>
    </div>
    <div class="search-panel">
<h3>⚖️ Pick Two Countries</h3>
<div class="search-row">
  <input type="text" id="compareA" placeholder="Country A (name or code)…" value="${escapeHtml(compareA?.name?.common || "")}"/>
  <span style="color:var(--gold);font-family:var(--font-display);font-size:18px;font-weight:900;align-self:center;flex-shrink:0">VS</span>
  <input type="text" id="compareB" placeholder="Country B (name or code)…" value="${escapeHtml(compareB?.name?.common || "")}"/>
  <button class="btn btn-gold" onclick="runCompare()">Compare</button>
</div>
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
  <button class="filter-chip" onclick="el('compareA').value='US';el('compareB').value='CN';runCompare()">🇺🇸 US vs 🇨🇳 China</button>
  <button class="filter-chip" onclick="el('compareA').value='IND';el('compareB').value='BRA';runCompare()">🇮🇳 India vs 🇧🇷 Brazil</button>
  <button class="filter-chip" onclick="el('compareA').value='DEU';el('compareB').value='FRA';runCompare()">🇩🇪 Germany vs 🇫🇷 France</button>
  <button class="filter-chip" onclick="el('compareA').value='AUS';el('compareB').value='CAN';runCompare()">🇦🇺 Australia vs 🇨🇦 Canada</button>
</div>
    </div>
    <div id="compareResults"></div>`;
}

window.runCompare = async function () {
  const a = el("compareA")?.value?.trim();
  const b = el("compareB")?.value?.trim();
  if (!a || !b) return showToast("Enter both countries");
  const res = el("compareResults");
  res.innerHTML = loading();
  try {
    const [da, db] = await Promise.all([
      apiFetch(`${BASE}/name/${encodeURIComponent(a)}`)
        .then((d) => (Array.isArray(d) ? d[0] : d))
        .catch(() =>
          apiFetch(`${BASE}/alpha/${encodeURIComponent(a)}`).then((d) =>
            Array.isArray(d) ? d[0] : d,
          ),
        ),
      apiFetch(`${BASE}/name/${encodeURIComponent(b)}`)
        .then((d) => (Array.isArray(d) ? d[0] : d))
        .catch(() =>
          apiFetch(`${BASE}/alpha/${encodeURIComponent(b)}`).then((d) =>
            Array.isArray(d) ? d[0] : d,
          ),
        ),
    ]);

    const metrics = [
      {
        label: "Population",
        va: da.population || 0,
        vb: db.population || 0,
        fmt: (n) => fmt(n),
        bigger: true,
      },
      {
        label: "Area (km²)",
        va: da.area || 0,
        vb: db.area || 0,
        fmt: (n) => fmt(n) + " km²",
        bigger: true,
      },
      {
        label: "Languages",
        va: Object.keys(da.languages || {}).length,
        vb: Object.keys(db.languages || {}).length,
        fmt: (n) => n + " languages",
        bigger: true,
      },
      {
        label: "Currencies",
        va: Object.keys(da.currencies || {}).length,
        vb: Object.keys(db.currencies || {}).length,
        fmt: (n) => n + " currencies",
        bigger: true,
      },
      {
        label: "Timezones",
        va: (da.timezones || []).length,
        vb: (db.timezones || []).length,
        fmt: (n) => n + " timezones",
        bigger: true,
      },
      {
        label: "Borders",
        va: (da.borders || []).length,
        vb: (db.borders || []).length,
        fmt: (n) => n + " neighbours",
        bigger: true,
      },
    ];

    res.innerHTML = `
<div class="compare-area">
  <div class="compare-card">
    <img class="compare-card-flag" src="${escapeHtml(safeUrl(da.flags?.png || da.flags?.svg || ""))}" alt="${escapeHtml(da.name?.common)}"/>
    <div class="compare-card-body">
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-bottom:4px">${escapeHtml(da.name?.common)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px;font-style:italic">${escapeHtml(da.name?.official)}</div>
      ${metrics
        .map(
          (m) => `
        <div class="compare-stat-row">
          <span class="compare-label">${m.label}</span>
          <span class="${(m.bigger ? m.va >= m.vb : m.va <= m.vb) ? "compare-winner" : "compare-loser"}">${m.fmt(m.va)}</span>
        </div>`,
        )
        .join("")}
      <div class="compare-stat-row"><span class="compare-label">Capital</span><span>${escapeHtml((da.capital || ["–"])[0])}</span></div>
      <div class="compare-stat-row"><span class="compare-label">Region</span><span>${escapeHtml(da.region || "–")}</span></div>
      <div class="compare-stat-row"><span class="compare-label">UN Member</span><span>${da.unMember ? "✅ Yes" : "❌ No"}</span></div>
      <button class="btn btn-gold btn-sm" style="margin-top:14px;width:100%" onclick="showCountry('${safeCode(da.cca2)}')">View Full Profile</button>
    </div>
  </div>
  <div class="vs-divider">VS</div>
  <div class="compare-card">
    <img class="compare-card-flag" src="${escapeHtml(safeUrl(db.flags?.png || db.flags?.svg || ""))}" alt="${escapeHtml(db.name?.common)}"/>
    <div class="compare-card-body">
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-bottom:4px">${escapeHtml(db.name?.common)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px;font-style:italic">${escapeHtml(db.name?.official)}</div>
      ${metrics
        .map(
          (m) => `
        <div class="compare-stat-row">
          <span class="compare-label">${m.label}</span>
          <span class="${(m.bigger ? m.vb >= m.va : m.vb <= m.va) ? "compare-winner" : "compare-loser"}">${m.fmt(m.vb)}</span>
        </div>`,
        )
        .join("")}
      <div class="compare-stat-row"><span class="compare-label">Capital</span><span>${escapeHtml((db.capital || ["–"])[0])}</span></div>
      <div class="compare-stat-row"><span class="compare-label">Region</span><span>${escapeHtml(db.region || "–")}</span></div>
      <div class="compare-stat-row"><span class="compare-label">UN Member</span><span>${db.unMember ? "✅ Yes" : "❌ No"}</span></div>
      <button class="btn btn-gold btn-sm" style="margin-top:14px;width:100%" onclick="showCountry('${safeCode(db.cca2)}')">View Full Profile</button>
    </div>
  </div>
</div>`;
  } catch (e) {
    res.innerHTML = errorBox(
      "Could not load one or both countries: " + e.message,
      e,
    );
  }
};

window.showCountry = async function (code) {
  code = safeCode(code);
  if (!code || code === "undefined") return;
  modalCode = code;
  const overlay = el("modal");
  const content = el("modalContent");
  content.innerHTML = `<div class="loading" style="padding:60px"><div class="spinner"></div></div>`;
  overlay.classList.add("open");

  try {
    const data = await apiFetch(
      `${BASE}/alpha/${encodeURIComponent(code)}`,
    );
    const c = Array.isArray(data) ? data[0] : data;
    const name = c.name?.common || "–";
    const official = c.name?.official || "";
    const flag = safeUrl(c.flags?.png || c.flags?.svg || "");
    const flagAlt = c.flags?.alt || "";
    const coat = safeUrl(c.coatOfArms?.png || c.coatOfArms?.svg || "");
    const cap = (c.capital || []).join(", ") || "–";
    const pop = fmt(c.population);
    const area = fmt(c.area);
    const region = c.region || "–";
    const sub = c.subregion || "–";
    const langs = c.languages ? Object.values(c.languages) : [];
    const currencies = c.currencies || {};
    const tlds = c.tld || [];
    const borders = c.borders || [];
    const timezones = (c.timezones || []).join(", ");
    const continents = (c.continents || []).join(", ");
    const gini = c.gini
      ? Object.entries(c.gini)
          .map(([y, v]) => `${v} (${y})`)
          .join(", ")
      : "–";
    const idd = c.idd?.root
      ? c.idd.root + (c.idd.suffixes?.[0] || "")
      : "–";
    const demonyms = c.demonyms?.eng
      ? `${c.demonyms.eng.m} / ${c.demonyms.eng.f}`
      : "–";
    const maps = safeUrl(c.maps?.googleMaps) || safeUrl(c.maps?.openStreetMaps);
    const osm = safeUrl(c.maps?.openStreetMaps);
    const driveSide = c.car?.side || "–";
    const fifa = c.fifa || "–";
    const latlng = c.latlng
      ? `${c.latlng[0].toFixed(2)}°, ${c.latlng[1].toFixed(2)}°`
      : "–";
    const landlocked = c.landlocked ? "Yes" : "No";
    const unMember = c.unMember ? "✅ Yes" : "❌ No";
    const independent = c.independent ? "✅ Yes" : "❌ No / Territory";
    const startOfWeek = c.startOfWeek || "–";
    const postal = c.postalCode?.format || "–";
    const altSpellings =
      (c.altSpellings || []).slice(0, 4).join(", ") || "–";

    const translations = c.translations || {};
    const transArr = Object.entries(translations)
      .slice(0, 8)
      .map(
        ([lang, t]) =>
          `<span class="tld-chip">${escapeHtml(lang)}: ${escapeHtml(t?.common)}</span>`,
      )
      .join("");

    content.innerHTML = `
<div class="modal-hero">
  <img class="modal-flag" src="${escapeHtml(flag)}" alt="${escapeHtml(flagAlt || "Flag of " + name)}"/>
  <div class="modal-hero-content">
    <div class="modal-title">${escapeHtml(name)}</div>
    ${official !== name ? `<div class="modal-subtitle">${escapeHtml(official)}</div>` : ""}
  </div>
  <button class="modal-close" onclick="closeModal()">✕</button>
</div>
<div class="modal-body">

  <div class="modal-grid">
    <div>
      <div class="info-section">
        <h4>🌍 Geography</h4>
        <div class="info-row"><span class="info-label">Capital</span><span class="info-value">${escapeHtml(cap)}</span></div>
        <div class="info-row"><span class="info-label">Region</span><span class="info-value">${escapeHtml(region)}</span></div>
        <div class="info-row"><span class="info-label">Subregion</span><span class="info-value">${escapeHtml(sub)}</span></div>
        <div class="info-row"><span class="info-label">Continents</span><span class="info-value">${escapeHtml(continents)}</span></div>
        <div class="info-row"><span class="info-label">Coordinates</span><span class="info-value mono">${escapeHtml(latlng)}</span></div>
        <div class="info-row"><span class="info-label">Landlocked</span><span class="info-value">${landlocked}</span></div>
        <div class="info-row"><span class="info-label">Area</span><span class="info-value">${escapeHtml(area)} km²</span></div>
      </div>

      <div class="info-section">
        <h4>📊 Demographics</h4>
        <div class="info-row"><span class="info-label">Population</span><span class="info-value">${escapeHtml(pop)}</span></div>
        <div class="info-row"><span class="info-label">Demonym</span><span class="info-value">${escapeHtml(demonyms)}</span></div>
        <div class="info-row"><span class="info-label">GINI Index</span><span class="info-value">${escapeHtml(gini)}</span></div>
      </div>

      <div class="info-section">
        <h4>💬 Languages</h4>
        <div>${langs.map((l) => `<span class="lang-chip">${escapeHtml(l)}</span>`).join("") || "–"}</div>
      </div>

      <div class="info-section">
        <h4>💱 Currencies</h4>
        <div>${
          Object.entries(currencies)
            .map(
              ([code, cur]) =>
                `<span class="curr-chip">${escapeHtml(cur.symbol || "")} ${escapeHtml(cur.name)} (${escapeHtml(code)})</span>`,
            )
            .join("") || "–"
        }</div>
      </div>
    </div>

    <div>
      <div class="info-section">
        <h4>🔢 Codes & Identifiers</h4>
        <div class="info-row"><span class="info-label">ISO 3166-1 α2</span><span class="info-value mono">${escapeHtml(c.cca2 || "–")}</span></div>
        <div class="info-row"><span class="info-label">ISO 3166-1 α3</span><span class="info-value mono">${escapeHtml(c.cca3 || "–")}</span></div>
        <div class="info-row"><span class="info-label">Numeric</span><span class="info-value mono">${escapeHtml(c.ccn3 || "–")}</span></div>
        <div class="info-row"><span class="info-label">IOC (Olympic)</span><span class="info-value mono">${escapeHtml(c.cioc || "–")}</span></div>
        <div class="info-row"><span class="info-label">FIFA</span><span class="info-value mono">${escapeHtml(fifa)}</span></div>
        <div class="info-row"><span class="info-label">Calling Code</span><span class="info-value mono">${escapeHtml(idd)}</span></div>
        <div class="info-row"><span class="info-label">TLD</span><span class="info-value">${tlds.map((t) => `<span class="tld-chip">${escapeHtml(t)}</span>`).join("") || "–"}</span></div>
      </div>

      <div class="info-section">
        <h4>🏛️ Status</h4>
        <div class="info-row"><span class="info-label">UN Member</span><span class="info-value">${unMember}</span></div>
        <div class="info-row"><span class="info-label">Independent</span><span class="info-value">${independent}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${escapeHtml(c.status || "–")}</span></div>
      </div>

      <div class="info-section">
        <h4>⏰ Time & Transport</h4>
        <div class="info-row"><span class="info-label">Timezones</span><span class="info-value" style="font-size:11px">${escapeHtml(timezones)}</span></div>
        <div class="info-row"><span class="info-label">Drives on</span><span class="info-value">${escapeHtml(driveSide)} side</span></div>
        <div class="info-row"><span class="info-label">Week starts</span><span class="info-value">${escapeHtml(startOfWeek)}</span></div>
        <div class="info-row"><span class="info-label">Postal code</span><span class="info-value mono">${escapeHtml(postal)}</span></div>
      </div>

      ${
        coat
          ? `
      <div class="info-section">
        <h4>🛡️ Coat of Arms</h4>
        <div class="coat-of-arms">
          <img src="${escapeHtml(coat)}" alt="Coat of arms of ${escapeHtml(name)}" onerror="this.parentElement.style.display='none'"/>
          <p>Official coat of arms</p>
        </div>
      </div>`
          : ""
      }
    </div>
  </div>

  ${
    borders.length
      ? `
  <div class="info-section">
    <h4>🗺️ Bordering Countries (${borders.length})</h4>
    <div>${borders.map((b) => `<span class="border-chip" onclick="closeModal();showCountry('${safeCode(b)}')">${escapeHtml(b)}</span>`).join("")}</div>
  </div>`
      : ""
  }

  ${
    altSpellings !== "–"
      ? `
  <div class="info-section">
    <h4>🔤 Alternative Names</h4>
    <div style="font-size:13px;color:var(--text-muted)">${escapeHtml(altSpellings)}</div>
  </div>`
      : ""
  }

  ${
    transArr
      ? `
  <div class="info-section">
    <h4>🌐 Translations</h4>
    <div>${transArr}</div>
  </div>`
      : ""
  }

  ${
    flagAlt
      ? `
  <div class="info-section">
    <h4>🚩 Flag Description</h4>
    <div style="font-size:13px;color:var(--text-muted);line-height:1.7;font-style:italic">${escapeHtml(flagAlt)}</div>
  </div>`
      : ""
  }

  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
    ${maps ? `<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer" class="map-btn">🗺️ View on Google Maps</a>` : ""}
    ${osm ? `<a href="${escapeHtml(osm)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">OpenStreetMap</a>` : ""}
  </div>
</div>`;
  } catch (e) {
    content.innerHTML = `
<button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="closeModal()">✕</button>
<div style="padding:60px 40px">${errorBox("Could not load country data: " + e.message, e)}</div>`;
  }
};

window.closeModal = function () {
  el("modal").classList.remove("open");
};

el("modal").addEventListener("click", (e) => {
  if (e.target === el("modal")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

let searchDebounce;
el("globalSearch").addEventListener("input", function () {
  clearTimeout(searchDebounce);
  const q = this.value.trim();
  if (!q) return;
  searchDebounce = setTimeout(async () => {
    try {
      const data = await apiFetch(
        `${BASE}/name/${encodeURIComponent(q)}`,
      );
      if (data?.length === 1) {
        showCountry(data[0].cca2);
      } else if (data?.length > 1) {
        navigate("byName");
        el("nameInput").value = q;
        searchByName();
      }
    } catch {}
  }, 500);
});

home();
