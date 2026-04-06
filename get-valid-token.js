/**
 * Script para obter e testar um access token válido
 * Execução: node get-valid-token.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';
const EMAIL = 'raphacom.web@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function getAndTestToken() {
  console.log('=== Obter Token de Acesso ===\n');
  
  try {
    // 1. Pedir senha
    console.log(`Email: ${EMAIL}`);
    const password = await question('Digite sua senha: ');
    
    if (!password) {
      console.log('❌ Senha vazia');
      process.exit(1);
    }

    rl.close();

    // 2. Login
    console.log('\n1️⃣  Fazendo login...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: password
    });

    if (authError) {
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }

    const accessToken = authData.session.access_token;
    console.log('✓ Login realizado com sucesso\n');

    // 3. Salvar token em arquivo
    const tokenFile = 'access-token.txt';
    fs.writeFileSync(tokenFile, accessToken);
    console.log(`✓ Token salvo em: ${tokenFile}`);
    console.log(`\n📋 Token (primeiros 50 caracteres):`);
    console.log(accessToken.substring(0, 50) + '...\n');

    // 4. Testar token com get-my-context
    console.log('2️⃣  Testando token com get-my-context...');
    
    const contextResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-my-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({})
    });

    const contextData = await contextResponse.json();
    
    if (!contextResponse.ok) {
      console.log('❌ Erro:', contextData.error);
      return;
    }

    console.log('✓ Context recebido:');
    console.log(`  - Email: ${contextData.context?.email}`);
    console.log(`  - Global Role: ${contextData.context?.global_role}`);
    console.log(`  - Status: ${contextData.context?.status}\n`);

    // 5. Mostrar como usar o token
    console.log('=== Para testar create-barbershop ===\n');
    console.log('Execute este comando em outro terminal:\n');
    console.log(`set TOKEN=${accessToken}`);
    console.log('node test-barbershop-with-token.js\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

getAndTestToken();
