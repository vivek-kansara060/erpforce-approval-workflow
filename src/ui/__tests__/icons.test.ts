import { describe, expect, it } from 'vitest';
import type { SvgIconComponent } from '@mui/icons-material';
import * as icons from '../icons';

const component = { $$typeof: Symbol.for('react.memo') } as unknown as SvgIconComponent;

describe('icon()', () => {
  it('returns a component handed over directly (bundlers honouring __esModule)', () => {
    expect(icons.icon(component)).toBe(component);
  });

  it('unwraps module.exports handed over under Node-mode interop (Vite dev, esbuild)', () => {
    const moduleExports = { __esModule: true, default: component } as unknown as SvgIconComponent;
    expect(icons.icon(moduleExports)).toBe(component);
  });
});

describe('icon exports', () => {
  it('are all renderable components', () => {
    for (const [name, value] of Object.entries(icons)) {
      if (name === 'icon') continue;
      const renderable =
        typeof value === 'function' ||
        (typeof value === 'object' && value !== null && '$$typeof' in value);
      expect(renderable, name).toBe(true);
    }
  });
});
