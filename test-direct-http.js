/**
 * Teste direto da função get-my-context via HTTP
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function testDirectCall() {
  console.log('=== Teste Direto da Função get-my-context ===\n');

  try {
    // Ler token
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Fazer chamada direta
    console.log('2️⃣  Fazendo chamada HTTP direta...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-my-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({})
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`Resposta:`, responseText);

    if (response.ok) {
      console.log('✅ Função executada com sucesso!');
    } else {
      console.log('❌ Erro na função');
    }

  } catch (error) {
    console.error('❌ Erro na chamada:', error.message);
  }
}

testDirectCall();