# Integration guide

Written for a developer adding approvals to an ERPForce module. It assumes you
have `@erpsquad/common` and a router; it assumes nothing about your module.

---

## Step 0 — Dependencies

`@erpsquad/common` is a **peer** dependency, not a bundled one, and must stay
that way. The package reads permissions through the common library's React
context; a second copy of `@erpsquad/common` in the tree would mean a second
context instance, and the package would read an empty permission tree while the
app's provider held the real one. The same argument applies to React, MUI and
Emotion, which are peers for the same reason.

```jsonc
"peerDependencies": {
  "@erpsquad/common": ">=1.11.0",
  "react": "^18.2.0 || ^19.0.0",
  // …
}
```

Nothing in `dependencies`: the package bundles no third-party code. Verify with
`npm ls @erpsquad/common` — one entry, hoisted to the app root.

---

## Step 1 — Provide a transport

The package never calls `fetch` directly and never reads an environment
variable. Give it an `HttpClient`.

### Option A: the bundled fetch client

```ts
import { createFetchHttpClient } from '@erpsquad/approval-workflow';
import { getToken } from '@erpsquad/common/utils/common';

const gateway = import.meta.env.VITE_BACKEND_BASE_URL;

export const http = createFetchHttpClient({
  baseUrls: {
    default: gateway,
    workflowAutomation: `${gateway}/workflow-automation`,
    systemFeature: `${gateway}/system-feature`,
    rbac: `${gateway}/rbac`,
    organization: `${gateway}/hrms`,
  },
  getHeaders: () => getToken(),
});
```

`baseUrls.default` is required; any service you omit falls back to it.

### Option B: your own client

Anything matching the signature works — axios, a generated client, a wrapper
with retries and token refresh:

```ts
import type { HttpClient } from '@erpsquad/approval-workflow/types';

export const http: HttpClient = async ({ service, method, path, query, body, signal }) => {
  const response = await apiClient.request({
    baseURL: BASE_URLS[service] ?? BASE_URLS.default,
    url: path,
    method,
    params: query,
    data: body,
    signal,
  });
  return response.data;
};
```

Reject on a non-2xx response; the package normalises whatever you throw.

### Services and endpoints

| Service | Endpoints |
| --- | --- |
| `workflowAutomation` | `/v1/workflows`, `/v1/workflow-references/*`, `/v1/approvals*` |
| `systemFeature` | `/v1/form-builder/mongo-schema-fields/:name`, `/v1/filter/filter-table` |
| `rbac` | `/v1/user/modules` |
| `organization` | `/v1/organisation-structure/hierarchy-levels` |

---

## Step 2 — Register your entity types

This is what makes the dashboard work for your module.

### Navigation only

```ts
import { createModuleRegistry, createRouteAdapters } from '@erpsquad/approval-workflow';

export const modules = createModuleRegistry(
  createRouteAdapters({
    purchase_orders:      { route: '/procurement/orders/:id',   title: 'Purchase Order' },
    purchase_requisitions:{ route: '/procurement/requisitions/:id', title: 'Requisition' },
  }),
);
```

Those entity types now render with a title, a link to the record, and the
default approve/reject flow (a comment modal → `PATCH /v1/approvals/:id`).

### A module with its own approval API

```ts
import { defineModuleAdapter } from '@erpsquad/approval-workflow';

const purchaseOrder = defineModuleAdapter('purchase_orders', {
  title: 'Purchase Order',
  getRecordRoute: (request) => `/procurement/orders/${request.entity_id}`,

  modalComponent: PurchaseOrderApprovalModal,
  getModalProps: (state, onConfirm, onClose) => ({
    open: state.open,
    onClose,
    onConfirm,
    type: state.decision?.toLowerCase(),
    data: state.request?.request_data,
  }),

  submitDecision: async ({ entityId, decision, formData }) => {
    await api.updatePurchaseOrderStatus(entityId, decision, formData);
  },
});
```

### Choosing who writes the decision

