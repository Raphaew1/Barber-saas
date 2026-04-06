import { createServiceClient, insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
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
    const token = String(body.token || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();

    if (!token) {
      return jsonResponse({ error: "Token de convite obrigatorio." }, 400);
    }

    const tokenHash = await hashToken(token);
    const { data: invitation, error: invitationError } = await serviceClient
      .from("invitations")
      .select("id, email, barbershop_id, role, status, invited_by, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invitationError) {
      return jsonResponse({ error: invitationError.message }, 400);
    }

    if (!invitation) {
      return jsonResponse({ error: "Convite nao encontrado." }, 404);
    }

    if (invitation.status !== "pending") {
      return jsonResponse({ error: "Este convite nao esta mais disponivel." }, 400);
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await serviceClient
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return jsonResponse({ error: "Convite expirado." }, 400);
    }

    if (String(invitation.email || "").trim().toLowerCase() !== String(authResult.user.email || "").trim().toLowerCase()) {
      return jsonResponse({ error: "Este convite pertence a outro email." }, 403);
    }

    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert([{
        id: authResult.user.id,
        email: authResult.user.email,
        name: name || null,
        phone: phone || null,
        global_role: "user",
        status: "active"
      }], { onConflict: "id" });

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 400);
    }

    const { data: access, error: accessError } = await serviceClient
      .from("user_access")
      .upsert([{
        user_id: authResult.user.id,
        barbershop_id: invitation.barbershop_id,
        role: invitation.role,
        status: "active",
        invited_by: invitation.invited_by,
        approved_by: invitation.invited_by
      }], { onConflict: "user_id,barbershop_id" })
      .select("id, user_id, barbershop_id, role, status")
      .single();

    if (accessError) {
      return jsonResponse({ error: accessError.message }, 400);
    }

    await serviceClient
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    await insertAuditLog(serviceClient, {
      action: "invite_accepted",
      actor_id: authResult.user.id,
      target_user_id: authResult.user.id,
      target_barbershop_id: invitation.barbershop_id,
      metadata: {
        invitation_id: invitation.id,
        role: invitation.role
      }
    });

    return jsonResponse({ access });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
