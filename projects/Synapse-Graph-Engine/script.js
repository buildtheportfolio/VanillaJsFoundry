"use strict";

class QuadTree {
  constructor(x, y, w, h, depth = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.depth = depth;
    this.cx = 0;
    this.cy = 0;
    this.mass = 0;
    this.node = null;
    this.nw = this.ne = this.sw = this.se = null;
  }

  subdivide() {
    const hw = this.w / 2,
      hh = this.h / 2;
    this.nw = new QuadTree(this.x, this.y, hw, hh, this.depth + 1);
    this.ne = new QuadTree(this.x + hw, this.y, hw, hh, this.depth + 1);
    this.sw = new QuadTree(this.x, this.y + hh, hw, hh, this.depth + 1);
    this.se = new QuadTree(this.x + hw, this.y + hh, hw, hh, this.depth + 1);
  }

  insert(n) {
    if (
      n.x < this.x ||
      n.x >= this.x + this.w ||
      n.y < this.y ||
      n.y >= this.y + this.h
    )
      return false;

    this.cx = (this.cx * this.mass + n.x) / (this.mass + 1);
    this.cy = (this.cy * this.mass + n.y) / (this.mass + 1);
    this.mass++;

    if (this.node === null && this.nw === null) {
      this.node = n;
      return true;
    }

    if (this.depth > 20) return true;

    if (this.nw === null) this.subdivide();

    if (this.node !== null) {
      const old = this.node;
      this.node = null;
      if (this.nw.insert(old) || this.ne.insert(old) || this.sw.insert(old) || this.se.insert(old));
    }

    return this.nw.insert(n) || this.ne.insert(n) || this.sw.insert(n) || this.se.insert(n);
  }

  applyForce(n, repulsion, theta) {
    if (this.mass === 0) return;
    const dx = this.cx - n.x,
      dy = this.cy - n.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < 0.01) return;
    if (this.node === n) return;

    const size = Math.max(this.w, this.h);
    if (this.nw === null || (size * size) / dist2 < theta * theta) {
      const dist = Math.sqrt(dist2);
      const force = (repulsion * this.mass) / dist2;
      n.vx -= (force * dx) / dist;
      n.vy -= (force * dy) / dist;
    } else {
      this.nw.applyForce(n, repulsion, theta);
      this.ne.applyForce(n, repulsion, theta);
      this.sw.applyForce(n, repulsion, theta);
      this.se.applyForce(n, repulsion, theta);
    }
  }

  collectRects(out) {
    out.push({ x: this.x, y: this.y, w: this.w, h: this.h });
    if (this.nw) {
      this.nw.collectRects(out);
      this.ne.collectRects(out);
      this.sw.collectRects(out);
      this.se.collectRects(out);
    }
  }
}

const PALETTES = {
  cluster: [
    "#00E5FF",
    "#8B5CF6",
    "#FF4D8A",
    "#FFB830",
    "#84FF00",
    "#FF7040",
    "#00FFC8",
    "#60A5FA",
    "#F472B6",
    "#34D399",
  ],
  degree: (d) => {
    const t = Math.min(d / 20, 1);
    return `hsl(${180 + t * 140}, 90%, ${40 + t * 30}%)`;
  },
  pagerank: (pr) => {
    const t = Math.min(pr * 10, 1);
    return `hsl(${190 - t * 80}, 85%, ${35 + t * 35}%)`;
  },
  type: {
    person: "#00E5FF",
    company: "#8B5CF6",
    technology: "#00FFC8",
    concept: "#FFB830",
    place: "#FF4D8A",
    default: "#60A5FA",
  },
};

