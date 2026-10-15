# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The semver contract covers everything listed in [docs/API.md](docs/API.md).
Anything not listed there is internal and may change in a patch release.

---

## [1.1.1] — Unreleased

### Added

- **Approval History for any record.** `ApprovalHistory` is a button that opens
  a popover with the record's whole approval trail. A summary card says where it
  stands (status, the level it is waiting at, who it is waiting on, who
  requested it). Below it, every submission is broken down by approval level,
  with each approver's status, decision time and remarks, and a closing
  approved/rejected step. Earlier submissions (a rejected first attempt) are
  folded. It takes the two identifiers every approval request already carries,
  `entityType` and `entityId`, and has its own entry point,
  `@erpsquad/approval-workflow/components/approval-history`, which pulls in
  neither the dashboard nor React Flow.
- **`useApprovalHistory({ entityType, entityId, enabled? })`**, the data behind
  it (`rounds` and `summary`), for hosts that want their own UI. Nothing is
  requested until both identifiers are present and, for the button, until the
  popover opens; results are cached under the `approval` prefix, so a decision
  taken anywhere in the package refreshes it.
- **Requires `GET /v1/approvals/history`** in the approvals service, taking the
  list's parameters (`skip`, `limit`, `order`, `select`, `filters`) with
  `filters` naming the record, e.g.
  `(entity_type.eq=purchase_orders&entity_id.eq=42)`. `GET /v1/approvals`
  returns only the caller's own requests, which cannot show a record's full
  history. The new `ENDPOINTS.approvalHistory()` and `ApprovalApi.listHistory`
  call it; `buildApprovalHistoryQuery` builds the query.
- History types (`ApprovalHistoryData`, `ApprovalHistoryRound`,
  `ApprovalHistoryStep` and its three variants, `ApprovalHistoryApprover`,
  `ApprovalHistorySummary`, `ApprovalUserRef`); `ApprovalRequest` gains
  `approved_at`, `approval_sequence` and `version`, and `approver_data` /
  `created_by_data` now describe the `{ id, first_name, last_name }` shape the
  service actually sends; `queryKeys.approval.byEntity`; `APPROVAL_HISTORY_LIMIT`; `errorTitle` and
  `retryLabel` on `AsyncBoundary`; `I18N.history.*` and `I18N.common.close`.
  All additive.
- **`onError` on the provider** receives every failed read
  (`{ source: 'query', key }`) and write (`{ source: 'mutation', operation }`)
  with the full `ApprovalWorkflowError`, for logging and telemetry. It observes;
  the package's own error states and notifications are unchanged.
- **`queryClient` now shares a cache.** Passing a `createQueryCache()` instance
  makes the provider use it, so several providers share responses. Previously
  the prop was stored on the config and otherwise ignored. `createQueryCache`,
  `QueryCache` and `QueryCache.onError` are exported from `…/hooks` and the root.
- `useWorkflowMutations({ onError })` and `useWorkflowList({ onDeleteError })`.
  `remove` / `deleteWorkflow` resolve `true` on success (still `undefined` on
  failure), so a caller can tell the two apart.
- `useApprovalDecision` returns `startApproval(request)` (opens the pending
  pre-action, else the decision modal) and `getPendingPreAction(request)`.
- `useApprovalRequest` returns `historyError` and `refetchHistory`.
- `useHierarchyLevels(scope, { enabled })`.
- Error utilities `toApprovalWorkflowError`, `getUserFacingErrorMessage`,
  `isAbortError`, `GENERIC_ERROR_MESSAGE`; also `toWorkflowScope`,
  `toDottedField` and the types `TranslateEntryFn`, `ErrorReporter`,
  `ApprovalErrorContext`, `UseWorkflowMutationsOptions`,
  `UseApprovalDecisionResult`.
- `PERMISSION_KEYS.commonApprovals` (`ErpCommonApprovals`): the dashboard reads
  it when the role carries nothing under `Approvals`.
- I18N keys for copy that was hard-coded in English: `workflow.createdOn`,
  `workflow.active` / `inactive`, `workflow.nodeDeleted`,
  `workflow.nodeAndBranchesDeleted`, `workflow.triggerNotDeletable`,
  `dashboard.requestedBy` / `requestedOn` / `noActivity`.

### Fixed

