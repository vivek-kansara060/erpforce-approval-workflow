import '@testing-library/jest-dom/vitest';

// jsdom does not implement crypto.randomUUID in all versions; the criteria
// builder relies on it for stable React keys.
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  let counter = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis.crypto as any).randomUUID = () =>
    `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
}