const DATASETS = {
  social: {
    title: "Social Network — Influence Graph",
    directed: false,
    nodes: [
      { id: "alice", label: "Alice", type: "person", cluster: 0, group: "Influencers" },
      { id: "bob", label: "Bob", type: "person", cluster: 0, group: "Influencers" },
      { id: "carol", label: "Carol", type: "person", cluster: 1, group: "Content" },
      { id: "dave", label: "Dave", type: "person", cluster: 1, group: "Content" },
      { id: "eve", label: "Eve", type: "person", cluster: 0, group: "Influencers" },
      { id: "frank", label: "Frank", type: "person", cluster: 2, group: "Tech" },
      { id: "grace", label: "Grace", type: "person", cluster: 2, group: "Tech" },
      { id: "henry", label: "Henry", type: "person", cluster: 3, group: "Finance" },
      { id: "iris", label: "Iris", type: "person", cluster: 3, group: "Finance" },
      { id: "jack", label: "Jack", type: "person", cluster: 1, group: "Content" },
      { id: "kate", label: "Kate", type: "person", cluster: 4, group: "Academia" },
      { id: "leo", label: "Leo", type: "person", cluster: 4, group: "Academia" },
      { id: "mia", label: "Mia", type: "person", cluster: 0, group: "Influencers" },
      { id: "noah", label: "Noah", type: "person", cluster: 2, group: "Tech" },
      { id: "olivia", label: "Olivia", type: "person", cluster: 3, group: "Finance" },
      { id: "peter", label: "Peter", type: "person", cluster: 4, group: "Academia" },
      { id: "quinn", label: "Quinn", type: "person", cluster: 1, group: "Content" },
      { id: "rachel", label: "Rachel", type: "person", cluster: 5, group: "Media" },
      { id: "sam", label: "Sam", type: "person", cluster: 5, group: "Media" },
      { id: "tina", label: "Tina", type: "person", cluster: 5, group: "Media" },
      { id: "uma", label: "Uma", type: "person", cluster: 2, group: "Tech" },
      { id: "victor", label: "Victor", type: "person", cluster: 0, group: "Influencers" },
      { id: "wendy", label: "Wendy", type: "person", cluster: 6, group: "Health" },
      { id: "xander", label: "Xander", type: "person", cluster: 6, group: "Health" },
      { id: "yara", label: "Yara", type: "person", cluster: 3, group: "Finance" },
      { id: "zach", label: "Zach", type: "person", cluster: 6, group: "Health" },
    ],
    edges: [
      { s: "alice", e: "bob", w: 5 },
      { s: "alice", e: "carol", w: 3 },
      { s: "alice", e: "mia", w: 4 },
      { s: "alice", e: "victor", w: 6 },
      { s: "bob", e: "eve", w: 3 },
      { s: "bob", e: "frank", w: 2 },
      { s: "bob", e: "dave", w: 3 },
      { s: "carol", e: "dave", w: 5 },
      { s: "carol", e: "jack", w: 4 },
      { s: "carol", e: "quinn", w: 3 },
      { s: "dave", e: "quinn", w: 4 },
      { s: "dave", e: "rachel", w: 2 },
      { s: "eve", e: "mia", w: 5 },
      { s: "eve", e: "alice", w: 4 },
      { s: "frank", e: "grace", w: 5 },
      { s: "frank", e: "noah", w: 4 },
      { s: "frank", e: "uma", w: 3 },
      { s: "grace", e: "noah", w: 4 },
      { s: "grace", e: "uma", w: 3 },
      { s: "henry", e: "iris", w: 5 },
      { s: "henry", e: "olivia", w: 4 },
      { s: "henry", e: "yara", w: 3 },
      { s: "iris", e: "olivia", w: 4 },
      { s: "iris", e: "henry", w: 3 },
      { s: "jack", e: "quinn", w: 3 },
      { s: "jack", e: "carol", w: 4 },
      { s: "kate", e: "leo", w: 5 },
      { s: "kate", e: "peter", w: 4 },
      { s: "leo", e: "peter", w: 4 },
      { s: "leo", e: "kate", w: 3 },
      { s: "mia", e: "victor", w: 4 },
      { s: "mia", e: "alice", w: 3 },
      { s: "noah", e: "frank", w: 3 },
      { s: "noah", e: "uma", w: 4 },
      { s: "olivia", e: "yara", w: 4 },
      { s: "olivia", e: "henry", w: 3 },
      { s: "peter", e: "kate", w: 3 },
      { s: "quinn", e: "rachel", w: 3 },
      { s: "rachel", e: "sam", w: 5 },
      { s: "rachel", e: "tina", w: 4 },
      { s: "sam", e: "tina", w: 4 },
      { s: "sam", e: "rachel", w: 3 },
      { s: "tina", e: "rachel", w: 3 },
      { s: "uma", e: "frank", w: 3 },
      { s: "victor", e: "alice", w: 4 },
      { s: "wendy", e: "xander", w: 5 },
      { s: "wendy", e: "zach", w: 4 },
      { s: "xander", e: "zach", w: 4 },
      { s: "yara", e: "olivia", w: 3 },
      { s: "alice", e: "henry", w: 2 },
      { s: "frank", e: "kate", w: 2 },
      { s: "rachel", e: "victor", w: 1 },
      { s: "bob", e: "henry", w: 1 },
    ],
  },
  tech: {
    title: "Tech Stack — Dependency Graph",
    directed: true,
    nodes: [
      { id: "react", label: "React", type: "technology", cluster: 0, group: "Frontend" },
      { id: "vue", label: "Vue", type: "technology", cluster: 0, group: "Frontend" },
      { id: "angular", label: "Angular", type: "technology", cluster: 0, group: "Frontend" },
      { id: "nextjs", label: "Next.js", type: "technology", cluster: 0, group: "Frontend" },
      { id: "node", label: "Node.js", type: "technology", cluster: 1, group: "Backend" },
      { id: "express", label: "Express", type: "technology", cluster: 1, group: "Backend" },
      { id: "fastify", label: "Fastify", type: "technology", cluster: 1, group: "Backend" },
      { id: "postgres", label: "PostgreSQL", type: "technology", cluster: 2, group: "Database" },
      { id: "mongo", label: "MongoDB", type: "technology", cluster: 2, group: "Database" },
      { id: "redis", label: "Redis", type: "technology", cluster: 2, group: "Database" },
      { id: "graphql", label: "GraphQL", type: "technology", cluster: 3, group: "API" },
      { id: "rest", label: "REST API", type: "technology", cluster: 3, group: "API" },
      { id: "grpc", label: "gRPC", type: "technology", cluster: 3, group: "API" },
      { id: "docker", label: "Docker", type: "technology", cluster: 4, group: "DevOps" },
      { id: "k8s", label: "Kubernetes", type: "technology", cluster: 4, group: "DevOps" },
      { id: "aws", label: "AWS", type: "technology", cluster: 4, group: "Cloud" },
      { id: "vercel", label: "Vercel", type: "technology", cluster: 4, group: "Cloud" },
      { id: "ts", label: "TypeScript", type: "technology", cluster: 0, group: "Language" },
      { id: "python", label: "Python", type: "technology", cluster: 1, group: "Language" },
      { id: "rust", label: "Rust", type: "technology", cluster: 1, group: "Language" },
    ],
    edges: [
      { s: "react", e: "ts", w: 5 },
      { s: "vue", e: "ts", w: 4 },
      { s: "angular", e: "ts", w: 5 },
      { s: "nextjs", e: "react", w: 5 },
      { s: "nextjs", e: "node", w: 4 },
      { s: "nextjs", e: "vercel", w: 3 },
      { s: "node", e: "express", w: 4 },
      { s: "node", e: "fastify", w: 4 },
      { s: "node", e: "ts", w: 3 },
      { s: "express", e: "postgres", w: 3 },
      { s: "express", e: "mongo", w: 3 },
      { s: "express", e: "redis", w: 2 },
      { s: "fastify", e: "postgres", w: 4 },
      { s: "fastify", e: "redis", w: 3 },
      { s: "graphql", e: "node", w: 4 },
      { s: "graphql", e: "react", w: 3 },
      { s: "rest", e: "express", w: 4 },
      { s: "rest", e: "fastify", w: 3 },
      { s: "grpc", e: "rust", w: 4 },
      { s: "grpc", e: "python", w: 3 },
      { s: "docker", e: "node", w: 4 },
      { s: "docker", e: "postgres", w: 3 },
      { s: "docker", e: "redis", w: 3 },
      { s: "k8s", e: "docker", w: 5 },
      { s: "k8s", e: "aws", w: 4 },
      { s: "aws", e: "postgres", w: 3 },
      { s: "aws", e: "redis", w: 3 },
      { s: "aws", e: "k8s", w: 4 },
      { s: "python", e: "postgres", w: 3 },
      { s: "python", e: "mongo", w: 3 },
      { s: "rust", e: "grpc", w: 3 },
      { s: "react", e: "graphql", w: 3 },
      { s: "vue", e: "rest", w: 3 },
      { s: "angular", e: "rest", w: 3 },
    ],
  },
  biology: {
    title: "Neural Network — Activation Graph",
    directed: true,
    nodes: [
      { id: "i1", label: "Input 1", type: "concept", cluster: 0, group: "Input Layer" },
      { id: "i2", label: "Input 2", type: "concept", cluster: 0, group: "Input Layer" },
      { id: "i3", label: "Input 3", type: "concept", cluster: 0, group: "Input Layer" },
      { id: "i4", label: "Input 4", type: "concept", cluster: 0, group: "Input Layer" },
      { id: "h1", label: "H1", type: "concept", cluster: 1, group: "Hidden Layer 1" },
      { id: "h2", label: "H2", type: "concept", cluster: 1, group: "Hidden Layer 1" },
      { id: "h3", label: "H3", type: "concept", cluster: 1, group: "Hidden Layer 1" },
      { id: "h4", label: "H4", type: "concept", cluster: 1, group: "Hidden Layer 1" },
      { id: "h5", label: "H5", type: "concept", cluster: 1, group: "Hidden Layer 1" },
      { id: "h6", label: "H6a", type: "concept", cluster: 2, group: "Hidden Layer 2" },
      { id: "h7", label: "H6b", type: "concept", cluster: 2, group: "Hidden Layer 2" },
      { id: "h8", label: "H6c", type: "concept", cluster: 2, group: "Hidden Layer 2" },
      { id: "h9", label: "H6d", type: "concept", cluster: 2, group: "Hidden Layer 2" },
      { id: "att1", label: "Attn1", type: "technology", cluster: 3, group: "Attention" },
      { id: "att2", label: "Attn2", type: "technology", cluster: 3, group: "Attention" },
      { id: "o1", label: "Out A", type: "place", cluster: 4, group: "Output" },
      { id: "o2", label: "Out B", type: "place", cluster: 4, group: "Output" },
      { id: "o3", label: "Out C", type: "place", cluster: 4, group: "Output" },
    ],
    edges: [
      { s: "i1", e: "h1", w: 3 },
      { s: "i1", e: "h2", w: 2 },
      { s: "i1", e: "h3", w: 4 },
      { s: "i2", e: "h1", w: 2 },
      { s: "i2", e: "h3", w: 3 },
      { s: "i2", e: "h4", w: 4 },
      { s: "i3", e: "h2", w: 3 },
      { s: "i3", e: "h4", w: 2 },
      { s: "i3", e: "h5", w: 4 },
      { s: "i4", e: "h3", w: 4 },
      { s: "i4", e: "h4", w: 3 },
      { s: "i4", e: "h5", w: 2 },
      { s: "h1", e: "h6", w: 3 },
      { s: "h1", e: "h7", w: 4 },
      { s: "h2", e: "h6", w: 4 },
      { s: "h2", e: "h8", w: 3 },
      { s: "h3", e: "h7", w: 3 },
      { s: "h3", e: "h8", w: 4 },
      { s: "h3", e: "h9", w: 2 },
      { s: "h4", e: "h7", w: 2 },
      { s: "h4", e: "h8", w: 3 },
      { s: "h4", e: "h9", w: 4 },
      { s: "h5", e: "h8", w: 4 },
      { s: "h5", e: "h9", w: 3 },
      { s: "h6", e: "att1", w: 5 },
      { s: "h7", e: "att1", w: 4 },
      { s: "h7", e: "att2", w: 3 },
      { s: "h8", e: "att1", w: 3 },
      { s: "h8", e: "att2", w: 4 },
      { s: "h9", e: "att2", w: 5 },
      { s: "att1", e: "o1", w: 5 },
      { s: "att1", e: "o2", w: 4 },
      { s: "att2", e: "o2", w: 4 },
      { s: "att2", e: "o3", w: 5 },
    ],
  },
  knowledge: {
    title: "Knowledge Graph — Concept Map",
    directed: false,
    nodes: [
      { id: "ai", label: "AI", type: "concept", cluster: 0, group: "Core" },
      { id: "ml", label: "Machine Learning", type: "concept", cluster: 0, group: "Core" },
      { id: "dl", label: "Deep Learning", type: "concept", cluster: 0, group: "Core" },
      { id: "nlp", label: "NLP", type: "concept", cluster: 1, group: "AI Apps" },
      { id: "cv", label: "Computer Vision", type: "concept", cluster: 1, group: "AI Apps" },
      { id: "rl", label: "Reinforcement", type: "concept", cluster: 1, group: "AI Apps" },
      { id: "gpt", label: "GPT", type: "technology", cluster: 2, group: "Models" },
      { id: "llama", label: "LLaMA", type: "technology", cluster: 2, group: "Models" },
      { id: "clip", label: "CLIP", type: "technology", cluster: 2, group: "Models" },
      { id: "diffusion", label: "Diffusion", type: "technology", cluster: 2, group: "Models" },
      { id: "transformer", label: "Transformer", type: "concept", cluster: 0, group: "Core" },
      { id: "attention", label: "Attention", type: "concept", cluster: 0, group: "Core" },
      { id: "embedding", label: "Embedding", type: "concept", cluster: 0, group: "Core" },
      { id: "openai", label: "OpenAI", type: "company", cluster: 3, group: "Labs" },
      { id: "meta", label: "Meta AI", type: "company", cluster: 3, group: "Labs" },
      { id: "google", label: "Google Brain", type: "company", cluster: 3, group: "Labs" },
      { id: "ethics", label: "AI Ethics", type: "concept", cluster: 4, group: "Society" },
      { id: "safety", label: "AI Safety", type: "concept", cluster: 4, group: "Society" },
      { id: "bias", label: "Bias", type: "concept", cluster: 4, group: "Society" },
    ],
    edges: [
      { s: "ai", e: "ml", w: 5 },
      { s: "ml", e: "dl", w: 5 },
      { s: "dl", e: "transformer", w: 4 },
      { s: "transformer", e: "attention", w: 5 },
      { s: "transformer", e: "embedding", w: 4 },
      { s: "dl", e: "nlp", w: 4 },
      { s: "dl", e: "cv", w: 4 },
      { s: "ml", e: "rl", w: 3 },
      { s: "nlp", e: "gpt", w: 5 },
      { s: "nlp", e: "llama", w: 4 },
      { s: "transformer", e: "gpt", w: 5 },
      { s: "cv", e: "clip", w: 4 },
      { s: "cv", e: "diffusion", w: 3 },
      { s: "diffusion", e: "clip", w: 3 },
      { s: "gpt", e: "openai", w: 5 },
      { s: "llama", e: "meta", w: 5 },
      { s: "clip", e: "openai", w: 4 },
      { s: "google", e: "transformer", w: 5 },
      { s: "ai", e: "ethics", w: 3 },
      { s: "ml", e: "bias", w: 4 },
      { s: "ai", e: "safety", w: 4 },
      { s: "ethics", e: "bias", w: 4 },
      { s: "ethics", e: "safety", w: 4 },
      { s: "openai", e: "safety", w: 3 },
      { s: "meta", e: "ethics", w: 3 },
      { s: "embedding", e: "nlp", w: 3 },
      { s: "attention", e: "nlp", w: 4 },
    ],
  },
  internet: {
    title: "Internet Topology — AS Graph",
    directed: false,
    nodes: Array.from({ length: 35 }, (_, i) => ({
      id: `n${i}`,
      label: `AS${1000 + i}`,
      type: i < 5 ? "company" : i < 15 ? "technology" : "concept",
      cluster: Math.floor(i / 5),
      group: `Region ${Math.floor(i / 7) + 1}`,
    })),
    edges: (() => {
      const edges = [], n = 35;
      const hubs = [0, 5, 10, 15, 20];
      hubs.forEach((h) => {
        for (let j = 0; j < n; j++) {
          if (j !== h && Math.random() < 0.25)
            edges.push({ s: `n${h}`, e: `n${j}`, w: Math.ceil(Math.random() * 5) });
        }
      });
      hubs.forEach((h, i) => {
        if (i < hubs.length - 1) edges.push({ s: `n${h}`, e: `n${hubs[i+1]}`, w: 5 });
      });
      for (let i = 0; i < n; i++) {
        const near = Math.floor(i / 5) * 5;
        for (let j = near; j < Math.min(near + 5, n); j++) {
          if (i !== j && Math.random() < 0.4)
            edges.push({ s: `n${i}`, e: `n${j}`, w: Math.ceil(Math.random() * 3) });
        }
      }
      return edges;
    })(),
  },
};

const NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let sim = null;
let state = {
  dataset: "social",
  repulsion: 400,
  linkDist: 80,
  linkStr: 0.3,
  gravity: 0.05,
  damping: 0.92,
  theta: 0.8,
  collision: 12,
  nodeSize: 8,
  edgeWidth: 1.5,
  glowStr: 8,
  showLabels: true,
  showWeights: false,
  showArrows: true,
  showMinimap: true,
  degreeSize: true,
  curvedEdges: false,
  showQuadtree: false,
  showClusters: false,
  colorMode: "cluster",
  frozen: false,
  selectedId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  width: 0,
  height: 0,
};

let rafId = null;
let lastTick = 0;
let fps = 60;
let fpsAccum = 0;
let fpsCount = 0;
let tickMs = 0;
let totalTicks = 0;
let qt_rects = [];

class ForceSimulation {
  constructor(nodes, edges, W, H) {
    this.nodes = nodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
      pinned: false, dragging: false,
      r: state.nodeSize
    }));
    this.edges = edges.map(e => ({ ...e, source: null, target: null }));
    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.edges.forEach(e => {
      e.source = this.nodeMap.get(e.s);
      e.target = this.nodeMap.get(e.t || e.e);
    });
    this.edges = this.edges.filter(e => e.source && e.target);
    this.adjList = new Map();
    this.nodes.forEach(n => this.adjList.set(n.id, []));
    this.edges.forEach(e => {
      this.adjList.get(e.source.id)?.push(e.target.id);
      this.adjList.get(e.target.id)?.push(e.source.id);
    });
    this.computeDegrees();
    this.computePageRank();
    this.alpha = 1;
    this.W = W;
    this.H = H;
  }

  computeDegrees() {
    this.nodes.forEach(n => n.degree = 0);
    this.edges.forEach(e => {
      e.source.degree++;
      e.target.degree++;
    });
    this.maxDeg = Math.max(...this.nodes.map(n => n.degree), 1);
  }

  computePageRank(iters = 20, d = 0.85) {
    const N = this.nodes.length;
    let pr = new Map(this.nodes.map(n => [n.id, 1 / N]));
    for (let iter = 0; iter < iters; iter++) {
      const next = new Map();
      this.nodes.forEach(n => {
        const neighbors = this.adjList.get(n.id) || [];
        let sum = 0;
        neighbors.forEach(nbId => {
          const nb = this.nodeMap.get(nbId);
          if (nb) sum += pr.get(nbId) / nb.degree;
        });
        next.set(n.id, (1 - d) / N + d * sum);
      });
      pr = next;
    }
    this.nodes.forEach(n => n.pagerank = pr.get(n.id) || 1 / N);
    this.maxPR = Math.max(...this.nodes.map(n => n.pagerank), 0.001);
  }

  buildQuadTree() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y);
    });
    const pad = 20;
    const qt = new QuadTree(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
    this.nodes.forEach(n => qt.insert(n));
    return qt;
  }

  tick() {
    if (this.alpha < 0.001) return false;
    const qt = this.buildQuadTree();
    if (state.showQuadtree) {
      qt_rects = [];
      qt.collectRects(qt_rects);
    }

    this.nodes.forEach(n => {
      if (n.pinned || n.dragging) return;
      qt.applyForce(n, state.repulsion, state.theta);
    });

    this.edges.forEach(e => {
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const f = (dist - state.linkDist) * state.linkStr * this.alpha;
      const fx = (f * dx) / dist, fy = (f * dy) / dist;
      if (!e.source.pinned && !e.source.dragging) { e.source.vx += fx; e.source.vy += fy; }
      if (!e.target.pinned && !e.target.dragging) { e.target.vx -= fx; e.target.vy -= fy; }
    });

    const cx = this.W / 2, cy = this.H / 2;
    this.nodes.forEach(n => {
      if (n.pinned || n.dragging) return;
      n.vx += (cx - n.x) * state.gravity * this.alpha;
      n.vy += (cy - n.y) * state.gravity * this.alpha;
    });

    if (state.collision > 0) {
      for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const b = this.nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minD = state.collision + (a.r || 8) + (b.r || 8);
          if (dist < minD) {
            const f = ((minD - dist) / dist) * 0.5;
            const fx = dx * f, fy = dy * f;
            if (!a.pinned && !a.dragging) { a.vx -= fx; a.vy -= fy; }
            if (!b.pinned && !b.dragging) { b.vx += fx; b.vy += fy; }
          }
        }
      }
    }

    this.nodes.forEach(n => {
      if (n.pinned || n.dragging) return;
      n.vx *= state.damping; n.vy *= state.damping;
      n.x += n.vx; n.y += n.vy;
    });

    this.alpha *= 0.995;
    totalTicks++;
    return true;
  }
}

