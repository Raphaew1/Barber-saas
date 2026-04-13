import { jsonResponse, methodNotAllowedResponse, preflightResponse, requireSuperAdmin } from "../_shared/supabase.ts";

type DeleteUserPayload = {
  userId?: string;
  email?: string;
};

function isMissingResourceError(error: { message?: string } | null | undefined, resourceName: string) {
  const message = String(error?.message || "").toLowerCase();
  const normalizedName = String(resourceName || "").toLowerCase();
  return message.includes(`relation "public.${normalizedName}" does not exist`) ||
    message.includes(`relation "${normalizedName}" does not exist`) ||
    message.includes(`column ${normalizedName} does not exist`) ||
    message.includes(`could not find the table 'public.${normalizedName}' in the schema cache`);
}

async function attemptCleanup(
  promise: Promise<{ error: { message?: string } | null }>,
  resourceName: string,
  warnings: string[],
) {
  const result = await promise;
  if (!result.error || isMissingResourceError(result.error, resourceName)) {
    return;
  }

  warnings.push(`${resourceName}: ${result.error.message || "falha ao limpar registro relacionado"}`);
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

    const authResult = await requireSuperAdmin(authHeader);
    if (authResult.error || !authResult.serviceClient || !authResult.profile || !authResult.user) {
      return jsonResponse({ error: authResult.error || "Acesso negado." }, 403);
    }

    const body = await request.json().catch(() => null) as DeleteUserPayload | null;
    const userId = String(body?.userId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!userId || !email) {
      return jsonResponse({ error: "Informe userId e email do usuario que sera excluido." }, 400);
    }

    const actorEmail = String(authResult.user.email || authResult.profile.email || "").trim().toLowerCase();

    if (userId === authResult.user.id || (actorEmail && email === actorEmail)) {
      return jsonResponse({ error: "Voce nao pode excluir o proprio usuario." }, 400);
    }

    if (email === "raphacom.web@gmail.com") {
      return jsonResponse({ error: "O usuario master admin nao pode ser excluido." }, 400);
    }

    const { data: profile, error: profileLookupError } = await authResult.serviceClient
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileLookupError && !isMissingResourceError(profileLookupError, "profiles")) {
      return jsonResponse({ error: profileLookupError.message || "Falha ao localizar o usuario." }, 400);
    }

    if (profile?.email && String(profile.email).trim().toLowerCase() !== email) {
      return jsonResponse({ error: "Os dados do usuario nao conferem. Atualize a lista e tente novamente." }, 409);
    }

    const warnings: string[] = [];

    await attemptCleanup(authResult.serviceClient.from("audit_logs").delete().eq("target_user_id", userId), "audit_logs", warnings);
    await attemptCleanup(authResult.serviceClient.from("audit_logs").delete().eq("actor_id", userId), "audit_logs", warnings);
    await attemptCleanup(authResult.serviceClient.from("user_access").delete().eq("user_id", userId), "user_access", warnings);
    await attemptCleanup(authResult.serviceClient.from("profiles").delete().eq("id", userId), "profiles", warnings);
    await attemptCleanup(authResult.serviceClient.from("barber_access").delete().eq("email", email), "barber_access", warnings);
    await attemptCleanup(authResult.serviceClient.from("invitations").delete().eq("email", email), "invitations", warnings);
    await attemptCleanup(authResult.serviceClient.from("invitations").delete().eq("invited_by", userId), "invitations", warnings);
    await attemptCleanup(authResult.serviceClient.from("access_audit_logs").delete().eq("target_email", email), "access_audit_logs", warnings);
    await attemptCleanup(authResult.serviceClient.from("access_audit_logs").delete().eq("performed_by_email", email), "access_audit_logs", warnings);
    await attemptCleanup(authResult.serviceClient.from("appointments").update({ customer_user_id: null }).eq("customer_user_id", userId), "appointments", warnings);
    await attemptCleanup(authResult.serviceClient.from("barbershops").update({ owner_user_id: null }).eq("owner_user_id", userId), "barbershops", warnings);

    const { error: deleteAuthError } = await authResult.serviceClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return jsonResponse({ error: `Falha ao excluir usuario no Auth: ${deleteAuthError.message}` }, 400);
    }

    return jsonResponse({
      success: true,
      deletedUserId: userId,
      deletedEmail: email,
      warnings,
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
