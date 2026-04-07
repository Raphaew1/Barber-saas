import { jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { ensureUserCanManageBarber, getGoogleIntegrationForBarber } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();

    if (!barberId) {
      return jsonResponse({ error: "barberId e obrigatorio." }, 400);
    }

    const accessResult = await ensureUserCanManageBarber(authHeader, barberId);
    if (accessResult.error || !accessResult.serviceClient) {
      return jsonResponse({ error: accessResult.error || "Acesso negado." }, 403);
    }

    const integrationResult = await getGoogleIntegrationForBarber(accessResult.serviceClient, barberId);
    if (integrationResult.error) {
      return jsonResponse({ error: integrationResult.error }, 400);
    }

    const integration = integrationResult.data;
    return jsonResponse({
      barberId,
      isConnected: Boolean(integration?.is_connected),
      googleEmail: integration?.google_email || "",
      googleCalendarId: integration?.google_calendar_id || "",
      source: integration?.is_connected ? "google" : "internal"
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
