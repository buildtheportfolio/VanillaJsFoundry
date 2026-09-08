"use strict";

const _private = new WeakMap();

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  "audio[controls]",
  "video[controls]",
  "details > summary",
].join(",");

function getFocusable(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (
      !el.offsetParent &&
      el.style.display !== "flex" &&
      el.style.display !== "grid"
    )
      return false;
    const style = getComputedStyle(el);
    return (
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0"
    );
  });
}

function getNearestFocusableAncestor(el) {
  if (!el || el === document.body) return document.body;
  const parent = el.parentElement;
  if (!parent) return document.body;
  if (parent.matches && parent.matches(FOCUSABLE) && parent.offsetParent)
    return parent;
  return getNearestFocusableAncestor(parent);
}

function isInDOM(el) {
  return el && el.isConnected && document.contains(el);
}

function trapFocus(e, container) {
  const focusable = getFocusable(container);
  if (!focusable.length) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (
      document.activeElement === first ||
      !container.contains(document.activeElement)
    ) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (
      document.activeElement === last ||
      !container.contains(document.activeElement)
    ) {
      e.preventDefault();
      first.focus();
    }
  }
}

class ModalStackManager {
  constructor() {
    _private.set(this, {
      stack: [],
      focusHistory: [],
      lifecycleHooks: { open: [], close: [], beforeOpen: [], beforeClose: [] },
      scrollPosition: { x: 0, y: 0 },
      metrics: {
        totalOpened: 0,
        totalClosed: 0,
        maxDepth: 0,
        escapeCount: 0,
        backdropCount: 0,
      },
      keyHandler: null,
      resizeObserver: null,
      mutationObserver: null,
      instanceId: `ms_${Date.now()}`,
    });

    this._bindGlobalHandlers();
    this._initMutationObserver();
  }

  _p() {
    return _private.get(this);
  }

