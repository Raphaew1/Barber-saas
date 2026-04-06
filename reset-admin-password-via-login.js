const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';
const EMAIL = 'raphacom.web@gmail.com';
const CURRENT_PASSWORD = 'Barber123!';
const NEW_PASSWORD = '123456';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('🔐 Fazendo login como admin para atualizar senha...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: CURRENT_PASSWORD
  });

  if (signInError) {
    console.error('❌ Falha ao autenticar com a senha atual:', signInError.message);
    process.exit(1);
  }

  const accessToken = signInData?.session?.access_token;
  if (!accessToken) {
    console.error('❌ Token de acesso não retornado após login.');
    process.exit(1);
  }

  console.log('✅ Login bem-sucedido. Atualizando senha para', NEW_PASSWORD);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    }
  });

  const { data: updateData, error: updateError } = await authClient.auth.updateUser({
    password: NEW_PASSWORD
  });

  if (updateError) {
    console.error('❌ Falha ao atualizar senha:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Senha atualizada com sucesso. Testando login com a nova senha...');

  const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: NEW_PASSWORD
  });

  if (testError) {
    console.error('⚠ Senha alterada, mas falha ao testar login:', testError.message);
    process.exit(1);
  }

  console.log('✅ Login com nova senha funcionando.');
  console.log('Email:', EMAIL);
  console.log('Nova senha:', NEW_PASSWORD);
}

main().catch((error) => {
  console.error('❌ Erro inesperado:', error.message || error);
  process.exit(1);
});