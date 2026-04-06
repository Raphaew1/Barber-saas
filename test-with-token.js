/**
 * Script para testar criação de barbearia com token já salvo
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function testCreateBarbershop() {
  console.log('=== Teste de Criação de Barbearia ===\n');

  try {
    // Ler token do arquivo
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado do arquivo');
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
      console.log(`❌ Erro na função get-my-context: ${contextResponse.status}`);
      console.log('Resposta:', contextData);
      return;
    }

    console.log('✓ Contexto obtido:');
    console.log('  - User ID:', contextData.user?.id);
    console.log('  - Email:', contextData.user?.email);
    console.log('  - Global Role:', contextData.profile?.global_role);
    console.log('  - Status:', contextData.profile?.status);
    console.log('');

    // 3. Tentar criar barbearia
    console.log('3️⃣  Tentando criar barbearia...');

    const barbershopData = {
      name: 'Barbearia Teste Automático',
      description: 'Barbearia criada via script de teste',
      address: 'Rua Teste, 123',
      phone: '(11) 99999-9999',
      email: 'teste@barbearia.com',
      working_hours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '08:00', close: '16:00' },
        sunday: { open: null, close: null }
      }
    };

    const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-barbershop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(barbershopData)
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.log(`❌ Erro na criação da barbearia: ${createResponse.status}`);
      console.log('Resposta:', createData);
      return;
    }

    console.log('✅ Barbearia criada com sucesso!');
    console.log('Dados da barbearia:', createData);

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testCreateBarbershop();