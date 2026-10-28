# @erpsquad/approval-workflow

Approval workflow builder and approval dashboard for ERPForce modules.

The package is **module-agnostic**: it knows about workflows, criteria, approvers
and approval requests, and nothing about leave requests, purchase orders or
payroll runs. Modules plug themselves in through configuration and adapters, so
Procurement, HRMS, Finance and Inventory can all consume the same build.

```
Procurement → Purchase Order Approval
Sales       → Sales Order Approval
HRMS        → Leave Approval
Finance     → Payment Approval
Inventory   → Stock Adjustment Approval
```

---

## Contents

| Document | What it covers |
| --- | --- |
| [docs/ANALYSIS.md](docs/ANALYSIS.md) | Analysis of the original HRMS implementation this was extracted from |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folder structure and the responsibility of each layer |
| [docs/INTEGRATION.md](docs/INTEGRATION.md) | Step-by-step integration guide |
| [docs/API.md](docs/API.md) | Full public API reference |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Bundle and runtime performance review |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Adopting the package without touching the existing implementation |

---

## Installation

```bash
npm install @erpsquad/approval-workflow
```

### Peer dependencies

Everything shared with the host application is a peer dependency, so there is
exactly one instance of React, MUI, Emotion and `@erpsquad/common` in the final
bundle. The package itself has **zero runtime dependencies**.

| Peer | Range | Required |
| --- | --- | --- |
| `react`, `react-dom` | `^18.2` or `^19` | yes |
| `@mui/material`, `@mui/icons-material` | `^5.15` | yes |
| `@emotion/react`, `@emotion/styled` | `^11` | yes |
| `@erpsquad/common` | `>=1.11` | yes |
| `react-hook-form` | `^7.50` | optional — workflow form, `…/schemas` and the root entry |
| `@hookform/resolvers`, `yup` | `^3` / `^1` | optional — as above |
| `@xyflow/react` | `^12` | optional — only for the workflow builder |

The optional peers are optional on purpose: a module that only renders the
approval dashboard or the approval-history button loads none of them, and npm
does not install duplicate copies for it. A module that renders the workflow
screens, or imports from the root entry, needs all of them. See
[docs/PERFORMANCE.md](docs/PERFORMANCE.md).

The package ships ESM (`.esm.js`) and CommonJS (`.cjs`) builds with type
declarations for every entry point.

---

## Quick start

### 1. Mount the provider

```tsx
import {
  ApprovalWorkflowProvider,
  createFetchHttpClient,
  createModuleRegistry,
  createRouteAdapters,
} from '@erpsquad/approval-workflow';

const http = createFetchHttpClient({
  baseUrls: {
    default: env.GATEWAY_URL,
    workflowAutomation: `${env.GATEWAY_URL}/workflow-automation`,
    systemFeature: `${env.GATEWAY_URL}/system-feature`,
    rbac: `${env.GATEWAY_URL}/rbac`,
    organization: `${env.GATEWAY_URL}/hrms`,
    hrms: `${env.GATEWAY_URL}/hrms`,
  },
  getHeaders: () => getToken(),
});

const modules = createModuleRegistry(
  createRouteAdapters({
    leave_requests: { route: '/hrms/leave-requests/:id', title: 'Leave Request' },
    asset_requests: { route: '/hrms/asset-requests/:id', title: 'Asset Request' },
  }),
);

function ApprovalsRoot() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <ApprovalWorkflowProvider
      http={http}
      moduleContext={{ module: 'hrms' }}
      currentUser={{ id: user.id, company_id: user.company_id }}
      routes={{
        workflowList: '/hrms/workflows',
        workflowCreate: '/hrms/workflows/new',
        workflowEdit: '/hrms/workflows/:id/edit',
        workflowView: '/hrms/workflows/:id',
        approvalDashboard: '/hrms/approvals',
        approvalView: '/hrms/approvals/:id',
      }}
      navigate={navigate}
      modules={modules}
      notify={(message, variant) => enqueueSnackbar(message, { variant })}
      translate={(key, fallback) => t(key, { defaultValue: fallback })}
    >
      <Outlet />
    </ApprovalWorkflowProvider>
  );
}
```

### 2. Render the screens

```tsx
import { WorkflowListView, WorkflowFormView, WorkflowDetailView }
  from '@erpsquad/approval-workflow/views/workflow';
import { ApprovalDashboardView, ApprovalRequestDetailView }
  from '@erpsquad/approval-workflow/views/dashboard';

const routes = [
  { path: '/hrms/workflows',           element: <WorkflowListView /> },
  { path: '/hrms/workflows/new',       element: <WorkflowFormView mode="create" /> },
  { path: '/hrms/workflows/:id/edit',  element: <EditRoute /> },
  { path: '/hrms/workflows/:id',       element: <ViewRoute /> },
  { path: '/hrms/approvals',           element: <ApprovalDashboardView /> },
  { path: '/hrms/approvals/:id',       element: <ApprovalDetailRoute /> },
];

// The package does not own the router, so the id comes from the host.
const EditRoute = () => {
  const { id } = useParams();
  return <WorkflowFormView mode="edit" workflowId={id} />;
};
```

