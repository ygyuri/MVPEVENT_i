import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { fetchProgress, clearProgress } from "../../store/slices/bulkEmailSlice";

const POLL_INTERVAL_MS = 2500;

const BulkEmailProgress = () => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.bulkEmail.progress);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!progress?.communicationId) return;
    const id = progress.communicationId;
    const poll = () => dispatch(fetchProgress(id));
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [progress?.communicationId, dispatch]);

  useEffect(() => {
    if (!progress) return;
    const done = progress.status === "completed" || progress.status === "failed";
    if (done && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [progress?.status, progress]);

  if (!progress) return null;

  const { total, sent, failed, pending, status, errors = [] } = progress;
  const done = status === "completed" || status === "failed" || status === "sending";
  const processed = sent + failed;
  const pctTotal = total > 0 ? Math.round((processed / total) * 100) : 0;
  const pctSent = total > 0 ? Math.round((sent / total) * 100) : 0;
  const pctFailed = total > 0 ? Math.round((failed / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Send progress
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {status === "queued" && "Job queued. Sending will start shortly."}
          {status === "sending" && "Sending emails in background..."}
          {status === "completed" && "All emails processed."}
          {status === "failed" && "Send completed with some failures."}
        </p>
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>
              {processed} / {total} processed
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {pctTotal}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
            <div
              className="h-full bg-green-500 dark:bg-green-600 transition-all duration-300 shrink-0"
              style={{ width: `${pctSent}%` }}
              title={`Sent: ${sent}`}
            />
            <div
              className="h-full bg-red-500 dark:bg-red-600 transition-all duration-300 shrink-0"
              style={{ width: `${pctFailed}%` }}
              title={`Failed: ${failed}`}
            />
            <div
              className="h-full bg-gray-300 dark:bg-gray-600 transition-all duration-300 shrink-0"
              style={{ width: `${100 - pctSent - pctFailed}%` }}
              title={`Pending: ${pending}`}
            />
          </div>
        </div>
      )}
      <div className="p-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sent: {sent}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Failed: {failed}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pending: {pending}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total: {total}
          </span>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Recent errors
          </h4>
          <ul className="space-y-1 max-h-32 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800/80 p-2 text-xs">
            {errors.slice(0, 10).map((e, i) => (
              <li key={i} className="text-red-700 dark:text-red-300 truncate">
                {e.email}: {e.errorMessage}
              </li>
            ))}
          </ul>
        </div>
      )}
      {done && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => dispatch(clearProgress())}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default BulkEmailProgress;
