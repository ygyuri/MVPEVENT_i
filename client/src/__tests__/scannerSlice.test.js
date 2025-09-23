import reducer, { clearScan, setScanning } from '../store/slices/scannerSlice';

describe('scannerSlice', () => {
  it('should clear scan', () => {
    const prev = { lastResult: { ok: true }, error: { a: 1 }, scanning: true };
    const next = reducer(prev, clearScan());
    expect(next.lastResult).toBe(null);
    expect(next.error).toBe(null);
  });
  it('should set scanning', () => {
    const prev = { scanning: false };
    const next = reducer(prev, setScanning(true));
    expect(next.scanning).toBe(true);
  });
});
