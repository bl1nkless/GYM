import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/workouts/active
 *
 * Returns the current active (not completed) workout for the authenticated user.
 * Used by Telegram Mini App to validate/resume sessions.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find active (not completed) workout
    const { data: activeWorkout, error: queryError } = await supabase
      .from("workout_sessions")
      .select("id, name, performed_at, is_completed, created_at")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (queryError) {
      // No active workout found is expected, not an error
      if (queryError.code === "PGRST116") {
        return NextResponse.json({}, { status: 404 });
      }
      console.error("Error fetching active workout:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch active workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(activeWorkout);
  } catch (error) {
    console.error("Unexpected error in GET /api/workouts/active:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
