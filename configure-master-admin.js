/**
 * Script Node.js para configurar Master Admin
 * Execução: node configure-master-admin.js
 * 
 * Certifique-se de ter as variáveis de ambiente configuradas:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_ADMIN_EMAIL = 'raphacom.web@gmail.com';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada');
  console.error('   Configure a variável de ambiente antes de executar este script');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function configureMasterAdmin() {
  console.log('=== Configurando Master Admin ===');
  console.log(`Email: ${MASTER_ADMIN_EMAIL}`);
  console.log('');

  try {
    // 1. Buscar user_id
    console.log('1️⃣  Buscando user_id de', MASTER_ADMIN_EMAIL);
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Erro ao listar usuários: ${usersError.message}`);
    }

    const masterAdminUser = users.find(u => u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase());

    if (!masterAdminUser) {
      throw new Error(`Usuário ${MASTER_ADMIN_EMAIL} não encontrado no Supabase Auth`);
    }

    const userId = masterAdminUser.id;
    console.log(`   ✓ User ID encontrado: ${userId}`);
    console.log('');

    // 2. Atualizar/criar profile
    console.log('2️⃣  Configurando profile como super_admin...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        email: MASTER_ADMIN_EMAIL,
        global_role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' });

    if (profileError) {
      throw new Error(`Erro ao atualizar profile: ${profileError.message}`);
    }

    console.log('   ✓ Profile configurado como super_admin');
    console.log('');

    // 3. Verificar
    console.log('3️⃣  Verificando configuração...');
    const { data: profiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, global_role, status')
      .eq('email', MASTER_ADMIN_EMAIL)
      .single();

    if (verifyError) {
      throw new Error(`Erro ao verificar: ${verifyError.message}`);
    }

    console.log('   ✓ Verificado com sucesso!');
    console.log('   Resultado:', JSON.stringify(profiles, null, 2));
    console.log('');

    // 4. Adicionar acesso a todas as barbearias
    console.log('4️⃣  Adicionando acesso admin a todas as barbearias...');
    
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1000);

    if (barbershopsError && barbershopsError.code !== 'PGRST116') {
      console.warn('   ⚠ Aviso:', barbershopsError.message);
    } else if (barbershops && barbershops.length > 0) {
      const userAccessData = barbershops.map(bs => ({
        user_id: userId,
        barbershop_id: bs.id,
        role: 'admin',
        status: 'active',
        approved_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: accessError } = await supabase
        .from('user_access')
        .upsert(userAccessData, { onConflict: 'user_id,barbershop_id' });

      if (accessError && accessError.code !== 'PGRST116') {
        console.warn('   ⚠ Aviso ao adicionar acesso:', accessError.message);
      } else if (!accessError) {
        console.log(`   ✓ Acesso adicionado a ${barbershops.length} barbearia(s)`);
      }
    } else {
      console.log('   ✓ Nenhuma barbearia encontrada (tabela vazia)');
    }

    console.log('');
    console.log('=== ✅ CONCLUSÃO ===');
    console.log(`${MASTER_ADMIN_EMAIL} agora é master admin com permissões globais!`);
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Faça login no portal com', MASTER_ADMIN_EMAIL);
    console.log('2. Atualize a página (F5)');
    console.log('3. Tente criar uma barbearia novamente');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

configureMasterAdmin();