let svgDefs, edgesLayer, nodesLayer, labelsLayer;
let edgeEls = new Map(), nodeEls = new Map(), labelEls = new Map(), qtEls = [], clusterEls = [];

function buildSVGDefs() {
  const defs = document.getElementById("svgDefs");
  if (!defs) return;
  defs.innerHTML = "";
  const gf = svgEl("filter", { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
  gf.appendChild(svgEl("feGaussianBlur", { stdDeviation: state.glowStr, result: "blur" }));
  gf.appendChild(svgEl("feComposite", { in: "SourceGraphic", in2: "blur", operator: "over" }));
  defs.appendChild(gf);
  const gfSm = svgEl("filter", { id: "glowSm", x: "-100%", y: "-100%", width: "300%", height: "300%" });
  gfSm.appendChild(svgEl("feGaussianBlur", { stdDeviation: "3", result: "blur" }));
  gfSm.appendChild(svgEl("feComposite", { in: "SourceGraphic", in2: "blur", operator: "over" }));
  defs.appendChild(gfSm);
  const marker = svgEl("marker", { id: "arrow", markerWidth: "8", markerHeight: "8", refX: "7", refY: "3", orient: "auto" });
  marker.appendChild(svgEl("path", { d: "M0,0 L0,6 L8,3 Z", fill: "rgba(0,229,255,0.6)" }));
  defs.appendChild(marker);
  const markerSel = svgEl("marker", { id: "arrowSel", markerWidth: "8", markerHeight: "8", refX: "7", refY: "3", orient: "auto" });
  markerSel.appendChild(svgEl("path", { d: "M0,0 L0,6 L8,3 Z", fill: "#00E5FF" }));
  defs.appendChild(markerSel);
}

function getNodeColor(n) {
  const cm = state.colorMode;
  if (cm === "cluster") return PALETTES.cluster[n.cluster % PALETTES.cluster.length];
  if (cm === "degree") return PALETTES.degree(n.degree || 0);
  if (cm === "pagerank") return PALETTES.pagerank(n.pagerank || 0);
  if (cm === "type") return PALETTES.type[n.type] || PALETTES.type.default;
  return PALETTES.cluster[n.cluster % PALETTES.cluster.length];
}

function getNodeRadius(n) {
  if (!state.degreeSize) return state.nodeSize;
  const deg = n.degree || 0;
  const maxDeg = sim?.maxDeg || 1;
  return state.nodeSize * (0.6 + 0.8 * (deg / maxDeg));
}

function buildEdgeEl(e) {
  const el = svgEl(state.curvedEdges ? "path" : "line", {
    class: "edge-el",
    stroke: "rgba(0,229,255,0.18)",
    "stroke-width": e.w ? Math.max(0.5, e.w * 0.3 * state.edgeWidth) : state.edgeWidth,
    fill: "none",
    "stroke-linecap": "round"
  });
  if (state.showArrows && DATASETS[state.dataset].directed) el.setAttribute("marker-end", "url(#arrow)");
  return el;
}

function buildNodeEl(n) {
  const g = svgEl("g", { class: "node-g", "data-id": n.id });
  const c = getNodeColor(n), r = getNodeRadius(n);
  n.r = r;
  g.appendChild(svgEl("circle", { cx: 0, cy: 0, r: r + 4, fill: c, opacity: "0.12", filter: "url(#glowSm)" }));
  g.appendChild(svgEl("circle", { cx: 0, cy: 0, r: r + 1.5, fill: "none", stroke: c, "stroke-width": "0.8", opacity: "0.4" }));
  g.appendChild(svgEl("circle", { cx: 0, cy: 0, r: r, fill: c, opacity: "0.9", filter: "url(#glow)", class: "node-core" }));
  g.appendChild(svgEl("circle", { cx: 0, cy: 0, r: r * 0.45, fill: "white", opacity: "0.25" }));
  if (n.pinned) g.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 2, fill: "#FFB830" }));
  g.style.cursor = "pointer";
  return g;
}

