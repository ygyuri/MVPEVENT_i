import reducer, { clearTicketsState } from '../store/slices/ticketsSlice';

describe('ticketsSlice', () => {
  it('should clear state', () => {
    const prev = { list: [1], byId: { a: {} }, qrByTicketId: { x: {} }, pagination: { page: 2, pages: 3 } };
    const next = reducer(prev, clearTicketsState());
    expect(next.list).toEqual([]);
    expect(next.byId).toEqual({});
    expect(next.qrByTicketId).toEqual({});
    expect(next.pagination.page).toBe(1);
  });
});
