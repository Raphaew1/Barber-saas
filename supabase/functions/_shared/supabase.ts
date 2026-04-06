import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://kgpsfbuurggwmpcxrfpa.supabase.co";
export const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ";
export const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3OTEwNSwiZXhwIjoyMDg5MzU1MTA1fQ.nGBuMecG0uy6X23a2lO4NzXllevBFURdWjkp6YXhcys";
export const masterAdminEmail = "raphacom.web@gmail.com";

console.log("=== SUPABASE CONFIG ===");
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key presente: ${!!supabaseAnonKey}`);
console.log(`Service Key presente: ${!!supabaseServiceRoleKey}`);
console.log("=======================\n");
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

export function createUserClient(authHeader: string) {
  return createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}

export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada nas Edge Functions.");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export function extractBearerToken(authHeader: string) {
  return String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

export function preflightResponse() {
  return new Response("ok", {
    status: 200,
    headers: corsHeaders
  });
}

export function methodNotAllowedResponse() {
  return jsonResponse({ error: "Metodo nao permitido." }, 405);
}

export async function requireAuthenticatedUser(authHeader: string) {
  console.log("=== REQUIRE AUTHENTICATED USER ===");
  console.log("Auth header presente:", !!authHeader);

  const token = extractBearerToken(authHeader);
  console.log("Token extraído (primeiros 20 chars):", token ? token.substring(0, 20) + "..." : "null");

  if (!token) {
    console.log("Token ausente");
    return {
      user: null,
      userClient: null,
      error: "Authorization header ausente."
    };
  }

  try {
    console.log("Tentando validar token com service client...");

    // Usar service client para validar o token
    const serviceClient = createServiceClient();

    const { data: userData, error: serviceError } = await serviceClient.auth.getUser(token);

    console.log("Resposta do service client:");
    console.log("- Error:", serviceError);
    console.log("- User presente:", !!userData?.user);
    if (userData?.user) {
      console.log("- User ID:", userData.user.id);
      console.log("- User email:", userData.user.email);
    }

    if (serviceError || !userData?.user) {
      console.log("Falha na validação com service client");
      return {
        user: null,
        userClient: createUserClient(`Bearer ${token}`),
        error: serviceError?.message || "Token inválido"
      };
    }

    console.log("Usuário validado com sucesso:", userData.user.id);

    // Criar userClient com o token válido
    const userClient = createUserClient(`Bearer ${token}`);

    return {
      user: userData.user,
      userClient,
      error: null
    };

  } catch (error) {
    console.log("Erro geral na validação:", error);
    return {
      user: null,
      userClient: null,
      error: `Erro interno: ${error.message}`
    };
  }
}

export async function requireSuperAdmin(authHeader: string) {
  const authResult = await requireAuthenticatedUser(authHeader);
  
  if (authResult.error || !authResult.user) {
    console.error("requireSuperAdmin: Auth failed -", authResult.error);
    return { ...authResult, serviceClient: null, profile: null, error: authResult.error };
  }

  console.log("requireSuperAdmin: User authenticated -", authResult.user.email);
  const serviceClient = createServiceClient();
  const isMasterAdminUser = authResult.user.email?.toLowerCase() === masterAdminEmail;
  console.log("requireSuperAdmin: isMasterAdminUser =", isMasterAdminUser, "masterAdminEmail =", masterAdminEmail);
  
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, email, global_role, status")
    .eq("id", authResult.user.id)
    .maybeSingle();

  console.log("requireSuperAdmin: Profile query -", { hasError: !!profileError, profileError: profileError?.message, profile });
  
  if (profileError) {
    const { data: fallbackProfile } = await serviceClient
      .from("profiles")
      .select("id, email")
      .eq("id", authResult.user.id)
      .maybeSingle();

    console.log("requireSuperAdmin: Using fallback profile -", fallbackProfile);
    
    if (isMasterAdminUser || fallbackProfile?.email?.toLowerCase() === masterAdminEmail) {
      return {
        ...authResult,
        serviceClient,
        profile: {
          id: authResult.user.id,
          email: authResult.user.email ?? fallbackProfile?.email ?? masterAdminEmail,
          global_role: "super_admin",
          status: "active"
        },
        error: null
      };
    }

    return { ...authResult, serviceClient, profile: null, error: profileError.message };
  }

  if (!profile && isMasterAdminUser) {
    console.log("requireSuperAdmin: Master admin without profile, creating virtual profile");
    return {
      ...authResult,
      serviceClient,
      profile: {
        id: authResult.user.id,
        email: authResult.user.email ?? masterAdminEmail,
        global_role: "super_admin",
        status: "active"
      },
      error: null
    };
  }

  if (!profile || profile.status !== "active") {
    console.error("requireSuperAdmin: No profile or inactive -", { profile, userEmail: authResult.user.email });
    return { ...authResult, serviceClient, profile, error: "Acesso restrito ao super admin." };
  }

  if (profile.global_role === "super_admin" || profile.email?.toLowerCase() === masterAdminEmail) {
    console.log("requireSuperAdmin: Access granted - super_admin");
    return { ...authResult, serviceClient, profile, error: null };
  }

  // Permite admin de barbearia (user_access.admin) e acessos de barbearia
  console.log("requireSuperAdmin: Checking user_access for admin role");
  const { data: accessData, error: accessError } = await serviceClient
    .from("user_access")
    .select("id")
    .eq("user_id", authResult.user.id)
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1);

  console.log("requireSuperAdmin: user_access check -", { hasError: !!accessError, accessError: accessError?.message, hasAccess: accessData?.length > 0 });
  
  if (!accessError && accessData?.length > 0) {
    console.log("requireSuperAdmin: Access granted - user has active admin role");
    return { ...authResult, serviceClient, profile, error: null };
  }

  console.error("requireSuperAdmin: Access denied - not super_admin nor barbershop admin");
  return { ...authResult, serviceClient, profile, error: "Acesso restrito ao super admin." };
}

export async function requireBarbershopAdmin(authHeader: string) {
  const authResult = await requireAuthenticatedUser(authHeader);
  
  if (authResult.error || !authResult.user) {
    console.error("requireBarbershopAdmin: Auth failed -", authResult.error);
    return { ...authResult, serviceClient: null, profile: null, error: authResult.error };
  }

  console.log("requireBarbershopAdmin: User authenticated -", authResult.user.email);
  const serviceClient = createServiceClient();
  const isMasterAdminUser = authResult.user.email?.toLowerCase() === masterAdminEmail;
  
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, email, global_role, status")
    .eq("id", authResult.user.id)
    .maybeSingle();

  if (profileError) {
    const { data: fallbackProfile } = await serviceClient
      .from("profiles")
      .select("id, email")
      .eq("id", authResult.user.id)
      .maybeSingle();

    if (isMasterAdminUser || fallbackProfile?.email?.toLowerCase() === masterAdminEmail) {
      console.log("requireBarbershopAdmin: Access granted - master admin");
      return {
        ...authResult,
        serviceClient,
        profile: {
          id: authResult.user.id,
          email: authResult.user.email ?? fallbackProfile?.email ?? masterAdminEmail,
          global_role: "super_admin",
          status: "active"
        },
        error: null
      };
    }

    return { ...authResult, serviceClient, profile: null, error: profileError.message };
  }

  if (!profile && isMasterAdminUser) {
    console.log("requireBarbershopAdmin: Access granted - master admin without profile");
    return {
      ...authResult,
      serviceClient,
      profile: {
        id: authResult.user.id,
        email: authResult.user.email ?? masterAdminEmail,
        global_role: "super_admin",
        status: "active"
      },
      error: null
    };
  }

  if (!profile || profile.status !== "active") {
    console.log("requireBarbershopAdmin: No active profile, checking barbershop admin access");
  } else {
    if (profile.global_role === "super_admin" || profile.email?.toLowerCase() === masterAdminEmail) {
      console.log("requireBarbershopAdmin: Access granted - super_admin profile");
      return { ...authResult, serviceClient, profile, error: null };
    }
  }

  // Verifica se é admin de barbearia
  console.log("requireBarbershopAdmin: Checking user_access for admin role");
  const { data: accessData, error: accessError } = await serviceClient
    .from("user_access")
    .select("id")
    .eq("user_id", authResult.user.id)
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1);

  if (!accessError && accessData?.length > 0) {
    console.log("requireBarbershopAdmin: Access granted - user has active admin role in barbershop");
    return { ...authResult, serviceClient, profile: profile || { id: authResult.user.id, email: authResult.user.email }, error: null };
  }

  if (accessError) {
    console.error("requireBarbershopAdmin: user_access query error -", accessError.message);
  } else {
    console.error("requireBarbershopAdmin: User has no admin role in any barbershop");
  }

  return { ...authResult, serviceClient, profile, error: "Acesso restrito. Voce deve ser super admin ou admin de uma barbearia." };
}

export async function insertAuditLog(serviceClient: ReturnType<typeof createServiceClient>, payload: {
  action: string;
  actor_id?: string | null;
  target_user_id?: string | null;
  target_barbershop_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await serviceClient.from("audit_logs").insert([{
    action: payload.action,
    actor_id: payload.actor_id ?? null,
    target_user_id: payload.target_user_id ?? null,
    target_barbershop_id: payload.target_barbershop_id ?? null,
    metadata: payload.metadata ?? {}
  }]);
}
