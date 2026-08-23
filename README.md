# 🧱 Vanilla JS Foundry

A hub for small, self-contained Vanilla JavaScript projects built with **HTML + CSS + JavaScript**.

> Every project follows the three-file contract: `index.html` · `style.css` · `script.js`.
>
> **No frameworks or libraries.** TensorFlow.js is the one exception for AI/ML projects.

## Project structure

```text
VanillaJsFoundry/
├── index.html
├── style.css
├── script.js
├── projects/
│   ├── _template/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   ├── my-project/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── ...
└── README.md
```

The hub automatically discovers project folders under `projects/`. No central registry is required.

## Add a project

1. Copy `projects/_template/` to a new folder such as `projects/calculator/`.
2. Add your `index.html`, `style.css`, and `script.js`.
3. Push the folder to GitHub.
4. The project automatically appears on the hub and is available at `/projects/<project-name>/`.

## Project rules

- One project = one folder.
- Each project contains `index.html`, `style.css`, and `script.js`.
- Keep projects self-contained and dependency-free.
- Browser and platform APIs are encouraged.
- TensorFlow.js is permitted only for AI/ML projects.

# 🧱 The Definitive Vanilla JS Project Ideas Reference

> Pure JS + HTML + CSS only (`index.html` · `style.css` · `script.js`) — no frameworks, no libraries.
> TensorFlow.js is the sole exception for AI/ML projects.

## 📊 Summary Table

