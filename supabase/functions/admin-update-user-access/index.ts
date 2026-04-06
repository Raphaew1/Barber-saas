import { createServiceClient, insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

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
    const targetUserId = String(body.targetUserId || "").trim();
    const barbershopId = String(body.barbershopId || "").trim();
    const role = String(body.role || "").trim().toLowerCase();
    const status = String(body.status || "").trim().toLowerCase();

    if (!targetUserId || !barbershopId || !["admin", "barber", "client"].includes(role) || !["active", "blocked", "pending"].includes(status)) {
      return jsonResponse({ error: "Payload invalido para atualizacao de acesso." }, 400);
    }

    const { data: actorProfile } = await serviceClient
      .from("profiles")
      .select("id, global_role")
      .eq("id", authResult.user.id)
      .maybeSingle();

    const { data: actorAccess } = await serviceClient
      .from("user_access")
      .select("id")
      .eq("user_id", authResult.user.id)
      .eq("barbershop_id", barbershopId)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();

    const isSuperAdmin = actorProfile?.global_role === "super_admin";
    if (!isSuperAdmin && !actorAccess?.id) {
      return jsonResponse({ error: "Acesso negado para atualizar usuarios desta barbearia." }, 403);
    }

    const { data, error } = await serviceClient
      .from("user_access")
      .upsert([{
        user_id: targetUserId,
        barbershop_id: barbershopId,
        role,
        status,
        approved_by: authResult.user.id
      }], { onConflict: "user_id,barbershop_id" })
      .select("id, user_id, barbershop_id, role, status")
      .single();

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    await insertAuditLog(serviceClient, {
      action: "user_access_updated",
      actor_id: authResult.user.id,
      target_user_id: targetUserId,
      target_barbershop_id: barbershopId,
      metadata: { role, status }
    });

    return jsonResponse({ access: data });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