  _bindGlobalHandlers() {
    const p = this._p();
    p.keyHandler = (e) => {
      if (!p.stack.length) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        p.metrics.escapeCount++;
        this.close();
        this._updateInspector("escape");
        return;
      }
      if (e.key === "Tab") {
        const top = p.stack[p.stack.length - 1];
        if (top) {
          trapFocus(e, top.boxEl);
          this._logFocus("trap", document.activeElement);
        }
      }
    };
    document.addEventListener("keydown", p.keyHandler, true);
  }

  _initMutationObserver() {
    const p = this._p();
    p.mutationObserver = new MutationObserver((mutations) => {
      p.focusHistory.forEach((entry) => {
        if (entry.el && !isInDOM(entry.el)) {
          entry.stale = true;
          entry.fallback = getNearestFocusableAncestor(entry.el);
        }
      });
    });
    p.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  _lockScroll() {
    const p = this._p();
    p.scrollPosition = { x: window.scrollX, y: window.scrollY };
    document.body.classList.add("scroll-locked");
    document.body.style.top = `-${p.scrollPosition.y}px`;
    document.body.style.left = `-${p.scrollPosition.x}px`;
    document.body.style.width = "100%";
  }

  _unlockScroll() {
    const p = this._p();
    document.body.classList.remove("scroll-locked");
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.width = "";
    window.scrollTo(p.scrollPosition.x, p.scrollPosition.y);
  }

  _setInert(enable) {
    const p = this._p();
    const host = document.getElementById("modalHost");
    const main = document.getElementById("pageRoot");
    const top = p.stack.length ? p.stack[p.stack.length - 1] : null;

    document
      .querySelectorAll("#pageRoot, header, main, aside, footer, nav")
      .forEach((el) => {
        if (enable) {
          el.setAttribute("inert", "");
          el.setAttribute("aria-hidden", "true");
        } else {
          el.removeAttribute("inert");
          el.removeAttribute("aria-hidden");
        }
      });

    if (enable && host) {
      host.setAttribute("aria-hidden", "false");
      host.removeAttribute("inert");
    } else if (!enable && host) {
      host.setAttribute("aria-hidden", "true");
    }

    if (top && p.stack.length > 1) {
      p.stack.slice(0, -1).forEach((entry) => {
        entry.overlayEl.setAttribute("inert", "");
        entry.overlayEl.setAttribute("aria-hidden", "true");
        entry.boxEl.setAttribute("aria-hidden", "true");
      });
      p.stack[p.stack.length - 1].overlayEl.removeAttribute("inert");
      p.stack[p.stack.length - 1].overlayEl.setAttribute(
        "aria-hidden",
        "false",
      );
      p.stack[p.stack.length - 1].boxEl.setAttribute("aria-hidden", "false");
    }
  }

  _saveCurrentFocus(trigger) {
    const p = this._p();
    const active = document.activeElement;
    const entry = {
      el: trigger || active,
      tag: (trigger || active)?.tagName?.toLowerCase() || "unknown",
      id:
        (trigger || active)?.id ||
        (trigger || active)?.textContent?.trim().slice(0, 20) ||
        "unknown",
      stale: false,
      fallback: null,
    };
    p.focusHistory.push(entry);
    this._logFocus("save", entry.el);
    return entry;
  }

  _restoreFocus() {
    const p = this._p();
    const entry = p.focusHistory.pop();
    if (!entry) {
      document.body.focus();
      return;
    }

    const target =
      !entry.stale && isInDOM(entry.el)
        ? entry.el
        : isInDOM(entry.fallback)
          ? entry.fallback
          : document.body;
    requestAnimationFrame(() => {
      try {
        target.focus({ preventScroll: false });
      } catch (_) {
        document.body.focus();
      }
    });
    this._logFocus("restore", target);
    return target;
  }

  _announceLive(msg) {
    const el = document.getElementById("ariaLiveEl");
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = msg;
    });
    this._logAria(msg);
  }

  _logFocus(type, el) {
    const log = document.getElementById("focusLog");
    if (!log) return;
    const label = el?.id
      ? `#${el.id}`
      : el?.tagName?.toLowerCase() || "unknown";
    const entry = document.createElement("div");
    entry.className = "focus-entry";
    const arrow = document.createElement("span");
    arrow.className = "fe-arrow";
    arrow.textContent = "→";
    const lbl = document.createElement("span");
    lbl.className = "fe-label";
    lbl.textContent = label;
    const badge = document.createElement("span");
    badge.className = `fe-type fe-${type}`;
    badge.textContent = type;
    entry.append(arrow, lbl, badge);
    log.prepend(entry);
    while (log.children.length > 12) log.removeChild(log.lastChild);
  }

  _logAria(msg) {
    const log = document.getElementById("ariaLog");
    if (!log) return;
    const entry = document.createElement("div");
    entry.className = "aria-entry";
    entry.textContent = msg;
    log.prepend(entry);
    while (log.children.length > 6) log.removeChild(log.lastChild);
  }

  _updateInspector(reason) {
    const p = this._p();
    const viz = document.getElementById("stackViz");
    const grid = document.getElementById("metricsGrid");
    if (!viz || !grid) return;

    viz.innerHTML = "";
    if (!p.stack.length) {
      const msg = document.createElement("div");
      msg.className = "stack-empty-msg";
      msg.textContent = "No modals open";
      viz.appendChild(msg);
    } else {
      [...p.stack].reverse().forEach((entry, ri) => {
        const isTop = ri === 0;
        const layer = document.createElement("div");
        layer.className = "stack-layer" + (isTop ? " sl-top" : "");
        const idx = document.createElement("div");
        idx.className = "sl-index";
        idx.textContent = p.stack.length - ri;
        const id = document.createElement("div");
        id.className = "sl-id";
        id.textContent = entry.id;
        const role = document.createElement("div");
        role.className = "sl-role";
        role.textContent = entry.role;
        layer.append(idx, id, role);
        viz.appendChild(layer);
      });
    }

    const metrics = [
      { label: "Depth", val: p.stack.length, sub: "layers" },
      { label: "Opened", val: p.metrics.totalOpened, sub: "total" },
      { label: "Escapes", val: p.metrics.escapeCount, sub: "key presses" },
      { label: "Max Depth", val: p.metrics.maxDepth, sub: "record" },
    ];
    grid.innerHTML = "";
    metrics.forEach((m) => {
      const cell = document.createElement("div");
      cell.className = "metric-cell";
      const lbl = document.createElement("div");
      lbl.className = "mc-label";
      lbl.textContent = m.label;
      const val = document.createElement("div");
      val.className = "mc-val";
      val.textContent = m.val;
      const sub = document.createElement("div");
      sub.className = "mc-sub";
      sub.textContent = m.sub;
      cell.append(lbl, val, sub);
      grid.appendChild(cell);
    });

    const badge = document.getElementById("ptScopeBadge");
    if (badge && typeof badge !== "undefined")
      badge.textContent = `stack depth: ${p.stack.length}`;
  }

  open(modalConfig, triggerEl) {
    const p = this._p();
    const id = typeof modalConfig === "string" ? modalConfig : modalConfig.id;
    if (p.stack.find((e) => e.id === id)) return this;

    const hooks = p.lifecycleHooks.beforeOpen;
    if (hooks.some((fn) => fn({ id, stack: this.getStack() }) === false))
      return this;

    const focusEntry = this._saveCurrentFocus(triggerEl);

    const overlayEl = document.createElement("div");
    overlayEl.className = `modal-overlay mo-${Math.min(p.stack.length + 1, 3)}`;
    overlayEl.setAttribute("role", "presentation");
    overlayEl.setAttribute("aria-hidden", "false");
    overlayEl.dataset.modalOverlay = id;

    const boxEl = document.createElement("div");
    boxEl.setAttribute(
      "role",
      modalConfig.alertDialog ? "alertdialog" : "dialog",
    );
    boxEl.setAttribute("aria-modal", "true");
    boxEl.setAttribute("aria-labelledby", `modal-title-${id}`);
    boxEl.setAttribute("aria-describedby", `modal-desc-${id}`);
    boxEl.setAttribute("tabindex", "-1");
    boxEl.className = `modal-box${modalConfig.size === "sm" ? " mb-sm" : modalConfig.size === "lg" ? " mb-lg" : ""}`;
    boxEl.dataset.modalId = id;

    const content =
      typeof modalConfig.render === "function"
        ? modalConfig.render({
            id,
            stackDepth: p.stack.length + 1,
            manager: this,
          })
        : this._renderDefault(id, modalConfig);

    boxEl.appendChild(content);
    overlayEl.appendChild(boxEl);

    if (!modalConfig.persistent) {
      overlayEl.addEventListener("mousedown", (e) => {
        if (e.target === overlayEl) {
          p.metrics.backdropCount++;
          this.close(id);
        }
      });
    }

    const closeBtn = boxEl.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.close(id));

    const host = document.getElementById("modalHost");
    if (host) host.appendChild(overlayEl);

    const entry = {
      id,
      overlayEl,
      boxEl,
      focusEntry,
      role: modalConfig.alertDialog ? "alertdialog" : "dialog",
      timestamp: Date.now(),
      config: modalConfig,
    };
    p.stack.push(entry);

    p.metrics.totalOpened++;
    p.metrics.maxDepth = Math.max(p.metrics.maxDepth, p.stack.length);

    if (p.stack.length === 1) this._lockScroll();
    this._setInert(true);

    requestAnimationFrame(() => {
      const firstFocus = modalConfig.alertDialog
        ? boxEl.querySelector(".btn-safe, button:not(.modal-close-btn)")
        : boxEl.querySelector("[autofocus]") ||
          boxEl.querySelector(".modal-close-btn") ||
          getFocusable(boxEl)[0];
      if (firstFocus) {
        firstFocus.focus();
        this._logFocus("trap", firstFocus);
      } else boxEl.focus();
    });

    const roleName = modalConfig.alertDialog ? "alert dialog" : "dialog";
    const titleEl = boxEl.querySelector(`#modal-title-${id}`);
    this._announceLive(`${roleName} opened: ${titleEl?.textContent || id}`);
    p.lifecycleHooks.open.forEach((fn) =>
      fn({ id, stack: this.getStack(), entry }),
    );
    this._updateInspector("open");
    return this;
  }

  _renderDefault(id, config) {
    const frag = document.createDocumentFragment();
    const stripe = document.createElement("div");
    stripe.className = `modal-stripe${config.stripeClass ? ` ${config.stripeClass}` : ""}`;
    frag.appendChild(stripe);

    const header = document.createElement("div");
    header.className = "modal-header";
    const titleGroup = document.createElement("div");
    titleGroup.className = "modal-title-group";
    if (config.icon) {
      const icon = document.createElement("div");
      icon.className = "modal-icon";
      icon.textContent = config.icon;
      titleGroup.appendChild(icon);
    }
    const title = document.createElement("h2");
    title.className = "modal-title";
    title.id = `modal-title-${id}`;
    title.textContent = config.title || id;
    const sub = document.createElement("div");
    sub.className = "modal-sub";
    sub.id = `modal-desc-${id}`;
    sub.textContent = config.subtitle || "";
    titleGroup.append(title, sub);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.setAttribute("aria-label", "Close dialog");
    closeBtn.textContent = "✕";
    header.append(titleGroup, closeBtn);
    frag.appendChild(header);

    const div = document.createElement("div");
    div.className = "modal-divider";
    frag.appendChild(div);

    const body = document.createElement("div");
    body.className = "modal-body";
    if (typeof config.body === "string") body.innerHTML = config.body;
    else if (config.body instanceof Element) body.appendChild(config.body);
    frag.appendChild(body);

    const div2 = document.createElement("div");
    div2.className = "modal-divider";
    frag.appendChild(div2);

    const footer = document.createElement("div");
    footer.className = `modal-footer${config.footerSplit ? " mf-split" : ""}`;
    (config.actions || []).forEach((action) => {
      const btn = document.createElement("button");
      btn.className =
        `btn btn-${action.style || "ghost"} ${action.className || ""}`.trim();
      if (action.safe) btn.classList.add("btn-safe");
      btn.textContent = action.label;
      if (action.id) btn.id = action.id;
      btn.addEventListener("click", (e) => {
        if (action.onClick) action.onClick(e, { manager: this, modalId: id });
        if (action.closes !== false) this.close(id);
      });
      footer.appendChild(btn);
    });
    frag.appendChild(footer);

    return frag;
  }

  close(id, options = {}) {
    const p = this._p();
    if (!p.stack.length) return this;

    const entry = id
      ? p.stack.find((e) => e.id === id)
      : p.stack[p.stack.length - 1];
    if (!entry) return this;

    const hooks = p.lifecycleHooks.beforeClose;
    if (
      !options.force &&
      hooks.some((fn) => fn({ id: entry.id, stack: this.getStack() }) === false)
    )
      return this;

    if (!options.skipAnimation) {
      entry.boxEl.classList.add("closing");
      setTimeout(() => this._removeEntry(entry), 180);
    } else {
      this._removeEntry(entry);
    }
    return this;
  }

  _removeEntry(entry) {
    const p = this._p();
    const idx = p.stack.indexOf(entry);
    if (idx === -1) return;
    p.stack.splice(idx, 1);

    entry.overlayEl.remove();
    p.metrics.totalClosed++;

    if (!p.stack.length) {
      this._setInert(false);
      this._unlockScroll();
    } else {
      const newTop = p.stack[p.stack.length - 1];
      p.stack.forEach((e, i) => {
        e.overlayEl.removeAttribute("inert");
        e.overlayEl.setAttribute(
          "aria-hidden",
          i < p.stack.length - 1 ? "true" : "false",
        );
        e.boxEl.setAttribute(
          "aria-hidden",
          i < p.stack.length - 1 ? "true" : "false",
        );
        if (i < p.stack.length - 1) e.overlayEl.setAttribute("inert", "");
      });
    }

    const restored = this._restoreFocus();
    const titleText =
      entry.boxEl.querySelector(`#modal-title-${entry.id}`)?.textContent ||
      entry.id;
    this._announceLive(`Dialog closed: ${titleText}`);
    p.lifecycleHooks.close.forEach((fn) =>
      fn({ id: entry.id, stack: this.getStack(), restoredEl: restored }),
    );
    this._updateInspector("close");
  }

  closeAll(options = {}) {
    const p = this._p();
    const ids = p.stack.map((e) => e.id).reverse();
    ids.forEach((id, i) =>
      setTimeout(
        () => this.close(id, { skipAnimation: i > 0, force: options.force }),
        i * 60,
      ),
    );
    return this;
  }

  getStack() {
    const p = this._p();
    return p.stack.map((e) => ({
      id: e.id,
      role: e.role,
      timestamp: e.timestamp,
    }));
  }

  isOpen(id) {
    return this._p().stack.some((e) => e.id === id);
  }
  getDepth() {
    return this._p().stack.length;
  }

  onOpen(fn) {
    this._p().lifecycleHooks.open.push(fn);
    return this;
  }
  onClose(fn) {
    this._p().lifecycleHooks.close.push(fn);
    return this;
  }
  onBeforeOpen(fn) {
    this._p().lifecycleHooks.beforeOpen.push(fn);
    return this;
  }
  onBeforeClose(fn) {
    this._p().lifecycleHooks.beforeClose.push(fn);
    return this;
  }

  destroy() {
    const p = this._p();
    document.removeEventListener("keydown", p.keyHandler, true);
    p.mutationObserver.disconnect();
    this.closeAll({ force: true });
  }
}

