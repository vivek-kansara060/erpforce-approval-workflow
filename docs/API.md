# Public API reference

Everything listed here is part of the package's semver contract. Anything not
listed is internal, even if it is physically reachable.

---

## Provider

### `ApprovalWorkflowProvider`

| Prop | Type | Required | Default |
| --- | --- | --- | --- |
| `http` | `HttpClient` | yes | — |
| `moduleContext` | `{ module: string; label?: string }` | yes | — |
| `currentUser` | `{ id: string \| number; name?; email?; company_id? }` | yes | — |
| `routes` | `RouteConfig` | yes | — |
| `navigate` | `(to, options?) => void` | yes | — |
| `modules` | `ModuleRegistry` | no | generic adapter only |
| `tenant` | `TenantContext` | no | — |
| `translate` | `(key, fallback?) => string` | no | returns the fallback |
| `notify` | `(message, variant?) => void` | no | `console.warn` |
| `onError` | `(error, context) => void` | no | — |
| `listState` | `ListStateAdapter` | no | local state |
| `queryClient` | `QueryClientLike` | no | one per provider; pass a `createQueryCache()` instance to share it |
| `entityCatalogue` | `Array<{ label, value, is_workflow_enabled? }>` | no | fetched |
| `defaultPageSize` | `number` | no | `10` |
| `staleTime` | `number` (ms) | no | `30000` |

`onError` observes every failed read (`{ source: 'query', key }`) and write
(`{ source: 'mutation', operation }`) with the full `ApprovalWorkflowError`. It
does not replace the package's own handling: users still see the error state or
notification, which only ever shows a safe message (see `getUserFacingErrorMessage`).

A missing `http`, `navigate`, `routes` or `moduleContext.module` throws an
`ApprovalWorkflowError` with `code: 'invalid-config'` on mount.

There is no permission prop. Permissions are ERP-wide, not module-specific, so
the package reads them itself from `usePermissions()` in `@erpsquad/common`.
Mount the screens anywhere under the app's `PermissionsProvider` — in an
ERPForce app that is the whole authenticated tree.

### Context hooks

| Hook | Returns |
| --- | --- |
| `useApprovalWorkflowConfig()` | resolved config |
| `useApprovalWorkflowContext()` | config + cache + api + services |
| `useApprovalWorkflowServices()` | `{ workflow, approval }` |
| `useApprovalWorkflowApi()` | `{ workflow, approval, reference }` |
| `useQueryCache()` | the shared `QueryCache` |
| `useTranslate()` | `TranslateEntryFn`: `(entry: I18nEntry, override?) => string` |

---

## Views

Import from `@erpsquad/approval-workflow/views`, or the narrower
`…/views/workflow` and `…/views/dashboard`.

### `WorkflowListView`

| Prop | Type | Default |
| --- | --- | --- |
| `filters` | `WorkflowListFilters` | — |
| `scopeToModule` | `boolean` | `true` |
| `title` | `string` | translated |
| `renderToolbar` | `(ctx) => ReactNode` | built-in toolbar |

`ctx` is `{ search, setSearch, onAdd, canAdd }`. `canAdd` reflects
`workflow.create`; the view gates itself on `workflow.view`.

### `WorkflowFormView`

| Prop | Type | Default |
| --- | --- | --- |
| `mode` | `'create' \| 'edit'` | required |
| `workflowId` | `string` | — |
| `duplicate` | `boolean` | `false` |
| `openBuilder` | `boolean` | `false` |
| `scopeFilters` | `ScopeFilterDefinition[]` | company/location/department/grade/type |
| `showScopeFilters` | `boolean` | `true` |

`ScopeFilterDefinition` is `{ key, label, valueKey, apiType?, options?,
showCancelButton?, capability?, dependentFilter? }`. A filter is dropped when
its `capability` is not granted; one without a `capability` always renders. The
defaults gate Department on `applicable.department`, Grade on
`applicable.grade` and Employee Type on `applicable.employeeType`.
| `showFlowGuide` | `boolean` | `true` in create |
| `flowGuideIllustration` | `string` | — |

### `WorkflowDetailView`

| Prop | Type |
| --- | --- |
| `workflowId` | `string` (required) |
| `formatDate` | `(iso: string) => string` |

### `ApprovalDashboardView`

