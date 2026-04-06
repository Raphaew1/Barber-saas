/**
 * Teste de criação de barbearia diretamente via API REST
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function testDirectBarbershopCreation() {
  console.log('=== Teste de Criação Direta de Barbearia ===\n');

  try {
    // Ler token
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Headers para requests autenticadas
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY
    };

    // 1. Verificar se podemos ler da tabela barbershops
    console.log('2️⃣  Verificando acesso à tabela barbershops...');
    const readResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?limit=1`, {
      method: 'GET',
      headers
    });

    console.log(`   Status da leitura: ${readResponse.status}`);
    if (readResponse.ok) {
      const data = await readResponse.json();
      console.log('   ✅ Acesso de leitura OK');
    } else {
      const error = await readResponse.text();
      console.log('   ❌ Erro na leitura:', error);
      return;
    }

    // 2. Tentar criar barbearia apenas com name
    console.log('\n3️⃣  Tentando criar barbearia apenas com name...');

    // Dados com nome único
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const barbershopData = {
      name: `Barbearia CorteFácil - ${timestamp}`
    };

    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbershops`, {
      method: 'POST',
      headers,
      body: JSON.stringify(barbershopData)
    });

    console.log(`   Status da criação: ${createResponse.status}`);

    if (createResponse.ok) {
      const createdData = await createResponse.json();
      console.log('   ✅ Barbearia criada com sucesso!');
      console.log('   Dados:', createdData);
      console.log('\n🎉 Parabéns! Sua barbearia foi criada com sucesso!');
      console.log('📍 Nome da barbearia:', createdData.name);
      console.log('🆔 ID da barbearia:', createdData.id);
    } else {
      const error = await createResponse.text();
      console.log('   ❌ Erro na criação:', error);
      console.log('   Isso confirma que há políticas RLS ou triggers que impedem a criação');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testDirectBarbershopCreation();