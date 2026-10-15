#!/usr/bin/env node
/**
 * Post-build gate.
 *
 * Checks the things that silently break a published library and that no unit
 * test would catch: missing declaration files, an `exports` map that points at
 * files which were never emitted, a peer dependency accidentally bundled into
 * dist, internal source paths leaking into the public surface, and the
 * dashboard or approval-history entry point dragging in React Flow, an MUI
 * import shape that breaks some toolchain, an icon that does not render under
 * Vite's dev optimizer, and a CommonJS build that Node cannot actually load.
 *
 * Run automatically by `prepublishOnly`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const failures = [];
const notes = [];

const fail = (message) => failures.push(message);
const note = (message) => notes.push(message);

// ── 1. dist exists ───────────────────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error('✗ dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// ── 2. every exports target was emitted ──────────────────────────────────────
const targets = [];
const collect = (value) => {
  if (typeof value === 'string') {
    if (value.startsWith('./dist/')) targets.push(value.slice(2));
    return;
  }
  if (value && typeof value === 'object') Object.values(value).forEach(collect);
};
collect(pkg.exports);

for (const target of [...new Set(targets)]) {
  if (!existsSync(join(ROOT, target))) fail(`exports target not built: ${target}`);
}

// ── 3. each entry has ESM, CJS and declarations ──────────────────────────────
const entrySubpaths = Object.keys(pkg.exports).filter(
  (key) => key !== './package.json' && !key.endsWith('.css'),
);
for (const subpath of entrySubpaths) {
  const entry = pkg.exports[subpath];
  if (typeof entry !== 'object') continue;
  for (const field of ['types', 'import', 'require']) {
    if (!entry[field]) fail(`exports["${subpath}"] is missing "${field}"`);
  }
}

// ── 4. no peer dependency was bundled ────────────────────────────────────────
const peers = Object.keys(pkg.peerDependencies ?? {});
const jsFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|mjs|cjs)$/.test(name) && !name.endsWith('.map')) jsFiles.push(full);
  }
};
walk(DIST);

// A bundled peer shows up as its own source, not as an import of it. React is
// the canonical tell: `react/jsx-runtime` imports are fine, a `ReactCurrentOwner`
// definition is not.
const bundledMarkers = [
  ['react', 'ReactCurrentDispatcher'],
  ['react-dom', 'ReactDOMSharedInternals'],
  ['@mui/material', 'createTheme_default'],
];
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  for (const [peer, marker] of bundledMarkers) {
    if (source.includes(marker)) fail(`${peer} appears to be bundled into ${file}`);
  }
}

// ── 5. peers are reached by import, somewhere in dist ────────────────────────
const allSource = jsFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
for (const peer of ['react', '@mui/material', '@erpsquad/common']) {
  const imported =
    allSource.includes(`"${peer}"`) ||
    allSource.includes(`'${peer}'`) ||
    allSource.includes(`"${peer}/`) ||
    allSource.includes(`'${peer}/`);
  if (!imported) fail(`${peer} is declared a peer dependency but never imported from dist`);
}

// ── 6. lightweight entries must not pull in React Flow ──────────────────────
// The dashboard, and the history popover modules drop onto their own record
// pages, are the entries hosts reach for precisely to avoid the canvas.
const FLOW_FREE_ENTRIES = {
  'views/dashboard': 'views/ApprovalDashboard/index.esm.js',
  'components/approval-history': 'components/approval-history/index.esm.js',
};
for (const [label, relativePath] of Object.entries(FLOW_FREE_ENTRIES)) {
  const entryFile = join(DIST, relativePath);
  if (!existsSync(entryFile)) {
    fail(`${relativePath} was not emitted`);
    continue;
  }
  const reachable = new Set();
  const visit = (file) => {
    if (reachable.has(file) || !existsSync(file)) return;
    reachable.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s*["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) visit(resolve(dirname(file), specifier));
      else if (specifier === '@xyflow/react' || specifier.startsWith('@xyflow/react/')) {
        fail(`${label} statically imports ${specifier} via ${file}`);
      }
    }
  };
  visit(entryFile);
}

// ── 7. MUI import shapes ─────────────────────────────────────────────────────
// - The icons barrel in the CommonJS build loads every icon MUI ships.
// - `@mui/material/<Component>` is a directory import in MUI v5, which Node's
//   ESM loader rejects; the barrel is the portable form.
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  if (source.includes('"@mui/icons-material"') || source.includes("'@mui/icons-material'")) {
    fail(`${file} imports the @mui/icons-material barrel; add the icon to src/ui/icons.ts`);
  }
  if (/["']@mui\/material\//.test(source)) {
    fail(`${file} imports an @mui/material subpath; import from the barrel`);
  }
}

// ── 7b. every icon renders under Vite's dev optimizer ────────────────────────
// Per-icon files are CommonJS. Default-imported from this `"type": "module"`
// package, esbuild (Vite's dev optimizer) applies Node's interop and hands
// over `module.exports` rather than the component, which React refuses to
// render. This bundles the icons chunk exactly that way, runs it, and checks
// each export is a component — the regression 1.1.1 briefly shipped with.
{
  const chunksDir = join(DIST, 'chunks');
  const iconsChunk = readdirSync(chunksDir).find(
    (name) => name.startsWith('mui-icons-') && name.endsWith('.esm.js'),
  );
  if (!iconsChunk) {
    fail('chunks/mui-icons-*.esm.js was not emitted (see manualChunks in vite.config.ts)');
  } else {
    try {
      const { build } = createRequire(import.meta.url)('esbuild');
      const bundled = await build({
        entryPoints: [join(chunksDir, iconsChunk)],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main'],
        define: { 'process.env.NODE_ENV': '"production"' },
        logLevel: 'silent',
      });
      const code = bundled.outputFiles[0].text;
      const icons = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
      const isComponent = (value) =>
        typeof value === 'function' ||
        (typeof value === 'object' && value !== null && '$$typeof' in value);
      // Export names are minified; every export must be a component (the one
      // helper, `icon()`, is a function and passes too). The regression shows
      // up as a plain `{ default }` object with no `$$typeof`.
      const broken = Object.entries(icons)
        .filter(([, value]) => !isComponent(value))
        .map(([name]) => name);
      if (broken.length > 0) {
        fail(`icons are not renderable under Vite's dev optimizer: ${broken.join(', ')}`);
      } else {
        note(`${Object.keys(icons).length} icon exports render under Node-mode interop`);
      }
    } catch (error) {
      fail(`could not bundle ${iconsChunk} for the icon check: ${error.message.split('\n')[0]}`);
    }
  }
}

// ── 8. CommonJS entries are loadable under "type": "module" ──────────────────
// Node reads `.js` as ESM in this package, so every `require` target must be
// `.cjs` or the CommonJS build cannot be loaded at all.
if (pkg.type === 'module') {
  for (const subpath of entrySubpaths) {
    const target = pkg.exports[subpath]?.require;
    if (typeof target === 'string' && !target.endsWith('.cjs')) {
      fail(`exports["${subpath}"].require must point at a .cjs file, got ${target}`);
    }
  }
  if (pkg.main && !pkg.main.endsWith('.cjs')) fail(`"main" must point at a .cjs file`);
}

// A real load, not just a naming check. `constants` imports no peer, so it can
// be required here without the host's dependencies installed.
const constantsEntry = pkg.exports['./constants']?.require;
if (typeof constantsEntry === 'string') {
  try {
    const loaded = createRequire(import.meta.url)(join(ROOT, constantsEntry));
    if (!loaded || typeof loaded.queryKeys !== 'object') {
      fail(`${constantsEntry} loaded but did not export queryKeys`);
    }
  } catch (error) {
    fail(`${constantsEntry} cannot be required: ${error.message.split('\n')[0]}`);
  }
}

// ── 9. no internal source paths leak ─────────────────────────────────────────
for (const target of targets) {
  if (target.includes('/src/')) fail(`exports target points into src/: ${target}`);
}

// ── 10. tree-shaking metadata ────────────────────────────────────────────────
if (pkg.sideEffects === undefined) fail('package.json is missing "sideEffects"');

// ── report ───────────────────────────────────────────────────────────────────
for (const message of notes) console.log(`• ${message}`);

if (failures.length > 0) {
  console.error('\n✗ package validation failed:');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `✓ package validation passed (${entrySubpaths.length} entry points, ${jsFiles.length} emitted files)`,
);