| # | Project Name | Category | Difficulty |
|---|---|---|---|
| 1 | Trie-Powered Autocomplete Engine | DOM & UI | Intermediate |
| 2 | Infinite Virtual Scroll | DOM & UI | Intermediate |
| 3 | Schema-Driven Form Builder | DOM & UI | Intermediate |
| 4 | Multi-Step Wizard with State Machine | DOM & UI | Intermediate |
| 5 | CSS-in-JS Theme Engine | DOM & UI | Advanced |
| 6 | Accessible Modal Stack Manager | DOM & UI | Intermediate |
| 7 | Rich Text Editor (no contenteditable libs) | DOM & UI | Advanced |
| 8 | Resizable Split-Pane Layout | DOM & UI | Intermediate |
| 9 | Command Palette (⌘K) | DOM & UI | Intermediate |
| 10 | Drag-to-Reorder Kanban Board | DOM & UI | Advanced |
| 11 | Raycast-style Spotlight Search | DOM & UI | Advanced |
| 12 | Snake [CLASSIC] | Games | Beginner |
| 13 | Tetris [CLASSIC] | Games | Intermediate |
| 14 | Nonogram / Picross Puzzle | Games | Intermediate |
| 15 | Minesweeper with Procedural Generation [CLASSIC] | Games | Intermediate |
| 16 | Wordle Clone with Hard Mode & Stats | Games | Beginner |
| 17 | 2D Platformer with Physics | Games | Advanced |
| 18 | Tower Defense Engine | Games | Advanced |
| 19 | Dungeon Crawler (Roguelite) | Games | Advanced |
| 20 | Chess with Legal Move Validation | Games | Advanced |
| 21 | Sokoban Puzzle Game | Games | Intermediate |
| 22 | Typing Speed Trainer with WPM Graph | Games | Beginner |
| 23 | Gravity Pong | Games | Intermediate |
| 24 | Infinite Runner with Procedural Terrain | Games | Advanced |
| 25 | Cellular Automaton Explorer | Games | Intermediate |
| 26 | Live Bar Chart Race | Data Viz | Intermediate |
| 27 | SVG Force-Directed Graph | Data Viz | Advanced |
| 28 | Heatmap Calendar (GitHub-style) | Data Viz | Intermediate |
| 29 | Real-Time Candlestick Chart | Data Viz | Advanced |
| 30 | Treemap Visualizer | Data Viz | Intermediate |
| 31 | Animated Sankey Diagram | Data Viz | Advanced |
| 32 | Radar / Spider Chart | Data Viz | Intermediate |
| 33 | World Choropleth Map (SVG + GeoJSON) | Data Viz | Advanced |
| 34 | Live CSV → Chart Transformer | Data Viz | Intermediate |
| 35 | REST API Explorer (Postman-lite) | APIs & Async | Intermediate |
| 36 | GitHub Profile Dashboard | APIs & Async | Beginner |
| 37 | WebSocket Chat Room | APIs & Async | Intermediate |
| 38 | Server-Sent Events Live Feed | APIs & Async | Intermediate |
| 39 | OAuth PKCE Flow from Scratch | APIs & Async | Advanced |
| 40 | GraphQL Query Builder & Tester | APIs & Async | Advanced |
| 41 | Paginated Infinite API Feed | APIs & Async | Beginner |
| 42 | Multi-source News Aggregator | APIs & Async | Intermediate |
| 43 | Geolocation Heatmap | Browser APIs | Intermediate |
| 44 | Clipboard Manager | Browser APIs | Beginner |
| 45 | Web Share + File Drop Zone | Browser APIs | Beginner |
| 46 | Push Notification Scheduler | Browser APIs | Intermediate |
| 47 | Speech-to-Text Note Taker | Browser APIs | Intermediate |
| 48 | Text-to-Speech Audiobook Player | Browser APIs | Intermediate |
| 49 | Drag-and-Drop File Organizer | Browser APIs | Intermediate |
| 50 | Bluetooth Device Dashboard | Browser APIs | Advanced |
| 51 | USB HID Input Visualizer | Browser APIs | Advanced |
| 52 | Barcode / QR Scanner (camera) | Browser APIs | Intermediate |
| 53 | Offline-First Notes App (Service Worker) | Storage & State | Intermediate |
| 54 | IndexedDB Photo Gallery | Storage & State | Intermediate |
| 55 | Undo/Redo History Engine | Storage & State | Intermediate |
| 56 | Encrypted Journal (Web Crypto API) | Storage & State | Advanced |
| 57 | Multi-Tab State Sync (BroadcastChannel) | Storage & State | Advanced |
| 58 | Time-Travel Debugger (state snapshots) | Storage & State | Advanced |
| 59 | Progressive Web App Shell | Storage & State | Intermediate |
| 60 | Particle System Engine | Animations | Intermediate |
| 61 | Morphing SVG Blob | Animations | Intermediate |
| 62 | Scroll-Driven Parallax Storytelling | Animations | Intermediate |
| 63 | FLIP Animation Coordinator | Animations | Advanced |
| 64 | Physics-Based Spring UI | Animations | Advanced |
| 65 | Liquid/Metaball Simulation | Animations | Advanced |
| 66 | CSS Custom Property Animator | Animations | Intermediate |
| 67 | 3D Card Deck with Perspective | Animations | Intermediate |
| 68 | Text Scramble / Glitch Reveal | Animations | Beginner |
| 69 | Markdown Editor with Live Preview | Productivity | Beginner |
| 70 | Pomodoro Timer with Session Analytics | Productivity | Beginner |
| 71 | Habit Tracker with Streak Engine | Productivity | Intermediate |
| 72 | Budget Ledger with Chart Summaries | Productivity | Intermediate |
| 73 | Spaced Repetition Flashcard System | Productivity | Intermediate |
| 74 | Mind Map Builder | Productivity | Advanced |
| 75 | Code Snippet Manager with Syntax Highlight | Productivity | Intermediate |
| 76 | Regex Tester & Explainer | Productivity | Intermediate |
| 77 | Cron Expression Builder | Productivity | Intermediate |
| 78 | Visual Color Palette Generator | Productivity | Beginner |
| 79 | Audio Visualizer (FFT Bars) [CLASSIC] | Media | Intermediate |
| 80 | Multi-Track Audio Mixer | Media | Advanced |
| 81 | Webcam Filters & Effects | Media | Intermediate |
| 82 | Video Annotation Timeline | Media | Advanced |
| 83 | Procedural Music Sequencer | Media | Advanced |
| 84 | Voice Pitch Detector | Media | Intermediate |
| 85 | Screen Recorder (MediaRecorder API) | Media | Intermediate |
| 86 | N-Body Gravitational Simulator | Math & Science | Advanced |
| 87 | Fourier Series Visualizer | Math & Science | Intermediate |
| 88 | Reaction-Diffusion System | Math & Science | Advanced |
| 89 | Mandelbrot Set Explorer | Math & Science | Intermediate |
| 90 | Sorting Algorithm Visualizer [CLASSIC] | Math & Science | Beginner |
| 91 | Pathfinding Visualizer (A*, Dijkstra) | Math & Science | Intermediate |
| 92 | Fluid Dynamics Sim (SPH) | Math & Science | Advanced |
| 93 | Double Pendulum Chaos Simulator | Math & Science | Intermediate |
| 94 | Perlin Noise Terrain Generator | Generative Art | Intermediate |
| 95 | L-System Tree Renderer | Generative Art | Intermediate |
| 96 | Truchet Tile Pattern Engine | Generative Art | Beginner |
| 97 | Voronoi Diagram Generator | Generative Art | Intermediate |
| 98 | Generative Typography Poster | Generative Art | Intermediate |
| 99 | Recursive Subdivision Art | Generative Art | Intermediate |
| 100 | Flow Field Vector Art | Generative Art | Intermediate |
| 101 | Spirograph / Hypotrochoid Plotter | Generative Art | Beginner |
| 102 | JS Bundle Size Visualizer | Dev Tools | Intermediate |
| 103 | DOM Tree Inspector (mini DevTools) | Dev Tools | Advanced |
| 104 | CSS Specificity Calculator | Dev Tools | Beginner |
| 105 | Performance Waterfall Profiler | Dev Tools | Advanced |
| 106 | JSON Schema Validator & Diff | Dev Tools | Intermediate |
| 107 | Console.log Time-Travel Replayer | Dev Tools | Advanced |
| 108 | Network Request Interceptor Proxy | Dev Tools | Advanced |
| 109 | Focus Trap & ARIA Live Region Tester | Accessibility | Intermediate |
| 110 | Color Contrast Audit Tool | Accessibility | Beginner |
| 111 | Keyboard Navigation Visualizer | Accessibility | Intermediate |
| 112 | Screen Reader Simulation | Accessibility | Advanced |
| 113 | Dyslexia-Friendly Reading Mode | Accessibility | Intermediate |
| 114 | Motor-Impairment Dwell-Click UI | Accessibility | Advanced |
| 115 | Swipe Gesture Navigation | Mobile/Touch | Beginner |
| 116 | Pull-to-Refresh Feed | Mobile/Touch | Intermediate |
| 117 | Pinch-to-Zoom Image Viewer | Mobile/Touch | Intermediate |
| 118 | Haptic Feedback Drumpad | Mobile/Touch | Intermediate |
| 119 | Touch-Drawing Canvas App | Mobile/Touch | Intermediate |
| 120 | Bottom Sheet & Snap Points | Mobile/Touch | Advanced |
| 121 | In-Browser Pose Estimator (TF.js) | AI/ML | Advanced |
| 122 | Handwriting Digit Classifier (TF.js) | AI/ML | Intermediate |
| 123 | Real-Time Object Detector (TF.js) | AI/ML | Advanced |
| 124 | Sentiment Analyzer (TF.js toxicity) | AI/ML | Intermediate |
| 125 | Face Mesh AR Filter (TF.js) | AI/ML | Advanced |

