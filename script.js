const PROJECTS_API = 'https://api.github.com/repos/buildtheportfolio/VanillaJsFoundry/contents/projects';
const projectsEl = document.getElementById('projects');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const countEl = document.getElementById('count');

const REQUIRED_FILES = new Set(['index.html', 'script.js', 'style.css']);
let projects = [];

function titleFromSlug(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function routeFor(slug) {
  return `projects/${encodeURIComponent(slug)}/`;
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const visible = projects.filter(project =>
    project.name.toLowerCase().includes(query) || project.slug.toLowerCase().includes(query)
  );

  countEl.textContent = `${visible.length} project${visible.length === 1 ? '' : 's'}`;
  projectsEl.innerHTML = visible.length
    ? visible.map(project => `
      <a class="card" href="${routeFor(project.slug)}">
        <h2>${project.name}</h2>
        <p>Vanilla HTML, CSS and JavaScript project.</p>
        <span class="open">Open project →</span>
      </a>
    `).join('')
    : '<div class="empty">No projects match your search.</div>';

  statusEl.hidden = true;
}

async function inspectProject(entry) {
  const response = await fetch(entry.url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) return null;

  const contents = await response.json();
  if (!Array.isArray(contents)) return null;

  const files = new Set(contents.filter(item => item.type === 'file').map(item => item.name));
  if (![...REQUIRED_FILES].every(file => files.has(file))) return null;

  return {
    slug: entry.name,
    name: titleFromSlug(entry.name)
  };
}

async function loadProjects() {
  try {
    const response = await fetch(PROJECTS_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

    const entries = await response.json();
    const candidates = entries.filter(entry => entry.type === 'dir' && entry.name !== '_template');
    const discovered = await Promise.all(candidates.map(inspectProject));

    projects = discovered
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    render();
  } catch (error) {
    projectsEl.innerHTML = '<div class="empty">Projects could not be loaded. Refresh and try again.</div>';
    countEl.textContent = '';
    statusEl.hidden = true;
    console.error(error);
  }
}

searchEl.addEventListener('input', render);
loadProjects();
