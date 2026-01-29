// Database types for Supabase
// Эти типы можно сгенерировать автоматически через: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PerceivedDifficulty = "easy" | "ok" | "hard";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          display_name: string | null;
          settings_json: Json | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          display_name?: string | null;
          settings_json?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          display_name?: string | null;
          settings_json?: Json | null;
        };
        Relationships: [];
      };
      muscle_groups: {
        Row: {
          id: number;
          name: string;
          slug: string;
          order_index: number;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          order_index?: number;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          normalized_name: string;
          primary_muscle_group_id: number;
          is_global: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          normalized_name: string;
          primary_muscle_group_id: number;
          is_global?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          normalized_name?: string;
          primary_muscle_group_id?: number;
          is_global?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_primary_muscle_group_id_fkey";
            columns: ["primary_muscle_group_id"];
            isOneToOne: false;
            referencedRelation: "muscle_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_aliases: {
        Row: {
          id: string;
          exercise_id: string;
          alias: string;
          normalized_alias: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          alias: string;
          normalized_alias: string;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          alias?: string;
          normalized_alias?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_aliases_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          performed_at: string;
          name: string | null;
          note: string | null;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          performed_at?: string;
          name?: string | null;
          note?: string | null;
          is_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          performed_at?: string;
          name?: string | null;
          note?: string | null;
          is_completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          order_index: number;
          note: string | null;
          perceived_difficulty: PerceivedDifficulty | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          order_index?: number;
          note?: string | null;
          perceived_difficulty?: PerceivedDifficulty | null;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          order_index?: number;
          note?: string | null;
          perceived_difficulty?: PerceivedDifficulty | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_exercise_id: string;
          set_index: number;
          weight: number;
          reps: number;
          rpe: number | null;
          is_warmup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_exercise_id: string;
          set_index?: number;
          weight: number;
          reps: number;
          rpe?: number | null;
          is_warmup?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_exercise_id?: string;
          set_index?: number;
          weight?: number;
          reps?: number;
          rpe?: number | null;
          is_warmup?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey";
            columns: ["workout_exercise_id"];
            isOneToOne: false;
            referencedRelation: "workout_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_templates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_template_exercises: {
        Row: {
          id: string;
          template_id: string;
          exercise_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          exercise_id: string;
          order_index?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          exercise_id?: string;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      perceived_difficulty: PerceivedDifficulty;
    };
  };
}

// Convenience types
export type MuscleGroup = Database["public"]["Tables"]["muscle_groups"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type ExerciseAlias =
  Database["public"]["Tables"]["exercise_aliases"]["Row"];
export type WorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutExercise =
  Database["public"]["Tables"]["workout_exercises"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];
export type WorkoutTemplate =
  Database["public"]["Tables"]["workout_templates"]["Row"];
export type WorkoutTemplateExercise =
  Database["public"]["Tables"]["workout_template_exercises"]["Row"];

// Extended types with relations
export interface ExerciseWithMuscleGroup extends Exercise {
  muscle_groups: MuscleGroup;
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercises: ExerciseWithMuscleGroup;
  workout_sets: WorkoutSet[];
}

export interface WorkoutSessionWithDetails extends WorkoutSession {
  workout_exercises: WorkoutExerciseWithDetails[];
}

// Local state types for workout logging
export interface WorkoutSetLocal {
  id: string;
  tempId?: string;
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
  isSaved: boolean;
}

export interface WorkoutExerciseLocal {
  id: string;
  tempId?: string;
  exercise: ExerciseWithMuscleGroup;
  perceivedDifficulty: PerceivedDifficulty | null;
  sets: WorkoutSetLocal[];
  recommendedWeight: number | null;
  alternativeExercise?: ExerciseWithMuscleGroup | null;
  alternativeWeight?: number | null;
  isSaved: boolean;
}

// Analytics types
export interface MuscleAnalytics {
  muscleGroupId: number;
  muscleGroupName: string;
  lastTrainedAt: string | null;
  sessionsCount: number;
  exercisesInLastSession: number;
}
