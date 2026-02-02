import { redirect } from "next/navigation";

/**
 * Redirect from /workouts/new to /workouts/active
 * This page is deprecated in favor of /workouts/active
 */
export default function NewWorkoutRedirect({
  searchParams: _searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  // Get the template param synchronously won't work in App Router,
  // so we redirect without it and handle on the active page
  redirect("/app/workouts/active");
}