| Prop | Type | Default |
| --- | --- | --- |
| `filters` | `ApprovalDashboardFilters` | — |
| `scopeToCurrentUser` | `boolean` | `true` |
| `pendingOnly` | `boolean` | `true` |
| `title` | `string` | translated |
| `renderToolbar` | `(ctx) => ReactNode` | built-in toolbar |

### `ApprovalRequestDetailView`

| Prop | Type |
| --- | --- |
| `requestId` | `string` (required) |
| `formatDate` | `(iso: string) => string` |

---

## Hooks

### Server state

| Hook | Returns |
| --- | --- |
| `useWorkflowList(options?)` | `{ rows, totalCount, isLoading, isRefetching, error, refetch, listState, setPage, setPageSize, setSearch, deleteWorkflow, isDeleting }`; `options.onDeleteError` is told about a failed delete |
| `useWorkflow(id, { mode? })` | `{ workflow, formValues, isLoading, error, refetch }` |
| `useWorkflowMutations({ onError? })` | `{ save, isSaving, saveError, remove, isRemoving, removeError, validate }` |
| `useApprovalRequests(options?)` | `{ rows, totalCount, isLoading, isRefetching, error, refetch, listState, setPage, setPageSize, setSearch }` |
| `useApprovalRequest(id)` | `{ request, history, isLoading, isHistoryLoading, error, historyError, refetch, refetchHistory }` |
| `useApprovalHistory({ entityType, entityId, enabled? })` | `{ rounds, summary, records, hasIdentity, isLoading, isRefetching, error, refetch }` |

`useApprovalHistory` is one record's history: every approval request
`GET /v1/approvals/history` returns for `entity_type` + `entity_id`, by any
approver and in any status, grouped into `rounds` (one per submission) of
steps: the submission, each approval level with its approvers, and the outcome
once nothing is pending. `summary` is where the latest round stands. It
requests nothing until both identifiers are present and `enabled` (default
`true`) holds.
It is not the same as `useApprovalRequest(id).history`, which is the audit trail
of a *single* approval request.

`useWorkflowMutations` writes resolve `undefined` on failure and never reject;
the error is on `saveError` / `removeError` and goes to
`onError(error, 'save' | 'remove')`. `remove` resolves `true` on success, so a
caller can tell the two apart.

### Reference data (5-minute cache)

| Hook | Returns |
| --- | --- |
| `useReferenceOptions(type, { enabled? })` | `{ options, ...query }` |
| `useOperators({ enabled? })` | `{ operators, ...query }` |
| `useEntityCatalogue({ selectedValue? })` | `{ catalogue, labelOf, ...query }`; `catalogue` holds workflow-enabled entities only (plus `selectedValue`) |
| `useEntityFields(entityType)` | `{ groups, ...query }` |
| `useSchemaFields(name)` | `{ fields, ...query }` |
| `useHierarchyLevels(scope, { enabled? })` | `{ levels, ...query }` |

### UI state

| Hook | Returns |
| --- | --- |
| `useApprovalDecision({ onCompleted? })` | decision + pre-action modal state and submit handlers, plus `startApproval(request)` (opens a pending pre-action, else the decision) and `getPendingPreAction(request)`; memoised |
| `useWorkflowGraph(options)` | nodes, edges, sidebar state, node mutations |
| `useListState(resource, columns)` | `ListState` |
| `useGroupedOptionSource(groups)` | a `customFetchApi` for `SearchableSelect` |
| `useApproverUserSource(scope)` | lookup props for the User approver selector |

`useApproverUserSource` returns `{ apiType, valueKey?, attributes?,
customeFilter }`. With the `employee` permission it drives the `employees`
lookup projected to each record's `user_id`; without it, the `users` lookup,
whose ids already are user ids. Either way the workflow stores user ids, so a
workflow authored by one role opens correctly for the other. It computes props
only — nothing is fetched until the User approval type is selected.

### Primitives

`useQuery(cache, key, fetcher, options)` and `useMutation(fn, options)` are
exported so a host can add its own queries against the same cache.
`createQueryCache()` returns a `QueryCache`; pass it to several providers' `queryClient`
to share one cache. `cache.onError(listener)` subscribes to fetch failures.

---

## Components

### Feedback

`LoadingState`, `EmptyState`, `ErrorState`, `PermissionDeniedState`,
`AsyncBoundary`.

