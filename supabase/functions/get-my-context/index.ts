import { createServiceClient, jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

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

    let profileResult = await serviceClient
      .from("profiles")
      .select("id, email, name, global_role, status, role, barbershop_id")
      .eq("id", authResult.user.id)
      .maybeSingle();

    if (profileResult.error) {
      profileResult = await serviceClient
        .from("profiles")
        .select("id, email")
        .eq("id", authResult.user.id)
        .maybeSingle();
    }

    const profile = profileResult.data ?? null;

    let accessResult = await serviceClient
      .from("user_access")
      .select("barbershop_id, role, status, barbershops(name, status, plan_code)")
      .eq("user_id", authResult.user.id);

    if (accessResult.error) {
      accessResult = await serviceClient
        .from("user_access")
        .select("barbershop_id, role, barbershops(name)")
        .eq("user_id", authResult.user.id);
    }

    const accessList = Array.isArray(accessResult.data) ? accessResult.data : [];
    const activeAccess = accessList.find((item: any) => String(item?.status || "active") === "active") || accessList[0] || null;
    const activeBarbershop = activeAccess?.barbershops || null;

    return jsonResponse({
      user: {
        id: authResult.user.id,
        email: authResult.user.email
      },
      profile,
      context: {
        user_id: authResult.user.id,
        email: authResult.user.email,
        global_role: profile?.global_role || null,
        status: profile?.status || null,
        role: activeAccess?.role || profile?.role || null,
        barbershop_id: activeAccess?.barbershop_id || profile?.barbershop_id || null,
        barbershop_name: activeBarbershop?.name || null,
        barbershop_status: activeBarbershop?.status || null,
        plan_code: activeBarbershop?.plan_code || null,
        access_list: accessList
      }
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
