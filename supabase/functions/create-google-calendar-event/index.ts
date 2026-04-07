import { createServiceClient, jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { getGoogleIntegrationForBarber, googleCalendarRequest } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();
    const bookingGroupId = String(body?.bookingGroupId || "").trim();
    const startsAt = String(body?.startsAt || "").trim();
    const endsAt = String(body?.endsAt || "").trim();
    const customerName = String(body?.customerName || "Cliente").trim();
    const customerEmail = String(body?.customerEmail || "").trim();
    const customerPhone = String(body?.customerPhone || "").trim();
    const timezone = String(body?.timezone || "Europe/Lisbon").trim() || "Europe/Lisbon";
    const serviceNames = Array.isArray(body?.serviceNames) ? body.serviceNames.filter(Boolean) : [];
    const appointmentIds = Array.isArray(body?.appointmentIds) ? body.appointmentIds.filter(Boolean) : [];

    if (!barberId || !startsAt || !endsAt) {
      return jsonResponse({ error: "barberId, startsAt e endsAt sao obrigatorios." }, 400);
    }

    const serviceClient = createServiceClient();
    const integrationResult = await getGoogleIntegrationForBarber(serviceClient, barberId);
    const integration = integrationResult.data;

    if (!integration?.is_connected) {
      return jsonResponse({ error: "Este barbeiro nao possui Google Calendar conectado." }, 400);
    }

    const { data: barber } = await serviceClient
      .from("barbers")
      .select("name")
      .eq("id", barberId)
      .maybeSingle();

    const eventPayload = await googleCalendarRequest(serviceClient, integration, `/calendars/${encodeURIComponent(integration.google_calendar_id || "primary")}/events`, {
      method: "POST",
      body: JSON.stringify({
        summary: `${barber?.name || "Barbeiro"} · ${customerName}`,
        description: [
          serviceNames.length ? `Servicos: ${serviceNames.join(", ")}` : null,
          customerEmail ? `Email do cliente: ${customerEmail}` : null,
          customerPhone ? `Telefone do cliente: ${customerPhone}` : null,
          bookingGroupId ? `Booking group: ${bookingGroupId}` : null
        ].filter(Boolean).join("\n"),
        start: {
          dateTime: startsAt,
          timeZone: timezone
        },
        end: {
          dateTime: endsAt,
          timeZone: timezone
        }
      })
    });

    if (appointmentIds.length > 0) {
      await serviceClient
        .from("appointments")
        .update({
          google_event_id: eventPayload.id,
          google_calendar_id: integration.google_calendar_id || "primary",
          sync_status: "synced",
          sync_error: null,
          synced_at: new Date().toISOString(),
          source: "google"
        })
        .in("id", appointmentIds);
    }

    return jsonResponse({
      success: true,
      eventId: eventPayload.id,
      googleCalendarId: integration.google_calendar_id || "primary"
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