const modalStack = new ModalStackManager();
window.modalStack = modalStack;

function buildFormBody(id, depth) {
  const wrap = document.createElement("div");

  const a11y = document.createElement("div");
  a11y.className = "a11y-meta";
  const a11yRows = [
    ["aria-modal", "true"],
    ["role", "dialog"],
    ["focus trap", "active"],
    ["scroll lock", "active"],
    ["inert applied", "background"],
  ];
  a11yRows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "am-row";
    const key = document.createElement("span");
    key.className = "am-key";
    key.textContent = k;
    const val = document.createElement("span");
    val.className = "am-val";
    val.textContent = v;
    row.append(key, val);
    a11y.appendChild(row);
  });

  wrap.innerHTML = `
    <div class="field-group">
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="field-fn-${depth}">First Name <span class="field-req" aria-hidden="true">★</span></label>
          <input id="field-fn-${depth}" class="field-input" type="text" placeholder="Jane" autocomplete="given-name" required/>
          <span class="field-err" id="err-fn-${depth}" role="alert">First name is required</span>
        </div>
        <div class="field">
          <label class="field-label" for="field-ln-${depth}">Last Name <span class="field-req" aria-hidden="true">★</span></label>
          <input id="field-ln-${depth}" class="field-input" type="text" placeholder="Doe" autocomplete="family-name" required/>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="field-em-${depth}">Email Address <span class="field-req" aria-hidden="true">★</span></label>
        <input id="field-em-${depth}" class="field-input" type="email" placeholder="jane@company.com" autocomplete="email" required/>
        <span class="field-hint">We'll never share your email with anyone.</span>
        <span class="field-err" id="err-em-${depth}" role="alert">A valid email is required</span>
      </div>
      <div class="field">
        <label class="field-label" for="field-role-${depth}">Role</label>
        <select id="field-role-${depth}" class="field-select">
          <option value="">— Select a role —</option>
          <option value="dev">Developer</option>
          <option value="design">Designer</option>
          <option value="pm">Product Manager</option>
          <option value="exec">Executive</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="field-msg-${depth}">Message</label>
        <textarea id="field-msg-${depth}" class="field-textarea" placeholder="Tell us about your use case…" rows="3"></textarea>
        <span class="field-hint">Optional — helps us onboard you faster.</span>
      </div>
      <label class="check-row">
        <input type="checkbox" id="field-terms-${depth}" required/>
        <div>
          <div class="check-label">I agree to the Terms of Service</div>
          <div class="check-sub">Required to create an account</div>
        </div>
      </label>
    </div>
  `;
  wrap.appendChild(a11y);

  wrap
    .querySelectorAll(".field-input[required], input[required]")
    .forEach((inp) => {
      inp.addEventListener("blur", () => {
        if (!inp.value.trim()) {
          inp.classList.add("invalid");
          const err = document.getElementById(inp.id.replace("field-", "err-"));
          if (err) err.classList.add("visible");
        } else {
          inp.classList.remove("invalid");
          const err = document.getElementById(inp.id.replace("field-", "err-"));
          if (err) err.classList.remove("visible");
        }
      });
      inp.addEventListener("input", () => {
        inp.classList.remove("invalid");
        const err = document.getElementById(inp.id.replace("field-", "err-"));
        if (err) err.classList.remove("visible");
      });
    });

  return wrap;
}

