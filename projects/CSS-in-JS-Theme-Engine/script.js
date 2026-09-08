"use strict";

class ThemeEngine {
  #sheets = new Map();
  #rawSheet = null;
  #tokens = new Map();
  #computed = new Map();
  #subscribers = new Set();
  #adoptedElements = new Set();
  #history = [];
  #historyIndex = -1;
  #batchDepth = 0;
  #pendingNotify = false;
  #aliases = new Map();
  #resolveCache = new Map();

  constructor() {
    this.#rawSheet = new CSSStyleSheet();
    this.supported =
      typeof CSSStyleSheet !== "undefined" &&
      "replace" in CSSStyleSheet.prototype;
  }

  #createSheet(scope) {
    const sheet = new CSSStyleSheet();
    this.#sheets.set(scope, sheet);
    return sheet;
  }

  #getSheet(scope = ":root") {
    return this.#sheets.get(scope) || this.#createSheet(scope);
  }

  #resolveValue(value) {
    if (typeof value !== "string") return String(value);
    if (value.startsWith("$")) {
      const ref = value.slice(1);
      const aliasTarget = this.#aliases.get(ref);
      if (aliasTarget) return this.#resolveValue(aliasTarget);
      const tokenVal = this.#tokens.get(ref);
      if (tokenVal !== undefined) return this.#resolveValue(tokenVal);
    }
    if (value.startsWith("fn:")) {
      const expr = value.slice(3);
      return this.#evalComputed(expr);
    }
    return value;
  }

  #evalComputed(expr) {
    try {
      const tokenEntries = Object.fromEntries(this.#tokens);
      const fn = new Function(
        "tokens",
        "Math",
        `"use strict"; with(tokens) { return String(${expr}); }`,
      );
      return fn(tokenEntries, Math);
    } catch {
      return "invalid";
    }
  }

  #buildRule(scope, tokenEntries) {
    const props = tokenEntries
      .map(([k, v]) => {
        const resolved = this.#resolveValue(v);
        return `  --${k}: ${resolved};`;
      })
      .join("\n");
    return `${scope} {\n${props}\n}`;
  }

  async #flushSheet(scope = ":root") {
    const sheet = this.#getSheet(scope);
    const entries = [...this.#tokens.entries()];
    const rule = this.#buildRule(scope, entries);
    try {
      await sheet.replace(rule);
    } catch {
      sheet.replaceSync(rule);
    }
    return sheet;
  }

  #propagateToElements(scope = ":root") {
    this.#adoptedElements.forEach((el) => {
      const sheet = this.#getSheet(scope);
      if (!el.adoptedStyleSheets) return;
      if (!el.adoptedStyleSheets.includes(sheet)) {
        el.adoptedStyleSheets = [...el.adoptedStyleSheets, sheet];
      }
    });
  }

  #snapshotHistory() {
    const snap = {
      tokens: new Map(this.#tokens),
      aliases: new Map(this.#aliases),
      computed: new Map(this.#computed),
    };
    this.#history = this.#history.slice(0, this.#historyIndex + 1);
    this.#history.push(snap);
    if (this.#history.length > 80) this.#history.shift();
    this.#historyIndex = this.#history.length - 1;
  }

  #notify(source) {
    if (this.#batchDepth > 0) {
      this.#pendingNotify = true;
      return;
    }
    this.#resolveCache.clear();
    this.#subscribers.forEach((fn) =>
      fn({ tokens: new Map(this.#tokens), source }),
    );
  }

  batch(fn) {
    this.#batchDepth++;
    try {
      fn();
    } finally {
      this.#batchDepth--;
      if (this.#batchDepth === 0 && this.#pendingNotify) {
        this.#pendingNotify = false;
        this.#notify("batch");
      }
    }
  }

  set(name, value, scope = ":root", { silent = false, snapshot = true } = {}) {
    if (snapshot) this.#snapshotHistory();
    this.#tokens.set(name, value);
    const resolved = this.#resolveValue(value);
    if (scope === ":root") {
      document.documentElement.style.setProperty(`--${name}`, resolved);
    }
    this.#flushSheet(scope).then(() => this.#propagateToElements(scope));
    if (!silent) this.#notify(name);
    return this;
  }

  setMany(entries, scope = ":root") {
    this.#snapshotHistory();
    this.batch(() => {
      entries.forEach(([k, v]) =>
        this.set(k, v, scope, { silent: true, snapshot: false }),
      );
    });
    return this;
  }

  get(name) {
    if (this.#resolveCache.has(name)) return this.#resolveCache.get(name);
    const raw = this.#tokens.get(name) ?? this.#aliases.get(name);
    const resolved =
      raw !== undefined
        ? this.#resolveValue(raw)
        : getComputedStyle(document.documentElement)
            .getPropertyValue(`--${name}`)
            .trim();
    this.#resolveCache.set(name, resolved);
    return resolved;
  }

  remove(name, scope = ":root") {
    this.#snapshotHistory();
    this.#tokens.delete(name);
    this.#aliases.delete(name);
    document.documentElement.style.removeProperty(`--${name}`);
    this.#flushSheet(scope).then(() => this.#propagateToElements(scope));
    this.#notify(name);
    return this;
  }

  alias(name, targetName, scope = ":root") {
    this.#snapshotHistory();
    this.#aliases.set(name, `$${targetName}`);
    this.#tokens.set(name, `$${targetName}`);
    const resolved = this.#resolveValue(`$${targetName}`);
    document.documentElement.style.setProperty(`--${name}`, resolved);
    this.#flushSheet(scope);
    this.#notify(name);
    return this;
  }

  compute(name, expr, scope = ":root") {
    this.#computed.set(name, expr);
    const value = `fn:${expr}`;
    this.#tokens.set(name, value);
    const resolved = this.#evalComputed(expr);
    document.documentElement.style.setProperty(`--${name}`, resolved);
    this.#flushSheet(scope);
    this.#notify(name);
    return this;
  }

  adoptTo(element, scope = ":root") {
    this.#adoptedElements.add(element);
    const sheet = this.#getSheet(scope);
    if (!element.adoptedStyleSheets) return this;
    element.adoptedStyleSheets = [
      ...element.adoptedStyleSheets,
      sheet,
      this.#rawSheet,
    ];
    return this;
  }

  unadoptFrom(element, scope = ":root") {
    this.#adoptedElements.delete(element);
    if (!element.adoptedStyleSheets) return this;
    const sheet = this.#getSheet(scope);
    element.adoptedStyleSheets = element.adoptedStyleSheets.filter(
      (s) => s !== sheet,
    );
    return this;
  }

  async injectRaw(cssText) {
    try {
      await this.#rawSheet.replace(cssText);
    } catch {
      this.#rawSheet.replaceSync(cssText);
    }
    if (!document.adoptedStyleSheets.includes(this.#rawSheet)) {
      document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        this.#rawSheet,
      ];
    }
    this.#notify("raw");
  }

  adoptToDocument(scope = ":root") {
    this.#flushSheet(scope).then(() => {
      const sheet = this.#getSheet(scope);
      if (!document.adoptedStyleSheets.includes(sheet)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
    });
    return this;
  }

  subscribe(fn) {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  undo() {
    if (this.#historyIndex <= 0) return false;
    this.#historyIndex--;
    const snap = this.#history[this.#historyIndex];
    this.#restoreSnapshot(snap);
    return true;
  }

  redo() {
    if (this.#historyIndex >= this.#history.length - 1) return false;
    this.#historyIndex++;
    const snap = this.#history[this.#historyIndex];
    this.#restoreSnapshot(snap);
    return true;
  }

  #restoreSnapshot(snap) {
    this.#tokens = new Map(snap.tokens);
    this.#aliases = new Map(snap.aliases);
    this.#computed = new Map(snap.computed);
    this.#resolveCache.clear();
    this.#tokens.forEach((v, k) => {
      const resolved = this.#resolveValue(v);
      document.documentElement.style.setProperty(`--${k}`, resolved);
    });
    this.#flushSheet(":root");
    this.#notify("history");
  }

  canUndo() {
    return this.#historyIndex > 0;
  }
  canRedo() {
    return this.#historyIndex < this.#history.length - 1;
  }

  makeProxy(scope = ":root") {
    const engine = this;
    return new Proxy(
      {},
      {
        set(_, name, value) {
          engine.set(String(name), String(value), scope);
          return true;
        },
        get(_, name) {
          if (name === Symbol.toPrimitive || typeof name === "symbol")
            return undefined;
          return engine.get(String(name));
        },
        deleteProperty(_, name) {
          engine.remove(String(name), scope);
          return true;
        },
        has(_, name) {
          return engine.#tokens.has(String(name));
        },
        ownKeys() {
          return [...engine.#tokens.keys()];
        },
        getOwnPropertyDescriptor(_, name) {
          if (engine.#tokens.has(String(name)))
            return {
              enumerable: true,
              configurable: true,
              writable: true,
              value: engine.get(String(name)),
            };
          return undefined;
        },
      },
    );
  }

  toCSS(scope = ":root") {
    const entries = [...this.#tokens.entries()];
    const props = entries
      .map(([k, v]) => {
        const resolved = this.#resolveValue(v);
        return `  --${k}: ${resolved};`;
      })
      .join("\n");
    return `${scope} {\n${props}\n}`;
  }

  toJSON() {
    const out = {};
    this.#tokens.forEach((v, k) => {
      const parts = k.split("-");
      let node = out;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) node[p] = this.#resolveValue(v);
        else {
          node[p] = node[p] || {};
          node = node[p];
        }
      });
    });
    return out;
  }

  toJSObject() {
    const entries = [...this.#tokens.entries()].map(([k, v]) => {
      const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `  "${camel}": "${this.#resolveValue(v)}"`;
    });
    return `const theme = {\n${entries.join(",\n")}\n};`;
  }

  toTypeScript() {
    const entries = [...this.#tokens.entries()].map(([k, v]) => {
      const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `  readonly ${camel}: "${this.#resolveValue(v)}"`;
    });
    return `export interface Theme {\n${entries.join(";\n")};\n}\n\nexport const theme: Theme = {\n${entries.map((e) => e.replace("readonly ", "").replace(': "', ': "')).join(",\n")}\n};`;
  }

  toSCSS() {
    const lines = [...this.#tokens.entries()].map(
      ([k, v]) => `$${k}: ${this.#resolveValue(v)};`,
    );
    return lines.join("\n");
  }

  toTailwind() {
    const colors = {};
    const spacing = {};
    const font = {};
    this.#tokens.forEach((v, k) => {
      const resolved = this.#resolveValue(v);
      if (k.startsWith("color-")) colors[k.slice(6)] = resolved;
      else if (k.startsWith("spacing-")) spacing[k.slice(8)] = resolved;
      else if (k.startsWith("font-size-")) font[k.slice(10)] = resolved;
    });
    return `module.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colors, null, 6)},\n      spacing: ${JSON.stringify(spacing, null, 6)},\n      fontSize: ${JSON.stringify(font, null, 6)},\n    },\n  },\n};`;
  }

  getAllTokens() {
    return new Map(this.#tokens);
  }
  getTokenCount() {
    return this.#tokens.size;
  }
  getSheetCount() {
    return this.#sheets.size;
  }
  getAdoptedCount() {
    return this.#adoptedElements.size;
  }
  getAliases() {
    return new Map(this.#aliases);
  }
  getComputed() {
    return new Map(this.#computed);
  }
  isAlias(name) {
    return this.#aliases.has(name);
  }
  isComputed(name) {
    return this.#computed.has(name);
  }
  getRawRuleCount() {
    try {
      return this.#rawSheet.cssRules?.length || 0;
    } catch {
      return 0;
    }
  }
}

const engine = new ThemeEngine();
window.__themeEngine = engine;
const themeProxy = engine.makeProxy();
window.theme = themeProxy;

const PRESET_THEMES = {
  cyber: {
    name: "Cyber",
    accent: "#00FFC8",
    tokens: {
      "color-primary": "#00FFC8",
      "color-primary-dim": "#00A884",
      "color-primary-glow": "rgba(0,255,200,0.2)",
      "color-secondary": "#A78BFA",
      "color-accent": "#F471B5",
      "color-danger": "#FF5757",
      "color-warning": "#FFC947",
      "color-success": "#4ADE80",
      "color-info": "#60A5FA",
      "color-bg": "#0B0D13",
      "color-bg-2": "#0F1117",
      "color-bg-3": "#141720",
      "color-surface": "#1A1D28",
      "color-border": "#1E2230",
      "color-text": "#C8CDD8",
      "color-text-2": "#7A8099",
      "color-text-3": "#3E4460",
      "color-neutral-100": "#F8F9FA",
      "color-neutral-200": "#E9ECEF",
      "color-neutral-300": "#DEE2E6",
      "color-neutral-400": "#CED4DA",
      "color-neutral-500": "#ADB5BD",
      "color-neutral-600": "#6C757D",
      "color-neutral-700": "#495057",
      "color-neutral-800": "#343A40",
      "color-neutral-900": "#212529",
      "spacing-1": "4px",
      "spacing-2": "8px",
      "spacing-3": "12px",
      "spacing-4": "16px",
      "spacing-5": "20px",
      "spacing-6": "24px",
      "spacing-8": "32px",
      "spacing-10": "40px",
      "spacing-12": "48px",
      "spacing-16": "64px",
      "radius-sm": "3px",
      "radius-md": "6px",
      "radius-lg": "10px",
      "radius-xl": "16px",
      "radius-full": "999px",
      "font-family-sans": "'IBM Plex Mono', monospace",
      "font-family-mono": "'IBM Plex Mono', monospace",
      "font-family-serif": "Georgia, serif",
      "font-size-xs": "11px",
      "font-size-sm": "12px",
      "font-size-md": "14px",
      "font-size-lg": "16px",
      "font-size-xl": "20px",
      "font-size-2xl": "26px",
      "font-size-3xl": "34px",
      "font-size-4xl": "44px",
      "font-weight-light": "300",
      "font-weight-regular": "400",
      "font-weight-medium": "500",
      "font-weight-semibold": "600",
      "font-weight-bold": "700",
      "line-height-tight": "1.2",
      "line-height-normal": "1.5",
      "line-height-relaxed": "1.75",
      "letter-spacing-tight": "-0.02em",
      "letter-spacing-normal": "0",
      "letter-spacing-wide": "0.06em",
      "shadow-sm": "0 1px 3px rgba(0,0,0,0.5)",
      "shadow-md": "0 4px 12px rgba(0,0,0,0.6)",
      "shadow-lg": "0 12px 32px rgba(0,0,0,0.7)",
      "shadow-glow": "0 0 20px rgba(0,255,200,0.25)",
      "transition-fast": "100ms ease",
      "transition-normal": "160ms ease",
      "transition-slow": "300ms ease",
      "opacity-disabled": "0.4",
      "opacity-muted": "0.6",
    },
  },
  aurora: {
    name: "Aurora",
    accent: "#7C3AED",
    tokens: {
      "color-primary": "#7C3AED",
      "color-primary-dim": "#5B21B6",
      "color-primary-glow": "rgba(124,58,237,0.2)",
      "color-secondary": "#EC4899",
      "color-accent": "#06B6D4",
      "color-danger": "#EF4444",
      "color-warning": "#F59E0B",
      "color-success": "#10B981",
      "color-info": "#3B82F6",
      "color-bg": "#0F0A1E",
      "color-bg-2": "#150E2C",
      "color-bg-3": "#1C1340",
      "color-surface": "#221855",
      "color-border": "#2D1F6B",
      "color-text": "#DDD6FE",
      "color-text-2": "#A78BFA",
      "color-text-3": "#6D28D9",
      "color-neutral-100": "#F5F3FF",
      "color-neutral-200": "#EDE9FE",
      "color-neutral-300": "#DDD6FE",
      "color-neutral-400": "#C4B5FD",
      "color-neutral-500": "#A78BFA",
      "color-neutral-600": "#7C3AED",
      "color-neutral-700": "#5B21B6",
      "color-neutral-800": "#4C1D95",
      "color-neutral-900": "#2E1065",
      "spacing-1": "4px",
      "spacing-2": "8px",
      "spacing-3": "12px",
      "spacing-4": "16px",
      "spacing-5": "20px",
      "spacing-6": "24px",
      "spacing-8": "32px",
      "spacing-10": "40px",
      "spacing-12": "48px",
      "spacing-16": "64px",
      "radius-sm": "4px",
      "radius-md": "8px",
      "radius-lg": "14px",
      "radius-xl": "20px",
      "radius-full": "999px",
      "font-family-sans": "'DM Sans', sans-serif",
      "font-family-mono": "'IBM Plex Mono', monospace",
      "font-family-serif": "Georgia, serif",
      "font-size-xs": "11px",
      "font-size-sm": "13px",
      "font-size-md": "15px",
      "font-size-lg": "18px",
      "font-size-xl": "22px",
      "font-size-2xl": "28px",
      "font-size-3xl": "36px",
      "font-size-4xl": "48px",
      "font-weight-light": "300",
      "font-weight-regular": "400",
      "font-weight-medium": "500",
      "font-weight-semibold": "600",
      "font-weight-bold": "800",
      "line-height-tight": "1.15",
      "line-height-normal": "1.6",
      "line-height-relaxed": "1.8",
      "letter-spacing-tight": "-0.03em",
      "letter-spacing-normal": "0",
      "letter-spacing-wide": "0.08em",
      "shadow-sm": "0 2px 6px rgba(124,58,237,0.2)",
      "shadow-md": "0 6px 20px rgba(124,58,237,0.3)",
      "shadow-lg": "0 16px 48px rgba(124,58,237,0.4)",
      "shadow-glow": "0 0 30px rgba(124,58,237,0.4)",
      "transition-fast": "80ms ease",
      "transition-normal": "200ms cubic-bezier(0.4,0,0.2,1)",
      "transition-slow": "400ms cubic-bezier(0.4,0,0.2,1)",
      "opacity-disabled": "0.35",
      "opacity-muted": "0.55",
    },
  },
  solar: {
    name: "Solar",
    accent: "#F59E0B",
    tokens: {
      "color-primary": "#F59E0B",
      "color-primary-dim": "#D97706",
      "color-primary-glow": "rgba(245,158,11,0.2)",
      "color-secondary": "#EF4444",
      "color-accent": "#10B981",
      "color-danger": "#DC2626",
      "color-warning": "#F97316",
      "color-success": "#16A34A",
      "color-info": "#0284C7",
      "color-bg": "#1C0A00",
      "color-bg-2": "#261000",
      "color-bg-3": "#321500",
      "color-surface": "#3D1C02",
      "color-border": "#4A2508",
      "color-text": "#FDE68A",
      "color-text-2": "#FCA34D",
      "color-text-3": "#92400E",
      "color-neutral-100": "#FFFBEB",
      "color-neutral-200": "#FEF3C7",
      "color-neutral-300": "#FDE68A",
      "color-neutral-400": "#FCD34D",
      "color-neutral-500": "#FBBF24",
      "color-neutral-600": "#F59E0B",
      "color-neutral-700": "#D97706",
      "color-neutral-800": "#B45309",
      "color-neutral-900": "#78350F",
      "spacing-1": "4px",
      "spacing-2": "8px",
      "spacing-3": "14px",
      "spacing-4": "18px",
      "spacing-5": "22px",
      "spacing-6": "28px",
      "spacing-8": "36px",
      "spacing-10": "44px",
      "spacing-12": "52px",
      "spacing-16": "68px",
      "radius-sm": "2px",
      "radius-md": "5px",
      "radius-lg": "9px",
      "radius-xl": "14px",
      "radius-full": "999px",
      "font-family-sans": "'DM Sans', sans-serif",
      "font-family-mono": "'IBM Plex Mono', monospace",
      "font-family-serif": "'DM Sans', sans-serif",
      "font-size-xs": "10px",
      "font-size-sm": "12px",
      "font-size-md": "14px",
      "font-size-lg": "17px",
      "font-size-xl": "21px",
      "font-size-2xl": "27px",
      "font-size-3xl": "35px",
      "font-size-4xl": "46px",
      "font-weight-light": "300",
      "font-weight-regular": "400",
      "font-weight-medium": "500",
      "font-weight-semibold": "700",
      "font-weight-bold": "800",
      "line-height-tight": "1.1",
      "line-height-normal": "1.55",
      "line-height-relaxed": "1.7",
      "letter-spacing-tight": "-0.025em",
      "letter-spacing-normal": "0",
      "letter-spacing-wide": "0.05em",
      "shadow-sm": "0 1px 4px rgba(0,0,0,0.6)",
      "shadow-md": "0 4px 16px rgba(0,0,0,0.7)",
      "shadow-lg": "0 12px 40px rgba(0,0,0,0.8)",
      "shadow-glow": "0 0 24px rgba(245,158,11,0.35)",
      "transition-fast": "90ms ease",
      "transition-normal": "180ms ease",
      "transition-slow": "350ms ease",
      "opacity-disabled": "0.3",
      "opacity-muted": "0.5",
    },
  },
  minimal: {
    name: "Minimal",
    accent: "#18181B",
    tokens: {
      "color-primary": "#18181B",
      "color-primary-dim": "#27272A",
      "color-primary-glow": "rgba(24,24,27,0.1)",
      "color-secondary": "#52525B",
      "color-accent": "#2563EB",
      "color-danger": "#DC2626",
      "color-warning": "#CA8A04",
      "color-success": "#16A34A",
      "color-info": "#0284C7",
      "color-bg": "#FFFFFF",
      "color-bg-2": "#FAFAFA",
      "color-bg-3": "#F4F4F5",
      "color-surface": "#E4E4E7",
      "color-border": "#D4D4D8",
      "color-text": "#09090B",
      "color-text-2": "#3F3F46",
      "color-text-3": "#71717A",
      "color-neutral-100": "#F4F4F5",
      "color-neutral-200": "#E4E4E7",
      "color-neutral-300": "#D4D4D8",
      "color-neutral-400": "#A1A1AA",
      "color-neutral-500": "#71717A",
      "color-neutral-600": "#52525B",
      "color-neutral-700": "#3F3F46",
      "color-neutral-800": "#27272A",
      "color-neutral-900": "#18181B",
      "spacing-1": "4px",
      "spacing-2": "8px",
      "spacing-3": "12px",
      "spacing-4": "16px",
      "spacing-5": "20px",
      "spacing-6": "24px",
      "spacing-8": "32px",
      "spacing-10": "40px",
      "spacing-12": "48px",
      "spacing-16": "64px",
      "radius-sm": "2px",
      "radius-md": "4px",
      "radius-lg": "8px",
      "radius-xl": "12px",
      "radius-full": "999px",
      "font-family-sans": "'DM Sans', sans-serif",
      "font-family-mono": "'IBM Plex Mono', monospace",
      "font-family-serif": "Georgia, serif",
      "font-size-xs": "11px",
      "font-size-sm": "13px",
      "font-size-md": "15px",
      "font-size-lg": "17px",
      "font-size-xl": "21px",
      "font-size-2xl": "27px",
      "font-size-3xl": "35px",
      "font-size-4xl": "44px",
      "font-weight-light": "300",
      "font-weight-regular": "400",
      "font-weight-medium": "500",
      "font-weight-semibold": "600",
      "font-weight-bold": "700",
      "line-height-tight": "1.2",
      "line-height-normal": "1.5",
      "line-height-relaxed": "1.7",
      "letter-spacing-tight": "-0.02em",
      "letter-spacing-normal": "0",
      "letter-spacing-wide": "0.05em",
      "shadow-sm": "0 1px 2px rgba(0,0,0,0.05)",
      "shadow-md": "0 4px 12px rgba(0,0,0,0.08)",
      "shadow-lg": "0 12px 32px rgba(0,0,0,0.1)",
      "shadow-glow": "0 0 0 3px rgba(24,24,27,0.15)",
      "transition-fast": "100ms ease",
      "transition-normal": "150ms ease",
      "transition-slow": "250ms ease",
      "opacity-disabled": "0.4",
      "opacity-muted": "0.6",
    },
  },
};

const STATE = {
  activeTheme: "cyber",
  activeTab: "colors",
  activeOutputTab: "vars",
  activeExportFmt: "css",
  searchQuery: "",
  isDiffMode: false,
  prevTokenSnapshot: null,
  outputCollapsed: false,
};

function isColor(v) {
  if (!v || typeof v !== "string") return false;
  if (v.startsWith("$") || v.startsWith("fn:")) return false;
  const s = v.trim();
  return (
    /^#[0-9a-fA-F]{3,8}$/.test(s) ||
    /^rgba?\(/.test(s) ||
    /^hsla?\(/.test(s) ||
    /^[a-z]+$/.test(s)
  );
}

function hexToHSL(hex) {
  const r = hex.replace("#", "");
  const len = r.length === 3 ? 1 : 2;
  let [ri, gi, bi] = [0, 2, 4].map(
    (i) =>
      parseInt(
        r.substr(Math.floor((i * len) / 2), len.length === 1 ? len : len),
        16,
      ) / 255,
  );
  if (r.length === 3) {
    ri = parseInt(r[0] + r[0], 16) / 255;
    gi = parseInt(r[1] + r[1], 16) / 255;
    bi = parseInt(r[2] + r[2], 16) / 255;
  }
  const max = Math.max(ri, gi, bi),
    min = Math.min(ri, gi, bi);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case ri:
        h = ((gi - bi) / d + (gi < bi ? 6 : 0)) / 6;
        break;
      case gi:
        h = ((bi - ri) / d + 2) / 6;
        break;
      default:
        h = ((ri - gi) / d + 4) / 6;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function parseColor(v) {
  if (!v) return null;
  const s = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return { hex: s, alpha: 1 };
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const e = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return { hex: e, alpha: 1 };
  }
  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    const alpha = parseInt(s.slice(7, 9), 16) / 255;
    return { hex: s.slice(0, 7), alpha: Math.round(alpha * 100) / 100 };
  }
  const rgba = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) {
    const toH = (n) => parseInt(n).toString(16).padStart(2, "0");
    return {
      hex: `#${toH(rgba[1])}${toH(rgba[2])}${toH(rgba[3])}`,
      alpha: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
    };
  }
  return null;
}

function colorToHex(color, alpha) {
  if (alpha === 1) return color.hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return color.hex + a;
}

let activePickerCleanup = null;

function showColorPicker(anchorEl, initialValue, onCommit) {
  if (activePickerCleanup) activePickerCleanup();
  const portal = document.getElementById("pickerPortal");
  portal.innerHTML = "";

  const parsed = parseColor(initialValue);
  let hsl = parsed ? hexToHSL(parsed.hex) : [200, 80, 50];
  let alpha = parsed ? parsed.alpha : 1;
  let hex = parsed ? parsed.hex : "#00FFC8";

  const popup = el("div", { class: "color-picker-popup" });

  const satvalCanvas = document.createElement("canvas");
  satvalCanvas.className = "cp-satval";
  satvalCanvas.width = 200;
  satvalCanvas.height = 130;
  const svCtx = satvalCanvas.getContext("2d");
  const thumb = el("div", { class: "cp-thumb" });
  const cvWrap = el("div", { class: "cp-canvas-wrap" });
  cvWrap.style.position = "relative";
  cvWrap.append(satvalCanvas, thumb);

  const hueTrack = el("div", { class: "cp-hue" });
  const hueThumb = el("div", { class: "cp-hue-thumb" });
  hueTrack.append(hueThumb);

  const alphaTrack = el("div", { class: "cp-alpha" });
  const alphaGrad = el("div", { class: "cp-alpha-gradient" });
  const alphaThumb = el("div", { class: "cp-alpha-thumb" });
  alphaTrack.append(alphaGrad, alphaThumb);

  const hexInput = el("input", { class: "cp-input", type: "text" });
  const rInput = el("input", {
    class: "cp-input",
    type: "number",
    min: "0",
    max: "255",
  });
  const gInput = el("input", {
    class: "cp-input",
    type: "number",
    min: "0",
    max: "255",
  });
  const bInput = el("input", {
    class: "cp-input",
    type: "number",
    min: "0",
    max: "255",
  });
  const aInput = el("input", {
    class: "cp-input",
    type: "number",
    min: "0",
    max: "100",
    step: "1",
  });
  const prevSwatch = el("div", { class: "cp-preview" });

  const cpSwatches = [
    "#FF5757",
    "#FFC947",
    "#4ADE80",
    "#60A5FA",
    "#A78BFA",
    "#F471B5",
    "#00FFC8",
    "#FFFFFF",
    "#000000",
    "#374151",
    "#6B7280",
    "#D1D5DB",
  ];

  function drawSatVal() {
    const [h] = hsl;
    const wh = svCtx.createLinearGradient(0, 0, satvalCanvas.width, 0);
    wh.addColorStop(0, "white");
    wh.addColorStop(1, `hsl(${h},100%,50%)`);
    svCtx.fillStyle = wh;
    svCtx.fillRect(0, 0, satvalCanvas.width, satvalCanvas.height);
    const blk = svCtx.createLinearGradient(0, 0, 0, satvalCanvas.height);
    blk.addColorStop(0, "transparent");
    blk.addColorStop(1, "black");
    svCtx.fillStyle = blk;
    svCtx.fillRect(0, 0, satvalCanvas.width, satvalCanvas.height);
    const x = (hsl[1] / 100) * satvalCanvas.width;
    const y = (1 - hsl[2] / 100) * satvalCanvas.height;
    thumb.style.left = x + "px";
    thumb.style.top = y + "px";
    thumb.style.background = hex;
  }

  function updateAll() {
    hex = hslToHex(...hsl);
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    hexInput.value = hex;
    rInput.value = r;
    gInput.value = g;
    bInput.value = b;
    aInput.value = Math.round(alpha * 100);
    prevSwatch.style.background =
      alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : hex;
    hueThumb.style.left = (hsl[0] / 360) * 100 + "%";
    hueThumb.style.background = `hsl(${hsl[0]},100%,50%)`;
    alphaGrad.style.background = `linear-gradient(to right, transparent, ${hex})`;
    alphaThumb.style.left = alpha * 100 + "%";
    alphaThumb.style.background = hex;
    drawSatVal();
    const finalColor = alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : hex;
    onCommit(finalColor);
  }

  function sliderDrag(track, onMove) {
    const handler = (e) => {
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onMove(x);
      updateAll();
    };
    track.addEventListener("mousedown", (e) => {
      handler(e);
      const up = () => document.removeEventListener("mousemove", handler);
      document.addEventListener("mousemove", handler);
      document.addEventListener("mouseup", up, { once: true });
    });
  }

  sliderDrag(hueTrack, (x) => {
    hsl[0] = Math.round(x * 360);
  });
  sliderDrag(alphaTrack, (x) => {
    alpha = Math.round(x * 100) / 100;
  });

  satvalCanvas.addEventListener("mousedown", (e) => {
    const move = (me) => {
      const rect = satvalCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (me.clientY - rect.top) / rect.height));
      hsl[1] = Math.round(x * 100);
      hsl[2] = Math.round((1 - y) * 100);
      updateAll();
    };
    move(e);
    document.addEventListener("mousemove", move);
    document.addEventListener(
      "mouseup",
      () => document.removeEventListener("mousemove", move),
      { once: true },
    );
  });

  hexInput.addEventListener("change", () => {
    const v = hexInput.value.trim();
    const p = parseColor(v.startsWith("#") ? v : "#" + v);
    if (p) {
      hex = p.hex;
      hsl = hexToHSL(hex);
      alpha = p.alpha;
      updateAll();
    }
  });
  [rInput, gInput, bInput].forEach((inp, i) => {
    inp.addEventListener("input", () => {
      const r = parseInt(rInput.value) || 0,
        g = parseInt(gInput.value) || 0,
        b = parseInt(bInput.value) || 0;
      const toH = (n) =>
        Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
      hex = `#${toH(r)}${toH(g)}${toH(b)}`;
      hsl = hexToHSL(hex);
      updateAll();
    });
  });
  aInput.addEventListener("input", () => {
    alpha = (parseInt(aInput.value) || 100) / 100;
    updateAll();
  });

  const swatchRow = el("div", { class: "cp-swatches" });
  cpSwatches.forEach((sw) => {
    const s = el("div", { class: "cp-swatch", style: { background: sw } });
    s.addEventListener("click", () => {
      hex = sw;
      hsl = hexToHSL(hex);
      alpha = 1;
      updateAll();
    });
    swatchRow.append(s);
  });

  const inputsGrid = el("div", { class: "cp-inputs" });
  [
    [rInput, "R"],
    [gInput, "G"],
    [bInput, "B"],
    [aInput, "A%"],
  ].forEach(([inp, lbl]) => {
    const wrap = el("div", { class: "cp-input-wrap" });
    const lblEl = el("span", { class: "cp-input-label" }, lbl);
    wrap.append(inp, lblEl);
    inputsGrid.append(wrap);
  });

  const hexRow = el("div", { class: "cp-hex-row" });
  hexRow.append(hexInput, prevSwatch);

  popup.append(cvWrap, hueTrack, alphaTrack, hexRow, inputsGrid, swatchRow);

  const rect = anchorEl.getBoundingClientRect();
  popup.style.position = "fixed";
  const left = Math.min(rect.left, window.innerWidth - 248);
  const top =
    rect.bottom + 6 + 230 > window.innerHeight
      ? rect.top - 246
      : rect.bottom + 6;
  popup.style.left = left + "px";
  popup.style.top = top + "px";

  portal.append(popup);
  updateAll();

  const closeOnOutside = (e) => {
    if (!popup.contains(e.target) && e.target !== anchorEl) {
      activePickerCleanup && activePickerCleanup();
    }
  };
  setTimeout(() => document.addEventListener("mousedown", closeOnOutside), 0);

  activePickerCleanup = () => {
    document.removeEventListener("mousedown", closeOnOutside);
    popup.remove();
    activePickerCleanup = null;
  };
}

