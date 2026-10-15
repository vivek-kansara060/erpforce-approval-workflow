/**
 * MUI import rules.
 *
 * - `@mui/material`: the barrel. Bundlers resolve it to MUI's ESM build and
 *   tree-shake it. Its per-component paths (`@mui/material/Box`) are directory
 *   imports in MUI v5, which Node's ESM loader rejects, so a host test runner
 *   that loads `dist/` natively would fail on them.
 * - Icons: only through `src/ui/icons.ts`. Each per-icon file is CommonJS, and
 *   a `"type": "module"` package default-importing it gets `module.exports`
 *   under Node's interop (which Vite's dev optimizer applies), so the module
 *   unwraps `default` once for everyone. The icons barrel is never used: in the
 *   CommonJS build it would load all ~2,000 icons.
 */
const MUI_BARREL_RULE = {
  name: '@mui/icons-material',
  allowTypeImports: true,
  message: 'Import icons from `src/ui/icons.ts`.',
};
const MUI_MATERIAL_PATHS_RULE = {
  group: ['@mui/material/*'],
  allowTypeImports: true,
  message: "Import from the barrel, e.g. `import { Box } from '@mui/material'`.",
};

module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'coverage', 'node_modules', '*.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: {
    // `any` is allowed only where a file opts in explicitly with a disable
    // comment and a reason. Integration boundaries are documented in
    // docs/TYPES.md.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // See the note on the MUI rules above.
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [MUI_BARREL_RULE],
        patterns: [
          MUI_MATERIAL_PATHS_RULE,
          {
            group: ['@mui/icons-material/*'],
            allowTypeImports: true,
            message: 'Import icons from `src/ui/icons.ts`, which unwraps their CommonJS default.',
          },
        ],
      },
    ],
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      // The one module allowed to import icon files directly.
      files: ['src/ui/icons.ts'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          { paths: [MUI_BARREL_RULE], patterns: [MUI_MATERIAL_PATHS_RULE] },
        ],
      },
    },
  ],
};
