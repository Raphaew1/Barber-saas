/**
 * Script para verificar se o profile foi criado como super_admin
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkProfile() {
  console.log('=== Verificando Profile de raphacom.web@gmail.com ===\n');

  try {
    // 1. Buscar user_id do auth
    console.log('1️⃣ Buscando user_id no auth...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Erro ao listar usuários: ${usersError.message}`);
    }

    const user = users.find(u => u.email?.toLowerCase() === 'raphacom.web@gmail.com');

    if (!user) {
      throw new Error('Usuário raphacom.web@gmail.com não encontrado');
    }

    console.log(`✓ User ID: ${user.id}`);
    console.log(`✓ Email: ${user.email}`);
    console.log('');

    // 2. Buscar profile na tabela profiles
    console.log('2️⃣ Buscando profile na tabela profiles...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, global_role, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Erro ao buscar profile:', profileError.message);
      console.log('   O profile ainda NÃO foi criado!');
      console.log('');
      console.log('   Criando profile agora...');

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          global_role: 'super_admin',
          status: 'active'
        }]);

      if (insertError) {
        throw new Error(`Erro ao criar profile: ${insertError.message}`);
      }

      console.log('✓ Profile criado com sucesso!');
      console.log('');

      // Verificar se foi criado
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id, email, global_role, status')
        .eq('id', user.id)
        .single();

      console.log('✓ Verificação final:');
      console.log(`  - ID: ${newProfile.id}`);
      console.log(`  - Email: ${newProfile.email}`);
      console.log(`  - Global Role: ${newProfile.global_role}`);
      console.log(`  - Status: ${newProfile.status}`);
    } else {
      console.log('✓ Profile encontrado:');
      console.log(`  - ID: ${profile.id}`);
      console.log(`  - Email: ${profile.email}`);
      console.log(`  - Global Role: ${profile.global_role}`);
      console.log(`  - Status: ${profile.status}`);
      console.log('');

      if (profile.global_role !== 'super_admin') {
        console.log('⚠ AVISO: Profile existe mas global_role NÃO é super_admin!');
        console.log('  Atualizando...');

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            global_role: 'super_admin',
            status: 'active'
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar: ${updateError.message}`);
        }

        console.log('✓ Profile atualizado para super_admin!');
      } else if (profile.status !== 'active') {
        console.log('⚠ AVISO: Profile é super_admin mas status NÃO é active!');
        console.log('  Atualizando...');

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar: ${updateError.message}`);
        }

        console.log('✓ Profile status atualizado para active!');
      } else {
        console.log('✅ Profile está CORRETO! (super_admin + active)');
      }
    }

    console.log('\n=== CONCLUSÃO ===');
    console.log('✅ raphacom.web@gmail.com agora é super_admin!');
    console.log('\nPróximos passos:');
    console.log('1. Faça logout do app (http://localhost:5500)');
    console.log('2. Faça login novamente');
    console.log('3. Atualize a página (F5)');
    console.log('4. Tente criar uma barbearia');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkProfile();
