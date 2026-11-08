#!/usr/bin/env node
// Fails (exit 1) if any project breaks the Foundry contract. Dependency-free.
// Usage: node scripts/validate.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PROJECTS_DIR, REQUIRED_FILES, listProjectDirs, parseHtmlMeta } from './build-projects.mjs';

const errors = [];
const warnings = [];
const fail = (slug, message) => errors.push(`${slug}: ${message}`);
const warn = (slug, message) => warnings.push(`${slug}: ${message}`);

const hashes = new Map();
const slugs = listProjectDirs({ includeReserved: true });

for (const slug of slugs) {
  const dir = join(PROJECTS_DIR, slug);
  const missing = REQUIRED_FILES.filter(file => !existsSync(join(dir, file)));
  if (missing.length) { fail(slug, `missing ${missing.join(', ')}`); continue; }

  const extras = readdirSync(dir).filter(name => !REQUIRED_FILES.includes(name));
  if (extras.length) warn(slug, `extra entries (allowed only if self-contained assets): ${extras.join(', ')}`);

  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const css = readFileSync(join(dir, 'style.css'), 'utf8');
  const js = readFileSync(join(dir, 'script.js'), 'utf8');

  // 1. syntax
  const check = spawnSync(process.execPath, ['--check', join(dir, 'script.js')], { encoding: 'utf8' });
  if (check.status !== 0) fail(slug, `script.js syntax error: ${(check.stderr || '').split('\n').slice(0, 4).join(' | ')}`);

  // 2. title + description
  const { title, meta } = parseHtmlMeta(html);
  if (!title) fail(slug, 'missing <title>');
  if (!meta.description) fail(slug, 'missing <meta name="description">');
  if (!/<html[^>]*\slang=["'][^"']+["']/i.test(html)) fail(slug, 'missing <html lang>');
  if (!/<a[^>]*href=["']\.\.\/\.\.\/["'][^>]*>/i.test(html)) fail(slug, 'missing back link to ../../');
  if (!/<noscript[\s>]/i.test(html)) fail(slug, 'missing <noscript> notice');
  if (!/rel=["']icon["']/i.test(html)) fail(slug, 'missing favicon link');
  if (!/prefers-reduced-motion/.test(css)) fail(slug, 'style.css lacks prefers-reduced-motion block');
  if (!/:focus-visible/.test(css)) fail(slug, 'style.css lacks :focus-visible styles');

  // 3. absolute "/" asset paths
  const absAttr = /\b(?:href|src|action|poster)\s*=\s*["']\/(?!\/)/gi;
  for (const m of html.matchAll(absAttr)) fail(slug, `absolute asset path in index.html: ${m[0]}`);
  for (const m of css.matchAll(/url\(\s*["']?\/(?!\/)[^)]*\)/gi)) fail(slug, `absolute url() in style.css: ${m[0]}`);
  for (const m of css.matchAll(/@import\s+(?:url\()?["']\/(?!\/)/gi)) fail(slug, `absolute @import in style.css: ${m[0]}`);
  for (const m of js.matchAll(/\b(?:fetch|importScripts|Worker|SharedWorker)\(\s*["'`]\/(?!\/)/g)) fail(slug, `absolute path in script.js: ${m[0]}`);
  if (/api\.github\.com\/repos\/[\w.-]+\/[\w.-]+/.test(js)) fail(slug, 'hardcoded repo owner/name in script.js');

  // 4. duplicate script.js
  if (slug !== '_template') {
    const hash = createHash('sha256').update(js).digest('hex');
    if (hashes.has(hash)) fail(slug, `script.js is byte-identical to ${hashes.get(hash)}/script.js`);
    else hashes.set(hash, slug);
  }

  // soft checks
  if ((html.match(/<h1[\s>]/gi) || []).length !== 1) warn(slug, 'expected exactly one <h1>');
  if (slug !== '_template' && !meta['foundry:category']) warn(slug, 'missing foundry:category meta (hub shows "Uncategorized")');
}

// Root-level hygiene
for (const file of ['index.html', 'script.js', 'style.css']) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  if (/\b(?:href|src)\s*=\s*["']\/(?!\/)/i.test(text)) fail('root', `absolute path in ${file}`);
}
if (/api\.github\.com/.test(readFileSync(join(ROOT, 'script.js'), 'utf8'))) fail('root', 'script.js calls the GitHub API at runtime');

console.log(`Validated ${slugs.length} project folder(s).`);
for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log('OK - no errors.');
