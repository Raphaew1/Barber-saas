import { insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireSuperAdmin } from "../_shared/supabase.ts";

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

    const authResult = await requireSuperAdmin(authHeader);
    if (authResult.error || !authResult.serviceClient || !authResult.profile) {
      return jsonResponse({ error: authResult.error || "Acesso negado." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Payload JSON invalido." }, 400);
    }
    const email = String(body.email || "").trim().toLowerCase();
    const userId = String(body.userId || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!userId && !email) {
      return jsonResponse({ error: "Informe o usuario para alterar a senha." }, 400);
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return jsonResponse({ error: "A nova senha deve ter pelo menos 6 caracteres." }, 400);
      }

      let targetUserId = userId;

      if (!targetUserId && email) {
        const { data: profile, error: profileError } = await authResult.serviceClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (profileError) {
          return jsonResponse({ error: profileError.message }, 400);
        }

        targetUserId = String(profile?.id || "").trim();
      }

      if (!targetUserId) {
        return jsonResponse({ error: "Nao foi possivel localizar a conta deste usuario." }, 404);
      }

      const { error } = await authResult.serviceClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      await insertAuditLog(authResult.serviceClient, {
        action: "admin_password_changed",
        actor_id: authResult.profile.id,
        target_user_id: targetUserId,
        metadata: {
          email
        }
      });

      return jsonResponse({ success: true, email, userId: targetUserId });
    }

    if (!email) {
      return jsonResponse({ error: "Informe o email para enviar a redefinicao." }, 400);
    }

    const { error } = await authResult.serviceClient.auth.admin.generateLink({
      type: "recovery",
      email
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    await insertAuditLog(authResult.serviceClient, {
      action: "admin_password_reset_requested",
      actor_id: authResult.profile.id,
      metadata: {
        email
      }
    });

    return jsonResponse({ success: true, email });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
