// vite.config.ts
import { defineConfig } from "file:///home/trootech/JS-Project/erpforce-approval-workflow/node_modules/vite/dist/node/index.js";
import react from "file:///home/trootech/JS-Project/erpforce-approval-workflow/node_modules/@vitejs/plugin-react/dist/index.js";
import dts from "file:///home/trootech/JS-Project/erpforce-approval-workflow/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";

// package.json
var package_default = {
  name: "@erpsquad/approval-workflow",
  version: "1.1.0",
  description: "Module-agnostic approval workflow builder and approval dashboard for ERPForce modules",
  type: "module",
  main: "./dist/index.cjs",
  module: "./dist/index.esm.js",
  types: "./dist/index.d.ts",
  _sideEffectsNote: "The package ships no stylesheet of its own \u2014 every component styles through the MUI theme. Only the builder pulls a stylesheet, and it belongs to @xyflow/react.",
  sideEffects: [
    "**/*.css"
  ],
  files: [
    "dist",
    "README.md",
    "CHANGELOG.md",
    "docs"
  ],
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.esm.js",
      require: "./dist/index.cjs",
      default: "./dist/index.esm.js"
    },
    "./views": {
      types: "./dist/views/index.d.ts",
      import: "./dist/views/index.esm.js",
      require: "./dist/views/index.cjs",
      default: "./dist/views/index.esm.js"
    },
    "./views/workflow": {
      types: "./dist/views/ApprovalWorkflow/index.d.ts",
      import: "./dist/views/ApprovalWorkflow/index.esm.js",
      require: "./dist/views/ApprovalWorkflow/index.cjs",
      default: "./dist/views/ApprovalWorkflow/index.esm.js"
    },
    "./views/dashboard": {
      types: "./dist/views/ApprovalDashboard/index.d.ts",
      import: "./dist/views/ApprovalDashboard/index.esm.js",
      require: "./dist/views/ApprovalDashboard/index.cjs",
      default: "./dist/views/ApprovalDashboard/index.esm.js"
    },
    "./components": {
      types: "./dist/components/index.d.ts",
      import: "./dist/components/index.esm.js",
      require: "./dist/components/index.cjs",
      default: "./dist/components/index.esm.js"
    },
    "./components/builder": {
      types: "./dist/components/builder/index.d.ts",
      import: "./dist/components/builder/index.esm.js",
      require: "./dist/components/builder/index.cjs",
      default: "./dist/components/builder/index.esm.js"
    },
    "./components/approval-history": {
      types: "./dist/components/approval-history/index.d.ts",
      import: "./dist/components/approval-history/index.esm.js",
      require: "./dist/components/approval-history/index.cjs",
      default: "./dist/components/approval-history/index.esm.js"
    },
    "./hooks": {
      types: "./dist/hooks/index.d.ts",
      import: "./dist/hooks/index.esm.js",
      require: "./dist/hooks/index.cjs",
      default: "./dist/hooks/index.esm.js"
    },
    "./providers": {
      types: "./dist/providers/index.d.ts",
      import: "./dist/providers/index.esm.js",
      require: "./dist/providers/index.cjs",
      default: "./dist/providers/index.esm.js"
    },
    "./api": {
      types: "./dist/api/index.d.ts",
      import: "./dist/api/index.esm.js",
      require: "./dist/api/index.cjs",
      default: "./dist/api/index.esm.js"
    },
    "./services": {
      types: "./dist/services/index.d.ts",
      import: "./dist/services/index.esm.js",
      require: "./dist/services/index.cjs",
      default: "./dist/services/index.esm.js"
    },
    "./adapters": {
      types: "./dist/adapters/index.d.ts",
      import: "./dist/adapters/index.esm.js",
      require: "./dist/adapters/index.cjs",
      default: "./dist/adapters/index.esm.js"
    },
    "./permissions": {
      types: "./dist/permissions/index.d.ts",
      import: "./dist/permissions/index.esm.js",
      require: "./dist/permissions/index.cjs",
      default: "./dist/permissions/index.esm.js"
    },
    "./schemas": {
      types: "./dist/schemas/index.d.ts",
      import: "./dist/schemas/index.esm.js",
      require: "./dist/schemas/index.cjs",
      default: "./dist/schemas/index.esm.js"
    },
    "./types": {
      types: "./dist/types/index.d.ts",
      import: "./dist/types/index.esm.js",
      require: "./dist/types/index.cjs",
      default: "./dist/types/index.esm.js"
    },
    "./constants": {
      types: "./dist/constants/index.d.ts",
      import: "./dist/constants/index.esm.js",
      require: "./dist/constants/index.cjs",
      default: "./dist/constants/index.esm.js"
    },
    "./utils": {
      types: "./dist/utils/index.d.ts",
      import: "./dist/utils/index.esm.js",
      require: "./dist/utils/index.cjs",
      default: "./dist/utils/index.esm.js"
    },
    "./package.json": "./package.json"
  },
  publishConfig: {
    access: "public",
    registry: "https://registry.npmjs.org/"
  },
  scripts: {
    dev: "vite build --watch --mode development",
    build: "npm run clean && vite build",
    clean: "rimraf dist",
    "type-check": "tsc --noEmit",
    lint: "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    format: 'prettier --write "src/**/*.{ts,tsx,md}"',
    test: "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    validate: "npm run lint && npm run type-check && npm run test",
    "validate:package": "node scripts/validate-package.mjs",
    prepublishOnly: "npm run build && npm run validate:package"
  },
  keywords: [
    "erp",
    "approval",
    "workflow",
    "react",
    "workflow-builder",
    "erpsquad"
  ],
  license: "MIT",
  dependencies: {},
  _peerDependenciesNote: "Optional peers are needed only by the entries that use them: @xyflow/react by the workflow builder (loaded lazily by the workflow screens); react-hook-form, @hookform/resolvers and yup by the workflow form (views/workflow, schemas, and the root entry). The dashboard and approval-history entries need none of them.",
  peerDependencies: {
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",
    "@erpsquad/common": ">=1.11.0",
    "@hookform/resolvers": "^3.0.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/material": "^5.15.0",
    "@xyflow/react": "^12.0.0",
    react: "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0",
    "react-hook-form": "^7.50.0",
    yup: "^1.0.0"
  },
  peerDependenciesMeta: {
    "@xyflow/react": {
      optional: true
    },
    "@hookform/resolvers": {
      optional: true
    },
    "react-hook-form": {
      optional: true
    },
    yup: {
      optional: true
    }
  },
  devDependencies: {
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@hookform/resolvers": "^3.10.0",
    "@mui/icons-material": "^5.18.0",
    "@mui/material": "^5.18.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^14.3.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/coverage-v8": "^1.6.0",
    "@xyflow/react": "^12.10.0",
    eslint: "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    jsdom: "^23.2.0",
    prettier: "^3.1.1",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.58.1",
    rimraf: "^5.0.5",
    typescript: "^5.2.2",
    vite: "^5.4.21",
    "vite-plugin-dts": "^3.9.1",
    vitest: "^1.6.0",
    yup: "^1.7.1"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/erpforce/approval-workflow.git"
  },
  bugs: {
    url: "https://github.com/erpforce/approval-workflow/issues"
  },
  homepage: "https://github.com/erpforce/approval-workflow#readme"
};