function buildTokenRow(name, value) {
  const row = el("div", { class: "token-row", "data-name": name });
  const isAlias = engine.isAlias(name);
  const isComputed = engine.isComputed(name);
  const isCol = isColor(value) || (isAlias && isColor(engine.get(name)));

  if (isAlias) row.classList.add("aliased");
  if (isComputed) row.classList.add("computed");

  const resolved = engine.get(name);

  if (isCol) {
    const swatch = el("div", {
      class: "token-swatch",
      style: { background: resolved },
    });
    swatch.addEventListener("click", (e) => {
      e.stopPropagation();
      showColorPicker(swatch, resolved, (newVal) => {
        engine.set(name, newVal);
        swatch.style.background = newVal;
        valEl.textContent = newVal;
      });
    });
    row.append(swatch);
  } else {
    const isSpacing = name.startsWith("spacing-");
    if (isSpacing) {
      const bar = el("div", { class: "spacing-preview" });
      const px = parseFloat(resolved) || 0;
      bar.style.width = Math.min(px, 60) + "px";
      row.append(bar);
    } else {
      const icon = el(
        "div",
        {
          style: {
            width: "24px",
            height: "24px",
            flexShrink: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "var(--text3)",
          },
        },
        isComputed ? "ƒ" : isAlias ? "→" : "·",
      );
      row.append(icon);
    }
  }

  const info = el("div", { class: "token-info" });
  const nameEl = el("span", { class: "token-name" }, `--${name}`);
  const valEl = el(
    "span",
    { class: isComputed ? "computed-expr" : "token-val" },
    isComputed ? value.slice(3) : isAlias ? `→ ${value}` : resolved,
  );

  nameEl.addEventListener("dblclick", () => {
    const inp = el("input", { class: "token-name-edit", value: name });
    nameEl.replaceWith(inp);
    inp.focus();
    inp.select();
    const commit = () => {
      const newName = inp.value
        .trim()
        .replace(/^--/, "")
        .replace(/[^a-z0-9-]/g, "");
      if (newName && newName !== name) {
        const v = engine.getAllTokens().get(name);
        engine.remove(name);
        engine.set(newName, v);
      }
      inp.replaceWith(nameEl);
    };
    inp.addEventListener("blur", commit);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") inp.replaceWith(nameEl);
    });
  });

  valEl.addEventListener("dblclick", () => {
    const inp = el("input", {
      class: "token-val-edit",
      value: isComputed ? value.slice(3) : value,
    });
    valEl.replaceWith(inp);
    inp.focus();
    inp.select();
    const commit = () => {
      const raw = inp.value.trim();
      if (isComputed && raw) engine.compute(name, raw);
      else if (raw) engine.set(name, raw);
      inp.replaceWith(valEl);
    };
    inp.addEventListener("blur", commit);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") inp.replaceWith(valEl);
    });
  });

  info.append(nameEl, valEl);

  const actions = el("div", { class: "token-actions" });
  const copyBtn = el(
    "button",
    { class: "token-action-btn", title: "Copy value" },
    "⎘",
  );
  const dupBtn = el(
    "button",
    { class: "token-action-btn", title: "Duplicate token" },
    "⿸",
  );
  const delBtn = el(
    "button",
    { class: "token-action-btn danger", title: "Delete token" },
    "✕",
  );

  copyBtn.onclick = () => {
    navigator.clipboard
      .writeText(`var(--${name})`)
      .then(() => toast(`Copied var(--${name})`, "info"));
  };
  dupBtn.onclick = () => {
    engine.set(name + "-copy", value);
    toast(`Duplicated ${name}`, "success");
  };
  delBtn.onclick = () => {
    engine.remove(name);
    toast(`Removed --${name}`, "success");
  };

  actions.append(copyBtn, dupBtn, delBtn);
  row.append(info, actions);
  return row;
}

