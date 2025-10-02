jest.useFakeTimers();

const UpdateService = require('../services/updateService');

describe('Update edit window', () => {
  it('rejects edits after 5 minutes for non-admin', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - (5 * 60 * 1000 + 1000));

    // Mock EventUpdate.findById
    jest.spyOn(require('../models/EventUpdate'), 'findById').mockResolvedValue({
      _id: 'u1',
      organizerId: '507f1f77bcf86cd799439011',
      content: 'a',
      mediaUrls: [],
      priority: 'normal',
      createdAt: old,
      save: async () => {}
    });

    const res = await UpdateService.edit('u1', { _id: '507f1f77bcf86cd799439011', role: 'organizer' }, { content: 'b' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe(400);
    expect(res.msg).toBe('EDIT_WINDOW_EXPIRED');
  });
});


