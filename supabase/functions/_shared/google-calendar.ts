import { createServiceClient, jsonResponse, requireAuthenticatedUser, supabaseUrl } from "./supabase.ts";

export const GOOGLE_CALENDAR_SCOPE = "openid email https://www.googleapis.com/auth/calendar";

export function getGoogleConfig() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") || `${supabaseUrl}/functions/v1/google-oauth-callback`;
  const postAuthRedirectUrl = Deno.env.get("GOOGLE_CALENDAR_POST_AUTH_REDIRECT_URL") || "";
  const appTimezone = Deno.env.get("APP_TIMEZONE") || "Europe/Lisbon";

  return {
    clientId,
    clientSecret,
    redirectUri,
    postAuthRedirectUrl,
    appTimezone
  };
}

export async function ensureUserCanManageBarber(authHeader: string, barberId: string) {
  const authResult = await requireAuthenticatedUser(authHeader);
  if (authResult.error || !authResult.user) {
    return { error: authResult.error || "Sessao invalida.", user: null, barber: null, serviceClient: null };
  }

  const serviceClient = createServiceClient();
  const { data: barber, error: barberError } = await serviceClient
    .from("barbers")
    .select("id, name, barbershop_id")
    .eq("id", barberId)
    .maybeSingle();

  if (barberError || !barber) {
    return { error: barberError?.message || "Barbeiro nao encontrado.", user: authResult.user, barber: null, serviceClient };
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, email, barbershop_id, global_role, role, status")
    .eq("id", authResult.user.id)
    .maybeSingle();

  const hasProfileAccess = profile?.status === "active" && (
    profile?.global_role === "super_admin"
    || String(profile?.email || "").toLowerCase() === "raphacom.web@gmail.com"
    || profile?.barbershop_id === barber.barbershop_id
  );

  if (hasProfileAccess) {
    return { error: null, user: authResult.user, barber, serviceClient, profile };
  }

  const { data: accessRows } = await serviceClient
    .from("user_access")
    .select("id")
    .eq("user_id", authResult.user.id)
    .eq("barbershop_id", barber.barbershop_id)
    .eq("status", "active")
    .limit(1);

  if (Array.isArray(accessRows) && accessRows.length > 0) {
    return { error: null, user: authResult.user, barber, serviceClient, profile };
  }

  return { error: "Voce nao possui acesso a este barbeiro.", user: authResult.user, barber, serviceClient, profile };
}

export async function getGoogleIntegrationForBarber(serviceClient: ReturnType<typeof createServiceClient>, barberId: string) {
  const { data, error } = await serviceClient
    .from("barber_google_integrations")
    .select("*")
    .eq("barber_id", barberId)
    .maybeSingle();

  return {
    data,
    error: error?.message || null
  };
}

export async function refreshGoogleAccessTokenIfNeeded(serviceClient: ReturnType<typeof createServiceClient>, integration: any) {
  if (!integration?.refresh_token) {
    throw new Error("Refresh token do Google nao configurado para este barbeiro.");
  }

  const now = Date.now();
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
  if (integration.access_token && expiresAt > (now + 60_000)) {
    return integration.access_token;
  }

  const config = getGoogleConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar configurados nas Edge Functions.");
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: integration.refresh_token,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Nao foi possivel renovar o token do Google.");
  }

  const nextExpiresAt = new Date(Date.now() + ((Number(payload.expires_in || 3600) - 60) * 1000)).toISOString();
  await serviceClient
    .from("barber_google_integrations")
    .update({
      access_token: payload.access_token,
      token_expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
      is_connected: true,
      disconnected_at: null
    })
    .eq("id", integration.id);

  return payload.access_token;
}

export async function googleCalendarRequest(serviceClient: ReturnType<typeof createServiceClient>, integration: any, endpoint: string, init: RequestInit = {}) {
  const accessToken = await refreshGoogleAccessTokenIfNeeded(serviceClient, integration);

  const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error_description || "Falha na Google Calendar API.");
  }

  return payload;
}

export async function fetchGoogleUserEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error_description || "Nao foi possivel obter o email Google conectado.");
  }
  return String(payload?.email || "").trim().toLowerCase();
}

export function getDateOffsetMinutes(date: string) {
  return Number.isFinite(Number(date)) ? Number(date) : 0;
}

export function buildUtcDateFromLocal(date: string, hour: number, minute: number, timezoneOffsetMinutes: number) {
  const [year, month, day] = String(date || "").split("-").map((value) => Number(value));
  const utcTime = Date.UTC(year, (month || 1) - 1, day || 1, hour, minute, 0, 0);
  return new Date(utcTime + (timezoneOffsetMinutes * 60_000));
}

export async function listLocalBusyWindows(serviceClient: ReturnType<typeof createServiceClient>, barberId: string, rangeStartIso: string, rangeEndIso: string) {
  const { data, error } = await serviceClient
    .from("appointments")
    .select("starts_at, ends_at, appointment_time, status")
    .eq("barber_id", barberId)
    .neq("status", "cancelled")
    .lt("starts_at", rangeEndIso)
    .gt("ends_at", rangeStartIso);

  if (error) {
    throw new Error(`Nao foi possivel consultar a agenda interna: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    start: item.starts_at || item.appointment_time,
    end: item.ends_at || new Date(new Date(item.appointment_time).getTime() + 30 * 60_000).toISOString()
  }));
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA).getTime() < new Date(endB).getTime()
    && new Date(endA).getTime() > new Date(startB).getTime();
}

export function responseWithRedirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url
    }
  });
}

export function missingGoogleConfigResponse() {
  return jsonResponse({
    error: "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI nas secrets do Supabase."
  }, 500);
}
