#!/usr/bin/env node
// Scans projects/*/ and writes projects.json for the hub.
// Dependency-free. Usage: node scripts/build-projects.mjs
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECTS_DIR = join(ROOT, 'projects');
export const REQUIRED_FILES = ['index.html', 'style.css', 'script.js'];
export const RESERVED = new Set(['_template']);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', middot: '·', rarr: '→', larr: '←', copy: '©' };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body.toLowerCase()) ? ENTITIES[body.toLowerCase()] : match;
  });
}

function parseAttributes(tag) {
  const attrs = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(tag.replace(/^<\s*\w+/, '')))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Extract <title> and <meta name=... content=...> values from an HTML string. */
export function parseHtmlMeta(html) {
  const head = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = parseAttributes(tag);
    if (attrs.name && 'content' in attrs && !(attrs.name in meta)) meta[attrs.name.toLowerCase()] = attrs.content.trim();
  }
  return { title: titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '', meta };
}

export function listProjectDirs({ includeReserved = false } = {}) {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && (includeReserved || !RESERVED.has(entry.name)) && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function isComplete(slug) {
  return REQUIRED_FILES.every(file => {
    try { return statSync(join(PROJECTS_DIR, slug, file)).isFile(); } catch { return false; }
  });
}

export function titleFromSlug(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function lastUpdated(slug) {
  const dir = join('projects', slug);
  const git = spawnSync('git', ['log', '-1', '--format=%cI', '--', dir], { cwd: ROOT, encoding: 'utf8' });
  const fromGit = git.status === 0 ? git.stdout.trim() : '';
  if (fromGit) return fromGit.slice(0, 10);
  const newest = Math.max(...REQUIRED_FILES.map(file => statSync(join(PROJECTS_DIR, slug, file)).mtimeMs));
  return new Date(newest).toISOString().slice(0, 10);
}

export function buildProject(slug) {
  const html = readFileSync(join(PROJECTS_DIR, slug, 'index.html'), 'utf8');
  const { title, meta } = parseHtmlMeta(html);
  const tags = (meta['foundry:tags'] || '').split(',').map(tag => tag.trim()).filter(Boolean);
  return {
    name: titleFromSlug(slug),
    slug,
    title: title || titleFromSlug(slug),
    description: meta.description || '',
    category: meta['foundry:category'] || 'Uncategorized',
    tags,
    difficulty: meta['foundry:difficulty'] || 'Intermediate',
    status: meta['foundry:status'] || 'Built',
    updated: lastUpdated(slug)
  };
}

export function buildAll() {
  const slugs = listProjectDirs();
  const skipped = slugs.filter(slug => !isComplete(slug));
  const projects = slugs.filter(isComplete).map(buildProject);
  return { projects, skipped };
}

function main() {
  const { projects, skipped } = buildAll();
  const out = { version: 1, count: projects.length, projects };
  writeFileSync(join(ROOT, 'projects.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`projects.json written: ${projects.length} project(s)`);
  for (const slug of skipped) console.log(`  skipped incomplete folder: ${slug}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