`AsyncBoundary` resolves loading → error → empty → content. `errorTitle` and
`retryLabel` are passed through to its `ErrorState`:

```tsx
<AsyncBoundary
  isLoading={isLoading}
  error={error}
  isEmpty={rows.length === 0}
  onRetry={refetch}
  emptyTitle="Nothing here yet"
>
  <Table rows={rows} />
</AsyncBoundary>
```

### Modals

`ApprovalCommentModal`, `ConfirmDecisionModal`, `FlowGuideModal`.

### Workflow

`WorkflowStatusChip`, `ApprovalStatusChip`, `WorkflowSummaryCard`.

### List

`ListToolbar`, `DataTable`.

### Approval history: `@erpsquad/approval-workflow/components/approval-history`

`ApprovalHistory` is a button that opens the record's approval timeline in a
popover. Also exported from `…/components` and the root.

| Prop | Type | Default |
| --- | --- | --- |
| `entityType` | `string` | required |
| `entityId` | `string \| number \| null \| undefined` | required; button disabled while missing |
| `formatDate` | `(iso: string) => string` | user's locale |
| `label` | `string` | translated "Approval History" |
| `disabled` | `boolean` | `false` |

The popover shows a summary card, then the latest submission's trail with
earlier submissions folded. A status the package does not recognise is shown in
the server's own wording. Requires the `GET /v1/approvals/history` route in the
approvals service; see the integration guide.

### Builder — `@erpsquad/approval-workflow/components/builder`

`WorkflowBuilder`, `ScopeFilterBar`, `ZoomControls`, `GenericNode`,
`NODE_TYPES`, `useNodeTypes`, `BranchEdge`, `EDGE_TYPES`, `SidebarShell`,
`TriggerSidebar`, `CriteriaSidebar`, `ActionSidebar`, `ConditionValueInput`,
`FormulaEditor`, and the `toFlowNode` / `toFlowEdge` converters.

`WorkflowBuilder` is fully controlled: `initialGraph` seeds it once, `onChange`
reports every mutation.

---

## Adapters

| Export | Purpose |
| --- | --- |
| `createModuleRegistry(adapters?, fallback?)` | build a registry |
| `defineModuleAdapter(entityType, adapter?)` | one adapter |
| `createRouteAdapters(routeMap)` | navigation-only adapters in bulk |
| `FALLBACK_ENTITY_TYPE` | `'*'` |

### `ApprovalModuleAdapter`

| Field | Type | Required |
| --- | --- | --- |
| `entityType` | `string` | yes |
| `title` | `string` | no |
| `getRecordRoute` | `(request) => string \| undefined` | no |
| `modalComponent` | `ComponentType` | no |
| `getModalProps` | `(state, onConfirm, onClose) => object` | no |
| `submitDecision` | `(context) => Promise \| void` | no |
| `callDecisionApi` | `boolean` | no |
| `handlesOwnSubmission` | `boolean` | no |
| `preAction` | `PreActionConfig` | no |

#### Who writes the decision

`submitDecision` and the package's own approve/reject endpoint are independent
writers. `callDecisionApi` decides which of them runs.

| `callDecisionApi` | `submitDecision` | Adapter called | Package endpoint called |
| --- | --- | --- | --- |
| unset | absent | — | yes |
| unset | present | yes | no |
| `false` | absent | — | no |
| `false` | present | yes | no |
| `true` | absent | — | yes |
| `true` | present | yes | yes |

Unset reproduces the original either/or, so existing adapters are unaffected.
Set it explicitly when your API is the sole writer (`false`) or when it is a
side effect and the package still owns the status transition (`true`).

When both run, `submitDecision` goes first and a rejected promise aborts the
decision — the request is not marked decided and the cache is not invalidated.

Set it on the `'*'` fallback adapter to change the default for every entity
type:

```ts
createModuleRegistry([], defineModuleAdapter(FALLBACK_ENTITY_TYPE, {
  callDecisionApi: false,
}));
```

`handlesOwnSubmission` outranks all of this: it returns straight after
refreshing the list, calling neither writer.

---

## Permissions

Permissions are resolved inside the package from the ERP's global permission
state. Nothing here is supplied or configured by a consumer.

```text
@erpsquad/common  ──►  usePermissions()  ──►  @erpsquad/approval-workflow
```