function buildLabelEl(n) {
  const c = getNodeColor(n);
  const tg = svgEl("g", { class: "label-g", "data-id": n.id, opacity: state.showLabels ? "1" : "0" });
  tg.appendChild(svgEl("rect", { rx: "3", ry: "3", fill: "rgba(4,5,8,0.75)", class: "label-bg" }));
  const tx = svgEl("text", { fill: c, "font-size": "10", "font-family": "Inter, sans-serif", "font-weight": "500", "text-anchor": "middle", "dominant-baseline": "central", class: "label-tx" });
  tx.textContent = n.label;
  tg.appendChild(tx);
  return tg;
}

function initSVGElements() {
  edgesLayer = document.getElementById("edgesLayer");
  nodesLayer = document.getElementById("nodesLayer");
  labelsLayer = document.getElementById("labelsLayer");
  if (!edgesLayer || !nodesLayer || !labelsLayer) return;
  edgesLayer.innerHTML = ""; nodesLayer.innerHTML = ""; labelsLayer.innerHTML = "";
  edgeEls.clear(); nodeEls.clear(); labelEls.clear();
  buildSVGDefs();
  sim.edges.forEach(e => {
    const el = buildEdgeEl(e);
    edgesLayer.appendChild(el);
    edgeEls.set(`${e.source.id}-${e.target.id}`, el);
  });
  sim.nodes.forEach(n => {
    const g = buildNodeEl(n), lg = buildLabelEl(n);
    nodesLayer.appendChild(g); labelsLayer.appendChild(lg);
    nodeEls.set(n.id, g); labelEls.set(n.id, lg);
    attachNodeEvents(n, g);
  });
}

function attachNodeEvents(n, g) {
  let dragActive = false, dragOX = 0, dragOY = 0;
  g.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    if (e.button === 2 || e.detail === 2) { n.pinned = !n.pinned; return; }
    dragActive = true; n.dragging = true;
    sim.alpha = Math.max(sim.alpha, 0.3);
    const pt = svgPoint(e);
    dragOX = pt.x - n.x; dragOY = pt.y - n.y;
    e.preventDefault();
  });
  g.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!dragActive) selectNode(n.id);
    dragActive = false;
  });
  document.addEventListener("mousemove", (e) => {
    if (!n.dragging) return;
    const pt = svgPoint(e);
    n.x = pt.x - dragOX; n.y = pt.y - dragOY;
    sim.alpha = Math.max(sim.alpha, 0.1);
  });
  document.addEventListener("mouseup", () => n.dragging = false);
}

