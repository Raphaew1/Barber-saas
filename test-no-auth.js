async function testNoAuth() {
  console.log('=== Teste de Função Sem Autenticação ===\n');

  const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

  try {
    // Teste 1: Sem header Authorization
    console.log('1️⃣ Teste sem header Authorization:');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/test-no-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    console.log(`   Status: ${response1.status}`);
    const errorText1 = await response1.text();
    console.log(`   Resposta: ${errorText1}`);

    // Teste 2: Com header Authorization vazio
    console.log('\n2️⃣ Teste com header Authorization vazio:');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/test-no-auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': ''
      }
    });

    console.log(`   Status: ${response2.status}`);
    if (response2.ok) {
      const data = await response2.json();
      console.log('   ✅ Sucesso!');
      console.log('   Resposta:', data);
    } else {
      const errorText2 = await response2.text();
      console.log(`   ❌ Erro: ${errorText2}`);
    }

  } catch (error) {
    console.error('❌ Erro na chamada:', error.message);
  }
}

testNoAuth();