## 🧩 Category Guide

### DOM & UI
Autocomplete, virtualization, schema-driven forms, state-machine wizards, theme engines, accessible modals, rich text editing, split panes, command palettes, Kanban boards, and Spotlight-style search.

### Games
Snake, Tetris, Nonograms, Minesweeper, Wordle, platformers, tower defense, roguelites, chess, Sokoban, typing trainers, physics games, infinite runners, and cellular automata.

### Data Visualization
Bar races, force graphs, heatmaps, candlesticks, treemaps, Sankey diagrams, radar charts, choropleth maps, and CSV-to-chart tools.

### APIs & Async
REST explorers, GitHub dashboards, WebSocket chat, SSE feeds, OAuth PKCE, GraphQL builders, infinite API feeds, and multi-source aggregation.

### Browser APIs
Geolocation, Clipboard, Web Share, Notifications, Speech APIs, file organization, Web Bluetooth, WebHID, and camera-based QR/barcode scanning.

### Storage & State
Offline notes, IndexedDB galleries, undo/redo engines, encrypted journals, BroadcastChannel synchronization, time-travel debugging, and PWA shells.

### Animations
Particles, SVG morphing, scroll-driven storytelling, FLIP, spring physics, metaballs, CSS variable timelines, 3D cards, and text effects.