function renderTokenList(listId, filterFn, searchQ) {
  const container = document.getElementById(listId);
  if (!container) return;
  const tokens = engine.getAllTokens();
  const visible = [...tokens.entries()].filter(
    ([k]) => filterFn(k) && (!searchQ || k.includes(searchQ)),
  );

  if (visible.length === 0) {
    container.innerHTML = `<div style="padding:8px 12px;font-family:var(--mono);font-size:10px;color:var(--text3);font-style:italic">No tokens found</div>`;
    return;
  }
  container.innerHTML = "";
  visible.forEach(([k, v]) => container.append(buildTokenRow(k, v)));
}

function refreshAllLists() {
  const q = STATE.searchQuery;
  renderTokenList(
    "listBrand",
    (k) =>
      k.startsWith("color-") &&
      ["primary", "secondary", "accent"].some((x) => k.includes(x)),
    q,
  );
  renderTokenList(
    "listSemantic",
    (k) => ["danger", "warning", "success", "info"].some((x) => k.includes(x)),
    q,
  );
  renderTokenList("listNeutral", (k) => k.startsWith("color-neutral-"), q);
  renderTokenList(
    "listAliases",
    (k) =>
      engine.isAlias(k) &&
      !k.startsWith("color-neutral") &&
      ![
        "primary",
        "secondary",
        "accent",
        "danger",
        "warning",
        "success",
        "info",
        "bg",
        "text",
        "surface",
        "border",
      ].some((x) => k.includes(x)),
    q,
  );
  renderTokenList("listSpacing", (k) => k.startsWith("spacing-"), q);
  renderTokenList("listRadius", (k) => k.startsWith("radius-"), q);
  renderTokenList("listFontFamily", (k) => k.startsWith("font-family-"), q);
  renderTokenList("listFontSize", (k) => k.startsWith("font-size-"), q);
  renderTokenList("listFontWeight", (k) => k.startsWith("font-weight-"), q);
  renderTokenList("listLineHeight", (k) => k.startsWith("line-height-"), q);
  renderTokenList(
    "listLetterSpacing",
    (k) => k.startsWith("letter-spacing-"),
    q,
  );
  renderTokenList("listShadow", (k) => k.startsWith("shadow-"), q);
  renderTokenList("listTransition", (k) => k.startsWith("transition-"), q);
  renderTokenList("listOpacity", (k) => k.startsWith("opacity-"), q);
  renderTokenList("listComputed", (k) => engine.isComputed(k), q);
  updateTokenCount();
  updateDiagnostics();
  refreshCSSOutput();
}

