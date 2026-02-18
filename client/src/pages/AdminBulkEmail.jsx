import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../utils/api";
import AttendeeSelector from "../components/admin/AttendeeSelector";
import EmailComposer from "../components/admin/EmailComposer";
import BulkEmailProgress from "../components/admin/BulkEmailProgress";
import {
  saveDraft,
  sendBulkEmail,
  clearError,
  loadDraft,
} from "../store/slices/bulkEmailSlice";

const AdminBulkEmail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const {
    eventId,
    draftId,
    draft,
    selectedAttendeeIds,
    progress,
    loading,
    sending,
    error,
  } = useSelector((state) => state.bulkEmail);

  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "admin") {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    setLoadingDrafts(true);
    api
      .get("/api/admin/communications/drafts?limit=20")
      .then((res) => {
        if (res.data?.success && res.data.data?.drafts) {
          setDrafts(res.data.data.drafts);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDrafts(false));
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSaveDraft = async () => {
    try {
      await dispatch(
        saveDraft({
          id: draftId || undefined,
          subject: draft.subject,
          bodyHtml: draft.bodyHtml,
          eventId: eventId || null,
          recipientIds: selectedAttendeeIds,
          attachments: draft.attachments || [],
          inlineImages: draft.inlineImages || [],
        })
      ).unwrap();
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err || "Failed to save draft");
    }
  };

  const handleSend = async () => {
    if (selectedAttendeeIds.length === 0) {
      toast.error("Select at least one attendee");
      return;
    }
    try {
      const payload = {
        id: draftId || undefined,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        eventId: eventId || null,
        recipientIds: selectedAttendeeIds,
        attachments: draft.attachments || [],
        inlineImages: draft.inlineImages || [],
      };
      const result = await dispatch(saveDraft(payload)).unwrap();
      const id = result._id;
      await dispatch(sendBulkEmail(id)).unwrap();
      toast.success("Bulk send queued. Emails are being sent in the background.");
    } catch (err) {
      toast.error(err || "Failed to send");
    }
  };

  if (!isAuthenticated || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Bulk Email
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Select attendees by event, compose your message, and send in bulk.
          </p>
        </div>

        {drafts.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Load draft
            </h3>
            <div className="flex flex-wrap gap-2">
              {drafts.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => dispatch(loadDraft(d._id))}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {d.subject || "(No subject)"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              1. Select attendees
            </h2>
            <AttendeeSelector />
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              2. Compose email
            </h2>
            <EmailComposer
              onSaveDraft={handleSaveDraft}
              onSend={handleSend}
              saving={loading}
              sending={sending}
            />
          </section>

          {progress && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                3. Progress
              </h2>
              <BulkEmailProgress />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBulkEmail;