function svgPoint(e) {
  const svg = document.getElementById("mainSvg");
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function selectNode(id) {
  state.selectedId = id === state.selectedId ? null : id;
  updateSelectionPanel();
  updateNodeHighlight();
}

function updateNodeHighlight() {
  const selId = state.selectedId;
  const neighbors = selId ? new Set(sim.adjList.get(selId) || []) : null;
  sim.nodes.forEach(n => {
    const g = nodeEls.get(n.id), lg = labelEls.get(n.id);
    if (!g) return;
    const isSel = n.id === selId, isNb = neighbors?.has(n.id);
    const isFaded = selId && !isSel && !isNb;
    g.style.opacity = isFaded ? "0.2" : "1";
    if (lg) lg.style.opacity = isFaded || !state.showLabels ? "0" : "1";
    const core = g.querySelector(".node-core");
    if (core) core.setAttribute("filter", isSel ? "url(#glowSm)" : "url(#glow)");
  });
  sim.edges.forEach(e => {
    const el = edgeEls.get(`${e.source.id}-${e.target.id}`);
    if (!el) return;
    const connected = selId && (e.source.id === selId || e.target.id === selId);
    el.style.opacity = selId && !connected ? "0.05" : "1";
    if (connected) {
      el.setAttribute("stroke", "#00E5FF"); el.setAttribute("stroke-width", state.edgeWidth * 2);
      if (state.showArrows && DATASETS[state.dataset].directed) el.setAttribute("marker-end", "url(#arrowSel)");
    } else {
      el.setAttribute("stroke", "rgba(0,229,255,0.18)");
      el.setAttribute("stroke-width", e.w ? Math.max(0.5, e.w * 0.3 * state.edgeWidth) : state.edgeWidth);
      if (state.showArrows && DATASETS[state.dataset].directed) el.setAttribute("marker-end", "url(#arrow)");
    }
  });
}

function updateSelectionPanel() {
  const panel = document.getElementById("selectionInfo");
  if (!state.selectedId || !sim) { panel.classList.add("hidden"); return; }
  const n = sim.nodeMap.get(state.selectedId);
  if (!n) { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  const c = getNodeColor(n);
  const wrap = document.getElementById("siIconWrap");
  wrap.style.cssText = `background:${c}22;border-color:${c};color:${c}`;
  wrap.textContent = n.label[0];
  document.getElementById("siLabel").textContent = n.label;
  document.getElementById("siId").textContent = n.id;
  document.getElementById("siBody").innerHTML = `
    <div class="si-row"><span class="si-row-key">Type</span><span class="si-row-val">${esc(n.type || "—")}</span></div>
    <div class="si-row"><span class="si-row-key">Group</span><span class="si-row-val">${esc(n.group || "—")}</span></div>
    <div class="si-row"><span class="si-row-key">Degree</span><span class="si-row-val">${n.degree || 0}</span></div>
    <div class="si-row"><span class="si-row-key">PageRank</span><span class="si-row-val">${((n.pagerank || 0) * 100).toFixed(2)}%</span></div>
    <div class="si-row"><span class="si-row-key">Cluster</span><span class="si-row-val">${n.cluster}</span></div>
    <div class="si-neighbors">↔ <strong style="color:#E0EAF8">Neighbors:</strong> ${(sim.adjList.get(n.id) || []).map(id => esc(sim.nodeMap.get(id)?.label || id)).join(", ") || "none"}</div>
  `;
}

function updatePositions() {
  if (!sim) return;
  if (state.showQuadtree) {
    while (qtEls.length > qt_rects.length) qtEls.pop().remove();
    while (qtEls.length < qt_rects.length) {
      const r = svgEl("rect", { class: "qt-rect" });
      edgesLayer.appendChild(r); qtEls.push(r);
    }
    qt_rects.forEach((rc, i) => {
      const el = qtEls[i];
      el.setAttribute("x", rc.x); el.setAttribute("y", rc.y);
      el.setAttribute("width", rc.w); el.setAttribute("height", rc.h);
    });
  } else { qtEls.forEach(el => el.remove()); qtEls = []; }

  if (state.showClusters) drawClusters();
  else { clusterEls.forEach(el => el.remove()); clusterEls = []; }

  sim.edges.forEach(e => {
    const el = edgeEls.get(`${e.source.id}-${e.target.id}`);
    if (!el) return;
    const dx = e.target.x - e.source.x, dy = e.target.y - e.source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const sr = getNodeRadius(e.source) + 1, tr = getNodeRadius(e.target) + 4;
    const ex = e.source.x + (dx / dist) * sr, ey = e.source.y + (dy / dist) * sr;
    const tx = e.target.x - (dx / dist) * tr, ty = e.target.y - (dy / dist) * tr;
    if (state.curvedEdges) {
      const mx = (ex + tx) / 2 + dy * 0.3, my = (ey + ty) / 2 - dx * 0.3;
      el.setAttribute("d", `M${ex},${ey} Q${mx},${my} ${tx},${ty}`);
    } else {
      el.setAttribute("x1", ex); el.setAttribute("y1", ey);
      el.setAttribute("x2", tx); el.setAttribute("y2", ty);
    }
  });

  sim.nodes.forEach(n => {
    const g = nodeEls.get(n.id), lg = labelEls.get(n.id), r = getNodeRadius(n);
    n.r = r;
    if (g) {
      g.setAttribute("transform", `translate(${n.x},${n.y})`);
      g.querySelector(".node-core").setAttribute("r", r);
      g.querySelector("circle:nth-child(2)").setAttribute("r", r + 1.5);
      g.querySelector("circle:nth-child(1)").setAttribute("r", r + 4);
      g.querySelector("circle:nth-child(4)").setAttribute("r", r * 0.45);
    }
    if (lg && state.showLabels) {
      const len = n.label.length * 5.5;
      const bg = lg.querySelector(".label-bg");
      bg.setAttribute("x", -len / 2 - 3); bg.setAttribute("y", -8);
      bg.setAttribute("width", len + 6); bg.setAttribute("height", 13);
      lg.setAttribute("transform", `translate(${n.x},${n.y + r + 11})`);
    }
  });

  if (state.showWeights) {
    sim.edges.forEach(e => {
      if (!e.w) return;
      const wKey = `w-${e.source.id}-${e.target.id}`;
      let wEl = document.querySelector(`[data-wkey="${wKey}"]`);
      if (!wEl) {
        wEl = svgEl("text", { "font-size": "8", fill: "rgba(0,229,255,0.5)", "text-anchor": "middle", "dominant-baseline": "central", "data-wkey": wKey, "pointer-events": "none" });
        labelsLayer.appendChild(wEl);
      }
      wEl.setAttribute("transform", `translate(${(e.source.x + e.target.x) / 2},${(e.source.y + e.target.y) / 2})`);
      wEl.textContent = e.w;
    });
  }
  updateMinimap();
}

function drawClusters() {
  clusterEls.forEach(el => el.remove()); clusterEls = [];
  const groups = new Map();
  sim.nodes.forEach(n => { if (!groups.has(n.cluster)) groups.set(n.cluster, []); groups.get(n.cluster).push(n); });
  groups.forEach((nodes, idx) => {
    if (nodes.length < 2) return;
    const cx = nodes.reduce((a, n) => a + n.x, 0) / nodes.length;
    const cy = nodes.reduce((a, n) => a + n.y, 0) / nodes.length;
    const rx = Math.max(...nodes.map(n => Math.abs(n.x - cx))) + 40;
    const ry = Math.max(...nodes.map(n => Math.abs(n.y - cy))) + 40;
    const c = PALETTES.cluster[idx % PALETTES.cluster.length];
    const el = svgEl("ellipse", { cx, cy, rx, ry, class: "cluster-hull", fill: c, stroke: c });
    edgesLayer.insertBefore(el, edgesLayer.firstChild); clusterEls.push(el);
  });
}

function updateMinimap() {
  const mmSvg = document.getElementById("minimapSvg");
  if (!mmSvg || !sim || !state.showMinimap) { if (mmSvg) mmSvg.innerHTML = ""; return; }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  sim.nodes.forEach(n => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); });
  const mmW = 140, mmH = 100, pad = 20, gW = maxX - minX + pad * 2 || 1, gH = maxY - minY + pad * 2 || 1;
  const sc = Math.min(mmW / gW, mmH / gH), ox = (mmW - gW * sc) / 2, oy = (mmH - gH * sc) / 2;
  const toMM = (x, y) => [(x - minX + pad) * sc + ox, (y - minY + pad) * sc + oy];
  mmSvg.innerHTML = "";
  sim.edges.forEach(e => {
    const [x1, y1] = toMM(e.source.x, e.source.y), [x2, y2] = toMM(e.target.x, e.target.y);
    mmSvg.appendChild(svgEl("line", { x1, y1, x2, y2, stroke: "rgba(0,229,255,0.1)", "stroke-width": "0.5" }));
  });
  sim.nodes.forEach(n => {
    const [cx, cy] = toMM(n.x, n.y);
    mmSvg.appendChild(svgEl("circle", { cx, cy, r: 2, fill: getNodeColor(n), opacity: "0.8" }));
  });
  const [vx1, vy1] = toMM(-state.panX / state.zoom, -state.panY / state.zoom);
  const [vx2, vy2] = toMM((-state.panX + state.width) / state.zoom, (-state.panY + state.height) / state.zoom);
  mmSvg.appendChild(svgEl("rect", { x: vx1, y: vy1, width: vx2 - vx1, height: vy2 - vy1, class: "minimap-viewport" }));
}

function updateZoomTransform() {
  const layer = document.getElementById("zoomLayer");
  if (layer) layer.setAttribute("transform", `translate(${state.panX},${state.panY}) scale(${state.zoom})`);
  const zd = document.getElementById("zoomDisplay");
  if (zd) zd.textContent = Math.round(state.zoom * 100) + "%";
}

function fitView() {
  if (!sim || !sim.nodes.length) return;
  const area = document.getElementById("graphArea");
  const W = area.clientWidth, H = area.clientHeight;
  state.width = W; state.height = H;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  sim.nodes.forEach(n => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); });
  const pad = 80, gW = maxX - minX + pad * 2, gH = maxY - minY + pad * 2;
  const z = Math.min(W / gW, H / gH, 2);
  state.zoom = z; state.panX = (W - (maxX + minX) * z) / 2; state.panY = (H - (maxY + minY) * z) / 2;
  updateZoomTransform();
}

