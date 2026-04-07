import { createServiceClient, jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { buildUtcDateFromLocal, getGoogleIntegrationForBarber, googleCalendarRequest, listLocalBusyWindows, rangesOverlap } from "../_shared/google-calendar.ts";

function buildSlotLabel(dateIso: string, timeZone = "Europe/Lisbon") {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(new Date(dateIso));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();
    const date = String(body?.date || "").trim();
    const serviceIds = Array.isArray(body?.serviceIds) ? body.serviceIds.filter(Boolean) : [];
    const timezone = String(body?.timezone || "Europe/Lisbon").trim() || "Europe/Lisbon";
    const timezoneOffsetMinutes = Number(body?.timezoneOffsetMinutes || 0);

    if (!barberId || !date || serviceIds.length === 0) {
      return jsonResponse({ error: "barberId, date e serviceIds sao obrigatorios." }, 400);
    }

    const serviceClient = createServiceClient();
    const { data: barber, error: barberError } = await serviceClient
      .from("barbers")
      .select("id, name, barbershop_id")
      .eq("id", barberId)
      .maybeSingle();

    if (barberError || !barber) {
      return jsonResponse({ error: barberError?.message || "Barbeiro nao encontrado." }, 404);
    }

    const { data: services, error: servicesError } = await serviceClient
      .from("services")
      .select("id, duration_minutes")
      .in("id", serviceIds);

    if (servicesError) {
      return jsonResponse({ error: `Nao foi possivel consultar os servicos: ${servicesError.message}` }, 400);
    }

    const durationMinutes = (services || []).reduce((sum: number, item: any) => sum + Number(item.duration_minutes || 30), 0) || 30;
    const dayStart = buildUtcDateFromLocal(date, 9, 0, timezoneOffsetMinutes);
    const dayEnd = buildUtcDateFromLocal(date, 19, 0, timezoneOffsetMinutes);

    const localBusyRanges = await listLocalBusyWindows(serviceClient, barberId, dayStart.toISOString(), dayEnd.toISOString());
    const integrationResult = await getGoogleIntegrationForBarber(serviceClient, barberId);
    const integration = integrationResult.data;
    const googleBusyRanges: Array<{ start: string; end: string }> = [];
    let source = "internal";
    let connectionStatus = {
      isConnected: false,
      googleEmail: "",
      googleCalendarId: ""
    };

    if (integration?.is_connected) {
      source = "google";
      connectionStatus = {
        isConnected: true,
        googleEmail: integration.google_email || "",
        googleCalendarId: integration.google_calendar_id || "primary"
      };

      try {
        const freeBusyPayload = await googleCalendarRequest(serviceClient, integration, "/freeBusy", {
          method: "POST",
          body: JSON.stringify({
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            timeZone: timezone,
            items: [{ id: integration.google_calendar_id || "primary" }]
          })
        });

        const busy = freeBusyPayload?.calendars?.[integration.google_calendar_id || "primary"]?.busy || [];
        busy.forEach((item: any) => {
          if (item?.start && item?.end) {
            googleBusyRanges.push({ start: item.start, end: item.end });
          }
        });
      } catch (googleError) {
        source = "internal";
        connectionStatus = {
          ...connectionStatus,
          isConnected: false
        };
      }
    }

    const slots = [];
    for (let hour = 9; hour < 19; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startsAt = buildUtcDateFromLocal(date, hour, minute, timezoneOffsetMinutes);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        if (endsAt > dayEnd) {
          continue;
        }

        const slotIsBusy = [...localBusyRanges, ...googleBusyRanges].some((range) =>
          rangesOverlap(startsAt.toISOString(), endsAt.toISOString(), range.start, range.end)
        );

        slots.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          label: buildSlotLabel(startsAt.toISOString(), timezone),
          disabled: slotIsBusy
        });
      }
    }

    return jsonResponse({
      source,
      timezone,
      durationMinutes,
      connectionStatus,
      slots: slots.filter((slot) => !slot.disabled)
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
