const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';
const EMAIL = 'raphacom.web@gmail.com';
const PASSWORD = '123456';

async function testLogin() {
  console.log('=== Teste de Login ===\n');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('1️⃣  Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });

    if (authError) {
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }

    const accessToken = authData.session.access_token;
    console.log('✓ Login realizado com sucesso\n');
    console.log('Token (primeiros 50 caracteres):');
    console.log(accessToken.substring(0, 50) + '...\n');

    // Testar get-my-context
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
    
    console.log(`Status: ${contextResponse.status}`);
    if (contextResponse.ok && contextData.context) {
      console.log('✓ Contexto obtido:');
      console.log(`  - Email: ${contextData.context.email}`);
      console.log(`  - Global Role: ${contextData.context.global_role}`);
      console.log(`  - Status: ${contextData.context.status}\n`);
    } else {
      console.log('❌ Erro ao obter contexto:', contextData.error, '\n');
    }

    // Testar create-barbershop
    console.log('3️⃣  Testando criação de barbearia...\n');
    
    const timestamp = new Date().getTime();
    const barbershopPayload = {
      name: `Barbearia Teste ${timestamp}`,
      email: `teste-${timestamp}@example.com`,
      phone: '(11) 98765-4321',
      location: 'Rua de Testes, 123',
      ownerEmail: `owner-${timestamp}@example.com`,
      ownerPassword: 'SenhaTest@123',
      planCode: 'free',
      status: 'active'
    };

    console.log('Enviando payload:');
    console.log(JSON.stringify(barbershopPayload, null, 2), '\n');

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
    console.log('Resposta:');
    console.log(JSON.stringify(createData, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testLogin();
