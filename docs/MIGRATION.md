# Migration and adoption

> **Breaking change in 1.1.0 — permission configuration removed.**
> See [Upgrading to 1.1.0](#upgrading-to-110--global-permissions) at the end of
> this document. In short: delete the `permissions` prop and the resolver that
> fed it. Nothing replaces them.

The existing implementation in `erpforce-hrms-fe/src/views/approval-work-flow`
and `src/views/approval-dashboard` is **untouched** and keeps working. This
document describes adopting the package alongside it, one step at a time, with a
way back at every step.

---

## Principle: run both, switch by route

The package owns no routes and no store. It can be mounted on a second route
while the original keeps serving the first, against the same backend and the
same data.

```tsx
// Existing — unchanged
{ path: '/hrms/approval-workflow',   element: <ApprovalWorkFlow /> },
{ path: '/hrms/approval-dashboard',  element: <ApprovalDashboard /> },

// New — behind a flag
...(flags.newApprovals ? [
  { path: '/hrms/v2/workflows', element: <WorkflowListView /> },
  { path: '/hrms/v2/approvals', element: <ApprovalDashboardView /> },
] : []),
```

Both read and write the same `/v1/workflows` and `/v1/approvals` endpoints and
the same graph format, so a workflow created in one is editable in the other.

---

## Phase 1 — Mount the provider (no user-visible change)

Add the package and wire the provider above a route that renders nothing new
yet. This proves the transport, permissions and adapters in your environment.

```tsx
export const approvalsConfig = {
  http: createFetchHttpClient({ baseUrls, getHeaders: getToken }),
  moduleContext: { module: 'hrms' },
  routes: V2_ROUTES,
};
```

**Exit criteria:** the provider mounts, `useEntityCatalogue()` returns your
entity list, `usePermission('workflow.view')` matches the existing
`ProtectedRoute` behaviour. The provider must sit under the app's
`PermissionsProvider` from `@erpsquad/common` — in an ERPForce app it already
does.

**Rollback:** delete the provider.

---

## Phase 2 — Port the entity map to adapters

`approval-dashboard/utils/configuration.tsx` is the file to translate. It is a
mechanical transformation — the adapter shape was designed to accept the
existing `modalProps` functions verbatim.

### Before

```tsx
// views/approval-dashboard/utils/configuration.tsx
leave_requests: {
  action: approveRejectLeaveRequest,
  getPayload: (id, type, data) => ({
    id, status: type, comments: typeof data === 'string' ? data : data?.remarks,
  }),
  component: AddCommentModal,
  modalProps: (state, onConfirm, onClose) => ({
    isOpen: state.open,
    setIsOpen: onClose,
    onConfirm,
    title: `${state.type} Request`,
  }),
},
```

### After

```ts
defineModuleAdapter('leave_requests', {
  title: 'Leave Request',
  getRecordRoute: (request) =>
    generateRouteWithId(PathnameGenerator(PathnameHrms.VIEW_LEAVE_REQUEST), request.entity_id),

  modalComponent: AddCommentModal,
  getModalProps: (state, onConfirm, onClose) => ({
    isOpen: state.open,
    setIsOpen: onClose,
    onConfirm,
    title: `${state.decision} Request`,
  }),

  submitDecision: ({ entityId, decision, formData }) =>
    dispatch(approveRejectLeaveRequest({
      id: entityId,
      status: decision,
      comments: typeof formData === 'string' ? formData : formData?.remarks,
    })),
});
```

### Field-by-field

| Original | Adapter | Notes |
| --- | --- | --- |
| `action` + `getPayload` | `submitDecision` | Merged: build the payload and dispatch in one place. |
| `component` | `modalComponent` | Unchanged; the modal itself needs no edits. |
| `modalProps` | `getModalProps` | Same signature. `state.type` is now `state.decision`; `state.row` is `state.request`. |
| `skipDispatch: true` | `handlesOwnSubmission: true` | Same meaning. |
| `preAction` | `preAction` | `action` → `submit`, `successMsg` → `successMessage`. |
| `ROUTE_MAP[entityType].path` | `getRecordRoute` | Or `createRouteAdapters` for the whole map at once. |
| `default:` entry | omit | The fallback is built in. |

The ten adapters live in the host app, near the modules they describe:

```
src/approvals/adapters/
├── leave.adapter.ts
├── recruitment.adapter.ts
├── assets.adapter.ts
├── resignation.adapter.ts
├── loan.adapter.ts
├── payroll.adapter.ts
├── resource-allocation.adapter.ts
└── index.ts        → createModuleRegistry([...])
```

This is also the moment the HRMS app stops loading ten feature modules just to
open the dashboard: each adapter file can `React.lazy` its modal.

**Exit criteria:** every entity type in `ROUTE_MAP` has an adapter; a unit test
asserts `registry.list()` covers them.

**Rollback:** the adapters are inert until Phase 3.

---

## Phase 3 — Adopt the dashboard

Point a flagged route at `ApprovalDashboardView`. This is the lower-risk half:
it is read-mostly, and the decision flow goes through your existing thunks and
modals via the adapters.

Behaviour differences to expect:

| Behaviour | Original | Package |
| --- | --- | --- |
| Detail screen | dummy hard-coded data | real `GET /v1/approvals/:id` + history |
| Failed list load | empty table, no message | `ErrorState` with the server's message and a retry |
| Empty queue | empty table | `EmptyState` |
| Rejection comment | optional | required by default (`requireComment`) on the built-in modal; adapter modals are unaffected |
| Already-actioned request | request sent, server rejects | blocked client-side with an explanatory message |
| Search | request per keystroke | 350 ms debounce |

**Exit criteria:** approve and reject work for every entity type; the list
refreshes; notifications appear.

**Rollback:** flip the flag.

---

## Phase 4 — Adopt the workflow screens

Higher risk, because it involves writes. Migrate in this order:

1. **`WorkflowDetailView`** — read-only, safe.
2. **`WorkflowListView`** — read plus delete.
3. **`WorkflowFormView mode="edit"`** — verify a round-trip first (see below).
4. **`WorkflowFormView mode="create"`**.

### Verify the graph round-trip before enabling writes

The wire format is unchanged, but confirm it against your data:

```ts
import { transformGraphFromApi, transformGraphForApi } from '@erpsquad/approval-workflow/utils';

const roundTripped = transformGraphForApi(transformGraphFromApi(existing.graph));
// Compare against `existing.graph`: node ids, types, positions, edges and
// criteria `field` / `sub_module` must be identical.
```

`src/utils/__tests__/graph-transform.test.ts` pins this; add a case using a real
graph from your database.

Behaviour differences to expect:

| Behaviour | Original | Package |
| --- | --- | --- |
| Save as draft | a thunk resolving a `setTimeout`; the real call went to `createApprovalWorkFlow` | one path, `status: 'draft'`, graph validation skipped |
| Scope validation | duplicated and divergent across add and edit | one `hasScopeSelection` |
| Validation messages | hard-coded English inside the yup schema | injected from `translate` |
| Double submit | possible | blocked while a save is in flight |
| Approver type switch | stale fields from the previous type persisted | only the selected type's fields persisted |
| Adding an approval stage | every stage shared one object | a fresh object per stage |
| Delete with a cyclic edge | stack overflow | handled |
| Criteria date values | `toISOString()` could shift a day | local-time `YYYY-MM-DD` |

The last five are bug fixes. If a downstream consumer depends on one of the old
behaviours, find out before Phase 4 — the approver-type fix in particular
changes what is written to `config`.

**Exit criteria:** a workflow created in the package is readable and editable in
the original, and vice versa.

---

## Phase 5 — Retire the original

Only after both screens have run on the package in production for a full
approval cycle.

1. Point the original routes at the package's views.
2. Delete `src/views/approval-work-flow` and `src/views/approval-dashboard`.
3. Remove `approvalWorkFlow` and `approvalDashboard` from the store, and their
   `useInjectReducer` calls.
4. Remove `UserModulesProvider` if nothing else uses it (the package fetches the
   catalogue itself, or takes `entityCatalogue`).
5. Drop `@xyflow/react`, `dagre` and `@react-querybuilder/*` from the host's
   `dependencies` if nothing else needs them — `@xyflow/react` becomes a peer
   satisfied for the package.

---

## Adopting in a new module (Procurement, Finance, Inventory)

No migration, just integration. The whole module-specific surface is:

```ts
// 1. Which entity types exist and where their records live
const modules = createModuleRegistry(
  createRouteAdapters({
    purchase_orders: { route: '/procurement/orders/:id', title: 'Purchase Order' },
  }),
);

// 2. Where the gateway is
const http = createFetchHttpClient({ baseUrls, getHeaders: getToken });
```

Permissions are not on that list. They are ERP-wide, resolved by the package
from `usePermissions()` in `@erpsquad/common`, and identical in every module —
which is exactly why a module should not be asked to describe them.

Plus `moduleContext={{ module: 'procurement' }}` and the six route paths. If the
module has no organisational scope, pass `showScopeFilters={false}`, or replace
the scope filters with your own (`scopeFilters`).

---

## Compatibility guarantees

- **Wire format unchanged.** Same `/v1/workflows` and `/v1/approvals` payloads,
  same graph JSON, same criteria encoding. Both implementations can read each
  other's records.
- **Existing modals work unchanged.** `getModalProps` is passed through
  verbatim; no wrapper is needed.
- **Existing thunks work unchanged.** `submitDecision` can dispatch whatever the
  module already dispatches.
- **Permissions read the same RBAC map** the `ProtectedRoute` components read —
  the package now reads it directly instead of through a host-supplied
  resolver.
- **Legacy graphs render.** `pass` and `fail` node types from older saved graphs
  are still mapped to a renderer.


---

## Upgrading to 1.1.0 — global permissions

### What changed

The package used to ask every consumer to describe the ERP's permissions and
hand them in. It now reads them itself from the global `usePermissions()` hook
in `@erpsquad/common`, against fixed RBAC keys.

```text
before                              after

Consumer                            ERP application
   │                                      │
   ▼                                      ▼
permission resolver                 @erpsquad/common
   │                                      │
   ▼                                      ▼
approval-workflow                   usePermissions()
                                          │
                                          ▼
                                    approval-workflow
```

### Removed

| Removed | Replacement |
| --- | --- |
| `ApprovalWorkflowProvider` `permissions` prop | none — delete it |
| `createPermissionResolver()` | none — delete the call |
| `createStaticPermissionResolver()` | `setErpPermissions` in your test setup |
| `allowAllPermissions` | grant the RBAC keys in your test tree |
| `usePermissions(capabilities)` | `useApprovalPermissions()` |
| `usePermissionChecker()` | `useApprovalPermissions()` |
| `PermissionGate` `context` prop | none — per-record checks were host-only |
| `WorkflowListView` `canCreate` prop | `WorkflowAutomation.canAdd` / `.canEdit` |
| `PermissionResolver`, `PermissionContext` types | `ApprovalWorkflowPermissions` |
| `ErpModulePermission`, `ErpPermissionBindings` types | `ErpPermissionNode`, `ErpPermissionTree` |

### Added

`useApprovalPermissions()`, `PERMISSION_KEYS`, `resolveCapabilities()`,
`readPermissionNode()`, `selectApproverTypeOptions()`,
`selectApplicableFilters()`, `useApproverUserSource()`, and the capabilities
`applicable.department`, `applicable.grade`, `applicable.employeeType`,
`employee.directory`.

### The edit

```diff
  import { ApprovalWorkflowProvider } from '@erpsquad/approval-workflow/providers';
- import { createPermissionResolver } from '@erpsquad/approval-workflow/permissions';
- import { usePermissions } from '@erpsquad/common/hooks/use-permissions';

  export default function ApprovalsProvider() {
-   const permissions = usePermissions();
-   const permissionResolver = useMemo(
-     () => createPermissionResolver(permissions, { workflowModule, approvalModule }),
-     [permissions],
-   );
-
    return (
      <ApprovalWorkflowProvider
        http={http}
        moduleContext={MODULE_CONTEXT}
        currentUser={currentUser}
-       permissions={permissionResolver}
        routes={ROUTES}
        navigate={navigate}
      >
        <Outlet />
      </ApprovalWorkflowProvider>
    );
  }
```

That is the whole migration. Delete, do not replace.

### Why no compatibility shim

Accepting an optional `permissions` prop would keep two sources of truth for
one question, and the one the host supplies is the one that drifts: the bug
this refactor fixes is a module binding workflow screens to its own RBAC
resource and quietly disagreeing with the rest of the ERP. The package has one
internal consumer and has not been published externally, so the cost of the
break is one file per module and the benefit is that the question has exactly
one answer.

### Behaviour you will notice

- **RBAC keys are fixed.** `WorkflowAutomation` and `Approvals`, not whatever
  `workflowModule`/`approvalModule` were bound to. A module pointed at a
  different resource must have that resource's grants mapped onto these two.
- **Approval Type and Applicable options now hide.** Previously every option
  rendered and permissions only gated the workflow screens as a whole.
- **The User approver may hit a different endpoint.** Roles without `employee`
  now load the `users` lookup instead of seeing a selector that failed. The
  stored payload is unchanged.