function applyLayout(type) {
  if (!sim) return;
  const N = sim.nodes.length, W = state.width || 800, H = state.height || 600;
  sim.alpha = 1;
  if (type === "circle") {
    sim.nodes.forEach((n, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2, r = Math.min(W, H) * 0.38; n.x = W / 2 + r * Math.cos(a); n.y = H / 2 + r * Math.sin(a); n.vx = n.vy = 0; });
  } else if (type === "grid") {
    const cols = Math.ceil(Math.sqrt(N)), sx = W / (cols + 1), sy = H / (Math.ceil(N / cols) + 1);
    sim.nodes.forEach((n, i) => { n.x = sx * ((i % cols) + 1); n.y = sy * (Math.floor(i / cols) + 1); n.vx = n.vy = 0; });
  } else if (type === "radial") {
    const hubs = sim.nodes.filter(n => n.degree >= 4), spokes = sim.nodes.filter(n => n.degree < 4);
    hubs.forEach((n, i) => { const a = (i / Math.max(hubs.length, 1)) * Math.PI * 2; n.x = W / 2 + 150 * Math.cos(a); n.y = H / 2 + 150 * Math.sin(a); n.vx = n.vy = 0; });
    spokes.forEach((n, i) => { const a = (i / Math.max(spokes.length, 1)) * Math.PI * 2; n.x = W / 2 + 280 * Math.cos(a); n.y = H / 2 + 280 * Math.sin(a); n.vx = n.vy = 0; });
  } else if (type === "clusters") {
    const map = new Map(); sim.nodes.forEach(n => { if (!map.has(n.cluster)) map.set(n.cluster, []); map.get(n.cluster).push(n); });
    let ci = 0; map.forEach((nodes) => {
      const ca = (ci / map.size) * Math.PI * 2, cR = Math.min(W, H) * 0.32;
      const cX = W / 2 + cR * Math.cos(ca), cY = H / 2 + cR * Math.sin(ca);
      nodes.forEach((n, ni) => { const a = (ni / nodes.length) * Math.PI * 2; n.x = cX + 60 * Math.cos(a); n.y = cY + 60 * Math.sin(a); n.vx = n.vy = 0; });
      ci++;
    });
  } else if (type === "tree") {
    const root = sim.nodes.reduce((a, b) => (a.degree > b.degree ? a : b));
    const visited = new Set([root.id]), levels = [[root]]; let curr = [root];
    while (visited.size < N && curr.length) {
      const next = []; curr.forEach(n => (sim.adjList.get(n.id) || []).forEach(nbId => { if (!visited.has(nbId)) { visited.add(nbId); const nb = sim.nodeMap.get(nbId); if (nb) next.push(nb); } }));
      if (next.length) levels.push(next); curr = next;
    }
    const levelH = H / (levels.length + 1);
    levels.forEach((lvl, li) => { const sw = W / (lvl.length + 1); lvl.forEach((n, ni) => { n.x = sw * (ni + 1); n.y = levelH * (li + 1); n.vx = n.vy = 0; }); });
  } else { sim.nodes.forEach(n => { n.x = W / 2 + (Math.random() - 0.5) * 400; n.y = H / 2 + (Math.random() - 0.5) * 400; n.vx = n.vy = 0; }); }
}

function updateStats() {
  if (!sim) return;
  const sg = document.getElementById("statsGrid");
  if (!sg) return;
  const density = sim.edges.length / Math.max((sim.nodes.length * (sim.nodes.length - 1)) / 2, 1);
  const avgDeg = ((sim.edges.length * 2) / Math.max(sim.nodes.length, 1)).toFixed(1);
  const leader = sim.nodes.reduce((a, b) => (a.degree > b.degree ? a : b), sim.nodes[0]);
  sg.innerHTML = `
    <div class="stat-cell"><div class="sc-label">Nodes</div><div class="sc-val">${sim.nodes.length}</div></div>
    <div class="stat-cell"><div class="sc-label">Edges</div><div class="sc-val">${sim.edges.length}</div></div>
    <div class="stat-cell"><div class="sc-label">Density</div><div class="sc-val">${(density * 100).toFixed(1)}%</div></div>
    <div class="stat-cell"><div class="sc-label">Avg Degree</div><div class="sc-val">${avgDeg}</div></div>
    <div class="stat-cell"><div class="sc-label">Max Degree</div><div class="sc-val">${sim.maxDeg}</div></div>
    <div class="stat-cell"><div class="sc-label">Hub</div><div class="sc-val" style="font-size:9px;color:var(--teal)">${esc(leader?.label || "—")}</div></div>
  `;
  const dg = document.getElementById("diagGrid");
  if (dg) dg.innerHTML = `<div class="diag-row"><span class="diag-key">Algorithm</span><span class="diag-val">Barnes-Hut</span></div><div class="diag-row"><span class="diag-key">Complexity</span><span class="diag-val">O(n log n)</span></div><div class="diag-row"><span class="diag-key">θ threshold</span><span class="diag-val">${state.theta.toFixed(2)}</span></div><div class="diag-row"><span class="diag-key">Alpha</span><span class="diag-val">${sim.alpha.toFixed(4)}</span></div><div class="diag-row"><span class="diag-key">Total ticks</span><span class="diag-val">${totalTicks}</span></div><div class="diag-row"><span class="diag-key">Tick time</span><span class="diag-val">${tickMs}ms</span></div>`;
  const nl = document.getElementById("nodeList");
  if (nl) {
    nl.innerHTML = "";
    [...sim.nodes].sort((a, b) => b.degree - a.degree).slice(0, 20).forEach(n => {
      const div = document.createElement("div"); div.className = "nl-item" + (n.id === state.selectedId ? " selected" : "");
      div.innerHTML = `<div class="nl-dot" style="background:${getNodeColor(n)}"></div><span class="nl-name">${esc(n.label)}</span><span class="nl-deg">d:${n.degree}</span>`;
      div.addEventListener("click", () => selectNode(n.id)); nl.appendChild(div);
    });
  }
}

function loop(ts) {
  rafId = requestAnimationFrame(loop);
  const dt = ts - lastTick; lastTick = ts;
  fpsAccum += dt; fpsCount++;
  if (fpsAccum >= 500) { fps = Math.round(1000 / (fpsAccum / fpsCount)); fpsAccum = 0; fpsCount = 0; const el = document.getElementById("perfFps"); if (el) el.textContent = fps + " FPS"; }
  let ticking = false;
  if (!state.frozen && sim && sim.alpha > 0.001) {
    const t0 = performance.now(); ticking = sim.tick(); tickMs = Math.round(performance.now() - t0);
    const tmEl = document.getElementById("perfTick"); if (tmEl) tmEl.textContent = tickMs + "ms";
    const dot = document.getElementById("simDot"), statusEl = document.getElementById("simStatus");
    if (ticking) { dot?.classList.add("active"); if (statusEl) statusEl.textContent = `α = ${sim.alpha.toFixed(3)}`; }
    else { dot?.classList.remove("active"); if (statusEl) statusEl.textContent = "Equilibrium"; }
  }
  updatePositions(); if (ticking || totalTicks < 20) updateStats();
}

function loadDataset(key) {
  if (rafId) cancelAnimationFrame(rafId);
  const ds = DATASETS[key]; if (!ds) return;
  state.dataset = key; totalTicks = 0; state.selectedId = null;
  document.getElementById("selectionInfo")?.classList.add("hidden");
  const area = document.getElementById("graphArea");
  const W = area.clientWidth || 800, H = area.clientHeight || 600;
  state.width = W; state.height = H; state.zoom = 1; state.panX = 0; state.panY = 0;
  sim = new ForceSimulation(ds.nodes, ds.edges, W, H);
  initSVGElements(); updateZoomTransform();
  sim.alpha = 1; lastTick = performance.now(); loop(lastTick);
  setTimeout(fitView, 800); setTimeout(() => updateStats(), 200);
}

function exportSVG() {
  const svg = document.getElementById("mainSvg");
  const s = new XMLSerializer().serializeToString(svg);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
  a.download = `synapse_${state.dataset}_${Date.now()}.svg`; a.click();
}

