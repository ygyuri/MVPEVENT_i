import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Gift, CheckCircle, AlertCircle } from "lucide-react";
import { validateVoucherScan, clearScan } from "../store/slices/scannerSlice";
import api from "../utils/api";

const VouchersPage = () => {
  const dispatch = useDispatch();
  const { voucherResult, error, scanning } = useSelector((s) => s.scanner);
  const [qrInput, setQrInput] = useState("");
  const [location, setLocation] = useState("Voucher Desk");
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await api.get("/api/vouchers/stats");
        setStats(res.data?.data || []);
      } catch (e) {
        console.error("Failed to fetch voucher stats:", e);
        setStats([]);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [voucherResult]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qrInput?.trim()) return;
    await dispatch(validateVoucherScan({ qr: qrInput.trim(), location }));
    setQrInput("");
  };

  const success = voucherResult?.valid;
  const hasError = error && !success;

  return (
    <div className="container-modern py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="w-8 h-8 text-amber-500" />
            Vouchers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Scan tickets for voucher redemption. Ticket must be scanned at entry first.
          </p>
        </div>

        <div className="bg-web3-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Scan Voucher
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                QR Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste or scan QR code"
                  className="flex-1 input-modern"
                  autoFocus
                  disabled={scanning}
                />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option>Voucher Desk</option>
                  <option>Bar</option>
                  <option>Merch</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={scanning || !qrInput?.trim()}
              className="btn-web3-primary disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Redeem Voucher"}
            </button>
          </form>

          {success && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Voucher redeemed</span>
              </div>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                {voucherResult.holderName && <p>Holder: {voucherResult.holderName}</p>}
                <p>
                  {voucherResult.currency} {voucherResult.voucherAmount?.toLocaleString()} ({voucherResult.ticketType})
                </p>
              </div>
              <button
                onClick={() => dispatch(clearScan())}
                className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Scan another
              </button>
            </div>
          )}

          {hasError && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">{error?.title || "Error"}</span>
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error?.message || error?.error}
              </p>
              {error?.details && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.details}</p>
              )}
              <button
                onClick={() => dispatch(clearScan())}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="bg-web3-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Voucher Redemptions
          </h2>
          {statsLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          ) : stats.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No events with voucher configuration yet. Configure voucher amounts in the event form.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.map((s) => (
                <div
                  key={s.eventId}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {s.eventTitle}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Redeemed: {s.totalRedeemed}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total value: {s.breakdown?.[0]?.currency || "KES"} {s.totalVoucherValue?.toLocaleString()}
                    </span>
                  </div>
                  {s.breakdown && s.breakdown.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {s.breakdown.map((b) => (
                        <span key={b.ticketType} className="mr-3">
                          {b.ticketType}: {b.redeemedCount} × {b.currency} {b.voucherAmount?.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VouchersPage;
