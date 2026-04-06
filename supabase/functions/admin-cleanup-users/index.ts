import { insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireSuperAdmin } from "../_shared/supabase.ts";

type AuthUser = {
  id?: string;
  email?: string | null;
};

function isMissingResourceError(error: { message?: string } | null | undefined, resourceName: string) {
  const message = String(error?.message || "").toLowerCase();
  const normalizedName = String(resourceName || "").toLowerCase();
  return message.includes(`relation "public.${normalizedName}" does not exist`) ||
    message.includes(`relation "${normalizedName}" does not exist`) ||
    message.includes(`column ${normalizedName} does not exist`);
}

async function listAllAuthUsers(serviceClient: any) {
  const users: AuthUser[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw error;
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function ignoreMissingResource(promise: Promise<{ error: { message?: string } | null }>, resourceName: string) {
  const result = await promise;
  if (result.error && !isMissingResourceError(result.error, resourceName)) {
    throw new Error(result.error.message || `Falha ao acessar ${resourceName}.`);
  }
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
    if (authResult.error || !authResult.serviceClient || !authResult.profile) {
      return jsonResponse({ error: authResult.error || "Acesso negado." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Payload JSON invalido." }, 400);
    }
    const masterEmail = String(body.masterEmail || "").trim().toLowerCase();

    if (!masterEmail) {
      return jsonResponse({ error: "Informe o email master que deve ser preservado." }, 400);
    }

    const authUsers = await listAllAuthUsers(authResult.serviceClient);
    const usersToDelete = authUsers.filter((user) => String(user.email || "").trim().toLowerCase() !== masterEmail);
    const keptUsers = authUsers.filter((user) => String(user.email || "").trim().toLowerCase() === masterEmail);
    const targetUserIds = usersToDelete.map((user) => String(user.id || "").trim()).filter(Boolean);
    const targetEmails = usersToDelete.map((user) => String(user.email || "").trim().toLowerCase()).filter(Boolean);

    if (targetUserIds.length) {
      await ignoreMissingResource(authResult.serviceClient.from("audit_logs").delete().in("target_user_id", targetUserIds), "audit_logs");
      await ignoreMissingResource(authResult.serviceClient.from("audit_logs").delete().in("actor_id", targetUserIds), "audit_logs");
      await ignoreMissingResource(authResult.serviceClient.from("user_access").delete().in("user_id", targetUserIds), "user_access");
      await ignoreMissingResource(authResult.serviceClient.from("invitations").delete().in("invited_by", targetUserIds), "invitations");
      await ignoreMissingResource(authResult.serviceClient.from("barbershops").update({ owner_user_id: null }).in("owner_user_id", targetUserIds), "barbershops");
      await ignoreMissingResource(authResult.serviceClient.from("appointments").update({ customer_user_id: null }).in("customer_user_id", targetUserIds), "appointments");
      await ignoreMissingResource(authResult.serviceClient.from("profiles").delete().in("id", targetUserIds), "profiles");
    }

    if (targetEmails.length) {
      await ignoreMissingResource(authResult.serviceClient.from("barber_access").delete().in("email", targetEmails), "barber_access");
      await ignoreMissingResource(authResult.serviceClient.from("invitations").delete().in("email", targetEmails), "invitations");
      await ignoreMissingResource(authResult.serviceClient.from("access_audit_logs").delete().in("target_email", targetEmails), "access_audit_logs");
      await ignoreMissingResource(authResult.serviceClient.from("access_audit_logs").delete().in("performed_by_email", targetEmails), "access_audit_logs");
    }

    for (const user of usersToDelete) {
      if (!user.id) {
        continue;
      }

      const { error } = await authResult.serviceClient.auth.admin.deleteUser(user.id);
      if (error) {
        return jsonResponse({ error: `Falha ao remover ${user.email || user.id}: ${error.message}` }, 400);
      }
    }

    await insertAuditLog(authResult.serviceClient, {
      action: "admin_cleanup_users",
      actor_id: authResult.profile.id,
      target_user_id: authResult.profile.id,
      metadata: {
        master_email: masterEmail,
        deleted_users: usersToDelete.map((user) => user.email || user.id),
        kept_users: keptUsers.map((user) => user.email || user.id)
      }
    });

    return jsonResponse({
      success: true,
      masterEmail,
      deletedUsers: usersToDelete.length,
      keptUsers: keptUsers.length
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