### Productivity
Markdown editors, Pomodoro analytics, habit tracking, budgeting, spaced repetition, mind maps, snippets, regex tools, cron builders, and palette generators.

### Media
Audio visualizers, multi-track mixers, webcam effects, video annotations, procedural music, pitch detection, and screen recording.

### Math & Science
N-body simulation, Fourier series, reaction-diffusion, Mandelbrot, sorting, pathfinding, SPH fluids, and double-pendulum chaos.

### Generative Art
Perlin terrain, L-systems, Truchet patterns, Voronoi diagrams, generative typography, recursive subdivision, flow fields, and spirographs.

### Dev Tools
Bundle analysis, DOM inspection, CSS specificity, performance profiling, JSON schema validation/diffing, console replay, and network interception.

### Accessibility
Focus/ARIA testing, contrast auditing, keyboard navigation, screen-reader simulation, dyslexia-friendly reading, and dwell-click interfaces.

### Mobile/Touch
Swipe navigation, pull-to-refresh, pinch zoom, haptic drum pads, touch drawing, and bottom-sheet interactions.

### AI/ML
Browser-based pose estimation, handwriting classification, object detection, toxicity/sentiment analysis, and face-mesh AR using TensorFlow.js only.

## 🏆 Top 10 Most Impressive for a Portfolio

| Rank | Project | Why It Impresses |
|---|---|---|
| 🥇 1 | **Rich Text Editor (from scratch)** (#7) | Deep Selection/Range API and browser editing knowledge. |
| 🥈 2 | **SVG Force-Directed Graph** (#27) | Algorithms, graphics, simulation, and performance without D3. |
| 🥉 3 | **Encrypted Journal (Web Crypto)** (#56) | Browser cryptography with PBKDF2 and AES-GCM. |
| 4 | **Reaction-Diffusion System** (#88) | High-performance Canvas pixel processing and simulation. |
| 5 | **Multi-Track Audio Mixer** (#80) | Precise Web Audio scheduling and timing. |
| 6 | **2D Platformer with Physics** (#17) | Collision detection, game loops, tilemaps, and physics. |
| 7 | **OAuth PKCE Flow from Scratch** (#39) | Authentication, Web Crypto, redirects, and security fundamentals. |
| 8 | **Time-Travel Debugger** (#58) | State snapshots, replay architecture, and memory management. |
| 9 | **Dungeon Crawler Roguelite** (#19) | Procedural generation, FOV, and advanced game architecture. |
| 10 | **Face Mesh AR Filter** (#125) | Browser ML, webcam processing, and real-time geometry. |

## 📌 Catalog Stats

- **125 projects** across **15 categories**
- **7 [CLASSIC]** projects
- **38 [RARE]** projects
- **18 Beginner** · **71 Intermediate** · **36 Advanced**

This catalog is the living backlog for the Foundry. Pick an idea, create `projects/<project-name>/`, implement the three-file contract, and let the hub discover it automatically.