- **The CommonJS build could not be loaded.** The package is
  `"type": "module"`, so Node read the CommonJS output (emitted as `.js`) as ESM
  and every `require()` of the package failed. It is now emitted as `.cjs`, and
  `validate-package.mjs` loads a CommonJS entry to prove it.
- **CommonJS consumers loaded all of `@mui/icons-material`.** The icons barrel
  survived into `dist/` as `require("@mui/icons-material")`: about 2,000 icon
  modules for the two dozen the package uses. Icons are now imported per file,
  through a single `src/ui/icons.ts`, enforced by ESLint and the validator.
- **Every icon failed to render under Vite's dev server** (a regression in an
  earlier 1.1.1 build, "React.jsx: type is invalid … got: object"). Per-icon
  files are CommonJS; default-imported from this `"type": "module"` package,
  esbuild applies Node's interop and hands over `module.exports` instead of the
  component. `src/ui/icons.ts` unwraps `default` once, which is correct under
  every toolchain, and `validate-package.mjs` now bundles the icons exactly as
  Vite does and fails the build if any icon is not a renderable component.
  `@mui/material` is imported from its barrel again: its per-component paths
  are directory imports in MUI v5, which Node's ESM loader rejects.
- **A failed save showed nothing.** `WorkflowFormView` returned silently when
  `save` failed (an API error or an invalid graph); the user is now notified.
- **A failed delete was announced as a success.** `WorkflowDetailView` notified
  "deleted" and navigated away whatever the outcome, and `WorkflowListView`
  closed its dialog. Both now notify the error and keep the dialog open; the
  list also confirms a successful delete, as the detail screen did.
- **Approval-history failures on the request detail screen were swallowed**; it
  now shows the error with a retry.
- **The request detail screen ignored an adapter's pre-action**, so a request
  gated behind a step such as "Add budget" could be decided there although the
  queue blocked it. Both screens now share one decision flow.
- **`useOperators` and `useReferenceOptions('operator')` shared a cache key**
  while caching different shapes, so whichever ran second read the wrong one.
  Operators now have their own key.
- **Dragging a node re-rendered the whole canvas.** Builder callbacks depended
  on `nodes`, rebuilding every node's data per drag frame. They are now stable,
  and unchanged nodes keep their React Flow object.
- **The action drawer requested hierarchy levels on every canvas visit**, open
  or not. It now asks only while open and when a Hierarchy stage is possible.
- User-facing errors never show server internals: a 5xx, a network failure or a
  `TypeError` shows the translated generic message instead of its raw text.
- A pre-action's `successMessage` is translated, as its type always documented.
- "Retry", "Active" / "Inactive", the permission-denied message and several
  labels were English-only; they now go through `translate`.
- A `console.log` left in `resolveCapabilities` is removed (it failed lint).
- A network failure in `createFetchHttpClient` is an `ApprovalWorkflowError`
  with `code: 'network-error'` rather than a bare `TypeError`; cancellations
  still pass through untouched.
- A missing `http`, `navigate`, `routes` or `moduleContext.module` throws an
  `ApprovalWorkflowError` (`code: 'invalid-config'`) on mount instead of
  failing later inside a hook.

- **The field picker never loaded for the first condition in the criteria
  drawer.** The picker is driven by `customFetchApi`, which the ERP
  `SearchableSelect` calls once on mount and then owns — it does not re-run
  because the source it closed over later gained data. Opening the drawer
  rendered the first row while `useEntityFields` was still in flight, so that
  row's picker was stuck on an empty list for good; a second condition added
  later worked only because the request had landed by then. The drawer now
  holds its rows back until the catalogue settles, showing a loading state and,
  on failure, a retryable error instead of an empty picker.
- **Rows in the criteria drawer shared one option-source accumulator.** Every
  row was served by a single `useGroupedOptionSource` instance, the exact
  sharing that hook's per-instance ref was built to prevent: the rows took turns
  resetting each other's search term and paging state, so scrolling the field
  picker on one condition dropped the first page of results on another. Each row
  is now a `CriteriaConditionRow` with its own accumulator.