Supplying `submitDecision` replaces the package's approve/reject endpoint — that
is the default and needs no flag. `callDecisionApi` exists for the two cases
that default cannot express.

**Only my API runs.** Identical to the default above, but stated rather than
implied — worth setting when the intent matters to the next reader:

```ts
defineModuleAdapter('purchase_orders', {
  callDecisionApi: false,
  submitDecision: async ({ entityId, decision, formData }) => {
    await api.updatePurchaseOrderStatus(entityId, decision, formData);
  },
});
```

`callDecisionApi: false` on its own — with no `submitDecision` — makes the
dashboard's buttons purely local: nothing is written, the list is refreshed.

**My API runs *and* the package still records the decision.** For a side effect
that is not itself the status transition:

```ts
defineModuleAdapter('purchase_orders', {
  callDecisionApi: true,
  submitDecision: async ({ entityId, decision }) => {
    if (decision === 'Approved') await api.raisePurchaseOrder(entityId);
  },
});
```

`submitDecision` runs first; if it throws, the package endpoint is never called
and the request stays pending.

To flip the default for every entity type, set it on the fallback adapter:

```ts
createModuleRegistry([], defineModuleAdapter('*', { callDecisionApi: false }));
```

### A modal that calls the API itself

Some modals upload files or run a multi-step flow. Declare it and the package
will only refresh the list:

```ts
defineModuleAdapter('terminations', {
  title: 'Termination',
  handlesOwnSubmission: true,
  modalComponent: TerminationApprovalModal,
  getModalProps: (state, onConfirm, onClose) => ({
    open: state.open,
    onClose,
    type: state.decision?.toLowerCase(),
    id: String(state.request?.entity_id),
    onSuccess: () => onConfirm(null),
  }),
});
```

### A pre-action

A step the request must pass through before it can be decided. While
`shouldShow` returns true, the row's **Approve** action opens the pre-action
modal instead of the approval one, and **Reject** is disabled:

```ts
defineModuleAdapter('hire_requests', {
  title: 'Hire Request',
  preAction: {
    shouldShow: (request) => !request.request_data?.budget,
    label: 'approvals.add_budget',
    className: 'btn--AddBudget',
    component: FinancialReviewModal,
    submit: (formData, request) =>
      api.createBudget({ hire_request_id: request.entity_id, ...formData }),
    successMessage: 'approvals.budget_added',
  },
});
```

### Adding a module later

`registry.extend()` returns a new registry; the original is untouched.

```ts
const withInventory = modules.extend(
  createRouteAdapters({ stock_adjustments: '/inventory/adjustments/:id' }),
);
```

---

## Step 3 — Permissions: nothing to do

There is no permission step. Permissions are ERP-wide rather than
module-specific, so the package reads them itself from the same global hook
every other ERPForce screen reads:

```text
ERP application  ──►  @erpsquad/common  ──►  usePermissions()
                                                   │
                                                   ▼
                                    @erpsquad/approval-workflow
```

The only requirement is that the approval screens render somewhere under the
app's `PermissionsProvider` from `@erpsquad/common`. In an ERPForce app that is
the entire authenticated tree, so this is already true.

Do **not** pass permissions, a resolver, an adapter or a provider. There is no
prop for it.

### What the package gates on

| Area | RBAC key | Behaviour |
| --- | --- | --- |
| Approval Workflow | `WorkflowAutomation` | access control |
| Approval Dashboard | `Approvals`, else `ErpCommonApprovals` | access control |
| Approval Type → Department | `Departments` | show / hide |
| Approval Type → Hierarchy | `OrganisationStructure` | show / hide |
| Approval Type → User | `employee` | selects the user data source |
| Applicable → Department | `Departments` | show / hide |
| Applicable → Grade | `Grades` | show / hide |
| Applicable → Employee Type | `employee` | show / hide |

Hidden options are removed, not disabled. The User approval type is always
available: with `employee` it reads the employee directory, without it the
users API. Either way it stores user ids, so workflows stay interchangeable
between roles.

If you need the same answers for your own route guards or menu entries, read
them from the package rather than re-deriving them:

