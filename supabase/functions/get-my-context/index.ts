import { jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";

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

    // Validação manual do token via API
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    // Fazer chamada direta para a API de validação
    const validationResponse = await fetch("https://kgpsfbuurggwmpcxrfpa.supabase.co/auth/v1/user", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ"
      }
    });

    if (!validationResponse.ok) {
      console.log("Token validation failed:", validationResponse.status);
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    const userData = await validationResponse.json();
    console.log("Token validado para user:", userData.id);

    // Agora buscar o contexto do usuário
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      "https://kgpsfbuurggwmpcxrfpa.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ"
    );

    // Buscar profile do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();

    if (profileError) {
      console.log("Erro ao buscar profile:", profileError);
      return jsonResponse({ error: "Erro ao buscar perfil" }, 500);
    }

    return jsonResponse({
      user: userData,
      profile: profile,
      context: {
        user_id: userData.id,
        email: userData.email,
        global_role: profile?.global_role,
        status: profile?.status
      }
    });

  } catch (error) {
    console.log("Erro geral:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