### Hooks and components

| Export | Purpose |
| --- | --- |
| `useApprovalPermissions()` | every capability, as one frozen object |
| `usePermission(capability)` | one capability |
| `PermissionGate` | `{ capability, children, fallback? }` |

`useApprovalPermissions()` returns the same object identity for as long as the
signed-in role's permissions hold, so it is safe in a dependency array.

### RBAC keys

Exported as `PERMISSION_KEYS`. These are ERP-wide names owned by the backend's
`role-permission` payload.

| Feature | Key |
| --- | --- |
| Approval Workflow | `WorkflowAutomation` |
| Approval Dashboard | `Approvals`, else `ErpCommonApprovals` |
| Department | `Departments` |
| Grade | `Grades` |
| Employee / Employee Type | `employee` |
| Hierarchy | `OrganisationStructure` |

The dashboard reads `Approvals`; when the role carries no flag there it reads
`ErpCommonApprovals` (`PERMISSION_KEYS.commonApprovals`) instead.

Keys are matched against the permission tree exactly first, then
case-insensitively — the tree builder in `@erpsquad/common` capitalises its
keys, so `employee` resolves against the `Employee` node it produces.

### Capabilities

| Capability | Source | Rule |
| --- | --- | --- |
| `workflow.view` | `WorkflowAutomation` | `canView` |
| `workflow.viewById` | `WorkflowAutomation` | `canViewById \|\| canView` |
| `workflow.create` | `WorkflowAutomation` | `canAdd \|\| canEdit` |
| `workflow.edit` | `WorkflowAutomation` | `canEdit` |
| `workflow.delete` | `WorkflowAutomation` | `canDelete` |
| `workflow.activate` | `WorkflowAutomation` | `canEdit` |
| `approval.view` | `Approvals` † | `canView` |
| `approval.viewById` | `Approvals` | `canViewById \|\| canView` |
| `approval.approve` | `Approvals` | `canEdit \|\| canView` |
| `approval.reject` | `Approvals` | `canEdit \|\| canView` |
| `workflow.approver.user` | — | always granted |
| `workflow.approver.department` | `Departments` | read |
| `workflow.approver.hierarchy` | `OrganisationStructure` | read |
| `applicable.department` | `Departments` | read |
| `applicable.grade` | `Grades` | read |
| `applicable.employeeType` | `employee` | read |
| `employee.directory` | `employee` | read |

† Or `ErpCommonApprovals` when the role has nothing under `Approvals`; the same
applies to every `approval.*` row.

"read" means `canView || canViewById`: a role granted only the detail endpoint
still knows the resource exists and may select from it.

### Deriving UI from capabilities

| Export | Purpose |
| --- | --- |
| `resolveCapabilities(tree)` | the whole matrix, as a pure function |
| `readPermissionNode(tree, key)` | one RBAC node, case-insensitively |
| `selectApproverTypeOptions(permissions)` | visible Approval Type options |
| `selectApplicableFilters(filters, permissions)` | visible Applicable filters |

Both selectors *remove* entries rather than disabling them.

---

## API and services

```ts
createFetchHttpClient(options): HttpClient
createWorkflowApi(http): WorkflowApi       // list, getById, create, update, remove
createApprovalApi(http): ApprovalApi       // list, listHistory, getById, getHistory, act
createReferenceApi(http): ReferenceApi     // byType, operators, entityFields, …
createWorkflowService({ api, cache, module }): WorkflowService
createApprovalService({ api, cache, modules }): ApprovalService
ENDPOINTS
```

---

## Schemas

`createWorkflowSchema(messages?, { requireGraph? })` and
`createTranslatedWorkflowSchema(translate, options?)`.

---

## Utilities

Graph: `transformGraphForApi`, `transformGraphFromApi`, `validateGraph`,
`summarizeGraph`, `normalizeConditionFields`, `denormalizeConditionFields`,
`toDottedField`.

Nodes: `addCriteriaNode`, `addActionNode`, `deleteNodeWithChildren`,
`findDescendantIds`, `updateNodeData`, `createNode`, `createEdge`,
`createTriggerNode`, `generateNodeId`, `generateEdgeId`, `getLayoutedElements`,
`getInitialNodePosition`.

