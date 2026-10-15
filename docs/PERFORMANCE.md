# Performance review

Numbers below are from the committed build, measured over each entry point's
**static** import closure (peer dependencies excluded, since the host already
ships them).

---

## Measured bundle cost

| Entry | Chunks | Raw | Gzipped |
| --- | --- | --- | --- |
| `@erpsquad/approval-workflow` (everything) | 51 | 191.0 KB | **65.4 KB** |
| `…/views/workflow` | 33 | 103.4 KB | **35.9 KB** |
| `…/components/builder` | 23 | 110.8 KB | **35.0 KB** |
| `…/hooks` | 24 | 67.5 KB | **25.6 KB** |
| `…/views/dashboard` | 25 | 73.7 KB | **26.4 KB** |
| `…/components/approval-history` | 16 | 59.5 KB | **19.8 KB** |
| `…/utils` | 13 | 26.1 KB | **10.9 KB** |
| `…/types` | 2 | 0.7 KB | **0.5 KB** |

Measured on the 1.1.1 build, ESM, minified, gzipped per chunk (so slightly
pessimistic next to one bundled file). A module that only needs the approval
queue pays **26.4 KB gzipped** and pulls no React Flow and none of the form
libraries. The largest single chunk every UI entry shares is the `I18N` key
table (12 KB raw), which is one object and cannot be tree-shaken by property.

Reproduce with `npm run build` then the script in
`scripts/validate-package.mjs`, which asserts the React Flow property in CI.

---

## Bundle

### Zero runtime dependencies

`"dependencies": {}`. Everything shared with the host is a peer dependency,
including deep subpaths, so there is exactly one instance of React, React DOM,
MUI, Emotion, `react-hook-form`, `yup` and `@erpsquad/common` in the final
bundle.

Verified by `validate-package.mjs`, which fails the build if a peer's source
markers (`ReactCurrentDispatcher`, `ReactDOMSharedInternals`,
`createTheme_default`) appear anywhere in `dist/`.

### Icons are imported per file, through one module

Because MUI is externalised, an import survives into `dist/` verbatim. The
icons barrel would become `require("@mui/icons-material")` in the CommonJS
build, loading all ~2,000 icon modules for the two dozen the package draws, in
every CommonJS consumer (Jest, older toolchains). So each icon is imported from
its own file, in `src/ui/icons.ts` and nowhere else.

