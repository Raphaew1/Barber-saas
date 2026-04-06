import { jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Authorization header ausente." }, 401);
    }

    const authResult = await requireAuthenticatedUser(authHeader);
    if (authResult.error || !authResult.user || !authResult.userClient) {
      return jsonResponse({ error: authResult.error || "Sessao invalida." }, 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Payload JSON invalido." }, 400);
    }

    const { data, error } = await authResult.userClient.rpc("create_appointment", {
      p_barber_id: body.barberId,
      p_service_ids: body.serviceIds,
      p_appointment_time: body.appointmentTime,
      p_customer_name: body.customerName,
      p_customer_email: body.customerEmail ?? null,
      p_customer_phone: body.customerPhone ?? null
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ appointments: data ?? [] }, 200);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
