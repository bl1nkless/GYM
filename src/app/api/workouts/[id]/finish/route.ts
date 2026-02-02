import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workouts/[id]/finish
 *
 * Marks a workout as completed. Idempotent - returns success even if already completed.
 * Used by Telegram Mini App's global "Finish workout" button.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the workout
    const { data: workout, error: fetchError } = await supabase
      .from("workout_sessions")
      .select("id, user_id, is_completed")
      .eq("id", id)
      .single();

    if (fetchError || !workout) {
      return NextResponse.json(
        { ok: false, error: "Workout not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (workout.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Idempotency: if already completed, just return success
    if (workout.is_completed) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from("workout_sessions")
      .update({
        is_completed: true,
        performed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error finishing workout:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to finish workout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in POST /api/workouts/[id]/finish:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