function bindPanZoom() {
  const area = document.getElementById("graphArea");
  let panning = false, px = 0, py = 0;
  area.addEventListener("wheel", (e) => {
    e.preventDefault(); const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = area.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
    state.panX = mx - (mx - state.panX) * factor; state.panY = my - (my - state.panY) * factor;
    state.zoom = Math.max(0.1, Math.min(5, state.zoom * factor)); updateZoomTransform();
  }, { passive: false });
  area.addEventListener("mousedown", (e) => { if (e.target.closest(".node-g")) return; panning = true; px = e.clientX; py = e.clientY; e.preventDefault(); });
  document.addEventListener("mousemove", (e) => { if (!panning) return; state.panX += e.clientX - px; state.panY += e.clientY - py; px = e.clientX; py = e.clientY; updateZoomTransform(); });
  document.addEventListener("mouseup", () => panning = false);
}

document.addEventListener("DOMContentLoaded", () => {
  bindPanZoom();
  document.getElementById("datasetTabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".dt-btn"); if (!btn) return;
    document.querySelectorAll(".dt-btn").forEach(b => b.classList.toggle("active", b === btn));
    loadDataset(btn.dataset.ds);
  });
  const sliders = [
    ["repulsion", "repulsionVal", (v) => state.repulsion = parseFloat(v), (v) => v],
    ["linkDist", "linkDistVal", (v) => state.linkDist = parseFloat(v), (v) => v],
    ["linkStr", "linkStrVal", (v) => state.linkStr = parseFloat(v), (v) => parseFloat(v).toFixed(2)],
    ["gravity", "gravityVal", (v) => state.gravity = parseFloat(v), (v) => parseFloat(v).toFixed(3)],
    ["damping", "dampingVal", (v) => state.damping = parseFloat(v), (v) => parseFloat(v).toFixed(3)],
    ["theta", "thetaVal", (v) => state.theta = parseFloat(v), (v) => parseFloat(v).toFixed(2)],
    ["collision", "collisionVal", (v) => state.collision = parseFloat(v), (v) => v],
    ["nodeSize", "nodeSizeVal", (v) => state.nodeSize = parseFloat(v), (v) => v],
    ["edgeWidth", "edgeWidthVal", (v) => state.edgeWidth = parseFloat(v), (v) => v],
    ["glowStr", "glowStrVal", (v) => { state.glowStr = parseFloat(v); buildSVGDefs(); }, (v) => v],
  ];
  sliders.forEach(([id, valId, setter, fmt]) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener("input", () => { setter(el.value); const vEl = document.getElementById(valId); if (vEl) vEl.textContent = fmt(el.value); if (sim) sim.alpha = Math.max(sim.alpha, 0.5); });
  });
  const checks = {
    showLabels: (v) => { state.showLabels = v; labelsLayer.style.opacity = v ? "1" : "0"; },
    showWeights: (v) => { state.showWeights = v; if (!v) document.querySelectorAll("[data-wkey]").forEach(el => el.remove()); },
    showArrows: (v) => { state.showArrows = v; sim?.edges.forEach(e => { const el = edgeEls.get(`${e.source.id}-${e.target.id}`); if (el) el.setAttribute("marker-end", v && DATASETS[state.dataset].directed ? "url(#arrow)" : "none"); }); },
    showMinimap: (v) => { state.showMinimap = v; const mw = document.getElementById("minimapWrap"); if (mw) mw.style.display = v ? "" : "none"; },
    degreeSize: (v) => { state.degreeSize = v; if (sim) sim.alpha = Math.max(sim.alpha, 0.3); },
    curvedEdges: (v) => { state.curvedEdges = v; edgesLayer.innerHTML = ""; edgeEls.clear(); sim?.edges.forEach(e => { const el = buildEdgeEl(e); edgesLayer.appendChild(el); edgeEls.set(`${e.source.id}-${e.target.id}`, el); }); },
    showQuadtree: (v) => { state.showQuadtree = v; if (!v) { qtEls.forEach(el => el.remove()); qtEls = []; } },
    showClusters: (v) => { state.showClusters = v; if (!v) { clusterEls.forEach(el => el.remove()); clusterEls = []; } },
  };
  Object.entries(checks).forEach(([id, fn]) => { document.getElementById(id)?.addEventListener("change", (e) => fn(e.target.checked)); });
  document.getElementById("colorModeRow")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cm-btn"); if (!btn) return;
    document.querySelectorAll(".cm-btn").forEach(b => b.classList.toggle("active", b === btn));
    state.colorMode = btn.dataset.cm;
    sim?.nodes.forEach(n => {
      const g = nodeEls.get(n.id); if (!g) return;
      const c = getNodeColor(n);
      g.querySelectorAll("circle").forEach((circle, i) => { if (i === 0 || i === 2) circle.setAttribute("fill", c); if (i === 1) circle.setAttribute("stroke", c); });
      const lg = labelEls.get(n.id); if (lg) { const tx = lg.querySelector(".label-tx"); if (tx) tx.setAttribute("fill", c); }
    });
    updateStats();
  });
  document.getElementById("layoutGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".lg-btn"); if (!btn) return;
    applyLayout(btn.dataset.layout); if (sim) sim.alpha = 1;
  });
  document.getElementById("btnLayout")?.addEventListener("click", () => { applyLayout("random"); if (sim) sim.alpha = 1; });
  document.getElementById("btnFreeze")?.addEventListener("click", (e) => {
    state.frozen = !state.frozen; e.currentTarget.classList.toggle("active", state.frozen);
    const d = document.getElementById("simDot"), s = document.getElementById("simStatus");
    if (state.frozen) { d?.classList.remove("active"); if (s) s.textContent = "Frozen"; }
    else if (sim) sim.alpha = Math.max(sim.alpha, 0.3);
  });
  document.getElementById("btnFitView")?.addEventListener("click", fitView);
  document.getElementById("btnExportSVG")?.addEventListener("click", exportSVG);
  document.getElementById("btnTogglePanel")?.addEventListener("click", () => document.getElementById("controlPanel")?.classList.toggle("hidden"));
  document.getElementById("siClose")?.addEventListener("click", () => { state.selectedId = null; updateSelectionPanel(); updateNodeHighlight(); });
  document.getElementById("nodeSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase(); if (!sim) return;
    if (!q) { sim.nodes.forEach(n => { nodeEls.get(n.id)?.style.setProperty("opacity", "1"); labelEls.get(n.id)?.style.setProperty("opacity", state.showLabels ? "1" : "0"); }); return; }
    const match = sim.nodes.find(n => n.label.toLowerCase().startsWith(q) || n.id.toLowerCase().startsWith(q));
    if (match) selectNode(match.id);
  });
  window.addEventListener("resize", () => {
    const area = document.getElementById("graphArea");
    state.width = area.clientWidth; state.height = area.clientHeight;
    if (sim) { sim.W = state.width; sim.H = state.height; }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { state.selectedId = null; updateSelectionPanel(); updateNodeHighlight(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "0") { e.preventDefault(); fitView(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "+") { e.preventDefault(); state.zoom = Math.min(5, state.zoom * 1.2); updateZoomTransform(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); state.zoom = Math.max(0.1, state.zoom * 0.8); updateZoomTransform(); }
    if (e.key === "f" && !e.ctrlKey) { state.frozen = !state.frozen; document.getElementById("btnFreeze")?.classList.toggle("active", state.frozen); }
  });
  loadDataset("social");
});
