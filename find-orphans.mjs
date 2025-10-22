// find-orphans.mjs
// Usage: node find-orphans.mjs
// Scans index.html, all .js/.css in js/ and root, manifest.json, sw.js
// and reports files under the repo that aren't referenced anywhere.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const INCLUDE_DIRS = ['.', 'js', 'icons']; // add other asset dirs if you use them
const CODE_FILES = [
  'index.html',
  'styles.css',
  'manifest.json',
  'sw.js',
];

// collect all candidate files (relative paths)
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip dotfiles
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(rel));
    } else {
      out.push(rel.replace(/^[.][/\\]?/, '')); // normalize
    }
  }
  return out;
}

function readIfExists(rel) {
  const p = path.join(ROOT, rel);
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// crude reference extraction from code/text
function extractRefs(text) {
  const refs = new Set();

  // src/href/url(...) imports
  const attrRe = /(src|href)\s*=\s*["']([^"']+)["']/gi;
  const urlRe  = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  // ES module import/require
  const importRe = /import\s+(?:[^'"]*from\s+)?["']([^"']+)["']/g;
  const dynamicImportRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  const requireRe = /require\(\s*["']([^"']+)["']\s*\)/g;

  // manifest icons + start_url, sw pre-cache arrays, JSON strings
  const jsonPathRe = /["'](icons\/[^"']+|js\/[^"']+|[^"']+\.(?:js|css|png|jpg|jpeg|webp|svg|ico|json|mp3|m4a))["']/gi;

  // generic "./" or "/" paths
  const genericRe = /["'](\.?\.?\/[^"']+)["']/g;

  for (const re of [attrRe, urlRe, importRe, dynamicImportRe, requireRe, jsonPathRe, genericRe]) {
    let m;
    while ((m = re.exec(text)) !== null) refs.add(m[1]);
  }

  // normalize and keep only local relative refs
  const norm = new Set();
  for (let r of refs) {
    if (/^https?:\/\//i.test(r) || r.startsWith('data:')) continue;
    // remove query/hash
    r = r.replace(/[?#].*$/, '');
    // strip leading "./"
    r = r.replace(/^.\//, '');
    // normalize slashes
    r = r.replace(/\\/g, '/');
    // map '' or '/' to index.html (common in SW/manifest)
    if (r === '' || r === '/') r = 'index.html';
    norm.add(r);
  }
  return norm;
}

function resolveModulePaths(ref, fromFile) {
  // handle bare refs like './ui.js' or 'js/ui.js'
  // convert to candidate file paths (try with and without extensions)
  const candidates = new Set();

  const baseDir = path.posix.dirname(fromFile);
  let p = ref;

  // if it's relative, resolve against baseDir
  if (ref.startsWith('./') || ref.startsWith('../')) {
    p = path.posix.normalize(path.posix.join(baseDir, ref));
  }

  // try as-is
  candidates.add(p);
  // try adding common extensions
  for (const ext of ['.js', '.mjs', '.css', '.json']) {
    if (!p.endsWith(ext)) candidates.add(p + ext);
  }
  // index.* inside folder
  candidates.add(path.posix.join(p, 'index.js'));
  candidates.add(path.posix.join(p, 'index.mjs'));

  return [...candidates];
}

function main() {
  const allFiles = new Set();
  for (const d of INCLUDE_DIRS) walk(d).forEach(f => allFiles.add(f));

  // Read all likely "entry" code files
  const entryFiles = new Set([...CODE_FILES, ...[...allFiles].filter(f =>
    f.endsWith('.js') || f.endsWith('.css') || f === 'index.html'
  )]);

  // Build a graph of references
  const used = new Set();
  const queue = ['index.html']; // start from index.html as root

  // also enqueue manifest and sw if present
  if (fs.existsSync(path.join(ROOT, 'manifest.json'))) queue.push('manifest.json');
  if (fs.existsSync(path.join(ROOT, 'sw.js'))) queue.push('sw.js');

  const seen = new Set();
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    used.add(file);

    const content = readIfExists(file);
    if (!content) continue;

    const refs = extractRefs(content);
    for (const r of refs) {
      // Expand module candidates and add any that actually exist
      for (const cand of resolveModulePaths(r, file)) {
        if (allFiles.has(cand)) queue.push(cand);
      }
    }
  }

  // Anything in repo not in "used" is considered orphan (excluding the script itself)
  used.add('find-orphans.mjs');

  const orphans = [...allFiles].filter(f => !used.has(f));

  console.log('Total files scanned:', allFiles.size);
  console.log('Used files:', used.size);
  console.log('\nLikely UNUSED files:');
  if (orphans.length === 0) {
    console.log('  ✅ No orphans found.');
  } else {
    for (const f of orphans.sort()) console.log('  •', f);
  }
}

main();
