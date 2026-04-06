const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY';
const ADMIN_EMAIL = 'raphacom.web@gmail.com';
const NEW_PASSWORD = '123456';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY faltando. Defina a variável de ambiente ou ajuste o script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔐 Alterando senha do admin...');
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Erro ao listar usuários:', listError.message);
    process.exit(1);
  }

  const adminUser = (listData?.users || []).find((user) => String(user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (!adminUser) {
    console.error(`❌ Usuário ${ADMIN_EMAIL} não encontrado no Auth.`);
    process.exit(1);
  }

  console.log(`✅ Usuário encontrado: ${adminUser.id}`);

  const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
    password: NEW_PASSWORD
  });

  if (updateError) {
    console.error('❌ Erro ao alterar senha:', updateError.message);
    process.exit(1);
  }

  console.log(`✅ Senha atualizada para ${NEW_PASSWORD}`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: NEW_PASSWORD
  });

  if (authError) {
    console.warn('⚠ Senha atualizada, mas falha ao testar login:', authError.message);
    process.exit(0);
  }

  if (authData?.user) {
    console.log('✅ Login de teste bem-sucedido. Agora você pode usar a nova senha.');
  } else {
    console.warn('⚠ Senha atualizada, mas o login de teste não retornou usuário.');
  }
}

main().catch((error) => {
  console.error('❌ Erro inesperado:', error.message || error);
  process.exit(1);
});