- **Canvas nodes were laid out unaligned, and far too far apart.**
  `getLayoutedElements` positioned only nodes sitting at exactly `(0,0)` and left
  everything else where it found it, which produced three separate kinds of
  misalignment:

  1. Pass/Fail branches were created at hard-coded *absolute* coordinates
     (`{x:250, y:±160}`), so the placer read them as manually positioned and
     never moved them to their parent. Every criteria's branches landed on the
     same two spots on the canvas — and in their parent's own column.
  2. Depth was read back as `x / (NODE_WIDTH + HORIZONTAL_SPACING)` (330) but
     written as `depth * HORIZONTAL_SPACING` (250). The two disagree from the
     third column on, where the round-trip puts a level directly on top of its
     own parent.
  3. Adding a second child re-centred its siblings without moving their
     subtrees, detaching an existing branch from the node it belongs to.

  The placer is now a tidy left-to-right tree: a node sits in the column for its
  depth, each leaf takes the next free row, and a parent is centred between its
  first and last child. The collision-search helpers that existed only to paper
  over the above (`buildDepthIndex`, `subtreeHeight`, `overlapsAtDepth`,
  `findAvailableY`) are gone. The trade is that adding a node re-tidies the whole
  tree, so a node the user dragged returns to its computed spot.
- **`LAYOUT` geometry now matches what a node actually renders as.** It declared
  an 80x50 node; `GenericNode` draws 148 wide (the label box) by ~170 tall (the
  in-flow hover toolbar, the 96px card and the caption). The spacings are now the
  *gap* between nodes rather than a stride derived from wrong dimensions, which
  is what made the canvas read as sparse: two branches were 500px apart and are
  now 210.
- **Actions configured on a Pass/Fail branch were dropped from the save
  payload.** Clicking a branch opens the *action* sidebar, which writes an
  `action` array onto that node, but `transformGraphForApi` projected result
  nodes down to `{ label, resultType, type }` and discarded it. Every action
  key (`action_type_ref`) and its approver config was lost on create *and* on
  update — so re-saving an untouched workflow also erased actions that were
  already stored. Branch nodes now persist their `action` array, which is what
  the engine reads: `transformGraphToExecution` walks `criteriaResult` nodes
  specifically for it. Dedicated `action` nodes were never affected.
- **A blank approval stage was persisted as an action.** The sidebar mapped
  every row, including one the author added but never filled in, producing a
  stage with an empty `action_type_ref` that the engine turned into a no-op
  `custom` action. Only stages that name an action are sent now; clearing every
  stage still correctly persists an empty list.

### Changed

- **Request Category lists only workflow-enabled entities.** Sub-modules from
  `/v1/user/modules` appear in the form's Request Category field and the
  trigger sidebar only when they carry `is_workflow_enabled: true`; a missing
  flag counts as disabled. Host-supplied `entityCatalogue` entries are listed
  unless they set `is_workflow_enabled: false`. A workflow already bound to a
  since-disabled entity keeps it selectable while editing, and list and detail
  views still show its label. `useEntityCatalogue()` takes an optional
  `{ selectedValue }` for the same purpose.
- **BREAKING: `ENDPOINTS.approvalHistory(id)` is now `ENDPOINTS.approvalDetails(id)`,
  and its path is `/v1/approvals/:id/details` instead of `/v1/approvals/:id/history`.**
  It is the audit trail of a single approval request, still read by
  `ApprovalApi.getHistory(id)` / `useApprovalRequest(id).history`; the backend
  route has to answer at the new path. `ENDPOINTS.approvalHistory` now takes no
  argument and returns `/v1/approvals/history`, the per-record history above.
  Hosts that referenced `ENDPOINTS.approvalHistory(id)` must switch to
  `approvalDetails(id)`.

- **New workflows are seeded from context.** The request type defaults to the
  `action_type` reference entry matching `request_approval`, and the scope's
  company defaults to `config.currentUser.company_id` — the field that was
  already documented as "default company scope applied to new workflows" but
  never read. Both are create-only, applied once each, and never overwrite a
  value already present, so editing and duplicating are untouched. A host that
  supplies no `company_id`, or a deployment whose reference list has no
  equivalent entry, simply gets no preselection.
- **Pass and Fail nodes carry their branch colour.** The tiles were white with a
  neutral hairline and were told apart only by their icon; they now take the
  tint, border and icon colour already defined in `RESULT_BRANCH_PRESENTATION`,
  which also drives the edge label and the action sidebar's badge. `GenericNode`
  gains a `tone` prop; every other node type is unchanged.