Criteria: `conditionsToQuery`, `queryToConditions`, `createEmptyQuery`,
`createEmptyRule`, `isRuleComplete`, `isQueryComplete`,
`resetRuleForConditionType`, `normalizeFieldType`, `filterOperatorsForField`,
`getFieldEnumValues`, `getFieldTable`.

Approvers: `draftToApproverConfig`, `draftToStage`, `stageToDraft`,
`hasActionType`, `isStageComplete`.

A stage without an `action_type_ref` is a row the author never filled in, not an
action; `hasActionType` is the gate the sidebar applies before persisting, and
`isStageComplete` builds on it.

Workflow: `hasScopeSelection`, `toWorkflowScope`, `toWorkflowPayload`,
`toWorkflowFormValues`, `toDuplicateFormValues`.

Errors: `toApprovalWorkflowError` (normalise anything thrown),
`getUserFacingErrorMessage(error, fallback?)` (the message safe to show: a 4xx
or validation message as-is; the fallback for a 5xx, a network failure or a
`TypeError`), `isAbortError`, `GENERIC_ERROR_MESSAGE`.

Lists: `buildListQuery`, `combineFilters`, `buildApprovalFilter`,
`buildWorkflowFilter`, `paginateGroupedOptions`, `mergeGroupedOptionPages`,
`findGroupedOption`.

Status: `normalizeApprovalStatus`, `isPending`, `canTakeDecision`,
`isTransitionAllowed`, `statusModifier`, `ALLOWED_TRANSITIONS`.

Routes: `withId`, `withParams`.

---

## Types

All exported from `@erpsquad/approval-workflow/types`, which is erased at build
time — importing it costs nothing at runtime.

`Workflow`, `WorkflowFormValues`, `WorkflowWritePayload`, `WorkflowScope`,
`WorkflowStatus`, `WorkflowListFilters`, `WorkflowGraph`, `WorkflowNode`,
`WorkflowEdge`, `WorkflowNodeType`, `TriggerNodeData`, `CriteriaNodeData`,
`ActionNodeData`, `ResultNodeData`, `ActionBearingNodeData`, `Viewport`,
`GraphValidationResult`,
`CriteriaCondition`, `ConditionType`, `ConditionRule`, `ConditionQuery`,
`LogicalOperator`, `EntityFieldMeta`, `OperatorReference`, `ApproverType`,
`ApproverStage`, `ApproverStageDraft`, `ApproverConfig`, `ActionTypeRef`,
`AutoApproveUnit`, `ApprovalRequest`, `ApprovalStatus`, `ApprovalDecision`,
`ApprovalHistoryEntry`, `ApprovalHistoryData`, `ApprovalHistoryRound`,
`ApprovalHistoryStep`, `ApprovalHistorySubmittedStep`, `ApprovalHistoryLevelStep`,
`ApprovalHistoryOutcomeStep`, `ApprovalHistoryApprover`, `ApprovalHistorySummary`,
`ApprovalUserRef`, `ApprovalDashboardFilters`, `ApprovalActionPayload`,
`ApprovalModuleAdapter`, `ModuleRegistry`, `DecisionContext`,
`DecisionModalState`, `PreActionConfig`, `ApprovalWorkflowCapability`,
`ApprovalWorkflowPermissions`, `CapabilityMap`, `ErpPermissionNode`,
`ErpPermissionTree`, `PermissionKey`, `ApprovalWorkflowConfig`, `RouteConfig`, `ListState`, `ListStateAdapter`,
`CurrentUser`, `TenantContext`, `ModuleContext`, `HttpClient`, `HttpRequest`,
`ServiceName`, `ServiceBaseUrls`, `PaginationModel`, `SortModel`, `ListQuery`,
`ListResult`, `SelectOption`, `SelectOptionGroup`, `AsyncState`,
`ApprovalWorkflowError`.

### `any` at the boundary

`any` appears in exactly three files, each with an `eslint-disable` and a reason:

- `types/module.ts` — an adapter's modal props, whose shape only the host knows.
- `components/list/DataTable.tsx` — `MaterialTable`'s column type, owned by
  `@erpsquad/common`.
- the two views that render `MaterialTable` cells.

Package logic itself is strict: `strict`, `noImplicitAny`, `strictNullChecks`,
`noUnusedLocals`, `noUnusedParameters` are all on.
