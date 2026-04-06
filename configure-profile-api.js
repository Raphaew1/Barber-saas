/**
 * Script para configurar o perfil do usuário como super_admin via REST API
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function configureSuperAdmin() {
  console.log('=== Configurando Perfil Super Admin ===\n');

  try {
    // Ler token do arquivo
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Headers para as requests
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY
    };

    // 1. Verificar perfil existente
    console.log('2️⃣  Verificando perfil existente...');
    const selectResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.raphacom.web@gmail.com`, {
      method: 'GET',
      headers
    });

    const existingProfiles = await selectResponse.json();

    if (existingProfiles && existingProfiles.length > 0) {
      const profile = existingProfiles[0];
      console.log('Perfil encontrado:', profile);
      if (profile.global_role === 'super_admin') {
        console.log('✅ Usuário já é super_admin!');
        return;
      }
    }

    // 2. Inserir/atualizar perfil como super_admin
    console.log('3️⃣  Configurando como super_admin...');

    const profileData = {
      id: '2115dd42-ea92-4525-8449-322073b49e62',
      email: 'raphacom.web@gmail.com',
      global_role: 'super_admin',
      status: 'active'
    };

    const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData)
    });

    const upsertResult = await upsertResponse.json();

    if (!upsertResponse.ok) {
      console.log('❌ Erro ao configurar perfil:', upsertResult);
      // Tentar UPDATE se INSERT falhar
      console.log('Tentando UPDATE...');
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.2115dd42-ea92-4525-8449-322073b49e62`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          global_role: 'super_admin',
          status: 'active',
          email: 'raphacom.web@gmail.com'
        })
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        console.log('❌ Erro no UPDATE também:', updateResult);
        return;
      }

      console.log('✅ Perfil atualizado via PATCH!');
      console.log('Resultado:', updateResult);
    } else {
      console.log('✅ Perfil inserido/atualizado com sucesso!');
      console.log('Resultado:', upsertResult);
    }

    // 3. Verificar configuração final
    console.log('4️⃣  Verificando configuração final...');
    const finalResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.raphacom.web@gmail.com`, {
      method: 'GET',
      headers
    });

    const finalProfiles = await finalResponse.json();

    if (finalProfiles && finalProfiles.length > 0) {
      const profile = finalProfiles[0];
      console.log('✅ Perfil final:');
      console.log('  - ID:', profile.id);
      console.log('  - Email:', profile.email);
      console.log('  - Global Role:', profile.global_role);
      console.log('  - Status:', profile.status);
    } else {
      console.log('❌ Perfil não encontrado após configuração');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

configureSuperAdmin();