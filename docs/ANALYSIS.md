# Analysis of the existing implementation

Source analysed: `erpforce-hrms-fe/src/views/approval-work-flow` and
`erpforce-hrms-fe/src/views/approval-dashboard`, plus the parts of the host app
they reach into. Roughly 12,000 lines across 105 files.

**Nothing in those folders was modified.** This document records what is there
and why the extraction made the choices it did.

---

## 1. Current architecture

### approval-work-flow (≈8,000 lines)

| Area | Files | Role |
| --- | --- | --- |
| Screens | `approval-work-flow.tsx`, `add-`, `edit-`, `view-approval-workflow` | list, create, edit, detail |
| Form | `form/form.tsx` (430 lines) | details fields + builder toggle |
| Builder | `component/workflow-builder.tsx` (544) | React Flow canvas |
| Sidebars | `sidebars/*` (1,330) | trigger, criteria, action configuration |
| Nodes/edges | `nodes/*`, `edges/*`, `component/genericNodeCompoent.tsx` | canvas rendering |
| Graph logic | `utils/node-utils.ts`, `layout-utils.ts`, `graph-transform.ts`, `query-transform.ts` | node/edge creation, layout, wire format |
| State | `redux/{state,reducer,actionCreator}.tsx` (530) | RTK slice + thunks |
| Listing | `listing/*`, `grid-view/*`, `summary/*` | table, cards, summary panel |

### approval-dashboard (≈2,400 lines)

| Area | Files | Role |
| --- | --- | --- |
| Screen | `approval-dashboard.tsx` (322) | pending approvals table |
| Dispatch table | `utils/configuration.tsx` (319) | per-entity modal + action mapping |
| State | `redux/*` (315) | RTK slice + hand-rolled `fetch` thunks |
| Listing | `listing/*` (541) | second copy of the listing component |
| Detail | `view-approval-dashboard/*` | detail screen, **backed by dummy data** |

---

## 2. Business logic worth preserving

These are the behaviours the package reproduces, each now covered by tests.

1. **Graph shape.** A workflow is `{ nodes, edges, viewport }`. Node types:
   `trigger`, `criteria`, `criteriaResult`, `action`, `actionResult`
   (with legacy `pass` / `fail` still present in stored graphs).
2. **Automatic branching.** Adding a criteria or action node also creates its
   Pass and Fail children and the three connecting edges, then re-runs layout.
3. **Subtree deletion.** Deleting a node deletes its whole subtree. The trigger
   node cannot be deleted.
4. **Criteria field encoding.** In the editor a field is `entity.field`; on the
   wire it is the bare field name with the entity in `sub_module`.
5. **Three condition types.** `operator`, `aggregate` (needs an aggregate
   function), `formula` (a token expression). Operators are filtered by the
   selected field's data type, via `metadata.data_types`.
6. **Three approver strategies.** `USER` (a list of user ids), `DEPARTMENT`
   (department + designation), `HIERARCHY` (a level). Each has an auto-approve
   escalation (value + unit, unit persisted capitalised).
7. **Scope is mandatory.** At least one of company / location / department /
   grade / employment-type must be selected before saving.
8. **Publishing locks the entity type.** A published workflow cannot change the
   entity it is attached to.
9. **Changing the entity clears the flow**, behind a confirmation.
10. **Only pending approvals are actionable**; approve and reject are the two
    decisions.
11. **Per-entity approval behaviour.** Each entity type has its own modal, its
    own payload and sometimes its own API — see §4.
12. **Duplicate.** Copies a workflow with the identity stripped.

---

## 3. Dependencies of the existing code

**On `@erpsquad/common`:** ~40 deep imports — `Button`, `Typography`, `Chip`,
`SearchableSelect`, `TextField`, `Checkbox`, `DatePicker`, `Modal`,
`ConfirmModal`, `DynamicModal`, `Accordion`, `ValueField`, `FormHeader`, `Menu`,
`Fallback`, `Footer`, `ActionBar`, `MaterialTable`, `DynamicLayoutWrapper`,
loaders, form-builder elements, icons, plus `usePages`, `useAuth`,
`usePermissions`, `use-translations`, `useAppSelector` and several utils.

**On the host app:**