- **Approve and Reject moved into the dashboard's row menu**, after View, and
  the dedicated action column is gone — it spent a full column of width on every
  row repeating two actions the menu had room for. Permission checks, the
  pending-status guard, the confirmation modals, notifications and the pre-action
  flow are unchanged. `APPROVAL_DASHBOARD_COLUMNS` no longer contains the
  `action` entry.
- **Clicking a dashboard row opens the request's record**, the same destination
  and route the View action uses. Cells render through the new shared `RowLink`,
  which the workflow list now uses too rather than repeating the anchor; the
  actions column is drawn by the grid outside those cells, so opening the menu
  cannot navigate.
- `ResultNodeData` gains an optional `action: ApproverStage[]`, and the new
  `ActionBearingNodeData` union covers both node types that carry stages. The
  shape was always written and stored — it just was not declared, which is how
  the projection came to drop it.
- `hasActionType(draft)` is exported from `utils/approver-config`;
  `isStageComplete` now builds on it rather than repeating the check. It is now
  also exported from `…/utils`, as `docs/API.md` already stated.
- **Peer dependencies.** `dayjs` and `react-router-dom` were declared but never
  imported, and are removed. `react-hook-form`, `@hookform/resolvers` and `yup`
  are now optional peers: only the workflow form, `…/schemas` and the root entry
  need them; the dashboard and approval-history entries do not. `sass` is
  removed from devDependencies (no stylesheet uses it).
- `main` and every `exports[…].require` now point at `.cjs` files.
- `ApprovalRequestDetailView` shows its View button only when the adapter
  returns a route for the request, matching the queue's View action.
- Internal: the list, cached-query and reported-mutation logic shared by the
  data hooks, the empty / error / permission-denied layout, the stage and
  condition card, and the dashboard's record links are each written once.

---

## [1.1.0] — Unreleased

Permissions are now resolved by the package from the ERP's global permission
system instead of being supplied by each consuming module.

```text
@erpsquad/common ──► usePermissions() ──► @erpsquad/approval-workflow
```

