import { redirect } from 'next/navigation';

// Renamed to /dashboard/cycles. Keep this redirect so old links/bookmarks work.
export default function CirclesRedirect() {
  redirect('/dashboard/cycles');
}