That is a working integration. Everything below is refinement.

---

## Integration contracts

| Contract | Prop | Default |
| --- | --- | --- |
| HTTP transport | `http` | — required |
| Owning module | `moduleContext` | — required |
| Signed-in user | `currentUser` | — required |
| Routes | `routes` | — required |
| Navigation | `navigate` | — required |
| Module adapters | `modules` | generic adapter only |
| Tenant / company scope | `tenant` | none |
| Translation | `translate` | bundled English fallbacks |
| Notifications | `notify` | `console.warn` |
| Error reporting | `onError` | none |
| List/table state | `listState` | local component state |
| Server-state cache | `queryClient` | one per provider |
| Entity catalogue | `entityCatalogue` | fetched from `/v1/user/modules` |

Nothing else couples the package to a host. There are no environment variables,
no global store, and no hard-coded URL or route anywhere in `src/`. A missing
`http`, `navigate`, `routes` or `moduleContext.module` throws an
`ApprovalWorkflowError` (`code: 'invalid-config'`) on mount rather than failing
later inside a hook.

### Errors

Users only ever see a safe message: the server's text for a client error
(4xx), the translated "Something went wrong" for a server fault, a network
failure or a bug. The full error, with status, code, server `details` and the
original `cause`, goes to `onError`:

```tsx
<ApprovalWorkflowProvider
  // …
  onError={(error, context) => Sentry.captureException(error, { extra: context })}
>
```

`context` is `{ source: 'query', key }` for a failed read, or
`{ source: 'mutation', operation }` for a failed write (`workflow.save`,
`workflow.remove`, `approval.decision`, `approval.preAction`).

### Sharing one cache between providers

```tsx
import { createQueryCache } from '@erpsquad/approval-workflow/hooks';

const approvalCache = createQueryCache();
// Pass `queryClient={approvalCache}` to every provider that should share
// responses, e.g. the dashboard route and a record page's history button.
```

---

## Adding a module

The registry is how an ERP module joins the approval dashboard. The minimum is a
route:

```ts
createRouteAdapters({
  purchase_orders: { route: '/procurement/orders/:id', title: 'Purchase Order' },
});
```

A module with its own approval API and modal supplies them:

```ts
defineModuleAdapter('loan_requests', {
  title: 'Loan Request',
  getRecordRoute: (request) => `/hrms/loans/${request.entity_id}`,
  modalComponent: LoanApprovalModal,
  getModalProps: (state, onConfirm, onClose) => ({
    open: state.open,
    onClose,
    onConfirm,
    type: state.decision?.toLowerCase(),
    data: state.request?.request_data,
  }),
  submitDecision: ({ entityId, decision, formData }) =>
    dispatch(patchLoanRequestStatus({ id: entityId, status: decision, payload: formData })),
});
```

`getModalProps` is passed through verbatim, so existing modals work unchanged —
see [docs/MIGRATION.md](docs/MIGRATION.md).

---

## Permissions

Nothing to configure. The package reads the ERP's global permission state
itself, from `usePermissions()` in `@erpsquad/common` — the same hook every
other ERPForce screen uses. Just render the screens under the app's
`PermissionsProvider`, which in an ERPForce app is already the case.

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
offered: with `employee` it reads the employee directory, without it the users
API — storing the same user ids either way.

Read the resolved capabilities yourself when your route guards or menus need
the same answers:

```ts
import { useApprovalPermissions } from '@erpsquad/approval-workflow/permissions';

const permissions = useApprovalPermissions();
permissions['workflow.view'];
permissions['approval.approve'];
```

See [docs/API.md](docs/API.md#permissions) for the full capability matrix.

---

## Entry points

Import from the narrowest entry that covers your need.

| Entry | Contents |
| --- | --- |
| `@erpsquad/approval-workflow` | everything |
| `…/views` | all screens |
| `…/views/workflow` | workflow list, form, detail |
| `…/views/dashboard` | approval dashboard and detail (no React Flow) |
| `…/components` | feedback, modals, chips, list primitives |
| `…/components/builder` | the canvas, nodes, edges, sidebars |
| `…/components/approval-history` | the Approval History button and popover, for any record page |
| `…/hooks` | data hooks, no UI |
| `…/providers` | provider and config hooks |
| `…/api` | transport and endpoint clients |
| `…/services` | workflow and approval business logic |
| `…/adapters` | module registry |
| `…/permissions` | capability hooks, gate, RBAC keys |
| `…/schemas` | yup schemas |
| `…/types` | types only (erased at build time) |
| `…/constants`, `…/utils` | field names, options, pure helpers |

---

## Scripts

```bash
npm run build            # dual ESM + CJS build with declarations
npm run type-check       # tsc --noEmit, strict
npm run lint             # eslint, zero warnings
npm test                 # vitest
npm run validate         # lint + type-check + test
npm run validate:package # post-build gate (exports, externals, no leaked src)
```

## License

MIT
