# Vanilla JS Foundry

A hub for small, self-contained Vanilla JavaScript projects.

## Project structure

Each project lives in its own folder under `projects/` and contains only:

```text
projects/
└── my-project/
    ├── index.html
    ├── style.css
    └── script.js
```

The hub automatically discovers project folders through the GitHub Contents API. No central registry is required.

## Add a project

1. Copy `projects/_template/` to a new folder such as `projects/calculator/`.
2. Add your `index.html`, `style.css`, and `script.js`.
3. Push the folder to the repository.
4. The project automatically appears on the hub.

Projects are opened directly at `/projects/<project-name>/`.

## Template

`projects/_template/` is intentionally kept to the same three-file structure as every project so new experiments stay portable and dependency-free.
