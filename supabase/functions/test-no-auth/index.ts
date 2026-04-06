import { jsonResponse, methodNotAllowedResponse, preflightResponse } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  if (request.method !== "GET") {
    return methodNotAllowedResponse();
  }

  try {
    console.log("Função de teste executada!");
    return jsonResponse({
      message: "Teste de função sem autenticação",
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});