import { createServiceClient, jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { getGoogleIntegrationForBarber, googleCalendarRequest } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();
    const googleEventId = String(body?.googleEventId || "").trim();
    const appointmentIds = Array.isArray(body?.appointmentIds) ? body.appointmentIds.filter(Boolean) : [];

    if (!barberId || !googleEventId) {
      return jsonResponse({ error: "barberId e googleEventId sao obrigatorios." }, 400);
    }

    const serviceClient = createServiceClient();
    const integrationResult = await getGoogleIntegrationForBarber(serviceClient, barberId);
    const integration = integrationResult.data;

    if (integration?.is_connected) {
      await googleCalendarRequest(
        serviceClient,
        integration,
        `/calendars/${encodeURIComponent(integration.google_calendar_id || "primary")}/events/${encodeURIComponent(googleEventId)}`,
        { method: "DELETE" }
      );
    }

    if (appointmentIds.length > 0) {
      await serviceClient
        .from("appointments")
        .update({
          sync_status: "cancelled",
          sync_error: null,
          synced_at: new Date().toISOString(),
          status: "cancelled"
        })
        .in("id", appointmentIds);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
