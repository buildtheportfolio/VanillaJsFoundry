"use strict";

/* ==========================================================================
   SECTION 1 - createMachine: a small reusable finite state machine.
   Everything is declared as data:
     { initial, context(), entry, states: { id: { entry, exit, on: { EVENT: [transition...] } } },
       on (global transitions), guards, actions }
   A transition is { target: 'state' | fn(ctx, payload), guard?, actions? }.
   `guard` is a name, a '!name' negation, a function, or an array (AND).
   Transitions for an event are tried in order; the first whose guard passes wins.
   ========================================================================== */
function createMachine(def) {
  const states = def.states;
  const guards = def.guards || {};
  const actions = def.actions || {};
  const listeners = new Set();
  const log = [];
  const context = def.context();
  let state = def.initial;
  let seq = 0;
  const api = {};

  function check(g, ctx, payload) {
    if (g == null) return true;
    if (Array.isArray(g)) return g.every((x) => check(x, ctx, payload));
    if (typeof g === "function") return !!g(ctx, payload, api);
    const neg = g.charAt(0) === "!";
    const fn = guards[neg ? g.slice(1) : g];
    if (!fn) throw new Error("Unknown guard: " + g);
    return neg ? !fn(ctx, payload, api) : !!fn(ctx, payload, api);
  }

  function candidates(stateId, event) {
    const own = (states[stateId].on || {})[event] || [];
    const glob = (def.on || {})[event] || [];
    return own.concat(glob);
  }

  function resolve(stateId, event, payload, ctx) {
    const c = ctx || context;
    for (const tr of candidates(stateId, event)) {
      if (check(tr.guard, c, payload)) {
        const target = typeof tr.target === "function" ? tr.target(c, payload) : tr.target;
        return { tr, target };
      }
    }
    return null;
  }

  function run(list, payload) {
    (list || []).forEach((a) => {
      const fn = typeof a === "function" ? a : actions[a];
      if (!fn) throw new Error("Unknown action: " + a);
      fn(context, payload, api);
    });
  }

  function record(entry) {
    entry.n = ++seq;
    log.push(entry);
    if (log.length > 60) log.shift();
    listeners.forEach((fn) => fn(entry));
    return entry;
  }

  function enter(stateId, payload) {
    state = stateId;
    run(def.entry, payload);
    run(states[stateId].entry, payload);
  }

  api.send = function (event, payload) {
    const from = state;
    const r = resolve(from, event, payload);
    if (!r) {
      const known = candidates(from, event).length > 0;
      record({ type: "blocked", event, from, reason: known ? "guard" : "no-transition" });
      return { ok: false, event, from, reason: known ? "guard" : "no-transition" };
    }
    run(states[from].exit, payload);
    run(r.tr.actions, payload);
    enter(r.target, payload);
    record({ type: "transition", event, from, to: r.target });
    return { ok: true, event, from, to: r.target };
  };

  /* Can this event fire right now? (pure) */
  api.can = (event, payload) => !!resolve(state, event, payload);

  /* Follow an event repeatedly (pure, on a copy of the context) and list the states visited. */
  api.walk = function (event, start) {
    const clone = Object.assign({}, context, { returnTo: null });
    let cur = start || def.initial;
    const path = [cur];
    for (let i = 0; i < Object.keys(states).length; i++) {
      const r = resolve(cur, event, undefined, clone);
      if (!r || path.indexOf(r.target) !== -1) break;
      path.push(r.target);
      cur = r.target;
    }
    return path;
  };

  /* Describe available events and each transition's guard results (pure). */
  api.inspect = function () {
    const names = new Set(Object.keys(states[state].on || {}).concat(Object.keys(def.on || {})));
    return Array.from(names).map((event) => ({
      event,
      transitions: candidates(state, event).map((tr) => {
        const list = tr.guard == null ? [] : Array.isArray(tr.guard) ? tr.guard : [tr.guard];
        const needsPayload = !!tr.needsPayload;
        const gs = list.map((g) => ({
          name: typeof g === "function" ? "(fn)" : g,
          pass: needsPayload ? null : check(g, context, undefined),
        }));
        return {
          target: typeof tr.target === "function" ? "(by payload)" : tr.target,
          guards: gs,
          needsPayload,
          pass: needsPayload ? null : gs.every((g) => g.pass),
        };
      }),
    }));
  };

  /* Place the machine in a state without a triggering event (used for reload restore). */
  api.start = function (stateId) {
    enter(stateId);
    record({ type: "restore", to: stateId });
  };

  api.subscribe = function (fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  Object.defineProperty(api, "state", { get: () => state });
  Object.defineProperty(api, "context", { get: () => context });
  Object.defineProperty(api, "log", { get: () => log.slice() });

  enter(def.initial);
  return api;
}

/* ==========================================================================
   SECTION 2 - Onboarding domain: data, validators, machine definition.
   ========================================================================== */
const PLANS = {
  free: { label: "Free", price: "$0", paid: false, blurb: "Up to 3 members, community support." },
  pro: { label: "Pro", price: "$12 / seat / month", paid: true, blurb: "Unlimited projects, priority support." },
  team: { label: "Team", price: "$29 / seat / month", paid: true, blurb: "SSO, audit log, roles and permissions." },
};
const TEAM_SIZES = [
  ["1", "Just me"],
  ["2-10", "2 to 10"],
  ["11-50", "11 to 50"],
  ["51-200", "51 to 200"],
  ["200+", "More than 200"],
];
const STEP_ORDER = ["account", "workspace", "plan", "billing", "invite", "review", "done"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED_SLUGS = ["admin", "api", "www", "app", "root", "support"];
const MAX_INVITES = 10;
const SECRET_KEYS = ["password", "cardName", "cardNumber", "expiry", "cvc"];

function freshContext() {
  return {
    data: {
      name: "", email: "", password: "",
      wsName: "", slug: "", slugEdited: false, teamSize: "",
      plan: "",
      cardName: "", cardNumber: "", expiry: "", cvc: "",
      invites: [""],
    },
    returnTo: null,
    completed: false,
    visited: {},
  };
}

function luhn(raw) {
  const digits = String(raw).replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}

function expiryError(v, now) {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
  if (!m) return "Use the format MM/YY.";
  const end = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day after the expiry month
  const today = now || new Date();
  if (end <= today) return "This card has expired.";
  if (end.getFullYear() > today.getFullYear() + 20) return "That expiry date is too far away.";
  return "";
}

/* Each validator is pure: data -> { fieldKey: message }. */
const VALIDATORS = {
  account(d) {
    const e = {};
    const name = d.name.trim();
    if (!name) e.name = "Enter your full name.";
    else if (name.length < 2) e.name = "Your name must be at least 2 characters.";
    if (!d.email.trim()) e.email = "Enter your work email.";
    else if (!EMAIL_RE.test(d.email.trim())) e.email = "Enter a valid email such as you@company.com.";
    if (!d.password) e.password = "Choose a password.";
    else if (d.password.length < 8) e.password = "Use at least 8 characters.";
    else if (!/[A-Za-z]/.test(d.password) || !/\d/.test(d.password)) e.password = "Include at least one letter and one number.";
    return e;
  },
  workspace(d) {
    const e = {};
    if (d.wsName.trim().length < 2) e.wsName = "Name your workspace (2 characters or more).";
    if (!d.slug) e.slug = "Choose a URL slug.";
    else if (!SLUG_RE.test(d.slug)) e.slug = "Use 3 to 30 lowercase letters, numbers or hyphens, starting and ending with a letter or number.";
    else if (RESERVED_SLUGS.indexOf(d.slug) !== -1) e.slug = "That slug is reserved. Try another.";
    if (!TEAM_SIZES.some((t) => t[0] === d.teamSize)) e.teamSize = "Select your team size.";
    return e;
  },
  plan(d) {
    return PLANS[d.plan] ? {} : { plan: "Choose a plan to continue." };
  },
  billing(d) {
    const e = {};
    if (d.cardName.trim().length < 2) e.cardName = "Enter the name on the card.";
    if (!d.cardNumber.trim()) e.cardNumber = "Enter a card number.";
    else if (!luhn(d.cardNumber)) e.cardNumber = "That card number is not valid. Check for typos.";
    const x = d.expiry ? expiryError(d.expiry) : "Enter the expiry date as MM/YY.";
    if (x) e.expiry = x;
    if (!/^\d{3,4}$/.test(d.cvc)) e.cvc = "Enter the 3 or 4 digit security code.";
    return e;
  },
  invite(d) {
    const e = {};
    const seen = {};
    const own = d.email.trim().toLowerCase();
    d.invites.forEach((raw, i) => {
      const v = raw.trim().toLowerCase();
      if (!v) return;
      if (!EMAIL_RE.test(v)) e["invite-" + i] = "Enter a valid email address or remove this row.";
      else if (v === own) e["invite-" + i] = "That is your own address.";
      else if (seen[v]) e["invite-" + i] = "This address is already in the list.";
      seen[v] = true;
    });
    return e;
  },
  review() { return {}; },
  done() { return {}; },
};

const isPaid = (d) => !!(PLANS[d.plan] && PLANS[d.plan].paid);
const ok = (step) => (ctx) => Object.keys(VALIDATORS[step](ctx.data)).length === 0;

function createOnboardingMachine() {
  const retNext = { target: "review", guard: ["returning", "allValid"] };
  return createMachine({
    initial: "account",
    context: freshContext,
    entry: ["markVisited"],
    guards: {
      accountValid: ok("account"),
      workspaceValid: ok("workspace"),
      planValid: ok("plan"),
      billingValid: ok("billing"),
      inviteValid: ok("invite"),
      paid: (ctx) => isPaid(ctx.data),
      returning: (ctx) => ctx.returnTo === "review",
      billingNeeded: (ctx) => isPaid(ctx.data) && !ok("billing")(ctx),
      allValid: (ctx) =>
        ["account", "workspace", "plan"].concat(isPaid(ctx.data) ? ["billing"] : [], ["invite"])
          .every((s) => ok(s)(ctx)),
      /* may the machine jump to payload.to? Only along the validated NEXT path (no deep-linking past a guard). */
      reachable: (ctx, p, m) => {
        const to = p && p.to;
        if (!to || STEP_ORDER.indexOf(to) === -1) return false;
        if (ctx.completed) return to === "done";
        if (to === "done") return false;
        return m.walk("NEXT").indexOf(to) !== -1;
      },
    },
    actions: {
      markVisited: (ctx, p, m) => { ctx.visited[m.state] = true; },
      clearReturn: (ctx) => { ctx.returnTo = null; },
      setReturn: (ctx) => { ctx.returnTo = "review"; },
      applyReturn: (ctx, p) => { ctx.returnTo = p && p.returnTo === "review" ? "review" : null; },
      dropBillingIfFree: (ctx) => {
        if (!isPaid(ctx.data)) { ctx.data.cardName = ctx.data.cardNumber = ctx.data.expiry = ctx.data.cvc = ""; }
      },
      complete: (ctx) => {
        ctx.completed = true;
        ctx.data.password = "";
        ctx.data.cardName = ctx.data.cardNumber = ctx.data.expiry = ctx.data.cvc = "";
      },
      resetAll: (ctx) => {
        Object.keys(ctx).forEach((k) => delete ctx[k]);
        Object.assign(ctx, freshContext());
      },
    },
    on: {
      JUMP: [{ target: (c, p) => p.to, guard: "reachable", actions: ["applyReturn"], needsPayload: true }],
      RESET: [{ target: "account", actions: ["resetAll"] }],
    },
    states: {
      account: {
        on: {
          NEXT: [retNext, { target: "workspace", guard: "accountValid" }],
        },
      },
      workspace: {
        on: {
          NEXT: [retNext, { target: "plan", guard: "workspaceValid" }],
          BACK: [{ target: "account" }],
        },
      },
      plan: {
        exit: ["dropBillingIfFree"],
        on: {
          NEXT: [
            { target: "billing", guard: ["returning", "billingNeeded"] },
            retNext,
            { target: "billing", guard: ["planValid", "paid"] },
            { target: "invite", guard: ["planValid", "!paid"] },
          ],
          BACK: [{ target: "workspace" }],
        },
      },
      billing: {
        on: {
          NEXT: [retNext, { target: "invite", guard: "billingValid" }],
          BACK: [{ target: "plan" }],
        },
      },
      invite: {
        on: {
          NEXT: [{ target: "review", guard: "inviteValid" }],
          BACK: [{ target: "billing", guard: "paid" }, { target: "plan" }],
        },
      },
      review: {
        entry: ["clearReturn"],
        on: {
          SUBMIT: [{ target: "done", guard: "allValid" }],
          BACK: [{ target: "invite" }],
          EDIT: [{ target: (c, p) => p.to, guard: "reachable", actions: ["setReturn"], needsPayload: true }],
        },
      },
      done: { entry: ["complete"], on: {} },
    },
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createMachine, createOnboardingMachine, VALIDATORS, luhn, passwordScore, slugify, expiryError, freshContext };
}

/* ==========================================================================
   SECTION 3 - UI (browser only).
   ========================================================================== */
if (typeof document !== "undefined") {
  (function () {
    const STORE_KEY = "foundry.finite-saas-onboarding.v1";
    const $ = (sel, root) => (root || document).querySelector(sel);

    const machine = createOnboardingMachine();
    const ctx = machine.context;
    const D = () => ctx.data;

    const els = {
      stepper: $("#stepper"), skipNote: $("#skipNote"), bar: $("#bar"), barFill: $("#barFill"),
      barLabel: $("#barLabel"), host: $("#stepHost"), form: $("#wizard"), status: $("#status"),
      notice: $("#notice"), resume: $("#resume"), resumeText: $("#resumeText"),
      inspector: $("#inspector"), inspMeta: $("#inspMeta"), inspEvents: $("#inspEvents"), inspLog: $("#inspLog"),
    };

    let pendingResume = null; // stored snapshot awaiting the user's decision
    const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- tiny DOM helper (text only, never innerHTML) ---------- */
    function h(tag, props, ...kids) {
      const el = document.createElement(tag);
      Object.keys(props || {}).forEach((k) => {
        const v = props[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      });
      kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
      return el;
    }

    function announce(msg) { els.status.textContent = ""; window.setTimeout(() => { els.status.textContent = msg; }, 30); }

    /* ---------- persistence (never password or card data) ---------- */
    function loadStored() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        return s && s.v === 1 && typeof s.data === "object" && s.data ? s : null;
      } catch (e) { return null; }
    }
    function persist() {
      if (pendingResume) return;
      try {
        const data = {};
        Object.keys(D()).forEach((k) => { if (SECRET_KEYS.indexOf(k) === -1) data[k] = D()[k]; });
        localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, step: machine.state, returnTo: ctx.returnTo, completed: ctx.completed, data, savedAt: Date.now() }));
      } catch (e) { /* storage unavailable */ }
    }
    function clearStored() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }
    function hydrate(s) {
      const d = D();
      Object.keys(s.data).forEach((k) => {
        if (SECRET_KEYS.indexOf(k) !== -1 || !(k in d)) return;
        const v = s.data[k];
        if (k === "invites") {
          if (Array.isArray(v)) {
            const rows = v.filter((x) => typeof x === "string").slice(0, MAX_INVITES);
            d.invites = rows.length ? rows : [""];
          }
        } else if (typeof v === typeof d[k]) d[k] = v;
      });
      ctx.completed = s.completed === true;
    }

    /* ---------- routing helpers ---------- */
    const parseHash = () => { const m = /^#\/([a-z]+)$/.exec(location.hash); return m && STEP_ORDER.indexOf(m[1]) !== -1 ? m[1] : null; };
    function clamp(target) {
      if (ctx.completed) return "done";
      const path = machine.walk("NEXT");
      return path.indexOf(target) !== -1 ? target : path[path.length - 1];
    }
    function route() {
      return ["account", "workspace", "plan"].concat(isPaid(D()) || machine.state === "billing" ? ["billing"] : [], ["invite", "review"]);
    }

    const STEPS = {
      account: { label: "Account", title: "Create your account", intro: "Tell us who you are. You can change all of this later.", event: "NEXT", cta: "Continue", render: renderAccount },
      workspace: { label: "Workspace", title: "Set up your workspace", intro: "A workspace is where your team's projects live.", event: "NEXT", cta: "Continue", render: renderWorkspace },
      plan: { label: "Plan", title: "Pick a plan", intro: "Free skips billing. Pro and Team take you to a (fake) payment step.", event: "NEXT", cta: "Continue", render: renderPlan },
      billing: { label: "Billing", title: "Billing details", intro: "Only paid plans need this step.", event: "NEXT", cta: "Continue", render: renderBilling },
      invite: { label: "Invite", title: "Invite teammates", intro: "Optional. Add as many as you like, or skip this step.", event: "NEXT", cta: "Continue", render: renderInvite },
      review: { label: "Review", title: "Review and confirm", intro: "Check everything. Use Edit to fix a section and come straight back.", event: "SUBMIT", cta: "Create workspace", render: renderReview },
      done: { label: "Done", title: "You're all set", intro: "", event: null, cta: "", render: renderDone },
    };

    /* ---------- navigation ---------- */
    function go(event, payload, opts) {
      const o = opts || {};
      const from = machine.state;
      const res = machine.send(event, payload);
      if (!res.ok) return res;
      if (pendingResume && !o.keepPending) { pendingResume = null; els.resume.hidden = true; }
      const histState = { step: machine.state, returnTo: ctx.returnTo };
      if (o.history === "replace") history.replaceState(histState, "", "#/" + machine.state);
      else if (o.history !== "none") history.pushState(histState, "", "#/" + machine.state);
      persist();
      render({ from: from, focus: true });
      return res;
    }

    function onBlocked(step) {
      if (step === "review") {
        const target = clamp("review");
        announce("Some details are missing or invalid. Taking you to the step that needs attention.");
        go("JUMP", { to: target });
        return;
      }
      const errs = withNative(VALIDATORS[step](D()));
      const n = showErrors(errs);
      if (n) announce(n + (n === 1 ? " field needs" : " fields need") + " attention. " + firstMessage(errs));
    }

    function submitStep() {
      const meta = STEPS[machine.state];
      if (!meta.event) return;
      const res = go(meta.event);
      if (!res.ok) onBlocked(res.from);
    }

    /* ---------- validation display ---------- */
    function withNative(errs) {
      const out = Object.assign({}, errs);
      els.host.querySelectorAll("input[id^='f-'], select[id^='f-']").forEach((c) => {
        const key = c.id.slice(2);
        if (!out[key] && c.type !== "radio" && !c.validity.valid) out[key] = c.validationMessage;
      });
      return out;
    }
    function firstMessage(errs) { const k = Object.keys(errs)[0]; return k ? errs[k] : ""; }
    function controlFor(key) {
      const el = $("#f-" + key);
      if (!el) return null;
      return el.tagName === "FIELDSET" ? el.querySelector("input") : el;
    }
    function setFieldError(key, msg) {
      const box = $("#f-" + key);
      const err = $("#f-" + key + "-error");
      if (!box || !err) return;
      err.textContent = msg || "";
      const targets = box.tagName === "FIELDSET" ? Array.from(box.querySelectorAll("input")) : [box];
      targets.forEach((t) => { if (msg) t.setAttribute("aria-invalid", "true"); else t.removeAttribute("aria-invalid"); });
    }
    function showErrors(errs) {
      els.host.querySelectorAll(".field-error").forEach((p) => { setFieldError(p.id.slice(2, -6), ""); });
      const keys = Object.keys(errs);
      keys.forEach((k) => setFieldError(k, errs[k]));
      const nodes = keys.map(controlFor).filter(Boolean);
      nodes.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      if (nodes[0]) nodes[0].focus();
      return keys.length;
    }
    function validateField(key) {
      const errs = VALIDATORS[machine.state](D());
      setFieldError(key, errs[key] || "");
    }

    /* ---------- field builders ---------- */
    function field(o) {
      const id = "f-" + o.key;
      const control = o.options ? h("select", { id, name: o.key }) : h("input", { id, name: o.key, type: o.type || "text" });
      if (o.options) {
        control.append(h("option", { value: "", text: "Select..." }));
        o.options.forEach((p) => control.append(h("option", { value: p[0], text: p[1] })));
      }
      ["autocomplete", "inputmode", "maxlength", "placeholder", "spellcheck"].forEach((a) => { if (o[a] != null) control.setAttribute(a, o[a]); });
      control.required = true;
      control.value = D()[o.key] || "";
      control.setAttribute("aria-describedby", (o.hint ? id + "-hint " : "") + id + "-error");
      control.addEventListener("input", () => {
        let v = control.value;
        if (o.format) { v = o.format(v); control.value = v; }
        D()[o.key] = v;
        if (o.onInput) o.onInput(v);
        if (control.getAttribute("aria-invalid") === "true") validateField(o.key);
        persist();
        refreshInspector();
      });
      control.addEventListener("blur", () => { if (control.value !== "") validateField(o.key); });
      return h("div", { class: "field" },
        h("label", { for: id, text: o.label }),
        control,
        o.hint ? h("p", { class: "hint", id: id + "-hint", text: o.hint }) : null,
        o.extra || null,
        h("p", { class: "field-error", id: id + "-error" })
      );
    }

    /* ---------- step renderers ---------- */
    function renderAccount(box) {
      const label = h("span", { class: "strength-text" });
      const meter = h("div", { class: "strength", "data-level": "0" }, h("i"), h("i"), h("i"), h("i"));
      function paint() {
        const pw = D().password;
        const s = pw ? passwordScore(pw) : 0;
        meter.setAttribute("data-level", String(s));
        label.textContent = pw ? "Strength: " + ["Very weak", "Weak", "Fair", "Good", "Strong"][s] : "Strength: not set";
      }
      paint();
      box.append(
        field({ key: "name", label: "Full name", autocomplete: "name" }),
        field({ key: "email", label: "Work email", type: "email", autocomplete: "email", spellcheck: "false" }),
        field({
          key: "password", label: "Password", type: "password", autocomplete: "new-password",
          hint: "At least 8 characters with a letter and a number. Never saved to this device.",
          onInput: paint, extra: h("div", { class: "strength-row" }, meter, label),
        })
      );
    }

    function renderWorkspace(box) {
      box.append(
        field({
          key: "wsName", label: "Workspace name", autocomplete: "organization",
          onInput: (v) => {
            if (D().slugEdited) return;
            D().slug = slugify(v);
            const s = $("#f-slug");
            if (s) { s.value = D().slug; if (s.getAttribute("aria-invalid") === "true") validateField("slug"); }
          },
        }),
        field({
          key: "slug", label: "Workspace URL", hint: "example.com/your-slug. Lowercase letters, numbers and hyphens, 3 to 30 characters.",
          autocomplete: "off", spellcheck: "false",
          format: (v) => v.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          onInput: () => { D().slugEdited = true; },
        }),
        field({ key: "teamSize", label: "Team size", options: TEAM_SIZES })
      );
    }

    function renderPlan(box) {
      const note = h("p", { class: "hint plan-note", "aria-live": "polite" });
      const paintNote = () => {
        note.textContent = !PLANS[D().plan] ? "" : PLANS[D().plan].paid ? "Next: billing details." : "Free plan: billing will be skipped.";
      };
      paintNote();
      const cards = Object.keys(PLANS).map((k) => {
        const p = PLANS[k];
        const input = h("input", { type: "radio", name: "plan", id: "plan-" + k, value: k });
        input.checked = D().plan === k;
        input.setAttribute("aria-describedby", "f-plan-error");
        input.addEventListener("change", () => {
          D().plan = k; setFieldError("plan", ""); paintNote(); persist(); refreshInspector(); refreshStepper();
        });
        return h("label", { class: "plan-card", for: "plan-" + k },
          input,
          h("span", { class: "plan-body" },
            h("span", { class: "plan-name", text: p.label }),
            h("span", { class: "plan-price", text: p.price }),
            h("span", { class: "plan-blurb", text: p.blurb }))
        );
      });
      box.append(
        h("fieldset", { class: "plan-set", id: "f-plan" }, h("legend", { text: "Choose a plan" }), h("div", { class: "plan-grid" }, cards)),
        note,
        h("p", { class: "field-error", id: "f-plan-error" })
      );
    }

    function renderBilling(box) {
      box.append(
        h("p", { class: "demo-note", text: "Demo only: this form is fake. Nothing is sent anywhere, and card details are kept in memory for this tab only, never saved. Try 4242 4242 4242 4242 with any future date." }),
        field({ key: "cardName", label: "Name on card", autocomplete: "off" }),
        field({
          key: "cardNumber", label: "Card number", inputmode: "numeric", autocomplete: "off", maxlength: "23", placeholder: "4242 4242 4242 4242",
          format: (v) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
        }),
        h("div", { class: "row2" },
          field({
            key: "expiry", label: "Expiry (MM/YY)", inputmode: "numeric", autocomplete: "off", maxlength: "5", placeholder: "08/29",
            format: (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; },
          }),
          field({
            key: "cvc", label: "Security code", type: "password", inputmode: "numeric", autocomplete: "off", maxlength: "4",
            format: (v) => v.replace(/\D/g, "").slice(0, 4),
          })
        )
      );
    }

    function renderInvite(box) {
      const list = h("div", { class: "invite-list" });
      const addBtn = h("button", { type: "button", class: "btn ghost", id: "addInvite", text: "Add another teammate" });
      function paintRows(focusIdx) {
        list.textContent = "";
        D().invites.forEach((val, i) => {
          const id = "f-invite-" + i;
          const input = h("input", { id, type: "email", name: "invite-" + i, autocomplete: "off", spellcheck: "false", "aria-describedby": id + "-error", placeholder: "teammate@company.com" });
          input.value = val;
          input.addEventListener("input", () => {
            D().invites[i] = input.value;
            if (input.getAttribute("aria-invalid") === "true") validateField("invite-" + i);
            persist(); refreshInspector();
          });
          input.addEventListener("blur", () => { if (input.value !== "") validateField("invite-" + i); });
          const rm = h("button", { type: "button", class: "btn ghost small", text: "Remove", "aria-label": "Remove teammate " + (i + 1) });
          rm.addEventListener("click", () => {
            D().invites.splice(i, 1);
            if (!D().invites.length) D().invites.push("");
            persist(); refreshInspector();
            paintRows(Math.min(i, D().invites.length - 1));
            announce("Teammate row removed.");
          });
          list.append(h("div", { class: "field invite-row" },
            h("label", { for: id, text: "Teammate " + (i + 1) + " email" }),
            h("div", { class: "invite-line" }, input, rm),
            h("p", { class: "field-error", id: id + "-error" })));
        });
        addBtn.disabled = D().invites.length >= MAX_INVITES;
        if (focusIdx != null) { const t = $("#f-invite-" + focusIdx); if (t) t.focus(); }
      }
      addBtn.addEventListener("click", () => {
        if (D().invites.length >= MAX_INVITES) return;
        D().invites.push("");
        persist(); paintRows(D().invites.length - 1);
        announce("Teammate row added.");
      });
      paintRows();
      box.append(list, h("div", { class: "invite-add" }, addBtn, h("span", { class: "hint", text: "Up to " + MAX_INVITES + ". Empty rows are ignored." })));
    }

    function renderReview(box) {
      const d = D();
      const row = (k, v) => [h("dt", { text: k }), h("dd", { text: v })];
      const group = (title, step, rows) => h("section", { class: "sum-group" },
        h("div", { class: "sum-head" },
          h("h3", { text: title }),
          step ? h("button", { type: "button", class: "btn link", text: "Edit", "aria-label": "Edit " + title.toLowerCase(), onclick: () => { const r = go("EDIT", { to: step }); if (!r.ok) announce("That step is not available yet."); } }) : null),
        h("dl", {}, rows));
      const plan = PLANS[d.plan];
      const last4 = d.cardNumber.replace(/\D/g, "").slice(-4);
      const invites = d.invites.map((s) => s.trim()).filter(Boolean);
      box.append(
        group("Account", "account", [row("Name", d.name), row("Email", d.email), row("Password", "Hidden (never stored)")]),
        group("Workspace", "workspace", [row("Name", d.wsName), row("URL", "example.com/" + d.slug), row("Team size", d.teamSize)]),
        group("Plan", "plan", [row("Plan", plan ? plan.label + " (" + plan.price + ")" : "-")]),
        isPaid(d)
          ? group("Billing", "billing", [row("Card", last4 ? "Ending in " + last4 : "Not entered"), row("Expiry", d.expiry || "-")])
          : group("Billing", null, [row("Status", "Skipped on the Free plan")]),
        group("Teammates", "invite", [row("Invites", invites.length ? invites.join(", ") : "None")])
      );
    }

    function renderDone(box) {
      const plan = PLANS[D().plan];
      box.append(
        h("div", { class: "success-mark", "aria-hidden": "true", text: "✓" }),
        h("p", { class: "done-text", text: "Workspace \"" + D().wsName + "\" is ready on the " + (plan ? plan.label : "") + " plan." }),
        h("p", { class: "hint", text: "This was a demo: no account was created and nothing left your browser. Your password and card details were discarded." }),
        h("button", { type: "button", class: "btn primary", id: "doneReset", text: "Start over", onclick: startOver })
      );
    }

    /* ---------- render ---------- */
    function render(opts) {
      const o = opts || {};
      const st = machine.state;
      const meta = STEPS[st];
      const dir = o.from == null ? "" : STEP_ORDER.indexOf(st) >= STEP_ORDER.indexOf(o.from) ? "fwd" : "back";
      const anim = dir && !reducedMotion() ? " enter-" + dir : "";
      const section = h("section", { class: "step" + anim, "aria-labelledby": "stepHeading" });
      const heading = h("h2", { id: "stepHeading", tabindex: "-1", text: meta.title });
      section.append(heading);
      if (meta.intro) section.append(h("p", { class: "intro", text: meta.intro }));
      const body = h("div", { class: "step-body" });
      section.append(body);
      meta.render(body);
      if (meta.event) {
        const actions = h("div", { class: "actions" });
        if (st !== "account") actions.append(h("button", { type: "button", class: "btn ghost", id: "backBtn", text: "Back", onclick: goBack }));
        actions.append(h("button", { type: "submit", class: "btn primary", id: "nextBtn", text: meta.cta }));
        section.append(actions);
      }
      els.host.textContent = "";
      els.host.append(section);
      refreshStepper();
      refreshInspector();
      if (o.focus) {
        heading.focus();
        const r = route();
        const idx = r.indexOf(st);
        announce(st === "done" ? "Onboarding complete." : "Step " + (idx + 1) + " of " + r.length + ": " + meta.label + ".");
      }
    }

    function goBack() {
      if (machine.state === "account" || machine.state === "done") return;
      go("BACK");
    }

    function refreshStepper() {
      const r = route();
      const st = machine.state;
      const idx = r.indexOf(st);
      const current = st === "done" ? r.length : idx;
      els.stepper.textContent = "";
      r.forEach((k, i) => {
        const done = i < current;
        const isCurrent = i === idx;
        const can = !isCurrent && machine.can("JUMP", { to: k }) && st !== "done";
        const mark = h("span", { class: "dot", "aria-hidden": "true", text: done ? "✓" : String(i + 1) });
        const inner = can
          ? h("button", { type: "button", class: "step-btn", onclick: () => go("JUMP", { to: k }) }, mark, h("span", { class: "step-label", text: STEPS[k].label }))
          : h("span", { class: "step-btn static" }, mark, h("span", { class: "step-label", text: STEPS[k].label }));
        const li = h("li", { class: "st" + (done ? " done" : "") + (isCurrent ? " current" : ""), "aria-current": isCurrent ? "step" : null }, inner);
        els.stepper.append(li);
      });
      const skipped = D().plan === "free" && st !== "billing";
      els.skipNote.hidden = !skipped;
      els.skipNote.textContent = skipped ? "Billing is skipped on the Free plan." : "";
      const pct = st === "done" ? 100 : Math.round((idx / r.length) * 100);
      els.barFill.style.width = pct + "%";
      els.bar.setAttribute("aria-valuenow", String(pct));
      els.bar.setAttribute("aria-valuetext", pct + " percent complete");
      els.barLabel.textContent = st === "done" ? "Complete" : "Step " + (idx + 1) + " of " + r.length + " · " + pct + "%";
    }

    /* ---------- inspector (textContent only) ---------- */
    function refreshInspector() {
      if (!els.inspector.open) return;
      const meta = els.inspMeta;
      meta.textContent = "";
      [["State", machine.state], ["Plan", D().plan || "(none)"], ["Return to", ctx.returnTo || "(none)"], ["NEXT path", machine.walk("NEXT").join(" > ")]]
        .forEach((p) => { meta.append(h("dt", { text: p[0] }), h("dd", { text: p[1] })); });
      els.inspEvents.textContent = "";
      machine.inspect().forEach((ev) => {
        const li = h("li", {}, h("code", { class: "ev-name", text: ev.event }));
        const ul = h("ul", { class: "tr-list" });
        ev.transitions.forEach((t) => {
          const state = t.pass === null ? "needs payload" : t.pass ? "enabled" : "blocked";
          const gtxt = t.guards.length ? t.guards.map((g) => g.name + (g.pass === null ? "" : g.pass ? " pass" : " fail")).join(", ") : "no guard";
          ul.append(h("li", { class: "tr " + (t.pass === null ? "na" : t.pass ? "pass" : "fail") }, "-> " + t.target + " [" + state + "] " + gtxt));
        });
        li.append(ul);
        els.inspEvents.append(li);
      });
      els.inspLog.textContent = "";
      machine.log.slice().reverse().slice(0, 25).forEach((e) => {
        const txt = e.type === "transition" ? "#" + e.n + " " + e.event + ": " + e.from + " -> " + e.to
          : e.type === "blocked" ? "#" + e.n + " " + e.event + " blocked in " + e.from + " (" + e.reason + ")"
          : "#" + e.n + " restored at " + e.to;
        els.inspLog.append(h("li", { text: txt }));
      });
    }
    els.inspector.addEventListener("toggle", refreshInspector);
    machine.subscribe(refreshInspector);

    /* ---------- start over / resume ---------- */
    function startOver() {
      if (!window.confirm("Start over? This clears everything you entered.")) return;
      clearStored();
      pendingResume = null;
      els.resume.hidden = true;
      els.notice.hidden = true;
      go("RESET");
      announce("Started over.");
    }
    $("#startOver").addEventListener("click", startOver);
    $("#resumeReset").addEventListener("click", startOver);
    $("#resumeBtn").addEventListener("click", () => {
      const s = pendingResume;
      if (!s) return;
      hydrate(s);
      pendingResume = null;
      els.resume.hidden = true;
      const target = clamp(s.step);
      const res = go("JUMP", { to: target, returnTo: s.returnTo });
      if (target !== s.step && !ctx.completed) showNotice("Your password and card details are never saved, so you need to re-enter them to continue.");
      if (!res.ok) render({ focus: true });
    });
    function showNotice(msg) {
      els.notice.textContent = msg;
      els.notice.hidden = !msg;
    }

    /* ---------- events: submit, keyboard, history ---------- */
    els.form.addEventListener("submit", (e) => { e.preventDefault(); submitStep(); });
    document.addEventListener("keydown", (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); submitStep(); }
    });
    window.addEventListener("popstate", (e) => {
      const wanted = (e.state && e.state.step) || parseHash() || "account";
      const target = clamp(STEP_ORDER.indexOf(wanted) === -1 ? "account" : wanted);
      const from = machine.state;
      const res = machine.send("JUMP", { to: target, returnTo: e.state && e.state.returnTo });
      if (target !== wanted || !e.state) history.replaceState({ step: target, returnTo: ctx.returnTo }, "", "#/" + target);
      if (res.ok) {
        if (target !== wanted) showNotice("You cannot skip ahead: earlier steps still need valid answers.");
        else showNotice("");
        persist();
        render({ from, focus: true });
      }
    });

    /* ---------- boot ---------- */
    (function boot() {
      const stored = loadStored();
      const wanted = (history.state && history.state.step) || parseHash();
      if (wanted && wanted !== "account") {
        if (stored) hydrate(stored);
        const target = clamp(STEP_ORDER.indexOf(wanted) === -1 ? "account" : wanted);
        machine.start(target);
        if (target !== "review" && history.state && history.state.returnTo === "review" && target === wanted) ctx.returnTo = "review";
        history.replaceState({ step: target, returnTo: ctx.returnTo }, "", "#/" + target);
        if (target !== wanted) showNotice("You cannot skip ahead: earlier steps still need valid answers. Your password and card details are never saved.");
      } else {
        history.replaceState({ step: "account", returnTo: null }, "", "#/account");
        const meaningful = stored && (stored.completed || stored.step !== "account" || stored.data.name || stored.data.email);
        if (meaningful) {
          pendingResume = stored;
          const label = stored.completed ? "Done" : STEPS[stored.step] ? STEPS[stored.step].label : "Account";
          els.resumeText.textContent = stored.completed
            ? "You already finished onboarding on this device."
            : "Welcome back. You were on the " + label + " step.";
          els.resume.hidden = false;
        }
      }
      render({});
    })();
  })();
}
