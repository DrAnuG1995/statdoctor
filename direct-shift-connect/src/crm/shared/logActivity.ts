import { supabase } from "@/lib/supabase";

/**
 * Log an activity to the global activity_feed and optionally to an entity-specific table.
 */
export async function logActivity({
  module,
  entityId,
  action,
  summary,
  metadata = {},
}: {
  module: "hospitals" | "doctors" | "shifts" | "investors" | "deals";
  entityId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert into global activity feed
  await supabase.from("activity_feed").insert({
    module,
    entity_id: entityId || null,
    action,
    summary,
    metadata,
    created_by: user?.id || null,
  });

  // Also insert into entity-specific table if applicable
  if (module === "hospitals" && entityId) {
    await supabase.from("hospital_activities").insert({
      hospital_id: entityId,
      action,
      summary,
      metadata,
      created_by: user?.id || null,
    });
  } else if (module === "doctors" && entityId) {
    await supabase.from("doctor_activities").insert({
      doctor_id: entityId,
      action,
      summary,
      metadata,
      created_by: user?.id || null,
    });
  }
}