function buildPreviewComponents() {
  const doc = document.getElementById("previewDoc");
  doc.innerHTML = "";
  doc.style.background = "var(--color-bg)";
  doc.style.color = "var(--color-text)";
  doc.style.fontFamily = "var(--font-family-sans)";
  doc.style.transition =
    "background var(--transition-normal), color var(--transition-normal)";

  const section = (title, ...children) => {
    const wrap = el("div", {});
    const lbl = el(
      "div",
      {
        style:
          "font-family:var(--font-family-mono);font-size:10px;letter-spacing:0.1em;color:var(--color-text-3);margin-bottom:10px;text-transform:uppercase;font-weight:600",
      },
      title,
    );
    wrap.append(lbl, ...children);
    return wrap;
  };

  const typeSect = section(
    "Typography",
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-4xl);font-weight:var(--font-weight-bold);color:var(--color-text);line-height:var(--line-height-tight);margin-bottom:8px",
      },
      "Display Heading",
    ),
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-2xl);font-weight:var(--font-weight-semibold);color:var(--color-text);margin-bottom:6px",
      },
      "Section Title",
    ),
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-md);font-weight:var(--font-weight-regular);color:var(--color-text-2);line-height:var(--line-height-relaxed);margin-bottom:4px",
      },
      "Body text — the quick brown fox jumps over the lazy dog. This paragraph demonstrates how the font family, size, weight, line height and color tokens all combine to produce readable body copy.",
    ),
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-sm);font-weight:var(--font-weight-light);color:var(--color-text-3);letter-spacing:var(--letter-spacing-wide);text-transform:uppercase",
      },
      "Caption / Meta Label",
    ),
  );

  const btnRow = el("div", {
    style: "display:flex;flex-wrap:wrap;gap:8px;align-items:center",
  });
  const mkBtn = (label, style) =>
    el(
      "button",
      {
        style: `font-family:var(--font-family-sans);font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);padding:var(--spacing-2) var(--spacing-4);border-radius:var(--radius-md);cursor:pointer;transition:var(--transition-normal);border:none;letter-spacing:var(--letter-spacing-normal);${style}`,
      },
      label,
    );
  btnRow.append(
    mkBtn(
      "Primary Action",
      "background:var(--color-primary);color:var(--color-bg);box-shadow:var(--shadow-glow)",
    ),
    mkBtn(
      "Secondary",
      "background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border)",
    ),
    mkBtn("Danger", "background:var(--color-danger);color:#fff"),
    mkBtn(
      "Ghost",
      "background:transparent;color:var(--color-text-2);border:1px solid var(--color-border)",
    ),
    mkBtn("Success ✓", "background:var(--color-success);color:#fff"),
  );
  const btnSect = section("Buttons", btnRow);

  const card = el("div", {
    style:
      "background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--spacing-4);box-shadow:var(--shadow-md);transition:var(--transition-normal)",
  });
  const cardHd = el("div", {
    style:
      "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px",
  });
  cardHd.append(
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);color:var(--color-text)",
      },
      "Token Usage Card",
    ),
    el(
      "span",
      {
        style:
          "background:var(--color-primary);color:var(--color-bg);font-size:var(--font-size-xs);padding:2px 8px;border-radius:var(--radius-full);font-weight:var(--font-weight-bold)",
      },
      "ACTIVE",
    ),
  );
  card.append(cardHd);
  card.append(
    el(
      "div",
      {
        style:
          "font-size:var(--font-size-sm);color:var(--color-text-2);line-height:var(--line-height-relaxed);margin-bottom:12px",
      },
      "This card uses CSS Custom Properties for every visual attribute — background, border, radius, shadow, typography, and color. Change any token to see this update instantly.",
    ),
  );
  const statRow = el("div", {
    style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px",
  });
  [
    ["Latency", "12ms", "success"],
    ["Uptime", "99.9%", "primary"],
    ["Requests", "1.2M", "secondary"],
  ].forEach(([k, v, c]) => {
    const statEl = el("div", {
      style: `background:var(--color-bg-3);border-radius:var(--radius-sm);padding:var(--spacing-2) var(--spacing-3);text-align:center`,
    });
    statEl.append(
      el(
        "div",
        {
          style: `font-size:var(--font-size-xl);font-weight:var(--font-weight-bold);color:var(--color-${c})`,
        },
        v,
      ),
      el(
        "div",
        {
          style:
            "font-size:var(--font-size-xs);color:var(--color-text-3);margin-top:2px",
        },
        k,
      ),
    );
    statRow.append(statEl);
  });
  card.append(statRow);
  const cardSect = section("Card Component", card);

  const inputsGroup = el("div", {
    style: "display:flex;flex-direction:column;gap:10px",
  });
  const mkInput = (placeholder, type) => {
    const wrap = el("div", {
      style: "display:flex;flex-direction:column;gap:5px",
    });
    const lbl = el(
      "label",
      {
        style:
          "font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--color-text-2);letter-spacing:var(--letter-spacing-wide);text-transform:uppercase",
      },
      placeholder,
    );
    const inp = el("input", {
      type: type || "text",
      placeholder: `Enter ${placeholder.toLowerCase()}…`,
      style:
        "background:var(--color-bg-2);border:1.5px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);padding:var(--spacing-2) var(--spacing-3);font-family:var(--font-family-sans);font-size:var(--font-size-sm);outline:none;width:100%;transition:var(--transition-normal)",
    });
    inp.addEventListener("focus", () => {
      inp.style.borderColor = "var(--color-primary)";
      inp.style.boxShadow = "0 0 0 3px var(--color-primary-glow)";
    });
    inp.addEventListener("blur", () => {
      inp.style.borderColor = "";
      inp.style.boxShadow = "";
    });
    wrap.append(lbl, inp);
    return wrap;
  };
  inputsGroup.append(
    mkInput("Email", "email"),
    mkInput("Password", "password"),
  );
  const inputSect = section("Form Inputs", inputsGroup);

  const badgeRow = el("div", { style: "display:flex;flex-wrap:wrap;gap:6px" });
  [
    ["Primary", "primary"],
    ["Secondary", "secondary"],
    ["Success", "success"],
    ["Warning", "warning"],
    ["Danger", "danger"],
    ["Info", "info"],
  ].forEach(([label, color]) => {
    badgeRow.append(
      el(
        "span",
        {
          style: `background:color-mix(in srgb, var(--color-${color}) 15%, transparent);color:var(--color-${color});border:1px solid color-mix(in srgb, var(--color-${color}) 30%, transparent);border-radius:var(--radius-full);padding:3px 10px;font-size:var(--font-size-xs);font-weight:var(--font-weight-bold);letter-spacing:var(--letter-spacing-wide);text-transform:uppercase`,
        },
        label,
      ),
    );
  });
  const badgeSect = section("Semantic Badges", badgeRow);

  const neutralRow = el("div", {
    style: "display:flex;gap:4px;flex-wrap:wrap",
  });
  [100, 200, 300, 400, 500, 600, 700, 800, 900].forEach((n) => {
    const sw = el("div", {
      title: `neutral-${n}`,
      style: `width:32px;height:32px;border-radius:var(--radius-sm);background:var(--color-neutral-${n});cursor:default;position:relative`,
    });
    neutralRow.append(sw);
  });
  const neutralSect = section("Neutral Scale", neutralRow);

  const shadowRow = el("div", {
    style: "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end",
  });
  ["sm", "md", "lg", "glow"].forEach((s) => {
    const b = el(
      "div",
      {
        style: `width:60px;height:60px;border-radius:var(--radius-md);background:var(--color-bg-2);box-shadow:var(--shadow-${s});border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;font-family:var(--font-family-mono);font-size:9px;color:var(--color-text-3)`,
      },
      s,
    );
    shadowRow.append(b);
  });
  const shadowSect = section("Shadows", shadowRow);

  const separator = el("hr", {
    style: "border:none;border-top:1px solid var(--color-border);margin:4px 0",
  });

  doc.append(
    typeSect,
    separator.cloneNode(),
    btnSect,
    separator.cloneNode(),
    cardSect,
    separator.cloneNode(),
    inputSect,
    separator.cloneNode(),
    badgeSect,
    separator.cloneNode(),
    neutralSect,
    separator.cloneNode(),
    shadowSect,
  );
}

