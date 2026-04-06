/**
 * Script para testar criação de barbearia com um token válido
 * Execução: node test-barbershop-with-token.js
 * 
 * Primeiro execute: node get-valid-token.js
 * para obter um token válido
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwOTcwMjQwMCwiZXhwIjoxODY3NDY4NDAwfQ.I3ZJI65Hh1w7vDZLWKHU1cWYL8K5F4vKhXqNrZvDy0c';

async function testCreateBarbershop() {
  console.log('=== Teste de Criação de Barbearia ===\n');
  
  try {
    // 1. Obter token de arquivo ou variável de ambiente
    let accessToken = process.env.TOKEN;
    
    if (!accessToken && fs.existsSync('access-token.txt')) {
      accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    }

    if (!accessToken) {
      console.log('❌ Token não encontrado');
      console.log('\nExecute primeiro: node get-valid-token.js');
      process.exit(1);
    }

    console.log('📋 Token encontrado (primeiros 50 caracteres):');
    console.log(accessToken.substring(0, 50) + '...\n');

    // 2. Verificar contexto
    console.log('1️⃣  Verificando contexto do usuário...');
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
      console.log('❌ Erro ao obter contexto:', contextData.error);
      return;
    }

    console.log('✓ Contexto:');
    console.log(`  - Email: ${contextData.context?.email}`);
    console.log(`  - Global Role: ${contextData.context?.global_role}`);
    console.log(`  - Status: ${contextData.context?.status}\n`);

    // 3. Criar barbearia de teste
    console.log('2️⃣  Criando barbearia de teste...\n');
    
    const timestamp = new Date().getTime();
    const barbershopPayload = {
      name: `Test Barbershop ${timestamp}`,
      email: `test-${timestamp}@example.com`,
      phone: '(11) 98765-4321',
      location: 'Test Location',
      ownerEmail: `owner-${timestamp}@example.com`,
      ownerPassword: 'TestPassword@123',
      planCode: 'free',
      status: 'active'
    };

    console.log('Payload sendo enviado:');
    console.log(JSON.stringify(barbershopPayload, null, 2));
    console.log('');

    const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-barbershop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(barbershopPayload)
    });

    const createData = await createResponse.json();

    console.log(`Status HTTP: ${createResponse.status}`);
    console.log('');

    if (!createResponse.ok) {
      console.log('❌ Erro ao criar barbearia:');
      console.log('Resposta:', JSON.stringify(createData, null, 2));
      
      // Tentar mostrar logs
      console.log('\n📋 Para ver os logs completos da função edge:');
      console.log('1. Abra: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/functions');
      console.log('2. Clique em "create-barbershop"');
      console.log('3. Vá em "Invocations" para ver os logs');
      return;
    }

    console.log('✅ SUCESSO! Barbearia criada com sucesso!\n');
    console.log('Detalhes da barbearia:');
    console.log(`  - ID: ${createData.barbershop?.id}`);
    console.log(`  - Nome: ${createData.barbershop?.name}`);
    console.log(`  - Email: ${createData.barbershop?.email}`);
    console.log(`  - Plano: ${createData.barbershop?.plan_code}`);
    console.log(`  - Status: ${createData.barbershop?.status}`);
    console.log(`  - Dono URL: ${createData.barbershop?.owner_user_id}`);
    
    if (createData.ownerInviteToken) {
      console.log(`  - Token de convite: ${createData.ownerInviteToken}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testCreateBarbershop();
