# Architecture

## Folder structure

```
src/
├── types/          contracts — no runtime code
├── constants/      field names, option lists, default columns, cache keys
├── api/            transport: HttpClient + endpoint clients
├── query/          server-state cache and its React bindings
├── services/       business rules over the API
├── adapters/       module registry (entity-type plug-in point)
├── permissions/    capability abstraction
├── providers/      the single provider that wires everything together
├── hooks/          React bindings for services and list state
├── schemas/        yup validation
├── utils/          pure functions: graph, criteria, approvers, filters
├── ui/             the ONLY module that imports @erpsquad/common
├── components/
│   ├── feedback/   loading / empty / error / permission-denied / AsyncBoundary
│   ├── modals/     comment modal, confirm modal, flow guide
│   ├── list/       toolbar + data table
│   ├── workflow/   status chips, summary card
│   ├── approval-history/  history button + timeline popover for any record
│   └── builder/    the React Flow canvas, nodes, edges, sidebars
├── views/
│   ├── ApprovalWorkflow/   list, form (create+edit), detail
│   └── ApprovalDashboard/  queue, request detail, decision modal host
└── index.ts
```

## Dependency direction

```
views ──► components ──► ui ──► @erpsquad/common  (design system)
  │            │
  │            └──► hooks ──► services ──► api ──► HttpClient (injected)
  │                   │           │
  │                   └──► query ─┘
  │
  ├──► permissions ──► @erpsquad/common  (usePermissions)
  │
  └──► providers ──► adapters
            │
         types ◄── (everything; types import nothing)
```

Rules enforced by review and by the package validator:

- `types/` imports nothing.
- `utils/` imports only `types/` and `constants/` — every function is pure and
  testable without React.
- `api/` never touches React and never reads an environment variable.
- `services/` never touches React.
- `@erpsquad/common` is named in exactly two files: `ui/index.ts` for the
  design system, and `permissions/erp-permission-tree.ts` for the global
  permission hook. Both are deep imports, so the host still tree-shakes.
- `@mui/material` is imported from its barrel; icons only through `ui/icons.ts`,
  which unwraps their CommonJS default. ESLint
  and the validator both enforce it.
- No layer imports a specific ERP module. There is no `leave_requests` or
  `purchase_orders` anywhere in `src/`.

---

## Layers

### `types/` — contracts

Every public type. Split by concern: `common`, `http`, `graph`, `criteria`,
`approver`, `workflow`, `approval`, `permissions`, `module`, `config`.

Node data is a discriminated union with type guards (`isTriggerNode`,
`isCriteriaNode`, …) rather than the `[key: string]: any` index signature the
original used, so a criteria node cannot be read as a trigger by accident.

### `api/` — transport

`HttpClient` is a one-function interface:

```ts
type HttpClient = <T>(request: HttpRequest) => Promise<T>;
```

`HttpRequest` names a *logical service* (`workflowAutomation`, `systemFeature`,
`rbac`, `organization`) rather than a URL. The host maps services to base URLs.
`createFetchHttpClient` is a ready-made implementation; a host with an
instrumented client passes its own function.

Three endpoint clients are built over it: `workflow`, `approval`, `reference`.
Each is a factory (`createWorkflowApi(http)`) so it can be tested against a stub.
Gateway envelope quirks — `_id` vs `id`, three different list envelope shapes on
the approvals endpoint — are normalised here and nowhere else.

### `query/` — server state

A ~200-line cache providing exactly three behaviours: request de-duplication,
staleness, and key-prefix invalidation.

- `QueryCache` is framework-agnostic and separately testable.
- `useQuery` binds it to React through `useSyncExternalStore`, with the fetcher
  held in a ref so an inline arrow function never causes a refetch.
- `useMutation` ignores concurrent calls and resolves rather than rejects, so
  save handlers do not need a try/catch.
- `QueryCache.onError(listener)` reports each failed fetch once, however many
  components read the key; the provider forwards it to `config.onError`.

No Redux (the brief rules it out for server state, and the original slices were
mostly boilerplate). No react-query (it would be a new runtime dependency for
the whole ERP ecosystem, for three behaviours).

### `services/` — business rules

`WorkflowService`: list, get, **validate**, save, remove. Validation returns
machine-readable codes (`scope-required`, `graph-invalid`) so the view chooses
its own copy. Saving invalidates the list cache.

`ApprovalService`: list, get, history, **submitDecision**, **runPreAction**.
`submitDecision` routes through the module registry — an adapter may take over
the call, declare that its modal already made it, or fall through to the generic
endpoint — and refuses a decision on a request that has already settled.

### `adapters/` — module integration

The registry replaces the original's static `approvalMapper`. An adapter
declares, for one `entity_type`: its title, the route to the record, its decision
modal and that modal's props, how to submit the decision, and an optional
pre-action. Only `entityType` is required; everything else falls back to the
generic behaviour.

`createRouteAdapters` covers the common case — navigation plus the default
approve/reject flow — in one line per entity type.

### `permissions/` — the global permission integration

Permissions are ERP-wide, not module-specific, so the package resolves them
itself rather than asking each consumer to supply them:

```text
ERP application
      │
      ▼
@erpsquad/common ── PermissionsProvider ──► usePermissions()
      │
      ▼
@erpsquad/approval-workflow
      │
      ├── WorkflowAutomation     workflow configuration
      ├── Approvals              approval dashboard (else ErpCommonApprovals)
      ├── Departments            department approver + Applicable filter
      ├── Grades                 Applicable filter
      ├── employee               Employee Type filter + user directory
      └── OrganisationStructure  hierarchy approver
```

Four files, each with one job:

| File | Job |
| --- | --- |
| `permission-keys.ts` | the RBAC key names, declared once |
| `erp-permission-tree.ts` | the boundary — the only import of the common hook |
| `capabilities.ts` | pure `tree → capabilities`; the whole matrix |
| `derive-options.ts` | pure `capabilities → visible options` |

`useApprovalPermissions()` joins them and memoises the result on the tree's
identity in a `WeakMap`, so the matrix is computed once per permission change
for the whole screen rather than once per component per render.

Components never name an RBAC key and never test a raw flag; they read a
capability. That keeps a UI change from touching RBAC and an RBAC change from
touching a component, and it is why `selectApproverTypeOptions` and
`selectApplicableFilters` can both be driven by `Departments` without either
component knowing that.

### `providers/` — composition root

`ApprovalWorkflowProvider` validates and applies defaults to the config, then
builds the cache, the three API clients and the two services. The API clients
are memoised on `http` alone and the services on their own inputs, so an inline
prop elsewhere never rebuilds them. A host-supplied `QueryCache` (via
`queryClient`) is used as the cache, which is how two providers share one.
Hooks read everything off the context, so nothing is re-created per render.

### Errors

One normaliser (`utils/errors.ts`) turns anything thrown into an
`ApprovalWorkflowError`, keeping the original as `cause`. Failures take two
paths from there:

- **To the user**, through `ErrorState` and `useNotifyError`, as
  `getUserFacingErrorMessage`: a 4xx or validation message as-is, the generic
  copy for a 5xx, a network failure or a `TypeError`.
- **To the host**, through `config.onError`, in full: failed reads from the
  cache's `onError`, failed writes from `useReportedMutation`.

### `hooks/` — React bindings

- `useWorkflowList`, `useWorkflow`, `useWorkflowMutations`
- `useApprovalRequests`, `useApprovalRequest`, `useApprovalDecision`
- `useWorkflowReferences` — action types, operators, entity fields, hierarchy
  levels, schema fields, entity catalogue; all cached for five minutes
- `useWorkflowGraph` — the builder's state machine, extracted from the component
- `useListState` — local list state, or a binding to the host's page-preference
  service
- `useGroupedOptionSource` — client-side paging for the field picker
- `hooks/internal/` — `useCachedQuery` (provider-bound `useQuery`),
  `usePagedList` (the list machine shared by the workflow list and the approval
  queue) and `useReportedMutation`; one module each so a light entry only pulls
  the ones it uses. Not exported.

### `ui/` — design-system boundary

One module re-exporting the ~25 `@erpsquad/common` components the package uses,
as deep imports so the common library still tree-shakes. Swapping design systems
means replacing this one file.

### `components/` and `views/`

Components are presentational and controlled. Views compose hooks and
components; each screen routes its four states through `AsyncBoundary`
(loading → error → empty → content), so the states are handled uniformly rather
than ad hoc per screen.

The builder lives under `components/builder/` and is the only subtree that
imports `@xyflow/react`. Both views that need it load it with `React.lazy`.

---

## State ownership

| State | Where it lives | Why |
| --- | --- | --- |
| Workflow list / detail | `QueryCache` | server-owned, shared across screens |
| Approval list / detail / history | `QueryCache` | same |
| A record's approval timeline | `QueryCache`, under `approval` | refreshed by the same invalidation as a decision |
| Reference data | `QueryCache`, 5-minute TTL | effectively static |
| Form values | `react-hook-form` | already the ERP convention |
| Builder graph | `useWorkflowGraph` | local to the canvas, mirrored to the form via `onChange` |
| Sidebar open/closed, node being edited | `useWorkflowGraph` | pure UI |
| Decision modal | `useApprovalDecision` | pure UI |
| Search / sort / page | `useListState` | local, or delegated to the host |

Nothing is global. Nothing is duplicated between a store and a component.

---

## Build

Vite library mode, 17 explicit entry points, dual ESM (`.esm.js`) + CommonJS
(`.cjs`, required because the package is `"type": "module"`), declarations from
`vite-plugin-dts`. Every peer dependency and peer subpath is externalised.

The entry map is explicit rather than auto-scanned, so an internal module cannot
become a public deep import by accident. `scripts/validate-package.mjs` runs
after the build and fails on: a missing `exports` target, an entry without all
three of `types`/`import`/`require`, a bundled peer, a leaked `src/` path, a
missing `sideEffects` field, an icons-barrel or `@mui/material` subpath import,
an icon that does not render under Vite's dev optimizer, a CommonJS entry that is not
`.cjs` or does not load, and — specifically — any static `@xyflow/react`
import reachable from the dashboard or approval-history entry.