- `api-client/api.workflow-automation`, `api.system-feature`, `api.rbac`,
  `api.hrms` — Platformatic-generated clients, configured with
  `setBaseUrl(import.meta.env.VITE_BACKEND_BASE_URL + '/...')` at module scope.
- `src/pathname.hrms` — route constants.
- `src/contexts/user-modules-context` — entity catalogue.
- `src/redux/useInjectReducer` — runtime slice injection.
- `src/hooks` — a local `useApi`.
- `src/utils/approval-navigation` — entity-type → route map.

**On specific HRMS feature folders** (dashboard only, all from
`utils/configuration.tsx`): leaves, recruitment, time-tracking,
employee-assets-management, resignation-termination, loan-management,
payroll-management, resource-allocation.

---

## 4. Coupling and problem areas

### 4.1 The dashboard statically imports ten HRMS modules

`approval-dashboard/utils/configuration.tsx` imports a Redux thunk and a modal
component from each of ten feature folders at module scope. Consequences:

- Opening the approval dashboard loads leave, recruitment, payroll, loan, asset,
  resignation and resource-allocation code regardless of what is in the queue.
- The dashboard cannot be extracted at all without the whole HRMS app.
- Adding an entity type means editing a file inside the dashboard.

**In the package:** the module registry. The host supplies adapters; the package
has no import edge to any module. (`src/adapters/module-registry.ts`)

### 4.2 Environment URLs baked in at import time

`redux/actionCreator.tsx` calls `setBaseUrl(import.meta.env.VITE_...)` as a
top-level side effect, four times, across four generated clients. The module
cannot run under a different gateway, in a test, or in a second host app.

**In the package:** `HttpClient` is injected; `ENDPOINTS` holds paths only.
(`src/types/http.ts`, `src/api/`)

### 4.3 Redux used for server state

Two slices, ~530 and ~315 lines, mostly `pending/fulfilled/rejected` triplets
setting four flags. `state.tsx` declares fields the workflow feature never uses
(`customers`, `vendors`, `uoms`, `taxTemplates`, `salesperson`, …), copied from
another module's slice. The dashboard slice is injected at runtime with
`useInjectReducer`, so the package would force a Redux store on every consumer.

**In the package:** a ~200-line cache with request de-duplication, staleness and
prefix invalidation. No Redux. (`src/query/`)

### 4.4 Three copies of the data-fetching hook

`approval-work-flow/utils/useDataFetcher.tsx`,
`approval-work-flow/listing/useDataFetcher.tsx` and
`approval-dashboard/utils/useDataFetcher.tsx` are near-identical, with divergent
behaviour: only one de-duplicates by serialising the payload, and only one uses
a `Set` for the `select` projection (the others emit duplicate fields).

**In the package:** one pure `buildListQuery`, with the de-duplication moved
into the cache. (`src/utils/filters.ts`)

### 4.5 Two copies of the listing component

`approval-work-flow/listing/listing.tsx` (324) and
`approval-dashboard/listing/listing.tsx` (311) differ in small, undocumented
ways. Both drive `MaterialTable`, `ActionBar` and `Footer`.

**In the package:** `ListToolbar` + `DataTable`, with a `renderToolbar` escape
hatch for hosts that want the full ERP `ActionBar`. (`src/components/list/`)

### 4.6 A module-level mutable cache shared by every component instance

```ts
// approval-work-flow/utils/common.tsx
let paginationCache = { data: [], lastSkip: -1, lastSearch: '' };
export const fetchDataLocally = (params, arr) => { /* reads and writes it */ };
```

Every criteria row in every open sidebar shares this object. Two rows open at
once interleave their pages; the cache is never released.

**In the package:** `paginateGroupedOptions` is pure, and accumulation lives in
a hook-scoped ref. (`src/utils/option-source.ts`, `src/hooks/useGroupedOptionSource.ts`)

### 4.7 Stale-object reuse in the action sidebar

```ts
const handleAddStage = () => setStages([...stages, defaultActionStage]);
```

`defaultActionStage` is a module-level object, so every added stage is the *same
object*. Separately, `buildApprovalConfig` spreads the whole draft, so a
department id selected before switching to `USER` is still persisted.

**In the package:** `createDefaultApproverStage()` returns a fresh object, and
`draftToApproverConfig` persists only the selected strategy's fields — with a
regression test. (`src/utils/approver-config.ts`)

