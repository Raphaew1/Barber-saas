import { insertAuditLog, jsonResponse, methodNotAllowedResponse, preflightResponse, requireBarbershopAdmin } from "../_shared/supabase.ts";

async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

function isMissingColumnError(error: { message?: string } | null | undefined, columnNames: string[]) {
  const message = String(error?.message || "").toLowerCase();
  return columnNames.some((columnName) => message.includes(String(columnName || "").toLowerCase()));
}

function isMissingTableError(error: { message?: string } | null | undefined, tableName: string) {
  const message = String(error?.message || "").toLowerCase();
  const normalizedTable = String(tableName || "").toLowerCase();
  return (
    message.includes(`relation "public.${normalizedTable}" does not exist`) ||
    message.includes(`relation "${normalizedTable}" does not exist`) ||
    message.includes(`could not find the table '${normalizedTable}'`)
  );
}

async function insertBarbershop(serviceClient: any, payload: Record<string, unknown>) {
  const payloadWithAllFields = {
    ...payload
  };

  let result = await serviceClient!
    .from("barbershops")
    .insert([payloadWithAllFields])
    .select("id, name, owner_user_id, plan, plan_code, status, owner_password_defined_at")
    .single();

  if (result.error && isMissingColumnError(result.error, ["location", "plan", "plan_code", "status", "owner_password_defined_at"])) {
    const fallbackPayload = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      owner_user_id: payload.owner_user_id,
      status: payload.status || "active",
      plan: payload.plan || payload.plan_code || "free"
    };

    result = await serviceClient!
      .from("barbershops")
      .insert([fallbackPayload])
      .select("id, name, owner_user_id")
      .single();

    if (result.error && isMissingColumnError(result.error, ["email", "phone"])) {
      result = await serviceClient!
        .from("barbershops")
        .insert([{
          name: payload.name,
          owner_user_id: payload.owner_user_id
        }])
        .select("id, name, owner_user_id")
        .single();
    }
  }

  return result;
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
      console.error("create-barbershop: Authorization header ausente");
      return jsonResponse({ error: "Authorization header ausente." }, 401);
    }

    console.log("create-barbershop: Validando barbershop admin access");
    const authResult = await requireBarbershopAdmin(authHeader);
    
    if (authResult.error) {
      console.error("create-barbershop: authResult.error =", authResult.error);
    }
    if (!authResult.profile) {
      console.error("create-barbershop: authResult.profile is null");
    }
    if (!authResult.serviceClient) {
      console.error("create-barbershop: authResult.serviceClient is null");
    }
    if (!authResult.user) {
      console.error("create-barbershop: authResult.user is null");
    }
    
    if (authResult.error || !authResult.profile || !authResult.serviceClient) {
      console.error("create-barbershop: Acesso negado - returning 403", {
        error: authResult.error,
        hasProfile: !!authResult.profile,
        hasServiceClient: !!authResult.serviceClient,
        user: authResult.user?.email
      });
      return jsonResponse({ error: authResult.error || "Acesso negado." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Payload JSON invalido." }, 400);
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const location = String(body.location || "").trim();
    const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
    const ownerPassword = String(body.ownerPassword || "");
    const planCode = ["free", "pro", "premium"].includes(String(body.planCode || "").trim().toLowerCase())
      ? String(body.planCode).trim().toLowerCase()
      : "free";
    const status = ["active", "blocked"].includes(String(body.status || "").trim().toLowerCase())
      ? String(body.status).trim().toLowerCase()
      : "active";

    if (!name) {
      return jsonResponse({ error: "Informe o nome da barbearia." }, 400);
    }

    if (ownerEmail && ownerPassword.length < 6) {
      return jsonResponse({ error: "A senha inicial deve ter pelo menos 6 caracteres." }, 400);
    }

    let ownerInviteToken: string | null = null;
    let ownerUserId: string | null = null;
    let ownerWasCreated = false;

    const { data: ownerProfile } = ownerEmail
      ? await authResult.serviceClient
          .from("profiles")
          .select("id, email")
          .eq("email", ownerEmail)
          .maybeSingle()
      : { data: null };

    if (ownerProfile?.id) {
      ownerUserId = ownerProfile.id;

      if (ownerPassword) {
        const { error: updateOwnerError } = await authResult.serviceClient.auth.admin.updateUserById(ownerProfile.id, {
          password: ownerPassword
        });

        if (updateOwnerError) {
          return jsonResponse({ error: updateOwnerError.message }, 400);
        }
      }
    } else if (ownerEmail) {
      if (!ownerPassword) {
        return jsonResponse({ error: "Informe a senha inicial do responsavel." }, 400);
      }

      const { data: createdOwner, error: createOwnerError } = await authResult.serviceClient.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true
      });

      if (createOwnerError || !createdOwner.user?.id) {
        return jsonResponse({ error: createOwnerError?.message || "Nao foi possivel criar a conta do responsavel." }, 400);
      }

      ownerUserId = createdOwner.user.id;
      ownerWasCreated = true;
    }

    const { data: createdBarbershop, error: createError } = await insertBarbershop(authResult.serviceClient, {
      name,
      email: email || null,
      phone: phone || null,
      location: location || null,
      owner_user_id: ownerUserId,
      plan: planCode,
      plan_code: planCode,
      status,
      owner_password_defined_at: ownerPassword ? new Date().toISOString() : null
    });

    if (createError) {
      if (ownerWasCreated && ownerUserId) {
        await authResult.serviceClient.auth.admin.deleteUser(ownerUserId);
      }

      return jsonResponse({ error: createError.message }, 400);
    }

    const subscriptionResult = await authResult.serviceClient
      .from("saas_subscriptions")
      .upsert([{
        barbershop_id: createdBarbershop.id,
        plan_code: planCode,
        status: "active",
        billing_provider: "manual"
      }], { onConflict: "barbershop_id" });

    if (subscriptionResult.error && !isMissingTableError(subscriptionResult.error, "saas_subscriptions")) {
      console.error("create-barbershop saas_subscriptions error:", subscriptionResult.error.message);
    }

    if (ownerUserId && ownerEmail) {
      const profileUpsertResult = await authResult.serviceClient
        .from("profiles")
        .upsert([{
          id: ownerUserId,
          email: ownerEmail,
          role: "admin",
          barbershop_id: createdBarbershop.id,
          global_role: "user",
          status: status === "blocked" ? "blocked" : "active"
        }], { onConflict: "id" });

      if (profileUpsertResult.error && isMissingColumnError(profileUpsertResult.error, ["global_role", "status"])) {
        await authResult.serviceClient
          .from("profiles")
          .upsert([{
            id: ownerUserId,
            email: ownerEmail,
            role: "admin",
            barbershop_id: createdBarbershop.id
          }], { onConflict: "id" });
      }

      const userAccessResult = await authResult.serviceClient
        .from("user_access")
        .upsert([{
          user_id: ownerUserId,
          barbershop_id: createdBarbershop.id,
          role: "admin",
          status: status === "blocked" ? "blocked" : "active",
          invited_by: authResult.profile.id,
          approved_by: authResult.profile.id
        }], { onConflict: "user_id,barbershop_id" });

      if (userAccessResult.error && !isMissingTableError(userAccessResult.error, "user_access")) {
        console.error("create-barbershop user_access error:", userAccessResult.error.message);
      }

      const barberAccessResult = await authResult.serviceClient
        .from("barber_access")
        .upsert([{
          email: ownerEmail,
          barbershop_id: createdBarbershop.id,
          approved_by_email: authResult.profile.email,
          approved_at: new Date().toISOString(),
          is_active: status !== "blocked"
        }], { onConflict: "email" });

      if (barberAccessResult.error && !isMissingTableError(barberAccessResult.error, "barber_access")) {
        console.error("create-barbershop barber_access error:", barberAccessResult.error.message);
      }
    } else if (ownerEmail) {
      const rawToken = crypto.randomUUID();
      const tokenHash = await hashToken(rawToken);
      ownerInviteToken = rawToken;

      const invitationResult = await authResult.serviceClient
        .from("invitations")
        .insert([{
          email: ownerEmail,
          barbershop_id: createdBarbershop.id,
          role: "admin",
          status: "pending",
          token_hash: tokenHash,
          invited_by: authResult.profile.id,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
        }]);

      if (invitationResult.error && !isMissingTableError(invitationResult.error, "invitations")) {
        console.error("create-barbershop invitations error:", invitationResult.error.message);
      }
    }

    await insertAuditLog(authResult.serviceClient, {
      action: "barbershop_created",
      actor_id: authResult.profile.id,
      target_barbershop_id: createdBarbershop.id,
      target_user_id: ownerUserId,
      metadata: {
        name,
        owner_email: ownerEmail || null,
        plan_code: planCode,
        status
      }
    });

    return jsonResponse({ barbershop: createdBarbershop, ownerInviteToken });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