```ts
import { useApprovalPermissions } from '@erpsquad/approval-workflow/permissions';

const permissions = useApprovalPermissions();
permissions['workflow.view'];   // WorkflowAutomation.canView
permissions['approval.view'];   // Approvals.canView
```

---

## Step 4 — Mount the provider

```tsx
<ApprovalWorkflowProvider
  http={http}
  moduleContext={{ module: 'procurement' }}
  currentUser={{ id: user.id, company_id: user.company_id }}
  tenant={{ companyId: user.company_id }}
  modules={modules}
  routes={routes}
  navigate={useNavigate()}
  notify={(message, variant) => enqueueSnackbar(message, { variant })}
  translate={(key, fallback) => t(key, { defaultValue: fallback })}
>
  <Outlet />
</ApprovalWorkflowProvider>
```

Mount it once, above every approval screen. All views share its cache, so
opening the dashboard after the workflow list reuses the reference data.

---

## Step 5 — Wire the routes

The package does not own your router. It links using `config.routes` and calls
`config.navigate`; you extract the params.

```tsx
import { WorkflowListView, WorkflowFormView, WorkflowDetailView }
  from '@erpsquad/approval-workflow/views/workflow';
import { ApprovalDashboardView, ApprovalRequestDetailView }
  from '@erpsquad/approval-workflow/views/dashboard';

const WorkflowEditRoute = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  return (
    <WorkflowFormView
      mode="edit"
      workflowId={id}
      openBuilder={params.get('builder') === '1'}
    />
  );
};

const WorkflowCreateRoute = () => {
  const [params] = useSearchParams();
  const duplicateOf = params.get('duplicateOf') ?? undefined;
  return <WorkflowFormView mode="create" workflowId={duplicateOf} duplicate={Boolean(duplicateOf)} />;
};

export const approvalRoutes = [
  { path: 'workflows',            element: <WorkflowListView /> },
  { path: 'workflows/new',        element: <WorkflowCreateRoute /> },
  { path: 'workflows/:id',        element: <WorkflowViewRoute /> },
  { path: 'workflows/:id/edit',   element: <WorkflowEditRoute /> },
  { path: 'approvals',            element: <ApprovalDashboardView /> },
  { path: 'approvals/:id',        element: <ApprovalDetailRoute /> },
];
```

The `routes` config must match these paths — that is how the package builds its
own links.

---

## Optional integrations

### Saved views and column preferences

Bind the host's page-preference service:

```tsx
listState={{
  useListState: (resource) => {
    const { activePage, updatePageInfo, loading } = usePages();
    return {
      search: activePage.search ?? '',
      sort: activePage.sort as SortModel | null,
      pagination: { pageNo: 1, limit: activePage.page_size ?? 10, totalCount: 0 },
      filterQueryString: activePage.filterQueryString ?? '',
      visibleColumns: activePage.visible_columns,
      activeView: activePage.active_view,
      pageSize: activePage.page_size ?? 10,
      isLoading: loading,
      update: (updates) => updatePageInfo({
        search: updates.search,
        sort: updates.sort ?? undefined,
        page_size: updates.pageSize,
        visible_columns: updates.visibleColumns,
        active_view: updates.activeView,
      }),
    };
  },
}}
```

`listState` must be present-or-absent for the lifetime of the provider; adding
or removing it after mount throws with an explanatory message.

### The full ERP ActionBar

```tsx
<WorkflowListView
  renderToolbar={({ search, setSearch, onAdd, canAdd }) => (
    <ActionBar
      title={t('approval-work-flow.title')}
      searchText={search}
      handleSearch={setSearch}
      handleAddButton={onAdd}
      button={canAdd}
      fields={schemaFields}
      {...pageProps}
    />
  )}
/>
```

### Skipping the entity-catalogue request

```tsx
entityCatalogue={[
  { label: 'Purchase Order', value: 'purchase_orders' },
  { label: 'Requisition',    value: 'purchase_requisitions' },
]}
```

### Replacing the scope filters

The defaults (company / location / department / grade / employment type) suit
an HR-shaped organisation. Any module can replace them:

