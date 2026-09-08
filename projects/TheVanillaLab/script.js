const store = {
  get: (k, fallback = null) => {
    try {
      const v = localStorage.getItem(k);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

function switchTab(name) {
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".pill-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + name)?.classList.add("active");
  document.querySelector(`[data-tab="${name}"]`)?.classList.add("active");
}

function toast(type, msg) {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  c.appendChild(el);
  const remove = () => {
    el.classList.add("removing");
    el.addEventListener("animationend", () => el.remove(), {
      once: true,
    });
  };
  setTimeout(remove, 3000);
  el.addEventListener("click", remove);
}

function initTabs() {
  document.getElementById("mainTabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) switchTab(tab.dataset.tab);
  });
}

function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = store.get("theme", "dark");
  document.documentElement.setAttribute("data-theme", saved);
  btn.textContent = saved === "dark" ? "☀️" : "🌙";

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    btn.textContent = next === "dark" ? "☀️" : "🌙";
    store.set("theme", next);
  });
}

function initCounter() {
  let count = store.get("counter", 0);
  const display = document.getElementById("counterDisplay");
  const pop = () => {
    display.classList.add("pop");
    setTimeout(() => display.classList.remove("pop"), 160);
  };
  const render = () => {
    display.textContent = count;
    store.set("counter", count);
  };
  render();

  document.getElementById("btnInc").addEventListener("click", () => {
    count++;
    pop();
    render();
  });
  document.getElementById("btnDec").addEventListener("click", () => {
    count--;
    pop();
    render();
  });
  document.getElementById("btnReset").addEventListener("click", () => {
    count = 0;
    pop();
    render();
  });
}

function initNotes() {
  let notes = store.get("notes", []);
  const list = document.getElementById("noteList");
  const input = document.getElementById("noteInput");

  const render = () => {
    list.innerHTML = "";
    notes.forEach((n, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${n}</span><button class="note-del" data-i="${i}">✕</button>`;
      list.appendChild(li);
    });
    store.set("notes", notes);
  };

  const add = () => {
    const val = input.value.trim();
    if (!val) return;
    notes.unshift(val);
    input.value = "";
    render();
    toast("success", "Note saved!");
  };

  document.getElementById("noteAdd").addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-i]");
    if (btn) {
      notes.splice(+btn.dataset.i, 1);
      render();
    }
  });

  render();
}

function initFetch() {
  const btn = document.getElementById("fetchBtn");
  const clear = document.getElementById("fetchClear");
  const result = document.getElementById("fetchResult");
  let reqId = 0;

  btn.addEventListener("click", async () => {
    const id = Math.ceil(Math.random() * 10);
    const thisReq = ++reqId;
    result.innerHTML = '<span class="spinner"></span>Loading…';
    btn.disabled = true;

    try {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${id}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (thisReq !== reqId) return;
      const data = await res.json();
      result.textContent = JSON.stringify(
        {
          name: data.name,
          email: data.email,
          city: data.address?.city,
          company: data.company?.name,
        },
        null,
        2,
      );
      toast("success", `Fetched user: ${data.name}`);
    } catch (err) {
      if (thisReq !== reqId) return;
      result.textContent = `Error: ${err.message}`;
      toast("error", "Fetch failed.");
    } finally {
      btn.disabled = false;
    }
  });

  clear.addEventListener("click", () => {
    result.textContent = "Result will appear here…";
  });
}

function initScrollReveal() {
  const cards = document.querySelectorAll(".card");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  cards.forEach((c, i) => {
    c.style.transitionDelay = `${i * 0.07}s`;
    io.observe(c);
  });
}

function initForm() {
  const rules = {
    fName: (v) =>
      v.trim().length >= 2 ? "" : "At least 2 characters required.",
    fEmail: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? ""
        : "Enter a valid email address.",
    fPass: (v) =>
      v.length >= 8 ? "" : "Password must be 8+ characters.",
    fConfirm: (v) =>
      v === document.getElementById("fPass").value
        ? ""
        : "Passwords do not match.",
    fBio: () => "",
  };

  const setValidity = (id, err) => {
    const el = document.getElementById(id);
    const msg = document.getElementById(id + "-err");
    el.classList.toggle("invalid", !!err);
    el.classList.toggle("valid", !err && el.value.length > 0);
    msg.textContent = err;
  };

  Object.keys(rules).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () =>
      setValidity(id, rules[id](el.value)),
    );
    el.addEventListener("blur", () => {
      if (el.value) setValidity(id, rules[id](el.value));
    });
  });

  document.getElementById("formSubmit").addEventListener("click", () => {
    let valid = true;
    ["fName", "fEmail", "fPass", "fConfirm"].forEach((id) => {
      const el = document.getElementById(id);
      const err = rules[id](el.value);
      setValidity(id, err);
      if (err) valid = false;
    });
    if (valid) {
      toast("success", "Account created! 🎉");
      ["fName", "fEmail", "fPass", "fConfirm", "fBio"].forEach((id) => {
        const el = document.getElementById(id);
        el.value = "";
        el.classList.remove("valid", "invalid");
        document.getElementById(id + "-err").textContent = "";
      });
    } else {
      toast("error", "Please fix the errors above.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTheme();
  initCounter();
  initNotes();
  initFetch();
  initScrollReveal();
  initForm();
});
