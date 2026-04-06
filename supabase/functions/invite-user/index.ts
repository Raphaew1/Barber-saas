import { createServiceClient, insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

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
    if (authResult.error || !authResult.user) {
      return jsonResponse({ error: authResult.error || "Sessao invalida." }, 401);
    }

    const serviceClient = createServiceClient();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Payload JSON invalido." }, 400);
    }
    const email = String(body.email || "").trim().toLowerCase();
    const barbershopId = String(body.barbershopId || "").trim();
    const role = ["admin", "barber", "client"].includes(String(body.role || "").trim().toLowerCase())
      ? String(body.role).trim().toLowerCase()
      : "barber";

    if (!email || !barbershopId) {
      return jsonResponse({ error: "Email e barbearia sao obrigatorios." }, 400);
    }

    const { data: actorAccess } = await serviceClient
      .from("user_access")
      .select("id")
      .eq("user_id", authResult.user.id)
      .eq("barbershop_id", barbershopId)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();

    const { data: actorProfile } = await serviceClient
      .from("profiles")
      .select("id, global_role")
      .eq("id", authResult.user.id)
      .maybeSingle();

    const isSuperAdmin = actorProfile?.global_role === "super_admin";
    if (!isSuperAdmin && !actorAccess?.id) {
      return jsonResponse({ error: "Somente admins da barbearia ou super admin podem convidar usuarios." }, 403);
    }

    const rawToken = crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data: invitation, error } = await serviceClient
      .from("invitations")
      .insert([{
        email,
        barbershop_id: barbershopId,
        role,
        status: "pending",
        token_hash: tokenHash,
        invited_by: authResult.user.id,
        expires_at: expiresAt
      }])
      .select("id, email, barbershop_id, role, status, expires_at")
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    await insertAuditLog(serviceClient, {
      action: "user_invited",
      actor_id: authResult.user.id,
      target_barbershop_id: barbershopId,
      metadata: {
        invitation_id: invitation.id,
        email,
        role
      }
    });

    return jsonResponse({
      invitation,
      inviteToken: rawToken
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
