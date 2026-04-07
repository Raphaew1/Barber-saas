import { createServiceClient, jsonResponse, methodNotAllowedResponse, preflightResponse, requireAuthenticatedUser } from "../_shared/supabase.ts";

function normalizePortalFromAccessRole(role: string | null | undefined) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "admin") {
    return "admin";
  }

  if (normalizedRole === "barber") {
    return "barbeiro";
  }

  return "cliente";
}

function getAllowedPortals(profile: any, accessList: any[], userEmail: string | null | undefined) {
  const activeAccessList = Array.isArray(accessList)
    ? accessList.filter((item: any) => String(item?.status || "active") === "active")
    : [];
  const hasAdminAccess = profile?.global_role === "super_admin"
    || String(profile?.role || "").trim().toLowerCase() === "admin"
    || String(userEmail || "").trim().toLowerCase() === "raphacom.web@gmail.com"
    || activeAccessList.some((item: any) => String(item?.role || "").trim().toLowerCase() === "admin");

  if (hasAdminAccess) {
    return ["admin", "barbeiro", "cliente"];
  }

  const hasBarberAccess = String(profile?.role || "").trim().toLowerCase() === "barbeiro"
    || profile?.global_role === "barbeiro"
    || activeAccessList.some((item: any) => String(item?.role || "").trim().toLowerCase() === "barber");

  if (hasBarberAccess) {
    return ["barbeiro"];
  }

  return ["cliente"];
}

function getPrimaryPortal(allowedPortals: string[]) {
  if (allowedPortals.includes("admin")) {
    return "admin";
  }

  if (allowedPortals.includes("barbeiro")) {
    return "barbeiro";
  }

  return "cliente";
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
    const allowedPortals = getAllowedPortals(profile, accessList, authResult.user.email);
    const primaryPortal = getPrimaryPortal(allowedPortals);

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
        role: activeAccess?.role ? normalizePortalFromAccessRole(activeAccess.role) : (profile?.role || null),
        barbershop_id: activeAccess?.barbershop_id || profile?.barbershop_id || null,
        barbershop_name: activeBarbershop?.name || null,
        barbershop_status: activeBarbershop?.status || null,
        plan_code: activeBarbershop?.plan_code || null,
        access_list: accessList,
        allowed_portals: allowedPortals,
        primary_portal: primaryPortal
      }
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
