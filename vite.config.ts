import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import pkg from './package.json';

const SRC = resolve(__dirname, 'src');

/**
 * Explicit entry map.
 *
 * Every public subpath in package.json `exports` has exactly one entry here and
 * vice-versa. Keeping the map explicit (rather than auto-scanning the tree, as
 * @erpsquad/common does) is deliberate: it makes it impossible to accidentally
 * publish an internal module as a public deep import.
 */
const entries: Record<string, string> = {
  index: resolve(SRC, 'index.ts'),

  views: resolve(SRC, 'views/index.ts'),
  'views/ApprovalWorkflow': resolve(SRC, 'views/ApprovalWorkflow/index.ts'),
  'views/ApprovalDashboard': resolve(SRC, 'views/ApprovalDashboard/index.ts'),

  components: resolve(SRC, 'components/index.ts'),
  'components/builder': resolve(SRC, 'components/builder/index.ts'),
  'components/approval-history': resolve(SRC, 'components/approval-history/index.ts'),

  hooks: resolve(SRC, 'hooks/index.ts'),
  providers: resolve(SRC, 'providers/index.ts'),
  api: resolve(SRC, 'api/index.ts'),
  services: resolve(SRC, 'services/index.ts'),
  adapters: resolve(SRC, 'adapters/index.ts'),
  permissions: resolve(SRC, 'permissions/index.ts'),
  schemas: resolve(SRC, 'schemas/index.ts'),
  types: resolve(SRC, 'types/index.ts'),
  constants: resolve(SRC, 'constants/index.ts'),
  utils: resolve(SRC, 'utils/index.ts'),
};

/**
 * "index" -> "index.esm.js";  "views/ApprovalWorkflow" -> "views/ApprovalWorkflow/index.esm.js"
 *
 * The CommonJS build uses `.cjs`. The package is `"type": "module"`, so Node
 * reads every `.js` file as ESM: a CommonJS build emitted as `.js` cannot be
 * `require`d at all (its own `require` calls fail inside an ES module scope).
 */
const entryFileName = (name: string, ext: 'esm.js' | 'cjs') =>
  name === 'index' ? `index.${ext}` : `${name}/index.${ext}`;

/**
 * Every peer dependency is externalised, including deep subpaths
 * (`@erpsquad/common/components/button`, `@mui/icons-material/Add`, ...), so the host
 * application always supplies a single instance of React, MUI, Emotion,
 * react-hook-form and @erpsquad/common.
 */
const peerNames = Object.keys(pkg.peerDependencies ?? {});
const external = (id: string) =>
  peerNames.some((peer) => id === peer || id.startsWith(`${peer}/`));

/**
 * `src/ui/icons.ts` gets a chunk of its own (`chunks/mui-icons-*`). It imports
 * nothing but MUI, so `validate-package.mjs` can bundle it the way Vite's dev
 * optimizer does and check every icon is a renderable component.
 */
const manualChunks = (id: string) =>
  id.replace(/\\/g, '/').endsWith('/src/ui/icons.ts') ? 'mui-icons' : undefined;

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.build.json',
      outDir: 'dist',
      copyDtsFiles: false,
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: true,
    minify: 'esbuild',
    cssCodeSplit: false,
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external,
      output: [
        {
          format: 'es',
          dir: 'dist',
          entryFileNames: (chunk) => entryFileName(chunk.name, 'esm.js'),
          chunkFileNames: 'chunks/[name]-[hash].esm.js',
          assetFileNames: (asset) =>
            asset.name?.endsWith('.css') ? 'styles.css' : 'assets/[name][extname]',
          preserveModules: false,
          manualChunks,
          // Named exports only — no default export on any entry, so consumers
          // always tree-shake against a statically analysable namespace.
          exports: 'named',
        },
        {
          format: 'cjs',
          dir: 'dist',
          entryFileNames: (chunk) => entryFileName(chunk.name, 'cjs'),
          chunkFileNames: 'chunks/[name]-[hash].cjs',
          assetFileNames: (asset) =>
            asset.name?.endsWith('.css') ? 'styles.css' : 'assets/[name][extname]',
          exports: 'named',
          interop: 'auto',
          manualChunks,
        },
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    /**
     * @erpsquad/common is a private peer supplied by the host and is not
     * installed here, so the one module the package imports from it outside
     * `ui/` is stubbed for tests. Scoped to `test` — the build still
     * externalises the real specifier.
     */
    alias: [
      {
        find: '@erpsquad/common/hooks/use-permissions',
        replacement: resolve(SRC, 'test/stubs/erp-use-permissions.ts'),
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/index.ts', 'src/test/**', 'src/**/*.test.*'],
    },
  },
});
