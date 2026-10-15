/**
 * Build-time fallback types for @erpsquad/common.
 *
 * The real package ships declarations for every deep-import subpath, and when
 * it is installed TypeScript resolves those instead of this file. These
 * declarations exist so the package can be type-checked and built in isolation
 * (CI without access to the private registry, a fresh clone before `npm i`).
 *
 * They are deliberately permissive: this is an external boundary, not package
 * logic, and tightening them here would only encode guesses about another
 * library's props.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '@erpsquad/common/components/*' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module '@erpsquad/common/icons/*' {
  import type { ComponentType } from 'react';
  const Icon: ComponentType<any>;
  export default Icon;
}

declare module '@erpsquad/common/tables/*' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
  export type MaterialTableColumnProps = Record<string, any>;
}

declare module '@erpsquad/common/hooks/*' {
  const hook: any;
  export default hook;
  export const usePages: any;
  export const usePermissions: any;
  export const useAuth: any;
  export const useTranslation: any;
}

declare module '@erpsquad/common/utils/*' {
  const util: any;
  export default util;
}

declare module '@erpsquad/common/contexts/*' {
  const context: any;
  export default context;
  export type PageState = Record<string, any>;
}