Those files are CommonJS. Default-imported from this `"type": "module"`
package, esbuild (Vite's dev optimizer) applies Node's interop and hands over
`module.exports` rather than the component, so `icons.ts` unwraps `default`
once. `validate-package.mjs` bundles that module the way Vite does and fails
the build unless every icon is a renderable component.

`@mui/material` is imported from its barrel. Bundlers resolve it to MUI's ESM
build and tree-shake it; its per-component paths are directory imports in MUI
v5, which Node's ESM loader rejects. The trade: a CommonJS consumer loads the
`@mui/material` CommonJS barrel, as MUI's own components do.

### The CommonJS build is `.cjs`

The package is `"type": "module"`, so Node reads every `.js` file as ESM. The
CommonJS build used to be emitted as `.js` and could not be `require`d at all.
It is now `.cjs`, and the validator loads a CommonJS entry to prove it.

### React Flow is optional and code-split

`@xyflow/react` is `peerDependenciesMeta.optional` and is the package's single
largest cost. Three properties, all machine-checked:

1. The dashboard entry has **no** static or dynamic React Flow import.
2. `views/workflow` reaches the builder only through
   `import('./WorkflowBuilder-*.esm.js')` — a separate chunk the browser fetches
   when the user opens the canvas, not when the form renders.
3. `components/builder` is the one entry that imports it statically, which is
   its purpose.

`scripts/validate-package.mjs` walks the dashboard entry's import graph and
fails on any `@xyflow/react` edge.

### 17 explicit entry points

The entry map in `vite.config.ts` is written out rather than auto-scanned from
the tree. An internal module cannot become a public deep import by accident, and
every `exports` subpath is asserted to exist after the build.

### Approval history is its own entry

`…/components/approval-history` exists so a module can put the history button
on its own record pages without importing the dashboard or the component
barrel. Its static closure is 14 emitted files, and its only externals are
`@erpsquad/common` `button`, `tooltip` and `typography`, MUI, and React. There
is no `MaterialTable`, no modal and no React Flow (the validator asserts the
last). Summing every emitted file in each closure the same way, it is about
75% of the dashboard entry (18.2 KB vs 24.2 KB gzipped).

At runtime the button holds no cache subscription and makes no request; the
timeline mounts, and fetches, only when the popover opens. A reopen within
`staleTime` is served from cache.

### Tree-shaking

- `sideEffects: ["**/*.css"]`. The package ships no stylesheet of its own; the
  only CSS import belongs to `@xyflow/react`.
- Named exports only, `exports: 'named'` in the Rollup output, so every entry is
  a statically analysable namespace.
- `types` is a separate entry that compiles to nothing at runtime.

### Dependencies not taken

| Candidate | Decision |
| --- | --- |
| `@reduxjs/toolkit` + `react-redux` | Not used. Server state lives in a ~200-line cache; the original's two slices were mostly `pending/fulfilled/rejected` boilerplate, and depending on Redux would have forced a store on every consumer. |
| `@tanstack/react-query` | Not used. It would be a new runtime dependency for the whole ERP ecosystem to get three behaviours the package already has. |
| `lodash` | Not used. The three helpers needed are a few lines each. |
| `dayjs` / `date-fns` | Not used. Dates go through `Intl` and an optional `formatDate` prop on the views that show timestamps. |
| `react-querybuilder` | Not used. The criteria model matches its rule shape (`ConditionRule`), so it can be swapped in later without changing the wire format. |
| `uuid` | Not used. `crypto.randomUUID` with a fallback. |
| `notistack` | Not used. Notifications go through the `notify` contract. |

---

## Runtime

### Duplicate requests removed

The original issued the same request repeatedly:

| Request | Before | Now |
| --- | --- | --- |
| `action_type` reference list | once per list screen, once per detail screen, once per form, once per action-sidebar open | once per 5 minutes, shared |
| `operator` reference list | once per criteria-sidebar open | once per 5 minutes, shared |
| Entity fields for a category | once per `selectedCategory` effect run | once per entity type per 5 minutes |
| `/v1/user/modules` | on every provider mount, cached in `localStorage` | once per 5 minutes, or skipped via `entityCatalogue` |
| List refetch | on any effect-dependency change; only one of the three `useDataFetcher` copies de-duplicated | keyed by the exact query object |
| Hierarchy levels | on every canvas visit, because the always-mounted action drawer queried them unconditionally | only while the drawer is open and a Hierarchy stage is possible |

Mechanism: `QueryCache` joins concurrent calls for the same key, serves fresh
values without a request, and keys by *value* — so `{ page: 1 }` built fresh on
every render still hits the same cache entry.

### Re-renders

| Problem in the original | Fix |
| --- | --- |
| `nodeTypes` rebuilt in `useMemo` on every parent render, remounting every node | frozen module-level `NODE_TYPES`; `useNodeTypes()` returns the same object |
| Node callbacks re-created per render, re-creating every node's `data` | one memoised `NodeCallbacks` bundle |
| `onChange` in the dependency array of every builder callback | held in a ref; `emit` is stable |
| `getCurrentNodeData()` called during render, scanning `nodes` each time | memoised `activeNodeData` |
| Zoom readout polled behind `setTimeout(50)` | subscribes to viewport changes |
| Search issuing a request per keystroke | 350 ms debounce in `ListToolbar` |
| `useWorkflowGraph` callbacks depended on `nodes`, so each drag frame rebuilt the node callback bundle and re-rendered **every** node | callbacks read the latest graph through a ref and keep their identity |
| Every graph change mapped all nodes to new React Flow objects | `useFlowNodes` reuses the object of every node that did not change, so a drag re-renders one node |
| `useApprovalDecision` and `useMutation` returned a new object per render, rebuilding the dashboard's row-action menus | both results are memoised; the dashboard depends on the stable functions |

### Permission resolution

Permissions cost no requests and no per-render work.

| Concern | How it is handled |
| --- | --- |
| Where they come from | `usePermissions()` in `@erpsquad/common` — a `useContext` read of a tree the app already built. The package adds no API call and no second source. |
| How often the matrix is computed | once per permission change, for the whole screen. `resolveCapabilities` runs behind a `WeakMap` keyed on the tree's identity, so ten mounted components share one computation. |
| Cost of a check | a property read on a frozen object. |
| Re-render pressure | `useApprovalPermissions()` returns a stable identity while the tree holds, so it is inert in a dependency array and in `useMemo` deps. |
| Key lookup | exact-match first; the case-insensitive scan is the miss path only, and runs inside the cached computation, never per render. |

`Employee Type` is gated by permission alone — deliberately no lookup is issued
to decide whether a static two-option list should render.

### The users API is not called until it is needed

The User approval type reads a directory; the other two do not. The chain is
lazy at every link:

```text
Action drawer opened          → no request (the selector is not mounted)
User approval type selected   → the selector mounts
Selector opened               → one request
Preselected approver ids      → one request to resolve the labels
Another approval type         → the selector unmounts; no request
```

`SearchableSelect` fetches on open, not on mount, and the selector only renders
while `approver_type === 'USER'` — so rendering the drawer, or configuring a
department or hierarchy stage, issues no user request at all. Concurrent calls
for the same options are joined by the select's own request state, and
`useApproverUserSource` returns a stable props object so a re-render never
re-triggers a fetch.

Which endpoint it is depends on one permission: `employees` with `employee`,
`users` without. One request either way.

### Memoisation policy

Memoisation is applied where it changes behaviour — a stable `nodeTypes` object,
a stable callback bundle, a derived list that feeds React Flow — and skipped for
trivial values. Node components are `memo`'d because React Flow re-renders the
whole node set on any graph change.

### Algorithmic fixes

- **Layout was O(n³).** `getNodesAtDepth` scanned the entire position map, was
  called inside `hasSubtreeConflict`, which was called inside a search loop of
  up to 8000/125 ≈ 64 iterations, and `calculateSubtreeHeight` recursed
  uncached on every call. Now: the depth index is built once per pass and
  subtree heights are memoised.
- **`findChildNodes` could overflow the stack.** It recursed with no visited
  set, so an edge back to an ancestor — which a user can draw — crashed the
  page. Now iterative BFS with a visited set, over an adjacency map built once
  (O(nodes + edges) rather than an edge scan per visited node).

### Pagination and server-side work

- Filtering, sorting, searching and paging are all server-side; the client never
  holds a full result set.
- The `select` projection asks only for the visible columns plus the fields the
  row actions genuinely need, de-duplicated through a `Set`. Two of the three
  original `useDataFetcher` copies emitted duplicate field names.
- The one client-side list — the entity-field catalogue, which arrives in a
  single response — is paged by a pure function, with accumulation scoped to the
  hook instance rather than a module-level object shared by every open sidebar.

### Lazy loading

`WorkflowBuilder` is `React.lazy` in both views that use it, behind an
`AsyncBoundary` fallback. The form is interactive while the canvas downloads.

---

## Verified in CI

`npm run validate:package` fails the build on:

- an `exports` target that was not emitted;
- an entry missing `types`, `import` or `require`;
- a bundled peer dependency;
- a peer declared but never imported;
- a `src/` path leaking into the public surface;
- a missing `sideEffects` field;
- an `@mui/icons-material` barrel import or an `@mui/material/<Component>` subpath
  import anywhere in `dist/`;
- an icon that is not a renderable component when bundled the way Vite's dev
  optimizer bundles it;
- a `require` target that is not `.cjs`, or a CommonJS entry that fails to load;
- **any static `@xyflow/react` import reachable from the dashboard or
  approval-history entry.**

---

## Known costs

- **The root entry is 65 KB gzipped** because it re-exports everything,
  including the builder. Deep entry points exist for this reason and the README
  leads with them.
- **`@erpsquad/common` is a hard peer.** It is by far the biggest saving (the
  package re-uses ~25 components rather than re-implementing them) and the
  reason the UI matches the rest of the ERP, but it does tie the package to the
  ERPForce ecosystem. `src/ui/index.ts` is the single file to replace if that
  ever has to change.
- **Reference data has a 5-minute TTL.** An operator or action type added while
  a user has the app open may take up to five minutes to appear. Call
  `queryCache.invalidate(['reference'])` to force it.
