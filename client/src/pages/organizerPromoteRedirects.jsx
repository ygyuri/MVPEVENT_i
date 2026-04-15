import { Navigate, useParams } from 'react-router-dom';

/** Organizer /commission-setup → unified marketing hub (bookmarks). */
export function RedirectToEventMarketingHub() {
  const { eventId } = useParams();
  return <Navigate to={`/organizer/events/${eventId}/marketing`} replace />;
}

/** Organizer /affiliates → hub Step 3 (bookmarks). */
export function RedirectToEventMarketingLinks() {
  const { eventId } = useParams();
  return <Navigate to={`/organizer/events/${eventId}/marketing?tab=links`} replace />;
}