function refreshCSSOutput() {
  const pre = document.getElementById("cobPre");
  if (!pre) return;
  if (STATE.outputCollapsed) return;
  if (STATE.activeOutputTab === "vars") {
    const tokens = engine.getAllTokens();
    let html = `<span class="tok-sel">:root</span> {\n`;
    tokens.forEach((v, k) => {
      const resolved = engine.get(k);
      html += `  <span class="tok-prop">--${k}</span>: <span class="tok-val">${resolved}</span>;\n`;
    });
    html += `}`;
    pre.innerHTML = html;
  } else if (STATE.activeOutputTab === "rules") {
    let html = "";
    const sheets = document.adoptedStyleSheets;
    sheets.forEach((sheet, i) => {
      try {
        const rules = [...sheet.cssRules];
        rules.forEach((r) => {
          html += `<span class="tok-sel">${r.selectorText || "@rule"}</span> {\n  ${r.cssText
            .replace(/[^{]+\{/, "")
            .replace("}", "")
            .trim()
            .split(";")
            .filter(Boolean)
            .map((p) => p.trim())
            .join(";\n  ")}\n}\n\n`;
        });
      } catch {}
    });
    pre.textContent =
      html || "(No rules injected via Constructable Stylesheets)";
  } else if (STATE.activeOutputTab === "diff") {
    if (!STATE.prevTokenSnapshot) {
      pre.textContent = "// Enable diff mode to see changes";
      return;
    }
    let html = "";
    const current = engine.getAllTokens();
    const prev = STATE.prevTokenSnapshot;
    current.forEach((v, k) => {
      const prevV = prev.get(k);
      const resolved = engine.get(k);
      if (!prevV) {
        html += `<span class="tok-added">+ --${k}: ${resolved};</span>\n`;
      } else if (prevV !== v) {
        html += `<span class="tok-removed">- --${k}: ${engine.get(k)};</span>\n<span class="tok-added">+ --${k}: ${resolved};</span>\n`;
      }
    });
    prev.forEach((v, k) => {
      if (!current.has(k))
        html += `<span class="tok-removed">- --${k}: ${engine.get(k)};</span>\n`;
    });
    pre.innerHTML =
      html ||
      `<span style="color:var(--text3)">// No changes since diff was enabled</span>`;
  }
}

