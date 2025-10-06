const MarketingAgency = require('../models/MarketingAgency');
const AffiliatePayout = require('../models/AffiliatePayout');

function assert(condition, message, code = 400) {
  if (!condition) {
    const err = new Error(message);
    err.statusCode = code;
    throw err;
  }
}

class AgencyService {
  async createAgency(organizerId, payload) {
    assert(payload?.agency_name, 'agency_name is required');
    assert(payload?.agency_email, 'agency_email is required');

    // Parent-child linkage validation
    if (payload.parent_agency_id) {
      const parent = await MarketingAgency.findById(payload.parent_agency_id);
      assert(parent, 'parent_agency not found', 404);
      assert(String(parent.organizer_id) === String(organizerId), 'Parent agency must belong to same organizer', 403);
    }

    // Create pending agency by default
    const agency = await MarketingAgency.create({
      organizer_id: organizerId,
      agency_name: payload.agency_name,
      agency_email: payload.agency_email,
      agency_type: payload.agency_type || 'primary',
      parent_agency_id: payload.parent_agency_id || null,
      contact_person: payload.contact_person,
      phone: payload.phone,
      address: payload.address,
      tax_id: payload.tax_id,
      payment_method: payload.payment_method,
      payment_details: payload.payment_details,
      status: 'pending_approval'
    });

    return agency;
  }

  async listAgencies(organizerId, { status, page = 1, limit = 20 } = {}) {
    const query = { organizer_id: organizerId };
    if (status) query.status = status;
    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
    const [items, total] = await Promise.all([
      MarketingAgency.find(query).sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, limit)),
      MarketingAgency.countDocuments(query)
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getAgency(organizerId, agencyId) {
    const agency = await MarketingAgency.findById(agencyId);
    assert(agency, 'Agency not found', 404);
    assert(String(agency.organizer_id) === String(organizerId), 'ACCESS_DENIED', 403);
    return agency;
  }

  async updateAgency(organizerId, agencyId, updates) {
    const agency = await this.getAgency(organizerId, agencyId);

    // If changing parent, validate
    if (updates.parent_agency_id && String(updates.parent_agency_id) !== String(agency.parent_agency_id || '')) {
      const parent = await MarketingAgency.findById(updates.parent_agency_id);
      assert(parent, 'parent_agency not found', 404);
      assert(String(parent.organizer_id) === String(organizerId), 'Parent agency must belong to same organizer', 403);
    }

    // Validate payment methods before activation
    if (updates.status === 'active') {
      assert(agency.payment_method || updates.payment_method, 'payment_method required for activation');
      assert(agency.payment_details || updates.payment_details, 'payment_details required for activation');
      if ((agency.payment_method || updates.payment_method) === 'paypal') {
        const email = (agency.payment_details?.email || updates.payment_details?.email);
        assert(email && /.+@.+\..+/.test(email), 'Invalid PayPal email');
      }
    }

    Object.assign(agency, updates, { updatedAt: new Date() });
    await agency.save();
    return agency;
  }

  async softDeleteAgency(organizerId, agencyId) {
    const agency = await this.getAgency(organizerId, agencyId);
    const pendingPayouts = await AffiliatePayout.countDocuments({ agency_id: agency._id, payout_status: { $in: ['pending', 'processing'] } });
    assert(pendingPayouts === 0, 'Cannot delete agency with pending payouts');
    agency.status = 'suspended';
    agency.deleted_at = new Date();
    await agency.save();
    return { ok: true };
  }

  async approveAgency(organizerId, agencyId) {
    const agency = await this.getAgency(organizerId, agencyId);
    assert(agency.status === 'pending_approval', 'Only pending agencies can be approved');
    // Basic tax id presence check; format could be validated with country rules later
    if (agency.tax_id) {
      assert(/^[-A-Za-z0-9]{3,50}$/.test(agency.tax_id), 'Invalid tax_id format');
    }
    // Payment details check again
    assert(agency.payment_method, 'payment_method required for approval');
    assert(agency.payment_details, 'payment_details required for approval');
    agency.status = 'active';
    await agency.save();
    return agency;
  }
}

module.exports = new AgencyService();


