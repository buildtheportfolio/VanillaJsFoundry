(function () {
  'use strict';

  // ---- storage helpers (storage can throw when blocked) -------------------
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ } },
    remove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  const THEME_KEY = 'foundry:theme';
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');
  const searchEl = document.getElementById('search');
  const difficultyEl = document.getElementById('difficulty');
  const sortEl = document.getElementById('sort');
  const surpriseEl = document.getElementById('surprise');
  const chipsEl = document.getElementById('chips');
  const countEl = document.getElementById('count');
  const listEl = document.getElementById('projects');

  const state = { projects: [], q: '', category: '', difficulty: '', sort: 'az' };

  // ---- theme: auto -> light -> dark -> auto -------------------------------
  const THEMES = ['auto', 'light', 'dark'];
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
    themeLabel.textContent = 'Theme: ' + theme;
    themeBtn.setAttribute('aria-label', 'Theme: ' + theme + '. Activate to change.');
    themeBtn.setAttribute('aria-pressed', String(theme !== 'auto'));
  }
  let theme = store.get(THEME_KEY);
  if (!THEMES.includes(theme)) theme = 'auto';
  applyTheme(theme);
  themeBtn.addEventListener('click', function () {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    if (theme === 'auto') store.remove(THEME_KEY); else store.set(THEME_KEY, theme);
    applyTheme(theme);
  });

  // ---- DOM helpers (never innerHTML: all text comes from projects.json) ---
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const key of Object.keys(props)) {
        if (key === 'class') node.className = props[key];
        else if (key === 'text') node.textContent = props[key];
        else node.setAttribute(key, props[key]);
      }
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function projectUrl(slug) {
    return 'projects/' + encodeURIComponent(slug) + '/';
  }

  function safeLevel(level) {
    return ['Beginner', 'Intermediate', 'Advanced'].includes(level) ? level : 'Intermediate';
  }

  // ---- URL <-> state ------------------------------------------------------
  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    state.q = params.get('q') || '';
    state.category = params.get('cat') || '';
    state.difficulty = params.get('level') || '';
    state.sort = params.get('sort') === 'newest' ? 'newest' : 'az';
  }
  function writeUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('cat', state.category);
    if (state.difficulty) params.set('level', state.difficulty);
    if (state.sort !== 'az') params.set('sort', state.sort);
    const query = params.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
    } catch (e) { /* ignore (sandboxed iframes) */ }
  }

  // ---- filtering ----------------------------------------------------------
  function haystack(project) {
    return [project.title, project.name, project.slug, project.description, project.category, project.difficulty]
      .concat(project.tags || []).join(' ').toLowerCase();
  }

  function matches(project, ignoreCategory) {
    if (!ignoreCategory && state.category && project.category !== state.category) return false;
    if (state.difficulty && project.difficulty !== state.difficulty) return false;
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const text = project._hay;
    return terms.every(function (term) { return text.includes(term); });
  }

  function visibleProjects() {
    const list = state.projects.filter(function (p) { return matches(p, false); });
    if (state.sort === 'newest') {
      list.sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title); });
    } else {
      list.sort(function (a, b) { return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }); });
    }
    return list;
  }

  // ---- rendering ----------------------------------------------------------
  function renderChips() {
    const base = state.projects.filter(function (p) { return matches(p, true); });
    const counts = new Map();
    for (const p of base) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    const allCategories = Array.from(new Set(state.projects.map(function (p) { return p.category; }))).sort();
    chipsEl.replaceChildren();
    const entries = [['', 'All', base.length]].concat(allCategories.map(function (c) { return [c, c, counts.get(c) || 0]; }));
    for (const entry of entries) {
      const chip = el('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.category === entry[0]) }, [
        document.createTextNode(entry[1]),
        el('span', { class: 'n', text: '(' + entry[2] + ')' })
      ]);
      chip.addEventListener('click', function () {
        state.category = state.category === entry[0] ? '' : entry[0];
        update();
        const again = chipsEl.querySelectorAll('.chip');
        const idx = entries.findIndex(function (e) { return e[0] === state.category; });
        if (again[idx]) again[idx].focus();
      });
      chipsEl.append(chip);
    }
  }

  function card(project) {
    const link = el('a', { href: projectUrl(project.slug), text: project.title });
    const tags = el('ul', { class: 'tags', 'aria-label': 'Tags' }, (project.tags || []).slice(0, 4).map(function (t) { return el('li', { text: t }); }));
    const meta = el('div', { class: 'meta' }, [
      el('span', { class: 'badge badge-cat', text: project.category }),
      el('span', { class: 'badge badge-' + safeLevel(project.difficulty), text: safeLevel(project.difficulty) })
    ]);
    const article = el('article', { class: 'card' }, [
      el('h2', null, [link]),
      el('p', { class: 'desc', text: project.description || 'A Vanilla JS project.' }),
      meta
    ]);
    if (tags.children.length) article.append(tags);
    return article;
  }

  function renderEmpty() {
    const reset = el('button', { class: 'btn', type: 'button', text: 'Clear filters' });
    reset.addEventListener('click', function () {
      state.q = ''; state.category = ''; state.difficulty = '';
      searchEl.value = ''; difficultyEl.value = '';
      update();
      searchEl.focus();
    });
    return el('div', { class: 'empty' }, [
      el('p', { class: 'empty-title', text: 'No projects match your filters.' }),
      el('p', { text: 'Try a different search term, category or difficulty.' }),
      reset
    ]);
  }

  function renderList() {
    const items = visibleProjects();
    listEl.replaceChildren();
    if (!items.length) listEl.append(renderEmpty());
    else for (const project of items) listEl.append(card(project));
    const total = state.projects.length;
    countEl.textContent = items.length === total
      ? total + ' project' + (total === 1 ? '' : 's')
      : items.length + ' of ' + total + ' project' + (total === 1 ? '' : 's');
    return items;
  }

  function update() {
    renderChips();
    renderList();
    writeUrl();
  }

  // ---- load projects.json -------------------------------------------------
  function showLoadError(message) {
    const retry = el('button', { class: 'btn btn-primary', type: 'button', text: 'Try again' });
    retry.addEventListener('click', load);
    listEl.replaceChildren(el('div', { class: 'status', role: 'alert' }, [
      el('p', { class: 'empty-title', text: 'Projects could not be loaded.' }),
      el('p', { text: message }),
      retry
    ]));
    chipsEl.replaceChildren();
    countEl.textContent = '';
  }

  async function load() {
    listEl.replaceChildren(el('p', { class: 'status', text: 'Loading projects…' }));
    try {
      const response = await fetch('projects.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('projects.json returned HTTP ' + response.status);
      const data = await response.json();
      const rows = Array.isArray(data) ? data : data && data.projects;
      if (!Array.isArray(rows)) throw new Error('projects.json has an unexpected shape');
      state.projects = rows
        .filter(function (p) { return p && typeof p.slug === 'string' && p.slug; })
        .map(function (p) {
          const project = {
            slug: p.slug,
            name: String(p.name || p.slug),
            title: String(p.title || p.name || p.slug),
            description: String(p.description || ''),
            category: String(p.category || 'Uncategorized'),
            difficulty: safeLevel(p.difficulty),
            status: String(p.status || ''),
            updated: String(p.updated || ''),
            tags: Array.isArray(p.tags) ? p.tags.map(String) : []
          };
          project._hay = haystack(project);
          return project;
        });
      searchEl.value = state.q;
      difficultyEl.value = state.difficulty;
      sortEl.value = state.sort;
      if (state.category && !state.projects.some(function (p) { return p.category === state.category; })) state.category = '';
      update();
    } catch (error) {
      const offline = window.location.protocol === 'file:';
      showLoadError(offline
        ? 'This page was opened from a file. Serve the folder over HTTP (for example "python -m http.server") and reload.'
        : 'Check your connection and try again. (' + error.message + ')');
    }
  }

  // ---- events -------------------------------------------------------------
  searchEl.addEventListener('input', function () { state.q = searchEl.value.trim(); update(); });
  difficultyEl.addEventListener('change', function () { state.difficulty = difficultyEl.value; update(); });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; update(); });

  surpriseEl.addEventListener('click', function () {
    const pool = visibleProjects();
    const pick = (pool.length ? pool : state.projects)[Math.floor(Math.random() * (pool.length || state.projects.length))];
    if (pick) window.location.href = projectUrl(pick.slug);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    const tag = target && target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable)) return;
    event.preventDefault();
    searchEl.focus();
    searchEl.select();
  });

  searchEl.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && searchEl.value) { searchEl.value = ''; state.q = ''; update(); }
  });

  readUrl();
  load();
})();
