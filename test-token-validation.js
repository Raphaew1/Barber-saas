/**
 * Teste da validação do token JWT diretamente na API do Supabase
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function testTokenValidation() {
  console.log('=== Teste de Validação do Token JWT ===\n');

  try {
    // Ler token
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Testar validação direta na API do Supabase
    console.log('2️⃣  Testando validação direta na API...');

    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Token válido!');
      console.log('User ID:', userData.id);
      console.log('Email:', userData.email);
    } else {
      const errorData = await response.json();
      console.log('❌ Token inválido:', errorData);
    }

    // Testar com o client Supabase
    console.log('\n3️⃣  Testando com Supabase client...');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Tentar definir o auth
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: null // Não temos refresh token
    });

    if (sessionError) {
      console.log('❌ Erro ao definir sessão:', sessionError);
    } else {
      console.log('✅ Sessão definida com sucesso');
    }

    // Tentar getUser
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.log('❌ Erro ao obter usuário:', userError);
    } else {
      console.log('✅ Usuário obtido:', userData.user?.email);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testTokenValidation();