function updateTokenCount() {
  const pill = document.getElementById("tokenCountPill");
  if (pill) pill.textContent = `${engine.getTokenCount()} tokens`;
}

function updateDiagnostics() {
  const panel = document.getElementById("diagnosticsPanel");
  if (!panel) return;
  panel.innerHTML = "";
  const rows = [
    [
      "CSSStyleSheet support",
      engine.supported ? "✓ yes" : "✗ no",
      engine.supported ? "ok" : "warn",
    ],
    ["Sheets created", engine.getSheetCount(), ""],
    ["Token count", engine.getTokenCount(), ""],
    ["Adopted elements", engine.getAdoptedCount(), ""],
    ["Raw CSS rules", engine.getRawRuleCount(), ""],
    ["History depth", "unlimited", ""],
    ["Proxy reactive", "active", "ok"],
    [
      "document.adoptedStyleSheets",
      document.adoptedStyleSheets.length + " sheets",
      "",
    ],
  ];
  rows.forEach(([k, v, cls]) => {
    const row = el("div", { class: "diag-row" });
    row.append(
      el("span", { class: "diag-key" }, k),
      el("span", { class: `diag-val ${cls}` }, String(v)),
    );
    panel.append(row);
  });
}

function updateScopeControls() {
  const sc = document.getElementById("scopeControls");
  if (!sc) return;
  sc.innerHTML = "";
  const scopes = [
    { sel: ":root", color: "#00FFC8", desc: "Document root" },
    { sel: "#previewFrame", color: "#A78BFA", desc: "Preview frame" },
    { sel: "#previewDoc", color: "#F471B5", desc: "Preview document" },
  ];
  scopes.forEach(({ sel, color, desc }) => {
    const row = el("div", { class: "scope-row" });
    const dot = el("div", {
      class: "scope-indicator",
      style: { background: color },
    });
    const selEl = el("span", { class: "scope-selector" }, sel);
    const cnt = el("span", { class: "scope-rule-count" }, desc);
    const btn = el("button", { class: "scope-adopt-btn" }, "Adopt");
    btn.addEventListener("click", () => {
      const target = sel.startsWith("#")
        ? document.getElementById(sel.slice(1))
        : document.querySelector(sel);
      if (target && target.adoptedStyleSheets !== undefined) {
        engine.adoptTo(target);
        btn.classList.add("adopted");
        btn.textContent = "Adopted ✓";
        toast(`Sheet adopted to ${sel}`, "success");
        updateDiagnostics();
      } else {
        toast(`Cannot adopt to ${sel} (no shadow root)`, "error");
      }
    });
    row.append(dot, selEl, cnt, btn);
    sc.append(row);
  });
}

