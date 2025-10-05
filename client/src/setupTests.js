import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Jest compatibility shim for Vitest
if (!globalThis.jest) {
  globalThis.jest = {
    fn: (...args) => vi.fn(...args),
    spyOn: (...args) => vi.spyOn(...args),
    mock: (...args) => vi.mock(...args),
    requireActual: (mod) => mod, // noop fallback; prefer avoiding in tests
    clearAllMocks: () => vi.clearAllMocks(),
    resetAllMocks: () => vi.resetAllMocks(),
    restoreAllMocks: () => vi.restoreAllMocks()
  };
}

// Global ResizeObserver mock for chart libraries in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock;
}


