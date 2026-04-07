import { createServiceClient, jsonResponse, preflightResponse } from "../_shared/supabase.ts";
import { fetchGoogleUserEmail, getGoogleConfig, missingGoogleConfigResponse, responseWithRedirect } from "../_shared/google-calendar.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "GET") return jsonResponse({ error: "Metodo nao permitido." }, 405);

  try {
    const url = new URL(request.url);
    const code = String(url.searchParams.get("code") || "").trim();
    const state = String(url.searchParams.get("state") || "").trim();
    const errorDescription = String(url.searchParams.get("error_description") || url.searchParams.get("error") || "").trim();

    if (errorDescription) {
      return jsonResponse({ error: `Google OAuth recusado: ${errorDescription}` }, 400);
    }

    if (!code || !state) {
      return jsonResponse({ error: "Parametros code/state ausentes no callback do Google." }, 400);
    }

    const config = getGoogleConfig();
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return missingGoogleConfigResponse();
    }

    const serviceClient = createServiceClient();
    const { data: oauthState, error: stateError } = await serviceClient
      .from("google_oauth_states")
      .select("*")
      .eq("state", state)
      .is("consumed_at", null)
      .maybeSingle();

    if (stateError || !oauthState) {
      return jsonResponse({ error: stateError?.message || "State OAuth invalido ou expirado." }, 400);
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      return jsonResponse({ error: "A solicitacao OAuth expirou. Tente conectar novamente." }, 400);
    }

    const tokenBody = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString()
    });

    const tokenPayload = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenPayload?.access_token) {
      return jsonResponse({
        error: tokenPayload?.error_description || tokenPayload?.error || "Nao foi possivel trocar o authorization code por tokens."
      }, 400);
    }

    const googleEmail = await fetchGoogleUserEmail(tokenPayload.access_token);
    const tokenExpiresAt = new Date(Date.now() + ((Number(tokenPayload.expires_in || 3600) - 60) * 1000)).toISOString();

    const { error: upsertError } = await serviceClient
      .from("barber_google_integrations")
      .upsert([{
        barber_id: oauthState.barber_id,
        profile_user_id: oauthState.requested_by_user_id,
        google_email: googleEmail,
        google_calendar_id: "primary",
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token || null,
        token_expires_at: tokenExpiresAt,
        scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
        is_connected: true,
        disconnected_at: null,
        updated_at: new Date().toISOString()
      }], { onConflict: "barber_id" });

    if (upsertError) {
      return jsonResponse({ error: `Nao foi possivel salvar a integracao Google: ${upsertError.message}` }, 400);
    }

    await serviceClient
      .from("google_oauth_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", oauthState.id);

    const redirectTo = String(oauthState.redirect_to || config.postAuthRedirectUrl || "").trim();
    if (redirectTo) {
      const successUrl = new URL(redirectTo);
      successUrl.searchParams.set("google_calendar", "connected");
      successUrl.searchParams.set("barber_id", oauthState.barber_id);
      return responseWithRedirect(successUrl.toString());
    }

    return jsonResponse({
      success: true,
      barberId: oauthState.barber_id,
      googleEmail
    }, 200);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