See [docs/MIGRATION.md](docs/MIGRATION.md#upgrading-to-110--global-permissions)
for the upgrade, which is a deletion.

### Removed — BREAKING

- `ApprovalWorkflowProvider` no longer accepts `permissions`. Delete the prop;
  nothing replaces it.
- `createPermissionResolver`, `createStaticPermissionResolver` and
  `allowAllPermissions` are gone, along with the `ErpModulePermission` and
  `ErpPermissionBindings` types.
- `usePermissions(capabilities)` and `usePermissionChecker()` are replaced by
  `useApprovalPermissions()`.
- `PermissionGate` no longer accepts `context`, and the `PermissionResolver` and
  `PermissionContext` types are gone. Per-record checks only ever existed so a
  host could answer them.
- `WorkflowListView` no longer accepts `canCreate`. The add button follows
  `WorkflowAutomation.canAdd || canEdit`, which is what the escape hatch
  existed to work around.

### Added

- `useApprovalPermissions()` — every capability as one frozen, stable object,
  computed once per permission change and shared through a `WeakMap`.
- `PERMISSION_KEYS` — the RBAC keys the package reads: `WorkflowAutomation`,
  `Approvals`, `Departments`, `Grades`, `employee`, `OrganisationStructure`.
- `resolveCapabilities(tree)` and `readPermissionNode(tree, key)` — the
  permission matrix as pure functions.
- `selectApproverTypeOptions(permissions)` and
  `selectApplicableFilters(filters, permissions)` — capability-driven option
  lists, shared by the action drawer and the canvas.
- `useApproverUserSource(scope)` — picks the directory behind the User approver.
- Capabilities `applicable.department`, `applicable.grade`,
  `applicable.employeeType` and `employee.directory`.
- `ScopeFilterDefinition.capability`, so a host-supplied Applicable filter can
  declare its own gate.
- Types `ApprovalWorkflowPermissions`, `ErpPermissionNode`, `ErpPermissionTree`
  and `PermissionKey`.

### Changed

- The Approval Type dropdown builds its options from permissions: `Department`
  needs `Departments`, `Hierarchy` needs `OrganisationStructure`. `User` is
  always offered. Options are removed, not disabled.
- The Applicable filters hide `Department` without `Departments`, `Grade`
  without `Grades` and `Employee Type` without `employee`. `Employee Type` is a
  static list and issues no lookup to decide its own visibility. A hidden
  filter's existing value is left on the workflow rather than cleared.
- The User approver reads the `employees` lookup with `employee` and the `users`
  lookup without it. Both resolve to user ids, so the persisted payload and the
  wire format are unchanged. Neither is fetched until the User approval type is
  selected and its selector is opened.
- `@erpsquad/common` stays a peer dependency and is now load-bearing at runtime:
  the package reads its permission context, so a duplicate copy in the tree
  would read an empty permission tree. Documented in
  [docs/INTEGRATION.md](docs/INTEGRATION.md).

### Fixed

- A module could bind the workflow screens to its own RBAC resource and
  disagree with the rest of the ERP about who may configure approvals. There is
  now one answer, from one source.

---

## [1.0.0] — Unreleased

First release. Extracted from the approval workflow and approval dashboard
screens in `erpforce-hrms-fe`, generalised so any ERP module can consume it.
See [docs/ANALYSIS.md](docs/ANALYSIS.md) for what the original did and
[docs/MIGRATION.md](docs/MIGRATION.md) for how to adopt this alongside it.

### Added

**Workflow**
- `WorkflowListView` — server-side search, sort, filter, paging; edit,
  duplicate and delete row actions, each permission-gated.
- `WorkflowFormView` — one component for create and edit, with draft support.
- `WorkflowDetailView` — read-only detail with a non-interactive canvas.
- `WorkflowBuilder` — React Flow canvas with trigger, criteria and action nodes,
  automatic Pass/Fail branching, subtree delete, auto-layout and scope filters.
- Criteria builder with three condition types (operator, aggregate, formula),
  field-type-aware operator filtering, enum/lookup/date/number value inputs and
  a token-based formula editor.
- Action sidebar with user, department and hierarchy approver strategies,
  multiple stages and auto-approve escalation.

**Dashboard**
- `ApprovalDashboardView` — pending approvals with inline approve/reject.
- `ApprovalRequestDetailView` — request detail and approval history, backed by
  the API.
- Module registry: each ERP module plugs in its own titles, routes, modals,
  decision handlers and pre-actions.

**Integration**
- `ApprovalWorkflowProvider` with eleven named contracts: transport, module
  context, current user, permissions, routes, navigation, module registry,
  tenant, translation, notifications, list state.
- `HttpClient` interface plus `createFetchHttpClient`. No environment variable
  is read anywhere in the package.
- `PermissionResolver` abstraction with `createPermissionResolver` for the ERP
  RBAC map, thirteen capabilities, `PermissionGate` and permission hooks.
- Optional binding to a host page-preference service for saved views and column
  preferences.

**Architecture**
- Server-state cache with request de-duplication, staleness and key-prefix
  invalidation. No Redux, no new runtime dependency.
- Service layer holding the business rules (scope is mandatory, a published
  workflow needs a valid graph, only pending requests are actionable).
- Standardised loading, empty, error and permission-denied states via
  `AsyncBoundary`.
- 16 entry points; ESM and CJS with declarations; zero runtime dependencies;
  every shared library a peer dependency.
- 190 tests covering graph transforms, criteria transforms, approver
  configuration, workflow payloads, list queries, status transitions, the cache,
  both services, permissions, the registry, the transport, and the two
  business-critical hooks.

**Adapters**
- `ApprovalModuleAdapter.callDecisionApi` — decouples the two writers of an
  approve/reject. Unset it keeps the original either/or (defining
  `submitDecision` replaces the package endpoint); `false` suppresses the
  package endpoint outright, so a host API can be the sole writer without having
  to supply a `submitDecision` it does not need; `true` runs both, for an
  adapter whose call is a side effect rather than the status transition. Set on
  the `'*'` fallback adapter it switches the default for every entity type.

**Design system**
- `src/ui/tokens.ts` — the package's surfaces, hairlines, radii, shadows and
  text ramp in one module, expressed as ERP palette paths so a host re-theme
  carries through. Every screen paints from it.
- `PageShell`, `PageHeader`, `SectionCard` and `FormField` — the page, header,
  panel and field primitives every screen now composes, replacing per-screen
  `Box` chrome that had drifted apart on padding, borders and type scale.
- `ListToolbar` gains a record count, a clearable ERP-style search field and a
  visible primary action; `DataTable` wraps the grid and its pager in one
  bordered white card with a quiet header band and row hover.
- `SectionCard` supports `collapsible`, preserving the fold/unfold behaviour of
  the `Accordion` sections it replaces.

### Fixed

Defects carried over from the original implementation, each pinned by a test:

- The action sidebar shared one object across every approval stage, so editing
  one stage edited them all.
- Switching approver type persisted the previous type's fields (a department id
  survived into a `USER` stage).