function buildStackedBody(depth, manager) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <p>This is <strong>modal layer ${depth}</strong>. Each modal correctly traps focus within its own boundary and pushes the previous modal into the background using the <code>inert</code> attribute.</p>
    <p style="margin-top:10px">Press <kbd>Esc</kbd> to close this layer and restore focus to the element that triggered it — even if that element was inside the modal below.</p>
    <div class="a11y-meta" style="margin-top:14px">
      <div class="am-row"><span class="am-key">stack depth</span><span class="am-val">${depth}</span></div>
      <div class="am-row"><span class="am-key">background inert</span><span class="am-val">true</span></div>
      <div class="am-row"><span class="am-key">scroll locked</span><span class="am-val">true</span></div>
      <div class="am-row"><span class="am-key">focus trap</span><span class="am-val">active on this layer</span></div>
    </div>
  `;
  if (depth < 4) {
    const openNextBtn = document.createElement("button");
    openNextBtn.className = "btn btn-primary";
    openNextBtn.textContent = `Open Layer ${depth + 1} →`;
    openNextBtn.style.marginTop = "16px";
    openNextBtn.addEventListener("click", () => {
      const nextId = `level${depth + 1}`;
      manager.open(
        {
          id: nextId,
          title: `Layer ${depth + 1}`,
          subtitle: `Stack depth: ${depth + 1}`,
          icon: "⬡".repeat(depth + 1),
          body: buildStackedBody(depth + 1, manager),
          actions: [
            { label: "Close This Layer", style: "ghost", onClick: () => {} },
          ],
        },
        openNextBtn,
      );
    });
    wrap.appendChild(openNextBtn);
  }
  return wrap;
}

function buildDetachedBody(manager) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <p>The button that opened this dialog has already been <strong>removed from the DOM</strong>.</p>
    <p style="margin-top:10px">When this modal closes, the engine detects the trigger element is no longer in the document and walks up the DOM tree using <code>parentElement</code> traversal to find the <strong>nearest valid focusable ancestor</strong> that is still present.</p>
    <p style="margin-top:10px">This prevents a situation where focus is simply lost (dropped to body) after a modal closes — a common accessibility failure in naive implementations.</p>
    <div class="a11y-meta" style="margin-top:14px">
      <div class="am-row"><span class="am-key">trigger in DOM</span><span class="am-val am-val-bad" style="color:var(--red)">false (removed)</span></div>
      <div class="am-row"><span class="am-key">fallback strategy</span><span class="am-val">ancestor walk via parentElement</span></div>
      <div class="am-row"><span class="am-key">WeakMap stale flag</span><span class="am-val">MutationObserver sets stale=true</span></div>
      <div class="am-row"><span class="am-key">final target</span><span class="am-val">nearest focusable ancestor</span></div>
    </div>
  `;
  return wrap;
}

