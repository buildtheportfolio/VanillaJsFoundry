"use strict";
class TrieNode {
  constructor() {
    this.children = Object.create(null);
    this.isEnd    = false;
    this.freq     = 0;
  }
}
class Trie {
  constructor() {
    this.root      = new TrieNode();
    this.nodeCount = 0;
    this.wordCount = 0;
  }
  insert(word, freq = 0) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (node.children[ch] === undefined) {
        node.children[ch] = new TrieNode();
        this.nodeCount++;
      }
      node = node.children[ch];
    }
    if (!node.isEnd) {
      node.isEnd = true;
      this.wordCount++;
    }
    if (freq > node.freq) node.freq = freq;
  }
  insertMany(words) {
    for (let i = 0; i < words.length; i++) this.insert(words[i]);
  }
  _prefixNode(prefix) {
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      node = node.children[prefix[i]];
      if (node === undefined) return null;
    }
    return node;
  }
  suggest(prefix, limit = 10) {
    const trimmed = prefix.trim().toLowerCase();
    if (!trimmed) return [];
    const startNode = this._prefixNode(trimmed);
    if (startNode === null) return [];
    const results = [];
    const stack   = [[startNode, trimmed]];
    while (stack.length > 0 && results.length < limit * 3) {
      const [node, word] = stack.pop();
      if (node.isEnd) results.push({ word, freq: node.freq });
      const keys = Object.keys(node.children);
      for (let i = keys.length - 1; i >= 0; i--) {
        stack.push([node.children[keys[i]], word + keys[i]]);
      }
    }
    results.sort((a, b) => b.freq - a.freq || a.word.localeCompare(b.word));
    return results.slice(0, limit).map(r => r.word);
  }
  boost(word) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      node = node.children[word[i]];
      if (!node) return;
    }
    if (node.isEnd) node.freq++;
  }
}
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
function oneSubstitutions(query) {
  const variants = new Set();
  for (let i = 0; i < query.length; i++) {
    for (const ch of ALPHABET) {
      if (ch !== query[i]) {
        variants.add(query.slice(0, i) + ch + query.slice(i + 1));
      }
    }
  }
  return [...variants];
}
const HISTORY_KEY = "trie_engine_history";
const HISTORY_MAX = 8;
const History = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  },
  save(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    } catch {}
  },
  push(word) {
    const list = History.load().filter(w => w !== word);
    list.unshift(word);
    History.save(list);
  },
  clear() {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }
};
async function loadWordList() {
  if (location.protocol === "file:") {
    console.info("Running on file:// — using built-in word list.");
    return FALLBACK_WORDS;
  }
  const REMOTE_URL =
    "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
  try {
    const res = await fetch(REMOTE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text
      .split(/\r?\n/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && /^[a-z]+$/.test(w));
  } catch (_) {
    console.warn("Remote word list unavailable — using bundled fallback.");
    return FALLBACK_WORDS;
  }
}
const FALLBACK_WORDS = [
  "aardvark","ability","absence","abstract","accent","access","acclaim","account",
  "accuracy","achieve","acid","acoustic","acquire","action","active","activity",
  "actual","addition","address","adjust","administration","admiral","adoption",
  "advance","adventure","advice","affect","afford","africa","after","agency",
  "agree","airport","alarm","album","alert","algebra","algorithm","almond",
  "along","alpha","already","alter","ambition","ambulance","anchor","ancient",
  "angel","angle","animal","announce","answer","apparent","apple","apply",
  "approve","archive","arctic","argue","array","artist","aspect","assert",
  "assist","assume","attach","attack","attend","attitude","attribute","audit",
  "author","avoid","award","aware","awful",
  "background","balance","banana","barrier","battle","beach","beauty","before",
  "believe","below","benefit","beyond","blank","blast","blend","blind","block",
  "blood","blossom","board","border","bounce","branch","brave","bread","bridge",
  "bring","broken","browser","buffer","build","bundle","butter","button",
  "cable","cache","capture","carbon","careful","castle","catalog","cause","central",
  "certain","chain","change","chapter","charm","chart","cheap","chess","child",
  "chrome","circuit","claim","clarity","class","clean","clever","climate","clock",
  "cloud","cluster","coding","collect","color","column","combat","combine",
  "command","commit","compact","compose","compute","concept","confirm","connect",
  "control","convert","cookie","copy","correct","cover","crash","create","credit",
  "cross","crowd","current","cursor","custom","cycle",
  "damage","danger","data","debug","decide","declare","defend","define","delete",
  "deliver","deploy","depth","design","detect","develop","device","dialog",
  "differ","digital","direct","display","divide","domain","draft","dragon",
  "dynamic",
  "eager","earth","editor","effect","effort","elegant","element","embed","employ",
  "enable","encode","enhance","entire","equal","error","escape","event","evolve",
  "exact","examine","except","exclude","execute","expand","expect","explain",
  "export","extend","extract",
  "fabric","factor","failed","false","fetch","field","filter","finish","fixed",
  "flexible","float","focus","follow","forest","format","fragment","frame",
  "function","future",
  "gather","generate","global","graph","group","guide",
  "handle","header","health","helper","hidden","history","hover",
  "image","import","index","initial","inject","input","install","integrate",
  "internal","iterate",
  "journal","journey","judge",
  "kernel","keyboard","knowledge",
  "label","launch","layer","layout","library","limit","linear","listen","local",
  "logic","lookup",
  "manage","mapping","matrix","measure","memory","method","model","module",
  "monitor","mutate",
  "native","network","neural","number",
  "object","offset","online","option","output","overlap",
  "package","parser","patch","pattern","payload","pending","perform","persist",
  "plugin","pointer","prefer","prefix","process","program","promise","proxy",
  "query","queue","quick",
  "random","range","reach","record","reduce","regex","render","replay","request",
  "resolve","result","return","reverse","router","runtime",
  "schema","search","select","server","session","signal","simple","single","slice",
  "socket","source","stack","state","static","store","stream","string","struct",
  "submit","syntax",
  "target","template","terminal","test","thread","timeout","token","traverse",
  "trigger","tuple","type",
  "union","unique","update","upload","utility",
  "value","variable","vector","version","virtual","visible",
  "widget","window","worker","wrapper","write",
  "yield","zero",
].concat([
  "abstract","adapter","aggregator","algorithm","allocate","annotation",
  "asynchronous","authentication","authorization","automate",
  "benchmark","binary","bitwise","boolean","breakpoint","bytecode",
  "callback","casting","checksum","ciphertext","closure","collection",
  "compilation","concurrency","conditional","constructor","container",
  "daemon","deadlock","dependency","deserialization","destructor",
  "encryption","enumerable","environment","exception","expression",
  "fibonacci","framework","functional","generator","generics",
  "hashing","heap","hook","idempotent","immutable","interface",
  "interpolation","iterator","javascript","jit","json","lazy",
  "lexer","linked","linter","literal","mainframe","middleware",
  "mixin","monad","monorepo","namespace","nullable","observable",
  "overload","overwrite","paradigm","parallelism","parameter","parser",
  "polymorphism","pipeline","prototype","queue","reactive","recursion",
  "reference","reflection","register","runtime","sandbox","scope",
  "serialization","singleton","socket","statement","subscriber","synchronous",
  "testing","transpiler","typescript","undefined","validator","variadic",
  "virtual","webpack","websocket","wrapper",
  "astronomy","astrophysics","biochemistry","catalyst","chromosome",
  "combustion","conductor","crystalline","electrode","electrolysis",
  "electromagnetic","electron","entropy","equilibrium","evaporation",
  "fermentation","fission","fusion","gravitational","halogen",
  "hydraulic","hypothesis","kinetic","laboratory","magnetism","metabolism",
  "molecule","nitrogen","nucleus","organism","osmosis","oxidation",
  "photosynthesis","polymer","precipitation","proton","quantum","radiation",
  "reactant","semiconductor","solubility","spectroscopy","thermodynamics",
  "ultraviolet","velocity","viscosity","wavelength",
  "afghanistan","albania","algeria","arctic","argentina","australia",
  "austria","azerbaijan","bahamas","bangladesh","barcelona","beijing",
  "belgium","berlin","bolivia","borders","brazil","budapest","cairo",
  "cambridge","canada","canberra","caribbean","chile","china","colombia",
  "continent","denmark","dubai","egypt","england","ethiopia",
  "finland","france","germany","ghana","greece","helsinki","himalaya",
  "hungary","iceland","india","indonesia","ireland","istanbul","italy",
  "jakarta","jamaica","japan","jerusalem","jordan","kazakhstan","kenya",
  "korea","kyoto","london","malaysia","maldives","mexico","morocco",
  "mountain","nairobi","netherlands","nigeria","norway","ocean","pacific",
  "pakistan","panama","peninsula","peru","philippines",
  "poland","portugal","prague","romania","russia","sahara","santiago",
  "saudi","scandinavia","scotland","senegal","singapore","slovenia",
  "somalia","spain","stockholm","sweden","switzerland","sydney","taipei",
  "thailand","tibet","tokyo","toronto","turkey","ukraine","uruguay",
  "vietnam","warsaw","zealand",
  "about","above","across","afternoon","again","against","almost","alone",
  "also","although","always","among","another","anyone","anything","around",
  "attempt","away","because","become","between","both","bring","brought",
  "called","came","cannot","carry","children","choice","close","could",
  "different","difficult","does","doing","done","down","during","each",
  "early","else","enough","even","every","everyone","everything","example",
  "face","family","find","first","five","found","four","friend","from",
  "give","given","goes","going","good","great","hand","hard","have","here",
  "himself","home","hope","house","idea","into","its","itself","just","keep",
  "kind","knew","know","large","last","later","learn","leave","less","like",
  "likely","list","little","live","long","look","made","make","many","maybe",
  "mean","might","mind","more","most","much","must","myself","name","need",
  "never","next","night","none","nothing","often","once","only","open",
  "other","our","over","own","part","people","place","play","point","put",
  "read","real","really","right","same","say","school","seem","seen","send",
  "set","she","show","side","since","small","some","something","sometimes",
  "soon","still","such","sure","take","tell","than","that","their","them",
  "then","there","these","they","thing","think","this","those","though",
  "three","through","time","today","together","told","too","took","toward",
  "true","turn","two","under","until","used","very","want","watch","water",
  "way","well","were","what","when","where","whether","which","while","who",
  "whole","will","with","within","without","word","world","would","year",
  "your","yourself",
]);
class AutocompleteUI {
  constructor() {
    this.$input       = document.getElementById("searchInput");
    this.$list        = document.getElementById("suggestionsList");
    this.$wrapper     = document.getElementById("searchWrapper");
    this.$clearBtn    = document.getElementById("clearBtn");
    this.$statusDot   = document.getElementById("statusDot");
    this.$statusText  = document.getElementById("statusText");
    this.$wordCount   = document.getElementById("wordCount");
    this.$nodeCount   = document.getElementById("nodeCount");
    this.$queryTime   = document.getElementById("queryTime");
    this.$resultCount = document.getElementById("resultCount");
    this.$announce    = document.getElementById("srAnnounce");
    this.$clearHistory = document.getElementById("clearHistoryBtn");
    this.trie         = null;
    this.activeIndex  = -1;
    this.currentItems = [];
    this.MAX_RESULTS  = 10;
    this.lastQuery    = "";
    this.fuzzyMode    = false;  
    this._setStatus("loading", "Fetching word list…");
    this._init();
  }
  async _init() {
    try {
      const words = await loadWordList();
      this._setStatus("loading", `Indexing ${words.length.toLocaleString()} words…`);
      await this._nextFrame();
      this.trie = new Trie();
      this.trie.insertMany(words);
      const hist = History.load();
      hist.forEach(w => this.trie.boost(w));
      this._animateCount(this.$wordCount, this.trie.wordCount);
      this._animateCount(this.$nodeCount, this.trie.nodeCount);
      this._setStatus("ready", `Trie ready · ${this.trie.wordCount.toLocaleString()} words indexed`);
      this.$input.disabled = false;
      this.$input.focus();
      this._bindEvents();
    } catch (err) {
      this._setStatus("error", `Failed to initialize: ${err.message}`);
      console.error(err);
    }
  }
  _nextFrame() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  _setStatus(type, text) {
    this.$statusDot.className    = `status-indicator ${type}`;
    this.$statusText.textContent = text;
  }
  _bindEvents() {
    this.$input.addEventListener("input",   () => this._onInput());
    this.$input.addEventListener("keydown", (e) => this._onKeydown(e));
    this.$input.addEventListener("focus",   () => this._onFocusChange(true));
    this.$input.addEventListener("blur",    () => this._onFocusChange(false));
    this.$clearBtn.addEventListener("click", () => this._clearInput());
    if (this.$clearHistory) {
      this.$clearHistory.addEventListener("click", () => {
        History.clear();
        this._closeList();
        this._announce("Search history cleared.");
      });
    }
    document.addEventListener("click", (e) => {
      if (!this.$wrapper.contains(e.target)) this._closeList();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== this.$input) {
        e.preventDefault();
        this.$input.focus();
        this.$input.select();
      }
    });
    const observer = new MutationObserver(() => {
      const open = this.$list.classList.contains("visible");
      this.$input.setAttribute("aria-expanded", open ? "true" : "false");
    });
    observer.observe(this.$list, { attributes: true, attributeFilter: ["class"] });
  }
  _onInput() {
    const value    = this.$input.value;
    const hasValue = value.trim().length > 0;
    this.lastQuery = value.trim().toLowerCase();
    this.$clearBtn.classList.toggle("visible", hasValue);
    if (!hasValue || !this.trie) {
      this._closeList();
      this._updateStat(this.$queryTime,   "—");
      this._updateStat(this.$resultCount, "—");
      return;
    }
    const t0 = performance.now();
    let suggestions = this.trie.suggest(this.lastQuery, this.MAX_RESULTS);
    this.fuzzyMode  = false;
    if (suggestions.length === 0 && this.lastQuery.length >= 3) {
      const fuzzyResults = new Set();
      for (const variant of oneSubstitutions(this.lastQuery)) {
        const res = this.trie.suggest(variant, 3);
        res.forEach(w => fuzzyResults.add(w));
        if (fuzzyResults.size >= this.MAX_RESULTS) break;
      }
      suggestions = [...fuzzyResults].slice(0, this.MAX_RESULTS);
      this.fuzzyMode = suggestions.length > 0;
    }
    const elapsed = performance.now() - t0;
    this._updateStat(this.$queryTime,   `${elapsed.toFixed(3)} ms`);
    this._updateStat(this.$resultCount, suggestions.length.toString());
    this._renderSuggestions(suggestions, this.lastQuery);
    const label = this.fuzzyMode ? `Fuzzy: ` : "";
    this._announce(
      suggestions.length === 0
        ? `No matches for ${this.lastQuery}`
        : `${label}${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} for ${this.lastQuery}`
    );
  }
  _onKeydown(e) {
    const { key } = e;
    if (!this.$list.classList.contains("visible")) {
      if (key === "ArrowDown") { e.preventDefault(); this._onInput(); }
      return;
    }
    switch (key) {
      case "ArrowDown":
        e.preventDefault();
        this._moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this._moveActive(-1);
        break;
      case "Enter":
        e.preventDefault();
        if (this.activeIndex >= 0 && this.currentItems[this.activeIndex]) {
          this._selectWord(this.currentItems[this.activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        this._closeList();
        break;
      case "Tab":
        if (this.currentItems.length > 0) {
          e.preventDefault();
          this._selectWord(this.currentItems[0]);
        }
        break;
    }
  }
  _moveActive(delta) {
    const len = this.currentItems.length;
    if (len === 0) return;
    this.activeIndex = ((this.activeIndex + delta) + len) % len;
    this._highlightActive();
  }
  _highlightActive() {
    const items = this.$list.querySelectorAll(".suggestion-item");
    items.forEach((el, i) => {
      el.classList.toggle("active", i === this.activeIndex);
      if (i === this.activeIndex) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }
  _showHistory() {
    const hist = History.load();
    if (hist.length === 0) return;
    this.activeIndex  = -1;
    this.currentItems = hist;
    this.$list.innerHTML = "";
    const header = document.createElement("li");
    header.className   = "list-header";
    header.textContent = "Recent";
    this.$list.appendChild(header);
    const fragment = document.createDocumentFragment();
    hist.forEach((word, i) => {
      const li = this._makeSuggestionEl(word, "", i, true);
      fragment.appendChild(li);
    });
    this.$list.appendChild(fragment);
    this._openList();
  }
  _renderSuggestions(suggestions, prefix) {
    this.activeIndex  = -1;
    this.currentItems = suggestions;
    this.$list.innerHTML = "";
    if (suggestions.length === 0) {
      this.$list.innerHTML = `<li class="no-results">no matches for "<em>${this._escHtml(prefix)}</em>"</li>`;
      this._openList();
      return;
    }
    if (this.fuzzyMode) {
      const banner = document.createElement("li");
      banner.className   = "list-header fuzzy-banner";
      banner.textContent = `≈ Fuzzy results for "${prefix}"`;
      this.$list.appendChild(banner);
    }
    const fragment = document.createDocumentFragment();
    suggestions.forEach((word, i) => {
      fragment.appendChild(this._makeSuggestionEl(word, prefix, i, false));
    });
    this.$list.appendChild(fragment);
    this._openList();
  }
  _makeSuggestionEl(word, prefix, index, isHistory) {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    if (isHistory) li.classList.add("history-item");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    const matchedPart   = this.fuzzyMode ? word : word.slice(0, prefix.length);
    const remainingPart = this.fuzzyMode ? ""   : word.slice(prefix.length);
    const icon = isHistory ? "↩" : "◆";
    li.innerHTML = `
      <span class="suggestion-icon">${icon}</span>
      <span class="suggestion-text">
        <span class="match-prefix">${this._escHtml(matchedPart)}</span>${this._escHtml(remainingPart)}
      </span>
      <span class="suggestion-rank">${String(index + 1).padStart(2, "0")}</span>
    `;
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this._selectWord(word);
    });
    li.addEventListener("mouseenter", () => {
      this.activeIndex = index;
      this._highlightActive();
    });
    return li;
  }
  _openList() {
    this.$list.classList.add("visible");
    this.$wrapper.classList.add("open");
  }
  _closeList() {
    this.$list.classList.remove("visible");
    this.$wrapper.classList.remove("open");
    this.activeIndex  = -1;
    this.currentItems = [];
    this.fuzzyMode    = false;
  }
  _selectWord(word) {
    this.$input.value = word;
    this._closeList();
    this.$clearBtn.classList.add("visible");
    if (this.trie) this.trie.boost(word);
    History.push(word);
    const t0          = performance.now();
    const suggestions = this.trie ? this.trie.suggest(word, this.MAX_RESULTS) : [];
    const elapsed     = performance.now() - t0;
    this._updateStat(this.$queryTime,   `${elapsed.toFixed(3)} ms`);
    this._updateStat(this.$resultCount, suggestions.length.toString());
    this.$input.focus();
  }
  _clearInput() {
    this.$input.value = "";
    this._closeList();
    this.$clearBtn.classList.remove("visible");
    this._updateStat(this.$queryTime,   "—");
    this._updateStat(this.$resultCount, "—");
    this.lastQuery = "";
    this.$input.focus();
  }
  _onFocusChange(focused) {
    this.$wrapper.classList.toggle("focused", focused);
    if (focused && !this.$input.value.trim()) {
      this._showHistory();
    }
  }
  _animateCount(el, target) {
    const duration = 900;
    const start    = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    };
    requestAnimationFrame(tick);
  }
  _updateStat(el, value) {
    el.textContent = value;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }
  _announce(msg) {
    if (!this.$announce) return;
    this.$announce.textContent = "";
    requestAnimationFrame(() => { this.$announce.textContent = msg; });
  }
  _escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  input.disabled = true;
  new AutocompleteUI();
  const hint = document.createElement("span");
  hint.style.cssText = "margin-left:auto;opacity:0.4;font-size:0.65rem;letter-spacing:0.05em";
  hint.textContent   = "press / to focus";
  document.getElementById("statusLine").appendChild(hint);
});