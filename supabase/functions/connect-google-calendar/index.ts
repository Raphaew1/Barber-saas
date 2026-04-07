import { jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";
import { ensureUserCanManageBarber, getGoogleConfig, GOOGLE_CALENDAR_SCOPE, missingGoogleConfigResponse } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse();

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const body = await request.json().catch(() => ({}));
    const barberId = String(body?.barberId || "").trim();
    const redirectTo = String(body?.redirectTo || "").trim();

    if (!barberId) {
      return jsonResponse({ error: "barberId e obrigatorio." }, 400);
    }

    const accessResult = await ensureUserCanManageBarber(authHeader, barberId);
    if (accessResult.error || !accessResult.user || !accessResult.barber || !accessResult.serviceClient) {
      return jsonResponse({ error: accessResult.error || "Acesso negado." }, 403);
    }

    const config = getGoogleConfig();
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return missingGoogleConfigResponse();
    }

    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const { error: stateError } = await accessResult.serviceClient
      .from("google_oauth_states")
      .insert([{
        state,
        barber_id: barberId,
        requested_by_user_id: accessResult.user.id,
        redirect_to: redirectTo || config.postAuthRedirectUrl || null,
        expires_at: expiresAt
      }]);

    if (stateError) {
      return jsonResponse({ error: `Nao foi possivel iniciar o OAuth: ${stateError.message}` }, 400);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: GOOGLE_CALENDAR_SCOPE,
      state
    });

    return jsonResponse({
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