### 4.8 The detail screen renders dummy data

`view-approval-dashboard.tsx` looks the request up in
`approvalDashboardDummyData` — a 140-line hard-coded array — instead of calling
the API. It also reads `request_type`, `requested_by` and `date`, which are not
fields the API returns.

**In the package:** a real detail view backed by
`GET /v1/approvals/:id` and `GET /v1/approvals/:id/details`.
(`src/views/ApprovalDashboard/ApprovalRequestDetailView.tsx`)

### 4.9 Dead and duplicated code

- `approval-work-flow/component/action-bar.tsx` — 751 lines, a fork of the
  common `ActionBar`, imported by nothing.
- `approval-work-flow/utils/common.tsx` re-implements `transformTableColumns`
  (166 lines) alongside an import of the common one.
- `saveWorkFlowAsDraft` is a thunk that resolves a `setTimeout` and never calls
  an API; both callers route to `createApprovalWorkFlow` instead.
- `constants/condition-constants.ts` ships hard-coded Purchase Order and HR
  entity types as "examples".

### 4.10 Smaller issues carried forward as fixes

| Issue | Location | Fix in package |
| --- | --- | --- |
| `findChildNodes` recurses without a visited set — stack overflow on a cycle | `node-utils.ts:87` | iterative BFS with `visited` |
| Layout is O(n³): the depth index is rebuilt inside two nested loops | `layout-utils.ts:91` | index built once per pass, subtree heights memoised |
| 14 `console.log` calls left in the layout and Redux paths | `layout-utils.ts`, `reducer.tsx`, `useApi.tsx` | removed; `no-console` is an error |
| `nodeTypes` rebuilt on each parent render → React Flow remounts every node | `form.tsx:202` | frozen module-level constant |
| Zoom readout polled behind `setTimeout(50)` | `CustomeZoomControl.tsx` | subscribes to viewport changes |
| Error bodies double-parsed, message discarded | `useApi.tsx:44` | `normalizeHttpError` keeps the server message |
| Save buttons allow double submit | `add-`/`edit-approval-workflow` | `useMutation` ignores concurrent calls |
| Date values via `toISOString()` shift a day across the UTC boundary | `criteria-sidebar.tsx:102` | local-time `YYYY-MM-DD` |
| Scope validation duplicated and divergent across add/edit | both screens | single `hasScopeSelection` |
| Validation messages hard-coded in English inside the yup schema | `validator.tsx` | messages injected from `translate` |
| No error state on the dashboard; empty table on failure | `approval-dashboard.tsx` | `AsyncBoundary` |

---

## 5. Reusable vs module-specific

| Reusable (extracted) | Module-specific (now the host's) |
| --- | --- |
| Graph model, node/edge creation, layout | Which entity types exist |
| Criteria model and operator filtering | Route to a record of a given entity type |
| Approver strategies and escalation | Which modal a given entity type uses |
| Workflow CRUD, validation, payload mapping | Which API a decision hits |
| Approval list, decision flow, history | Pre-actions such as "Add budget" |
| Permission capability model *and* the RBAC keys behind it | — (permissions are ERP-wide, not module-specific) |
| Table, toolbar, loading/empty/error states | Saved views and filter builder |

RBAC keys moved to the left column in 1.1.0. They were originally the host's to
name, on the theory that each module might govern approvals through its own
resource. In practice every module governs them through the same two
(`WorkflowAutomation` and `Approvals`), and letting modules name them only
created opportunities to disagree.

---

## 6. Recommended extraction approach (what was done)

1. **Invert the module dependency.** The dashboard's static imports become a
   registry the host populates. This is the change that makes extraction
   possible at all.
2. **Inject the transport.** Replace the generated clients and their
   `import.meta.env` side effects with an `HttpClient` interface plus a path
   table.
3. **Replace Redux with a cache.** Server state moves to a small cache; UI state
   stays local to the components that own it.
4. **Split UI from logic.** Graph mutation to `useWorkflowGraph`, business rules
   to services, pure transforms to `utils/` — all testable without a DOM.
5. **Make integration explicit.** One provider carrying eleven named contracts,
   instead of ambient access to a store, a router and an env object.
6. **Preserve behaviour, fix defects.** Every behaviour in §2 is reproduced; the
   defects in §4 are fixed and each fix is pinned by a test.
