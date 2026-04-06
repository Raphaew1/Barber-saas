const https = require('https');
const { URL } = require('url');

console.log('🔧 Corrigindo acesso ao Supabase...\n');

// Configurações do Supabase
const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY';

// Função para fazer requisições HTTP
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Verificar se a tabela profiles existe
async function checkTableExists() {
  console.log('🔍 Verificando se a tabela profiles existe...');

  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      method: 'GET'
    });

    if (response.statusCode === 200) {
      console.log('✅ Tabela profiles existe\n');
      return true;
    } else {
      console.log('❌ Tabela profiles não existe ou não é acessível\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar tabela:', error.message, '\n');
    return false;
  }
}

// Configurar perfil do usuário como super_admin
async function configureSuperAdmin() {
  console.log('👑 Configurando perfil como super_admin...');

  const profileData = {
    id: '2115dd42-ea92-4525-8449-322073b49e62',
    email: 'raphacom.web@gmail.com',
    global_role: 'super_admin',
    status: 'active'
  };

  try {
    // Primeiro tentar fazer upsert
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates'
      }
    }, profileData);

    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ Perfil configurado como super_admin com sucesso!\n');
      return true;
    } else {
      console.log('❌ Erro ao configurar perfil:', response.statusCode, response.body, '\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao configurar perfil:', error.message, '\n');
    return false;
  }
}

// Verificar configuração
async function verifyConfiguration() {
  console.log('🔍 Verificando configuração...');

  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?id=eq.2115dd42-ea92-4525-8449-322073b49e62&select=*`, {
      method: 'GET'
    });

    if (response.statusCode === 200 && response.body && response.body.length > 0) {
      const profile = response.body[0];
      console.log('✅ Perfil encontrado:');
      console.log(`   ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.global_role}`);
      console.log(`   Status: ${profile.status}\n`);
      return true;
    } else {
      console.log('❌ Perfil não encontrado ou erro na consulta\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar configuração:', error.message, '\n');
    return false;
  }
}

// Executar correções
async function main() {
  console.log('🚀 Iniciando processo de correção...\n');

  // Verificar tabela
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log('⚠️  A tabela profiles pode não existir. Você precisa criar as tabelas primeiro.\n');
    console.log('📋 Execute este SQL no dashboard do Supabase:');
    console.log('   https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql\n');
    console.log('SQL:');
    console.log(`
-- Criar tabela profiles se não existir
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  phone text,
  global_role text not null default 'user',
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Política básica para super admins
drop policy if exists "Super admins can manage profiles" on public.profiles;
create policy "Super admins can manage profiles" on public.profiles
  for all using (global_role = 'super_admin');
    `);
    return;
  }

  // Configurar super admin
  const configured = await configureSuperAdmin();
  if (!configured) {
    console.log('❌ Falha ao configurar super_admin\n');
    return;
  }

  // Verificar configuração
  const verified = await verifyConfiguration();
  if (verified) {
    console.log('🎉 Correções aplicadas com sucesso!\n');
    console.log('🔐 Agora você deve conseguir logar novamente!');
    console.log('   Email: raphacom.web@gmail.com');
    console.log('   Role: super_admin\n');
    console.log('🧪 Teste o acesso executando:');
    console.log('   node test-now.js\n');
  } else {
    console.log('❌ Verificação falhou. Tente novamente ou execute manualmente.\n');
  }
}

main().catch(console.error);