function buildConfirmBody() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:4px 0 12px;">
      <div class="confirm-icon-wrap"><span class="confirm-icon">🗑</span></div>
      <div>
        <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:600;color:var(--ink);margin-bottom:6px">Delete "Project Alpha"?</div>
        <p style="font-size:13px;color:var(--ink-3);line-height:1.6;max-width:320px">This action is <strong>permanent</strong> and cannot be undone. All associated data, files and collaborator access will be immediately revoked.</p>
      </div>
      <div class="a11y-meta" style="width:100%;text-align:left;margin-top:4px">
        <div class="am-row"><span class="am-key">role</span><span class="am-val">alertdialog</span></div>
        <div class="am-row"><span class="am-key">first focus</span><span class="am-val">safe action (Cancel)</span></div>
        <div class="am-row"><span class="am-key">aria-labelledby</span><span class="am-val">modal-title-confirm</span></div>
      </div>
    </div>
  `;
  return wrap;
}

modalStack
  .onOpen(({ id, stack }) => {
    updateDepthIndicators(stack.length);
  })
  .onClose(({ id, stack }) => {
    updateDepthIndicators(stack.length);
  });

function updateDepthIndicators(depth) {
  document.querySelectorAll(".depth-indicator .depth-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i < depth);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  modalStack._updateInspector("init");

  document
    .getElementById("btnOpenBasic")
    .addEventListener("click", function () {
      modalStack.open(
        {
          id: "basic",
          title: "Welcome to ModalStack",
          subtitle: "Single layer · ARIA compliant · Focus trapped",
          icon: "⬡",
          body: `
        <p>This is a <strong>fully accessible modal</strong> that uses Constructable Stylesheets, <code>WeakMap</code> private state, and the <code>inert</code> attribute to lock the background from focus and pointer events.</p>
        <p>Try pressing <kbd>Tab</kbd> — focus will cycle only within this dialog. Try pressing <kbd>Esc</kbd> to close it and watch focus return to the button that opened it.</p>
        <div class="a11y-meta">
          <div class="am-row"><span class="am-key">role</span><span class="am-val">dialog</span></div>
          <div class="am-row"><span class="am-key">aria-modal</span><span class="am-val">true</span></div>
          <div class="am-row"><span class="am-key">aria-labelledby</span><span class="am-val">modal-title-basic</span></div>
          <div class="am-row"><span class="am-key">scroll locked</span><span class="am-val">body overflow:hidden</span></div>
          <div class="am-row"><span class="am-key">background</span><span class="am-val">inert + aria-hidden</span></div>
          <div class="am-row"><span class="am-key">focus restore</span><span class="am-val">trigger → #btnOpenBasic</span></div>
        </div>
      `,
          actions: [
            {
              label: "Learn More",
              style: "outline",
              closes: false,
              onClick: () => alert("(just a demo action)"),
            },
            { label: "Got it", style: "primary" },
          ],
        },
        this,
      );
    });

  document
    .getElementById("btnOpenStacked")
    .addEventListener("click", function () {
      modalStack.open(
        {
          id: "level1",
          title: "Layer 1",
          subtitle: "Stack depth: 1 — open another from inside",
          icon: "⬡",
          body: buildStackedBody(1, modalStack),
          actions: [{ label: "Close Layer 1", style: "ghost" }],
        },
        this,
      );
    });

  document.getElementById("btnOpenForm").addEventListener("click", function () {
    modalStack.open(
      {
        id: "form",
        title: "Create Account",
        subtitle: "Form modal — Tab cycles through all inputs",
        icon: "✎",
        size: "lg",
        body: buildFormBody("form", 1),
        actions: [
          { label: "Cancel", style: "ghost" },
          {
            label: "Create Account",
            style: "primary",
            closes: false,
            onClick: (e, { manager }) => {
              const firstNameEl = document.getElementById("field-fn-1");
              const emailEl = document.getElementById("field-em-1");
              const termsEl = document.getElementById("field-terms-1");
              let valid = true;
              if (!firstNameEl.value.trim()) {
                firstNameEl.classList.add("invalid");
                valid = false;
              }
              if (
                !emailEl.value.trim() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)
              ) {
                emailEl.classList.add("invalid");
                valid = false;
              }
              if (!termsEl.checked) {
                termsEl.style.outline = "2px solid var(--red)";
                valid = false;
              }
              if (valid) manager.close("form");
            },
          },
        ],
      },
      this,
    );
  });

  document
    .getElementById("btnOpenConfirm")
    .addEventListener("click", function () {
      modalStack.open(
        {
          id: "confirm",
          title: "Confirm Deletion",
          subtitle: "alertdialog · focus on safe action",
          alertDialog: true,
          stripeClass: "ms-danger",
          size: "sm",
          body: buildConfirmBody(),
          footerSplit: true,
          actions: [
            {
              label: "← Cancel",
              style: "outline",
              safe: true,
              onClick: () => {},
            },
            {
              label: "Delete Forever",
              style: "danger",
              onClick: (e, { manager }) => {
                manager._announceLive("Item deleted successfully");
              },
            },
          ],
        },
        this,
      );
    });

  document
    .getElementById("btnOpenDetached")
    .addEventListener("click", function () {
      const btn = this;
      const parent = btn.parentElement;
      const placeholder = document.createElement("span");
      placeholder.style.cssText =
        "display:inline-block;font-size:11px;color:var(--ink-4);font-style:italic;padding:9px 0";
      placeholder.textContent = "(button removed from DOM)";
      parent.replaceChild(placeholder, btn);

      modalStack.open(
        {
          id: "detached",
          title: "Detached Trigger Demo",
          subtitle: "Trigger element was removed from DOM on open",
          icon: "⟳",
          body: buildDetachedBody(modalStack),
          actions: [
            {
              label: "Close & See Focus Restored",
              style: "primary",
              onClick: (e, { manager }) => {
                parent.replaceChild(btn, placeholder);
                setTimeout(() => manager.close("detached"), 50);
              },
              closes: false,
            },
          ],
        },
        btn,
      );
    });

  document.getElementById("btnOpenDeep").addEventListener("click", function () {
    const delays = [0, 200, 400, 600];
    const configs = [
      {
        id: "deep1",
        title: "Deep Layer 1",
        subtitle: "Opened programmatically",
        icon: "⬡",
        depth: 1,
      },
      {
        id: "deep2",
        title: "Deep Layer 2",
        subtitle: "Stack depth: 2",
        icon: "⬡⬡",
        depth: 2,
      },
      {
        id: "deep3",
        title: "Deep Layer 3",
        subtitle: "Stack depth: 3",
        icon: "⬡⬡⬡",
        depth: 3,
      },
      {
        id: "deep4",
        title: "Deep Layer 4",
        subtitle: "Stack depth: 4 · Maximum demo depth",
        icon: "⬡⬡⬡⬡",
        depth: 4,
      },
    ];
    configs.forEach((cfg, i) => {
      setTimeout(() => {
        modalStack.open({
          id: cfg.id,
          title: cfg.title,
          subtitle: cfg.subtitle,
          icon: cfg.icon,
          body: `<p>Layer <strong>${cfg.depth}</strong> of 4. Each layer traps focus independently. Press <kbd>Esc</kbd> repeatedly to collapse the stack one layer at a time — watch focus restore correctly at each level.</p>
                 <div class="a11y-meta" style="margin-top:12px">
                   <div class="am-row"><span class="am-key">depth</span><span class="am-val">${cfg.depth}</span></div>
                   <div class="am-row"><span class="am-key">layers below</span><span class="am-val am-val">${cfg.depth - 1} (all inert)</span></div>
                   <div class="am-row"><span class="am-key">focus history</span><span class="am-val">${cfg.depth} saved entries</span></div>
                 </div>`,
          actions: [
            { label: "Close This Layer", style: "ghost" },
            {
              label: "Close All",
              style: "danger btn-sm",
              onClick: () => modalStack.closeAll(),
            },
          ],
        });
      }, delays[i]);
    });
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Escape") {
      modalStack.closeAll();
    }
  });

  const observer = new MutationObserver(() =>
    modalStack._updateInspector("dom"),
  );
  const host = document.getElementById("modalHost");
  if (host) observer.observe(host, { childList: true, subtree: false });

  setInterval(() => modalStack._updateInspector("tick"), 2000);
});