- `findChildNodes` recursed without a visited set and overflowed the stack on a
  graph containing a cycle.
- Graph layout was O(n³): the depth index was rebuilt inside two nested loops
  and subtree heights were recomputed on every call.
- `fetchDataLocally` kept a module-level mutable cache shared by every mounted
  sidebar, so two open criteria rows corrupted each other's pages.
- Reference data (action types, operators, entity fields) was re-fetched on
  every screen mount and every sidebar open.
- `nodeTypes` was rebuilt on each parent render, remounting every canvas node.
- Error responses were double-parsed and the server's message discarded in
  favour of a literal "Something went wrong".
- Save buttons allowed a double submit.
- Criteria date values used `toISOString()` and shifted by a day for users east
  or west of UTC.
- The zoom readout was polled behind a 50 ms timeout and never updated on scroll
  or pinch zoom.
- The approval detail screen rendered a hard-coded dummy array instead of
  calling the API.
- The dashboard had no error state; a failed load rendered an empty table.
- Scope validation was duplicated and divergent between the add and edit
  screens.
- Validation messages were hard-coded in English inside the yup schema and could
  not be translated.
- The builder canvas flickered and swallowed clicks on a node. React Flow emits
  a `dimensions` change the first time it measures a node, and a node the user
  had just created carried no `measured` value; writing that back produced a new
  node object, a new `nodes` array, and another measurement pass. The node
  element was replaced between mousedown and mouseup, so the click never landed.
  `applyTrackedNodeChanges` now keeps position and selection only, and returns
  the previous array when nothing moved.
- The builder's canvas was a fixed `70vh` under a variable stack of host chrome,
  so it ran off the bottom of the window; it now measures its own offset and
  fills the remaining viewport.
- The screen header and the builder's header stacked, costing ~120px of canvas
  and showing two competing titles. The embedding screen now owns the single
  header and switches it to builder mode.
- The scope filter bar floated over the canvas and covered the trigger node,
  which is where auto-layout puts it. It is now a toolbar row above the canvas.
- The builder restored the persisted viewport on mount, which framed the graph
  against whatever window size it had been saved at and left half the flow
  off-screen. It fits the graph to the canvas instead; the viewport is still
  persisted.
- The builder drawers opened *under* the host's fixed app bar, hiding their
  headers: MUI places a Drawer at `zIndex.drawer`, which is one below the ERP
  app bar. Raised to the modal layer.
- Several `sx` overrides silently lost to the host stylesheet. The ERP mounts
  MUI on a `prepend: true` emotion cache, so emotion styles are injected above
  the app's CSS and lose every specificity tie with it — status chips fell back
  to the global grey `.MuiChip-root`, the search field kept its outline, and the
  dashed "add another" buttons lost their border. Those rules now out-specify.
- Table headings rendered raw translation keys
  (`approval-work-flow.columns.status`) for hosts that had not shipped these
  translations: the column table paired each key with the key itself as its
  fallback. Columns now carry a `label`, like every other key in `I18N`.
- The workflow list hid its add button for hosts whose RBAC binds these screens
  to a container resource — a singleton `Settings` node that is readable and
  updatable but never created, so `canAdd` was never granted. `workflow.create`
  now falls back to `canEdit` when `canAdd` is absent; an explicit
  `canAdd: false` is still honoured, and `WorkflowListView` takes a `canCreate`
  override.

### Removed

Carried over deliberately as *not* extracted:

- A 751-line unused fork of the common `ActionBar`.
- A 166-line duplicate of `transformTableColumns` shadowing the common one.
- `saveWorkFlowAsDraft`, a thunk that resolved a `setTimeout` and called no API.
- Hard-coded Purchase Order and HR entity-type "examples" in the condition
  constants.
- Redux slices whose state declared fields the feature never used
  (`customers`, `vendors`, `uoms`, `taxTemplates`, `salesperson`, …).
- Three near-identical copies of the data-fetching hook and two of the listing
  component.