function renderPresetSwitcher() {
  const container = document.getElementById("tsPresets");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(PRESET_THEMES).forEach(([key, theme]) => {
    const btn = el("div", {
      class: "ts-preset" + (STATE.activeTheme === key ? " active" : ""),
      "data-theme": key,
    });
    const swatch = el("div", {
      class: "ts-swatch",
      style: { background: theme.accent },
    });
    btn.append(swatch, theme.name);
    btn.addEventListener("click", () => loadTheme(key));
    container.append(btn);
  });
}

function loadTheme(key) {
  const theme = PRESET_THEMES[key];
  if (!theme) return;
  STATE.prevTokenSnapshot = engine.getAllTokens();
  STATE.activeTheme = key;
  engine.setMany(Object.entries(theme.tokens));
  engine.adoptToDocument();
  buildPreviewComponents();
  refreshAllLists();
  renderPresetSwitcher();
  toast(`Loaded "${theme.name}" theme`, "success");
}

function generateExport(fmt) {
  switch (fmt) {
    case "css":
      return engine.toCSS();
    case "json":
      return JSON.stringify(engine.toJSON(), null, 2);
    case "js":
      return engine.toJSObject();
    case "ts":
      return engine.toTypeScript();
    case "scss":
      return engine.toSCSS();
    case "tailwind":
      return engine.toTailwind();
    default:
      return "";
  }
}

