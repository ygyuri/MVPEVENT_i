import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Gift } from 'lucide-react';
import { updateTicketType, setStepValidation } from '../../../store/slices/eventFormSlice';
import { currencyUtils } from '../../../utils/eventHelpers';

const VouchersStep = () => {
  const dispatch = useDispatch();
  const { formData } = useSelector((state) => state.eventForm);

  const ticketTypes = formData.ticketTypes || [];
  const currency = formData.pricing?.currency || 'KES';

  const handleUpdateVoucher = (index, value) => {
    const num = value === '' || value === null ? null : Math.max(0, parseFloat(value) || 0);
    dispatch(updateTicketType({ index, updates: { voucherAmount: num } }));
    dispatch(setStepValidation({ step: 5, isValid: true, errors: {} }));
  };

  const hasAnyVoucher = ticketTypes.some((t) => t.voucherAmount != null && t.voucherAmount > 0);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full mx-auto mb-4">
          <Gift className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Voucher Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Optionally set a voucher amount per ticket type. Attendees can redeem their voucher after entry using the same ticket QR at the voucher desk.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
        {ticketTypes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Gift className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No ticket types yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Add ticket types in the Pricing &amp; Tickets step first, then return here to configure voucher amounts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {ticket.name || `Ticket Type #${index + 1}`}
                  </div>
                  <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
                    <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Voucher amount (optional):
                    </label>
                    <div className="relative w-40">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 text-sm">
                        {currencyUtils.getCurrencySymbol(ticket.currency || currency)}
                      </div>
                      <input
                        type="number"
                        value={ticket.voucherAmount ?? ''}
                        onChange={(e) => handleUpdateVoucher(index, e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="input-modern w-full pl-8"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Leave empty for no voucher. If set, this amount can be redeemed once per ticket after entry.
                </p>
              </div>
            ))}
          </div>
        )}

        {hasAnyVoucher && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>How it works:</strong> Attendees scan their ticket at entry first, then scan the same ticket again at the voucher desk to redeem. Each voucher can only be redeemed once.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VouchersStep;
