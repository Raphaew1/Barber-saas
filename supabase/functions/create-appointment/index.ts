import { createServiceClient, extractBearerToken, jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { getGoogleIntegrationForBarber, googleCalendarRequest } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();
    const serviceIds = Array.isArray(body?.serviceIds) ? body.serviceIds.filter(Boolean) : [];
    const startsAt = String(body?.startsAt || "").trim();
    const endsAt = String(body?.endsAt || "").trim();
    const customerName = String(body?.customerName || "").trim();
    const customerEmail = String(body?.customerEmail || "").trim().toLowerCase();
    const customerPhone = String(body?.customerPhone || "").trim();
    const timezone = String(body?.timezone || "Europe/Lisbon").trim() || "Europe/Lisbon";

    if (!barberId || serviceIds.length === 0 || !startsAt || !endsAt || !customerName) {
      return jsonResponse({ error: "barberId, serviceIds, startsAt, endsAt e customerName sao obrigatorios." }, 400);
    }

    const serviceClient = createServiceClient();
    const authToken = extractBearerToken(request.headers.get("Authorization") || "");
    let customerUserId: string | null = null;
    if (authToken) {
      const { data } = await serviceClient.auth.getUser(authToken);
      customerUserId = data?.user?.id || null;
    }

    const { data: barber, error: barberError } = await serviceClient
      .from("barbers")
      .select("id, name, barbershop_id")
      .eq("id", barberId)
      .maybeSingle();

    if (barberError || !barber?.barbershop_id) {
      return jsonResponse({ error: barberError?.message || "Barbeiro nao encontrado." }, 404);
    }

    const { data: services, error: servicesError } = await serviceClient
      .from("services")
      .select("id, name, barbershop_id, duration_minutes")
      .in("id", serviceIds);

    if (servicesError || !Array.isArray(services) || services.length !== serviceIds.length) {
      return jsonResponse({ error: servicesError?.message || "Nao foi possivel validar os servicos selecionados." }, 400);
    }

    const invalidService = services.find((item: any) => item.barbershop_id !== barber.barbershop_id);
    if (invalidService) {
      return jsonResponse({ error: "Selecione barbeiro e servicos da mesma barbearia." }, 400);
    }

    const requestedStart = new Date(startsAt);
    const requestedEnd = new Date(endsAt);
    if (Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime()) || requestedEnd <= requestedStart) {
      return jsonResponse({ error: "Intervalo de agendamento invalido." }, 400);
    }

    const { data: conflictingAppointments, error: conflictError } = await serviceClient
      .from("appointments")
      .select("id, starts_at, ends_at, appointment_time, status")
      .eq("barber_id", barberId)
      .neq("status", "cancelled")
      .lt("starts_at", requestedEnd.toISOString())
      .gt("ends_at", requestedStart.toISOString());

    if (conflictError) {
      return jsonResponse({ error: `Nao foi possivel validar conflitos: ${conflictError.message}` }, 400);
    }

    if ((conflictingAppointments || []).length > 0) {
      return jsonResponse({ error: "Horario indisponivel para este barbeiro." }, 409);
    }

    const bookingGroupId = crypto.randomUUID();
    const basePayload = services.map((service: any) => ({
      booking_group_id: bookingGroupId,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      customer_user_id: customerUserId,
      barber_id: barberId,
      service_id: service.id,
      appointment_time: requestedStart.toISOString(),
      starts_at: requestedStart.toISOString(),
      ends_at: requestedEnd.toISOString(),
      barbershop_id: barber.barbershop_id,
      status: "scheduled",
      source: "internal",
      sync_status: "not_connected",
      finalized_at: null
    }));

    const insertResult = await serviceClient
      .from("appointments")
      .insert(basePayload)
      .select("*");

    if (insertResult.error) {
      return jsonResponse({ error: `Nao foi possivel criar o agendamento: ${insertResult.error.message}` }, 400);
    }

    const appointments = insertResult.data || [];
    const integrationResult = await getGoogleIntegrationForBarber(serviceClient, barberId);
    const integration = integrationResult.data;

    if (integration?.is_connected) {
      try {
        const eventPayload = await googleCalendarRequest(serviceClient, integration, `/calendars/${encodeURIComponent(integration.google_calendar_id || "primary")}/events`, {
          method: "POST",
          body: JSON.stringify({
            summary: `${barber.name || "Barbeiro"} · ${customerName}`,
            description: [
              `Servicos: ${services.map((item: any) => item.name).join(", ")}`,
              customerEmail ? `Email do cliente: ${customerEmail}` : null,
              customerPhone ? `Telefone do cliente: ${customerPhone}` : null,
              `Booking group: ${bookingGroupId}`
            ].filter(Boolean).join("\n"),
            start: {
              dateTime: requestedStart.toISOString(),
              timeZone: timezone
            },
            end: {
              dateTime: requestedEnd.toISOString(),
              timeZone: timezone
            }
          })
        });

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
          .eq("booking_group_id", bookingGroupId);

        const { data: syncedAppointments } = await serviceClient
          .from("appointments")
          .select("*")
          .eq("booking_group_id", bookingGroupId)
          .order("created_at", { ascending: true });

        return jsonResponse({
          appointments: syncedAppointments || appointments,
          bookingGroupId,
          source: "google",
          syncStatus: "synced"
        });
      } catch (googleError) {
        await serviceClient
          .from("appointments")
          .update({
            sync_status: "failed",
            sync_error: googleError.message,
            synced_at: new Date().toISOString(),
            source: "internal"
          })
          .eq("booking_group_id", bookingGroupId);

        const { data: failedAppointments } = await serviceClient
          .from("appointments")
          .select("*")
          .eq("booking_group_id", bookingGroupId)
          .order("created_at", { ascending: true });

        return jsonResponse({
          appointments: failedAppointments || appointments,
          bookingGroupId,
          source: "internal",
          syncStatus: "failed",
          syncError: googleError.message
        });
      }
    }

    return jsonResponse({
      appointments,
      bookingGroupId,
      source: "internal",
      syncStatus: "not_connected"
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