// vite.config.ts
var __vite_injected_original_dirname = "/home/trootech/JS-Project/erpforce-approval-workflow";
var SRC = resolve(__vite_injected_original_dirname, "src");
var entries = {
  index: resolve(SRC, "index.ts"),
  views: resolve(SRC, "views/index.ts"),
  "views/ApprovalWorkflow": resolve(SRC, "views/ApprovalWorkflow/index.ts"),
  "views/ApprovalDashboard": resolve(SRC, "views/ApprovalDashboard/index.ts"),
  components: resolve(SRC, "components/index.ts"),
  "components/builder": resolve(SRC, "components/builder/index.ts"),
  "components/approval-history": resolve(SRC, "components/approval-history/index.ts"),
  hooks: resolve(SRC, "hooks/index.ts"),
  providers: resolve(SRC, "providers/index.ts"),
  api: resolve(SRC, "api/index.ts"),
  services: resolve(SRC, "services/index.ts"),
  adapters: resolve(SRC, "adapters/index.ts"),
  permissions: resolve(SRC, "permissions/index.ts"),
  schemas: resolve(SRC, "schemas/index.ts"),
  types: resolve(SRC, "types/index.ts"),
  constants: resolve(SRC, "constants/index.ts"),
  utils: resolve(SRC, "utils/index.ts")
};
var entryFileName = (name, ext) => name === "index" ? `index.${ext}` : `${name}/index.${ext}`;
var peerNames = Object.keys(package_default.peerDependencies ?? {});
var external = (id) => peerNames.some((peer) => id === peer || id.startsWith(`${peer}/`));
var manualChunks = (id) => id.replace(/\\/g, "/").endsWith("/src/ui/icons.ts") ? "mui-icons" : void 0;
var vite_config_default = defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.build.json",
      outDir: "dist",
      copyDtsFiles: false
    })
  ],
  build: {
    target: "es2020",
    sourcemap: true,
    minify: "esbuild",
    cssCodeSplit: false,
    lib: {
      entry: entries,
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external,
      output: [
        {
          format: "es",
          dir: "dist",
          entryFileNames: (chunk) => entryFileName(chunk.name, "esm.js"),
          chunkFileNames: "chunks/[name]-[hash].esm.js",
          assetFileNames: (asset) => asset.name?.endsWith(".css") ? "styles.css" : "assets/[name][extname]",
          preserveModules: false,
          manualChunks,
          // Named exports only — no default export on any entry, so consumers
          // always tree-shake against a statically analysable namespace.
          exports: "named"
        },
        {
          format: "cjs",
          dir: "dist",
          entryFileNames: (chunk) => entryFileName(chunk.name, "cjs"),
          chunkFileNames: "chunks/[name]-[hash].cjs",
          assetFileNames: (asset) => asset.name?.endsWith(".css") ? "styles.css" : "assets/[name][extname]",
          exports: "named",
          interop: "auto",
          manualChunks
        }
      ]
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    /**
     * @erpsquad/common is a private peer supplied by the host and is not
     * installed here, so the one module the package imports from it outside
     * `ui/` is stubbed for tests. Scoped to `test` — the build still
     * externalises the real specifier.
     */
    alias: [
      {
        find: "@erpsquad/common/hooks/use-permissions",
        replacement: resolve(SRC, "test/stubs/erp-use-permissions.ts")
      }
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/index.ts", "src/test/**", "src/**/*.test.*"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvdHJvb3RlY2gvSlMtUHJvamVjdC9lcnBmb3JjZS1hcHByb3ZhbC13b3JrZmxvd1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvdHJvb3RlY2gvSlMtUHJvamVjdC9lcnBmb3JjZS1hcHByb3ZhbC13b3JrZmxvdy92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS90cm9vdGVjaC9KUy1Qcm9qZWN0L2VycGZvcmNlLWFwcHJvdmFsLXdvcmtmbG93L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHBrZyBmcm9tICcuL3BhY2thZ2UuanNvbic7XG5cbmNvbnN0IFNSQyA9IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyk7XG5cbi8qKlxuICogRXhwbGljaXQgZW50cnkgbWFwLlxuICpcbiAqIEV2ZXJ5IHB1YmxpYyBzdWJwYXRoIGluIHBhY2thZ2UuanNvbiBgZXhwb3J0c2AgaGFzIGV4YWN0bHkgb25lIGVudHJ5IGhlcmUgYW5kXG4gKiB2aWNlLXZlcnNhLiBLZWVwaW5nIHRoZSBtYXAgZXhwbGljaXQgKHJhdGhlciB0aGFuIGF1dG8tc2Nhbm5pbmcgdGhlIHRyZWUsIGFzXG4gKiBAZXJwc3F1YWQvY29tbW9uIGRvZXMpIGlzIGRlbGliZXJhdGU6IGl0IG1ha2VzIGl0IGltcG9zc2libGUgdG8gYWNjaWRlbnRhbGx5XG4gKiBwdWJsaXNoIGFuIGludGVybmFsIG1vZHVsZSBhcyBhIHB1YmxpYyBkZWVwIGltcG9ydC5cbiAqL1xuY29uc3QgZW50cmllczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgaW5kZXg6IHJlc29sdmUoU1JDLCAnaW5kZXgudHMnKSxcblxuICB2aWV3czogcmVzb2x2ZShTUkMsICd2aWV3cy9pbmRleC50cycpLFxuICAndmlld3MvQXBwcm92YWxXb3JrZmxvdyc6IHJlc29sdmUoU1JDLCAndmlld3MvQXBwcm92YWxXb3JrZmxvdy9pbmRleC50cycpLFxuICAndmlld3MvQXBwcm92YWxEYXNoYm9hcmQnOiByZXNvbHZlKFNSQywgJ3ZpZXdzL0FwcHJvdmFsRGFzaGJvYXJkL2luZGV4LnRzJyksXG5cbiAgY29tcG9uZW50czogcmVzb2x2ZShTUkMsICdjb21wb25lbnRzL2luZGV4LnRzJyksXG4gICdjb21wb25lbnRzL2J1aWxkZXInOiByZXNvbHZlKFNSQywgJ2NvbXBvbmVudHMvYnVpbGRlci9pbmRleC50cycpLFxuICAnY29tcG9uZW50cy9hcHByb3ZhbC1oaXN0b3J5JzogcmVzb2x2ZShTUkMsICdjb21wb25lbnRzL2FwcHJvdmFsLWhpc3RvcnkvaW5kZXgudHMnKSxcblxuICBob29rczogcmVzb2x2ZShTUkMsICdob29rcy9pbmRleC50cycpLFxuICBwcm92aWRlcnM6IHJlc29sdmUoU1JDLCAncHJvdmlkZXJzL2luZGV4LnRzJyksXG4gIGFwaTogcmVzb2x2ZShTUkMsICdhcGkvaW5kZXgudHMnKSxcbiAgc2VydmljZXM6IHJlc29sdmUoU1JDLCAnc2VydmljZXMvaW5kZXgudHMnKSxcbiAgYWRhcHRlcnM6IHJlc29sdmUoU1JDLCAnYWRhcHRlcnMvaW5kZXgudHMnKSxcbiAgcGVybWlzc2lvbnM6IHJlc29sdmUoU1JDLCAncGVybWlzc2lvbnMvaW5kZXgudHMnKSxcbiAgc2NoZW1hczogcmVzb2x2ZShTUkMsICdzY2hlbWFzL2luZGV4LnRzJyksXG4gIHR5cGVzOiByZXNvbHZlKFNSQywgJ3R5cGVzL2luZGV4LnRzJyksXG4gIGNvbnN0YW50czogcmVzb2x2ZShTUkMsICdjb25zdGFudHMvaW5kZXgudHMnKSxcbiAgdXRpbHM6IHJlc29sdmUoU1JDLCAndXRpbHMvaW5kZXgudHMnKSxcbn07XG5cbi8qKlxuICogXCJpbmRleFwiIC0+IFwiaW5kZXguZXNtLmpzXCI7ICBcInZpZXdzL0FwcHJvdmFsV29ya2Zsb3dcIiAtPiBcInZpZXdzL0FwcHJvdmFsV29ya2Zsb3cvaW5kZXguZXNtLmpzXCJcbiAqXG4gKiBUaGUgQ29tbW9uSlMgYnVpbGQgdXNlcyBgLmNqc2AuIFRoZSBwYWNrYWdlIGlzIGBcInR5cGVcIjogXCJtb2R1bGVcImAsIHNvIE5vZGVcbiAqIHJlYWRzIGV2ZXJ5IGAuanNgIGZpbGUgYXMgRVNNOiBhIENvbW1vbkpTIGJ1aWxkIGVtaXR0ZWQgYXMgYC5qc2AgY2Fubm90IGJlXG4gKiBgcmVxdWlyZWBkIGF0IGFsbCAoaXRzIG93biBgcmVxdWlyZWAgY2FsbHMgZmFpbCBpbnNpZGUgYW4gRVMgbW9kdWxlIHNjb3BlKS5cbiAqL1xuY29uc3QgZW50cnlGaWxlTmFtZSA9IChuYW1lOiBzdHJpbmcsIGV4dDogJ2VzbS5qcycgfCAnY2pzJykgPT5cbiAgbmFtZSA9PT0gJ2luZGV4JyA/IGBpbmRleC4ke2V4dH1gIDogYCR7bmFtZX0vaW5kZXguJHtleHR9YDtcblxuLyoqXG4gKiBFdmVyeSBwZWVyIGRlcGVuZGVuY3kgaXMgZXh0ZXJuYWxpc2VkLCBpbmNsdWRpbmcgZGVlcCBzdWJwYXRoc1xuICogKGBAZXJwc3F1YWQvY29tbW9uL2NvbXBvbmVudHMvYnV0dG9uYCwgYEBtdWkvaWNvbnMtbWF0ZXJpYWwvQWRkYCwgLi4uKSwgc28gdGhlIGhvc3RcbiAqIGFwcGxpY2F0aW9uIGFsd2F5cyBzdXBwbGllcyBhIHNpbmdsZSBpbnN0YW5jZSBvZiBSZWFjdCwgTVVJLCBFbW90aW9uLFxuICogcmVhY3QtaG9vay1mb3JtIGFuZCBAZXJwc3F1YWQvY29tbW9uLlxuICovXG5jb25zdCBwZWVyTmFtZXMgPSBPYmplY3Qua2V5cyhwa2cucGVlckRlcGVuZGVuY2llcyA/PyB7fSk7XG5jb25zdCBleHRlcm5hbCA9IChpZDogc3RyaW5nKSA9PlxuICBwZWVyTmFtZXMuc29tZSgocGVlcikgPT4gaWQgPT09IHBlZXIgfHwgaWQuc3RhcnRzV2l0aChgJHtwZWVyfS9gKSk7XG5cbi8qKlxuICogYHNyYy91aS9pY29ucy50c2AgZ2V0cyBhIGNodW5rIG9mIGl0cyBvd24gKGBjaHVua3MvbXVpLWljb25zLSpgKS4gSXQgaW1wb3J0c1xuICogbm90aGluZyBidXQgTVVJLCBzbyBgdmFsaWRhdGUtcGFja2FnZS5tanNgIGNhbiBidW5kbGUgaXQgdGhlIHdheSBWaXRlJ3MgZGV2XG4gKiBvcHRpbWl6ZXIgZG9lcyBhbmQgY2hlY2sgZXZlcnkgaWNvbiBpcyBhIHJlbmRlcmFibGUgY29tcG9uZW50LlxuICovXG5jb25zdCBtYW51YWxDaHVua3MgPSAoaWQ6IHN0cmluZykgPT5cbiAgaWQucmVwbGFjZSgvXFxcXC9nLCAnLycpLmVuZHNXaXRoKCcvc3JjL3VpL2ljb25zLnRzJykgPyAnbXVpLWljb25zJyA6IHVuZGVmaW5lZDtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgZHRzKHtcbiAgICAgIGluc2VydFR5cGVzRW50cnk6IHRydWUsXG4gICAgICB0c2NvbmZpZ1BhdGg6ICcuL3RzY29uZmlnLmJ1aWxkLmpzb24nLFxuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBjb3B5RHRzRmlsZXM6IGZhbHNlLFxuICAgIH0pLFxuICBdLFxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIGNzc0NvZGVTcGxpdDogZmFsc2UsXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogZW50cmllcyxcbiAgICAgIGZvcm1hdHM6IFsnZXMnLCAnY2pzJ10sXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbCxcbiAgICAgIG91dHB1dDogW1xuICAgICAgICB7XG4gICAgICAgICAgZm9ybWF0OiAnZXMnLFxuICAgICAgICAgIGRpcjogJ2Rpc3QnLFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAoY2h1bmspID0+IGVudHJ5RmlsZU5hbWUoY2h1bmsubmFtZSwgJ2VzbS5qcycpLFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnY2h1bmtzL1tuYW1lXS1baGFzaF0uZXNtLmpzJyxcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0KSA9PlxuICAgICAgICAgICAgYXNzZXQubmFtZT8uZW5kc1dpdGgoJy5jc3MnKSA/ICdzdHlsZXMuY3NzJyA6ICdhc3NldHMvW25hbWVdW2V4dG5hbWVdJyxcbiAgICAgICAgICBwcmVzZXJ2ZU1vZHVsZXM6IGZhbHNlLFxuICAgICAgICAgIG1hbnVhbENodW5rcyxcbiAgICAgICAgICAvLyBOYW1lZCBleHBvcnRzIG9ubHkgXHUyMDE0IG5vIGRlZmF1bHQgZXhwb3J0IG9uIGFueSBlbnRyeSwgc28gY29uc3VtZXJzXG4gICAgICAgICAgLy8gYWx3YXlzIHRyZWUtc2hha2UgYWdhaW5zdCBhIHN0YXRpY2FsbHkgYW5hbHlzYWJsZSBuYW1lc3BhY2UuXG4gICAgICAgICAgZXhwb3J0czogJ25hbWVkJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZvcm1hdDogJ2NqcycsXG4gICAgICAgICAgZGlyOiAnZGlzdCcsXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IChjaHVuaykgPT4gZW50cnlGaWxlTmFtZShjaHVuay5uYW1lLCAnY2pzJyksXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdjaHVua3MvW25hbWVdLVtoYXNoXS5janMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXQpID0+XG4gICAgICAgICAgICBhc3NldC5uYW1lPy5lbmRzV2l0aCgnLmNzcycpID8gJ3N0eWxlcy5jc3MnIDogJ2Fzc2V0cy9bbmFtZV1bZXh0bmFtZV0nLFxuICAgICAgICAgIGV4cG9ydHM6ICduYW1lZCcsXG4gICAgICAgICAgaW50ZXJvcDogJ2F1dG8nLFxuICAgICAgICAgIG1hbnVhbENodW5rcyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwLnRzJ10sXG4gICAgY3NzOiBmYWxzZSxcbiAgICAvKipcbiAgICAgKiBAZXJwc3F1YWQvY29tbW9uIGlzIGEgcHJpdmF0ZSBwZWVyIHN1cHBsaWVkIGJ5IHRoZSBob3N0IGFuZCBpcyBub3RcbiAgICAgKiBpbnN0YWxsZWQgaGVyZSwgc28gdGhlIG9uZSBtb2R1bGUgdGhlIHBhY2thZ2UgaW1wb3J0cyBmcm9tIGl0IG91dHNpZGVcbiAgICAgKiBgdWkvYCBpcyBzdHViYmVkIGZvciB0ZXN0cy4gU2NvcGVkIHRvIGB0ZXN0YCBcdTIwMTQgdGhlIGJ1aWxkIHN0aWxsXG4gICAgICogZXh0ZXJuYWxpc2VzIHRoZSByZWFsIHNwZWNpZmllci5cbiAgICAgKi9cbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAnQGVycHNxdWFkL2NvbW1vbi9ob29rcy91c2UtcGVybWlzc2lvbnMnLFxuICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZShTUkMsICd0ZXN0L3N0dWJzL2VycC11c2UtcGVybWlzc2lvbnMudHMnKSxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2xjb3YnXSxcbiAgICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoue3RzLHRzeH0nXSxcbiAgICAgIGV4Y2x1ZGU6IFsnc3JjLyoqL2luZGV4LnRzJywgJ3NyYy90ZXN0LyoqJywgJ3NyYy8qKi8qLnRlc3QuKiddLFxuICAgIH0sXG4gIH0sXG59KTtcbiIsICJ7XG4gIFwibmFtZVwiOiBcIkBlcnBzcXVhZC9hcHByb3ZhbC13b3JrZmxvd1wiLFxuICBcInZlcnNpb25cIjogXCIxLjEuMFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiTW9kdWxlLWFnbm9zdGljIGFwcHJvdmFsIHdvcmtmbG93IGJ1aWxkZXIgYW5kIGFwcHJvdmFsIGRhc2hib2FyZCBmb3IgRVJQRm9yY2UgbW9kdWxlc1wiLFxuICBcInR5cGVcIjogXCJtb2R1bGVcIixcbiAgXCJtYWluXCI6IFwiLi9kaXN0L2luZGV4LmNqc1wiLFxuICBcIm1vZHVsZVwiOiBcIi4vZGlzdC9pbmRleC5lc20uanNcIixcbiAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9pbmRleC5kLnRzXCIsXG4gIFwiX3NpZGVFZmZlY3RzTm90ZVwiOiBcIlRoZSBwYWNrYWdlIHNoaXBzIG5vIHN0eWxlc2hlZXQgb2YgaXRzIG93biBcdTIwMTQgZXZlcnkgY29tcG9uZW50IHN0eWxlcyB0aHJvdWdoIHRoZSBNVUkgdGhlbWUuIE9ubHkgdGhlIGJ1aWxkZXIgcHVsbHMgYSBzdHlsZXNoZWV0LCBhbmQgaXQgYmVsb25ncyB0byBAeHlmbG93L3JlYWN0LlwiLFxuICBcInNpZGVFZmZlY3RzXCI6IFtcbiAgICBcIioqLyouY3NzXCJcbiAgXSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCJkaXN0XCIsXG4gICAgXCJSRUFETUUubWRcIixcbiAgICBcIkNIQU5HRUxPRy5tZFwiLFxuICAgIFwiZG9jc1wiXG4gIF0sXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3QvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi92aWV3c1wiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L3ZpZXdzL2luZGV4LmQudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3ZpZXdzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L3ZpZXdzL2luZGV4LmNqc1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9kaXN0L3ZpZXdzL2luZGV4LmVzbS5qc1wiXG4gICAgfSxcbiAgICBcIi4vdmlld3Mvd29ya2Zsb3dcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC92aWV3cy9BcHByb3ZhbFdvcmtmbG93L2luZGV4LmQudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3ZpZXdzL0FwcHJvdmFsV29ya2Zsb3cvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3Qvdmlld3MvQXBwcm92YWxXb3JrZmxvdy9pbmRleC5janNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vZGlzdC92aWV3cy9BcHByb3ZhbFdvcmtmbG93L2luZGV4LmVzbS5qc1wiXG4gICAgfSxcbiAgICBcIi4vdmlld3MvZGFzaGJvYXJkXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3Qvdmlld3MvQXBwcm92YWxEYXNoYm9hcmQvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3Qvdmlld3MvQXBwcm92YWxEYXNoYm9hcmQvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3Qvdmlld3MvQXBwcm92YWxEYXNoYm9hcmQvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3Qvdmlld3MvQXBwcm92YWxEYXNoYm9hcmQvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9jb21wb25lbnRzXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvY29tcG9uZW50cy9pbmRleC5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9jb21wb25lbnRzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L2NvbXBvbmVudHMvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3QvY29tcG9uZW50cy9pbmRleC5lc20uanNcIlxuICAgIH0sXG4gICAgXCIuL2NvbXBvbmVudHMvYnVpbGRlclwiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2NvbXBvbmVudHMvYnVpbGRlci9pbmRleC5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9jb21wb25lbnRzL2J1aWxkZXIvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvY29tcG9uZW50cy9idWlsZGVyL2luZGV4LmNqc1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9kaXN0L2NvbXBvbmVudHMvYnVpbGRlci9pbmRleC5lc20uanNcIlxuICAgIH0sXG4gICAgXCIuL2NvbXBvbmVudHMvYXBwcm92YWwtaGlzdG9yeVwiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2NvbXBvbmVudHMvYXBwcm92YWwtaGlzdG9yeS9pbmRleC5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9jb21wb25lbnRzL2FwcHJvdmFsLWhpc3RvcnkvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvY29tcG9uZW50cy9hcHByb3ZhbC1oaXN0b3J5L2luZGV4LmNqc1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9kaXN0L2NvbXBvbmVudHMvYXBwcm92YWwtaGlzdG9yeS9pbmRleC5lc20uanNcIlxuICAgIH0sXG4gICAgXCIuL2hvb2tzXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvaG9va3MvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvaG9va3MvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvaG9va3MvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3QvaG9va3MvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9wcm92aWRlcnNcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9wcm92aWRlcnMvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvcHJvdmlkZXJzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L3Byb3ZpZGVycy9pbmRleC5janNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vZGlzdC9wcm92aWRlcnMvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9hcGlcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9hcGkvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvYXBpL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L2FwaS9pbmRleC5janNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vZGlzdC9hcGkvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9zZXJ2aWNlc1wiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L3NlcnZpY2VzL2luZGV4LmQudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3NlcnZpY2VzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L3NlcnZpY2VzL2luZGV4LmNqc1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9kaXN0L3NlcnZpY2VzL2luZGV4LmVzbS5qc1wiXG4gICAgfSxcbiAgICBcIi4vYWRhcHRlcnNcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9hZGFwdGVycy9pbmRleC5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9hZGFwdGVycy9pbmRleC5lc20uanNcIixcbiAgICAgIFwicmVxdWlyZVwiOiBcIi4vZGlzdC9hZGFwdGVycy9pbmRleC5janNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vZGlzdC9hZGFwdGVycy9pbmRleC5lc20uanNcIlxuICAgIH0sXG4gICAgXCIuL3Blcm1pc3Npb25zXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvcGVybWlzc2lvbnMvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvcGVybWlzc2lvbnMvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvcGVybWlzc2lvbnMvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3QvcGVybWlzc2lvbnMvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9zY2hlbWFzXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3Qvc2NoZW1hcy9pbmRleC5kLnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9zY2hlbWFzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L3NjaGVtYXMvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3Qvc2NoZW1hcy9pbmRleC5lc20uanNcIlxuICAgIH0sXG4gICAgXCIuL3R5cGVzXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3QvdHlwZXMvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvdHlwZXMvaW5kZXguZXNtLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvdHlwZXMvaW5kZXguY2pzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL2Rpc3QvdHlwZXMvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi9jb25zdGFudHNcIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9jb25zdGFudHMvaW5kZXguZC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL2Rpc3QvY29uc3RhbnRzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L2NvbnN0YW50cy9pbmRleC5janNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vZGlzdC9jb25zdGFudHMvaW5kZXguZXNtLmpzXCJcbiAgICB9LFxuICAgIFwiLi91dGlsc1wiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L3V0aWxzL2luZGV4LmQudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3V0aWxzL2luZGV4LmVzbS5qc1wiLFxuICAgICAgXCJyZXF1aXJlXCI6IFwiLi9kaXN0L3V0aWxzL2luZGV4LmNqc1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9kaXN0L3V0aWxzL2luZGV4LmVzbS5qc1wiXG4gICAgfSxcbiAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIlxuICB9LFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwiYWNjZXNzXCI6IFwicHVibGljXCIsXG4gICAgXCJyZWdpc3RyeVwiOiBcImh0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnL1wiXG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJkZXZcIjogXCJ2aXRlIGJ1aWxkIC0td2F0Y2ggLS1tb2RlIGRldmVsb3BtZW50XCIsXG4gICAgXCJidWlsZFwiOiBcIm5wbSBydW4gY2xlYW4gJiYgdml0ZSBidWlsZFwiLFxuICAgIFwiY2xlYW5cIjogXCJyaW1yYWYgZGlzdFwiLFxuICAgIFwidHlwZS1jaGVja1wiOiBcInRzYyAtLW5vRW1pdFwiLFxuICAgIFwibGludFwiOiBcImVzbGludCBzcmMgLS1leHQgLnRzLC50c3ggLS1tYXgtd2FybmluZ3MgMFwiLFxuICAgIFwibGludDpmaXhcIjogXCJlc2xpbnQgc3JjIC0tZXh0IC50cywudHN4IC0tZml4XCIsXG4gICAgXCJmb3JtYXRcIjogXCJwcmV0dGllciAtLXdyaXRlIFxcXCJzcmMvKiovKi57dHMsdHN4LG1kfVxcXCJcIixcbiAgICBcInRlc3RcIjogXCJ2aXRlc3QgcnVuXCIsXG4gICAgXCJ0ZXN0OndhdGNoXCI6IFwidml0ZXN0XCIsXG4gICAgXCJ0ZXN0OmNvdmVyYWdlXCI6IFwidml0ZXN0IHJ1biAtLWNvdmVyYWdlXCIsXG4gICAgXCJ2YWxpZGF0ZVwiOiBcIm5wbSBydW4gbGludCAmJiBucG0gcnVuIHR5cGUtY2hlY2sgJiYgbnBtIHJ1biB0ZXN0XCIsXG4gICAgXCJ2YWxpZGF0ZTpwYWNrYWdlXCI6IFwibm9kZSBzY3JpcHRzL3ZhbGlkYXRlLXBhY2thZ2UubWpzXCIsXG4gICAgXCJwcmVwdWJsaXNoT25seVwiOiBcIm5wbSBydW4gYnVpbGQgJiYgbnBtIHJ1biB2YWxpZGF0ZTpwYWNrYWdlXCJcbiAgfSxcbiAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgXCJlcnBcIixcbiAgICBcImFwcHJvdmFsXCIsXG4gICAgXCJ3b3JrZmxvd1wiLFxuICAgIFwicmVhY3RcIixcbiAgICBcIndvcmtmbG93LWJ1aWxkZXJcIixcbiAgICBcImVycHNxdWFkXCJcbiAgXSxcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHt9LFxuICBcIl9wZWVyRGVwZW5kZW5jaWVzTm90ZVwiOiBcIk9wdGlvbmFsIHBlZXJzIGFyZSBuZWVkZWQgb25seSBieSB0aGUgZW50cmllcyB0aGF0IHVzZSB0aGVtOiBAeHlmbG93L3JlYWN0IGJ5IHRoZSB3b3JrZmxvdyBidWlsZGVyIChsb2FkZWQgbGF6aWx5IGJ5IHRoZSB3b3JrZmxvdyBzY3JlZW5zKTsgcmVhY3QtaG9vay1mb3JtLCBAaG9va2Zvcm0vcmVzb2x2ZXJzIGFuZCB5dXAgYnkgdGhlIHdvcmtmbG93IGZvcm0gKHZpZXdzL3dvcmtmbG93LCBzY2hlbWFzLCBhbmQgdGhlIHJvb3QgZW50cnkpLiBUaGUgZGFzaGJvYXJkIGFuZCBhcHByb3ZhbC1oaXN0b3J5IGVudHJpZXMgbmVlZCBub25lIG9mIHRoZW0uXCIsXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAZW1vdGlvbi9yZWFjdFwiOiBcIl4xMS4wLjBcIixcbiAgICBcIkBlbW90aW9uL3N0eWxlZFwiOiBcIl4xMS4wLjBcIixcbiAgICBcIkBlcnBzcXVhZC9jb21tb25cIjogXCI+PTEuMTEuMFwiLFxuICAgIFwiQGhvb2tmb3JtL3Jlc29sdmVyc1wiOiBcIl4zLjAuMFwiLFxuICAgIFwiQG11aS9pY29ucy1tYXRlcmlhbFwiOiBcIl41LjE1LjBcIixcbiAgICBcIkBtdWkvbWF0ZXJpYWxcIjogXCJeNS4xNS4wXCIsXG4gICAgXCJAeHlmbG93L3JlYWN0XCI6IFwiXjEyLjAuMFwiLFxuICAgIFwicmVhY3RcIjogXCJeMTguMi4wIHx8IF4xOS4wLjBcIixcbiAgICBcInJlYWN0LWRvbVwiOiBcIl4xOC4yLjAgfHwgXjE5LjAuMFwiLFxuICAgIFwicmVhY3QtaG9vay1mb3JtXCI6IFwiXjcuNTAuMFwiLFxuICAgIFwieXVwXCI6IFwiXjEuMC4wXCJcbiAgfSxcbiAgXCJwZWVyRGVwZW5kZW5jaWVzTWV0YVwiOiB7XG4gICAgXCJAeHlmbG93L3JlYWN0XCI6IHtcbiAgICAgIFwib3B0aW9uYWxcIjogdHJ1ZVxuICAgIH0sXG4gICAgXCJAaG9va2Zvcm0vcmVzb2x2ZXJzXCI6IHtcbiAgICAgIFwib3B0aW9uYWxcIjogdHJ1ZVxuICAgIH0sXG4gICAgXCJyZWFjdC1ob29rLWZvcm1cIjoge1xuICAgICAgXCJvcHRpb25hbFwiOiB0cnVlXG4gICAgfSxcbiAgICBcInl1cFwiOiB7XG4gICAgICBcIm9wdGlvbmFsXCI6IHRydWVcbiAgICB9XG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBlbW90aW9uL3JlYWN0XCI6IFwiXjExLjE0LjBcIixcbiAgICBcIkBlbW90aW9uL3N0eWxlZFwiOiBcIl4xMS4xNC4xXCIsXG4gICAgXCJAaG9va2Zvcm0vcmVzb2x2ZXJzXCI6IFwiXjMuMTAuMFwiLFxuICAgIFwiQG11aS9pY29ucy1tYXRlcmlhbFwiOiBcIl41LjE4LjBcIixcbiAgICBcIkBtdWkvbWF0ZXJpYWxcIjogXCJeNS4xOC4wXCIsXG4gICAgXCJAdGVzdGluZy1saWJyYXJ5L2plc3QtZG9tXCI6IFwiXjYuNi4zXCIsXG4gICAgXCJAdGVzdGluZy1saWJyYXJ5L3JlYWN0XCI6IFwiXjE0LjMuMVwiLFxuICAgIFwiQHRlc3RpbmctbGlicmFyeS91c2VyLWV2ZW50XCI6IFwiXjE0LjUuMlwiLFxuICAgIFwiQHR5cGVzL3JlYWN0XCI6IFwiXjE4LjIuNDNcIixcbiAgICBcIkB0eXBlcy9yZWFjdC1kb21cIjogXCJeMTguMi4xN1wiLFxuICAgIFwiQHR5cGVzY3JpcHQtZXNsaW50L2VzbGludC1wbHVnaW5cIjogXCJeNi4xNC4wXCIsXG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvcGFyc2VyXCI6IFwiXjYuMTQuMFwiLFxuICAgIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjogXCJeNC4yLjFcIixcbiAgICBcIkB2aXRlc3QvY292ZXJhZ2UtdjhcIjogXCJeMS42LjBcIixcbiAgICBcIkB4eWZsb3cvcmVhY3RcIjogXCJeMTIuMTAuMFwiLFxuICAgIFwiZXNsaW50XCI6IFwiXjguNTUuMFwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1yZWFjdC1ob29rc1wiOiBcIl40LjYuMFwiLFxuICAgIFwianNkb21cIjogXCJeMjMuMi4wXCIsXG4gICAgXCJwcmV0dGllclwiOiBcIl4zLjEuMVwiLFxuICAgIFwicmVhY3RcIjogXCJeMTguMi4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTguMi4wXCIsXG4gICAgXCJyZWFjdC1ob29rLWZvcm1cIjogXCJeNy41OC4xXCIsXG4gICAgXCJyaW1yYWZcIjogXCJeNS4wLjVcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNS4yLjJcIixcbiAgICBcInZpdGVcIjogXCJeNS40LjIxXCIsXG4gICAgXCJ2aXRlLXBsdWdpbi1kdHNcIjogXCJeMy45LjFcIixcbiAgICBcInZpdGVzdFwiOiBcIl4xLjYuMFwiLFxuICAgIFwieXVwXCI6IFwiXjEuNy4xXCJcbiAgfSxcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImdpdCtodHRwczovL2dpdGh1Yi5jb20vZXJwZm9yY2UvYXBwcm92YWwtd29ya2Zsb3cuZ2l0XCJcbiAgfSxcbiAgXCJidWdzXCI6IHtcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9lcnBmb3JjZS9hcHByb3ZhbC13b3JrZmxvdy9pc3N1ZXNcIlxuICB9LFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2VycGZvcmNlL2FwcHJvdmFsLXdvcmtmbG93I3JlYWRtZVwiXG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThVLFNBQVMsb0JBQW9CO0FBQzNXLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFDaEIsU0FBUyxlQUFlOzs7QUNIeEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLE9BQVM7QUFBQSxFQUNULGtCQUFvQjtBQUFBLEVBQ3BCLGFBQWU7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBUztBQUFBLElBQ1A7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxPQUFTO0FBQUEsTUFDVCxRQUFVO0FBQUEsTUFDVixTQUFXO0FBQUEsTUFDWCxTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0EsV0FBVztBQUFBLE1BQ1QsT0FBUztBQUFBLE1BQ1QsUUFB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