```tsx
<WorkflowFormView
  mode="create"
  scopeFilters={[
    { key: 'company',  label: 'Company',  apiType: 'company',  valueKey: 'company_ids' },
    { key: 'location', label: 'Warehouse', apiType: 'warehouse', valueKey: 'location_ids' },
  ]}
/>
```

Or hide them: `showScopeFilters={false}`.

### Translations

Every key the package uses, with its English fallback, is in
`src/constants/i18n-keys.ts`. `translate(key, fallback)` returns the fallback
when you have no translation, so a consumer that ships none still sees English
rather than raw keys.

---

## Approval History on a record page

Drop the button onto any record screen that sits under the provider. It needs
only the two identifiers every approval request already carries:

```tsx
import { ApprovalHistory } from '@erpsquad/approval-workflow/components/approval-history';

<ApprovalHistory entityType="purchase_orders" entityId={order.id} />
```

- `entityType` is the value your workflow was configured against, the same one
  you register an adapter under.
- While `entityId` is missing (a record that has not been saved yet), the button
  renders disabled and nothing is requested.
- The popover opens on a summary (status, the level it is waiting at, who it
  is waiting on, who requested it), then the trail: each submission, each
  approval level, and every approver at that level with their status, decision
  time and remarks. Earlier submissions (a rejected first attempt) are folded.
- Pass `formatDate` to match your module's date format. Recent events show a
  relative time ("2 hours ago"); `formatDate` is used for older ones and for the
  hover title. The default is the user's locale, with the time.

**Backend requirement.** The history reads `GET /v1/approvals/history` from the
workflow-automation service, with the same query parameters as the approvals
list:

| Param | Sent |
| --- | --- |
| `skip` | `0` |
| `limit` | `100` |
| `order` | `created_at:1` |
| `select` | `[id,entity_type,entity_id,module,status,comments,approver_id,approver_data,created_by_user,created_by_data,created_at,updated_at,approved_at,approval_sequence,version]` |
| `filters` | `(entity_type.eq=purchase_orders&entity_id.eq=42)` |

`GET /v1/approvals` cannot be used: it returns only the caller's own
approvals. The history route returns every approver's requests for the one
record and is gated by the `Approvals` RBAC resource. `filters` is required and
must be a single AND group with `entity_type.eq` and a numeric `entity_id.eq`;
extra AND clauses are allowed, while `|` or nested groups get a 400. Against a
service without the route, the popover shows its error state with a retry.

Fields read: `version` (submission round), `approval_sequence` (level),
`approver_data.first_name/last_name`, `created_by_user`, `status`, `comments`,
`created_at`, `updated_at` and `approved_at`. A decision without remarks leaves
the level's instruction in `comments`; the package shows it as the level's
instruction, not as the approver's remark, whenever another request at that
level still carries it.

For a custom UI, `useApprovalHistory({ entityType, entityId, enabled })` returns
the same `rounds` and `summary` without any markup.

---

## Using the hooks without the views

Every view is a thin composition of hooks. Build your own screen:

```tsx
import { useApprovalRequests, useApprovalDecision } from '@erpsquad/approval-workflow/hooks';

const MyQueue = () => {
  const { rows, isLoading, error, refetch } = useApprovalRequests({
    filters: { entityType: 'purchase_orders' },
  });
  const decision = useApprovalDecision({ onCompleted: refetch });
  // ...
};
```

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `No <ApprovalWorkflowProvider> found` | A screen rendered outside the provider. |
| Dashboard rows show a raw `entity_type` | No adapter registered for it — expected, add one. |
| Approve/reject disabled | `approval.approve` / `approval.reject` denied, or the request is not `Pending`. |
| Blank entity-type dropdown | `/v1/user/modules` returned nothing for `moduleContext.module`; pass `entityCatalogue` instead. |
| "`config.listState` was added or removed after mount" | The adapter is being created conditionally; hoist it. |
| Builder renders but is unstyled | `@xyflow/react` is not installed. It is an optional peer. |