function toast(msg, type = "info", duration = 2800) {
  const stack = document.getElementById("toastStack");
  const icons = { info: "◆", success: "✓", error: "✕", warn: "⚠" };
  const colors = {
    info: "var(--cyan)",
    success: "var(--green)",
    error: "var(--red)",
    warn: "var(--amber)",
  };
  const t = el("div", { class: `toast ${type}` });
  const icon = el(
    "span",
    { style: `color:${colors[type]};flex-shrink:0;font-size:11px` },
    icons[type] || "◆",
  );
  t.append(icon, msg);
  stack.prepend(t);
  setTimeout(() => {
    t.style.animation = "toastOut 0.25s ease both";
    setTimeout(() => t.remove(), 260);
  }, duration);
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k === "style" && typeof v === "string") e.style.cssText = v;
    else if (k.startsWith("on"))
      e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children
    .flat()
    .forEach(
      (c) =>
        c != null &&
        e.append(typeof c === "string" ? document.createTextNode(c) : c),
    );
  return e;
}

document.addEventListener("DOMContentLoaded", () => {
  loadTheme("minimal");
  engine.adoptToDocument();

  engine.compute(
    "color-primary-alpha-50",
    `tokens["color-primary"] ? tokens["color-primary"] + "80" : "#00FFC880"`,
  );

  engine.subscribe(() => {
    refreshAllLists();
    buildPreviewComponents();
    refreshCSSOutput();
    document.getElementById("btnUndo").disabled = !engine.canUndo();
    document.getElementById("btnRedo").disabled = !engine.canRedo();
  });

  document.getElementById("sidebarTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".stab");
    if (!btn) return;
    const tab = btn.dataset.tab;
    STATE.activeTab = tab;
    document
      .querySelectorAll(".stab")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document
      .querySelectorAll(".token-panel")
      .forEach((p) => p.classList.toggle("active", p.dataset.panel === tab));
    refreshAllLists();
  });

  const searchInput = document.getElementById("tokenSearch");
  const searchClear = document.getElementById("searchClear");
  searchInput.addEventListener("input", () => {
    STATE.searchQuery = searchInput.value.trim().toLowerCase();
    searchClear.classList.toggle("hidden", !STATE.searchQuery);
    refreshAllLists();
  });
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    STATE.searchQuery = "";
    searchClear.classList.add("hidden");
    refreshAllLists();
  });

  document.querySelectorAll(".btn-add-token").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category;
      const name =
        cat === "alias"
          ? `alias-new-${Date.now()}`
          : `${cat}-new-${Date.now()}`;
      const value =
        cat === "alias"
          ? "$color-primary"
          : cat === "spacing"
            ? "16px"
            : "#888888";
      engine.set(name, value);
      toast(`Added --${name}`, "success");
    });
  });

  document.getElementById("btnApplyRaw").addEventListener("click", () => {
    const css = document.getElementById("rawCssInput").value.trim();
    if (!css) return;
    engine
      .injectRaw(css)
      .then(() =>
        toast("Raw CSS injected via Constructable Stylesheet", "success"),
      );
  });

  document.getElementById("btnUndo").addEventListener("click", () => {
    if (engine.undo()) toast("Undo", "info");
  });
  document.getElementById("btnRedo").addEventListener("click", () => {
    if (engine.redo()) toast("Redo", "info");
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (engine.undo()) toast("Undo", "info");
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "z"))
    ) {
      e.preventDefault();
      if (engine.redo()) toast("Redo", "info");
    }
    if (e.key === "Escape" && activePickerCleanup) activePickerCleanup();
  });

  document.querySelectorAll(".pvbtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".pvbtn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const frame = document.getElementById("previewFrame");
      const vp = btn.dataset.vp;
      frame.className = "preview-frame" + (vp !== "full" ? ` vp-${vp}` : "");
    });
  });

  document.getElementById("btnToggleDiff").addEventListener("click", () => {
    STATE.isDiffMode = !STATE.isDiffMode;
    if (STATE.isDiffMode) {
      STATE.prevTokenSnapshot = engine.getAllTokens();
      toast(
        "Diff mode ON — snapshot taken. Modify tokens to see diff.",
        "info",
      );
    } else {
      STATE.prevTokenSnapshot = null;
      toast("Diff mode OFF", "info");
    }
    document.getElementById("btnToggleDiff").style.borderColor =
      STATE.isDiffMode ? "var(--cyan-border)" : "";
    document.getElementById("btnToggleDiff").style.color = STATE.isDiffMode
      ? "var(--cyan)"
      : "";
  });

  document.getElementById("btnCopyVars").addEventListener("click", () => {
    navigator.clipboard
      .writeText(engine.toCSS())
      .then(() => toast("CSS Variables copied to clipboard!", "success"));
  });

  document.querySelectorAll(".cob-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".cob-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      STATE.activeOutputTab = tab.dataset.out;
      refreshCSSOutput();
    });
  });

  document.getElementById("cobToggle").addEventListener("click", () => {
    STATE.outputCollapsed = !STATE.outputCollapsed;
    document
      .getElementById("cssOutputBar")
      .classList.toggle("collapsed", STATE.outputCollapsed);
    if (!STATE.outputCollapsed) refreshCSSOutput();
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    const modal = document.getElementById("exportModal");
    modal.classList.remove("hidden");
    document.getElementById("modalPre").textContent = generateExport(
      STATE.activeExportFmt,
    );
  });

  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("exportModal").classList.add("hidden");
  });
  document.getElementById("modalBackdrop").addEventListener("click", () => {
    document.getElementById("exportModal").classList.add("hidden");
  });

  document.querySelectorAll(".mtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".mtab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      STATE.activeExportFmt = tab.dataset.fmt;
      document.getElementById("modalPre").textContent = generateExport(
        STATE.activeExportFmt,
      );
    });
  });

  document.getElementById("btnModalCopy").addEventListener("click", () => {
    const txt = document.getElementById("modalPre").textContent;
    navigator.clipboard.writeText(txt).then(() => toast("Copied!", "success"));
  });

  document.getElementById("btnModalDownload").addEventListener("click", () => {
    const fmtMap = {
      css: "theme.css",
      json: "theme.tokens.json",
      js: "theme.js",
      ts: "theme.ts",
      scss: "_theme.scss",
      tailwind: "tailwind.config.js",
    };
    const txt = document.getElementById("modalPre").textContent;
    const blob = new Blob([txt], { type: "text/plain" });
    const a = el("a", {
      href: URL.createObjectURL(blob),
      download: fmtMap[STATE.activeExportFmt] || "theme.txt",
    });
    document.body.append(a);
    a.click();
    a.remove();
    toast(`Downloaded ${fmtMap[STATE.activeExportFmt]}`, "success");
  });

  const divider = document.getElementById("dividerV");
  const sidebar = document.getElementById("sidebar");
  let dragging = false,
    startX = 0,
    startW = 0;
  divider.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    divider.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const w = Math.max(220, Math.min(520, startW + e.clientX - startX));
    sidebar.style.width = w + "px";
    sidebar.style.flexShrink = "0";
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  updateScopeControls();
  refreshAllLists();
  refreshCSSOutput();
  toast("ThemeForge ready — Constructable Stylesheets active", "success", 3500);
});
