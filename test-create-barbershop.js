/**
 * Script de teste para criar barbearia com raphacom.web@gmail.com
 * Execução: node test-create-barbershop.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

const EMAIL = 'raphacom.web@gmail.com';
const PASSWORD = 'Barbershop@123'; // Você precisará informar a senha

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCreateBarbershop() {
  console.log('=== Teste de Criação de Barbearia ===\n');
  
  try {
    // 1. Login
    console.log('1️⃣  Fazendo login com', EMAIL);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });

    if (authError) {
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }

    const accessToken = authData.session.access_token;
    console.log('   ✓ Login realizado com sucesso');
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    console.log('');

    // 2. Verificar contexto do usuário
    console.log('2️⃣  Verificando contexto do usuário...');
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
      console.log('   ⚠ Aviso ao obter contexto:', contextData.error);
    } else {
      console.log('   ✓ Contexto obtido:');
      console.log(`     - Email: ${contextData.context?.email}`);
      console.log(`     - Global Role: ${contextData.context?.global_role}`);
      console.log(`     - Status: ${contextData.context?.status}`);
    }
    console.log('');

    // 3. Criar barbearia
    console.log('3️⃣  Criando barbearia de teste...');
    
    const barbershopPayload = {
      name: `Barbearia Teste ${new Date().getTime()}`,
      email: 'contato@teste.com',
      phone: '(11) 99999-9999',
      location: 'Rua Teste, 123',
      ownerEmail: 'owner@teste.com',
      ownerPassword: 'Senha@123',
      planCode: 'free',
      status: 'active'
    };

    console.log('   Payload:', JSON.stringify(barbershopPayload, null, 2));
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

    if (!createResponse.ok) {
      console.log('   ❌ Erro ao criar barbearia:');
      console.log('   Status:', createResponse.status);
      console.log('   Erro:', createData.error);
      console.log('');
      console.log('   Resposta completa:', JSON.stringify(createData, null, 2));
      return;
    }

    console.log('   ✅ Barbearia criada com sucesso!');
    console.log('   ID:', createData.barbershop?.id);
    console.log('   Nome:', createData.barbershop?.name);
    console.log('   Plano:', createData.barbershop?.plan_code);
    console.log('   Status:', createData.barbershop?.status);
    
    if (createData.ownerInviteToken) {
      console.log('   Token de convite do proprietário:', createData.ownerInviteToken);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Se PASSWORD não foi definida, pedir ao usuário
if (PASSWORD === 'Barbershop@123') {
  console.log('⚠ AVISO: Você precisa definir a senha correta no script');
  console.log('Abra este arquivo e substitua PASSWORD by sua senha real');
  console.log('');
  console.log('Ou execute com a variável de ambiente:');
  console.log('set MASTER_PASSWORD=SuaSenha && node test-create-barbershop.js');
  process.exit(1);
}

testCreateBarbershop();
