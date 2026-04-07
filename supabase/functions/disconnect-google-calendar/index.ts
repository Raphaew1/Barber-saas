import { jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { ensureUserCanManageBarber } from "../_shared/google-calendar.ts";

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

    const { error } = await accessResult.serviceClient
      .from("barber_google_integrations")
      .update({
        is_connected: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("barber_id", barberId);

    if (error) {
      return jsonResponse({ error: `Nao foi possivel desconectar: ${error.message}` }, 400);
    }

    return jsonResponse({ success: true, barberId });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
