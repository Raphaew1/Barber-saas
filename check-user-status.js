const https = require('https');
const { URL } = require('url');

console.log('🔍 Verificando usuário no Supabase Auth...\n');

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

// Verificar se o usuário existe no auth.users
async function checkAuthUser() {
  console.log('🔍 Verificando se o usuário existe no Supabase Auth...');

  try {
    // Usar RPC para consultar auth.users (precisa de service role)
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/get_auth_user`, {
      method: 'POST'
    }, {
      user_id: '2115dd42-ea92-4525-8449-322073b49e62'
    });

    if (response.statusCode === 200 && response.body) {
      console.log('✅ Usuário encontrado no Auth!');
      console.log(`   ID: ${response.body.id || 'N/A'}`);
      console.log(`   Email: ${response.body.email || 'N/A'}`);
      console.log(`   Criado em: ${response.body.created_at || 'N/A'}\n`);
      return true;
    } else {
      console.log('❌ Usuário NÃO encontrado no Supabase Auth\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar usuário no Auth:', error.message);
    console.log('   (Isso pode indicar que o usuário não existe)\n');
    return false;
  }
}

// Verificar perfil na tabela profiles
async function checkProfile() {
  console.log('🔍 Verificando perfil na tabela profiles...');

  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?id=eq.2115dd42-ea92-4525-8449-322073b49e62&select=*`, {
      method: 'GET'
    });

    if (response.statusCode === 200 && response.body && response.body.length > 0) {
      const profile = response.body[0];
      console.log('✅ Perfil encontrado na tabela!');
      console.log(`   ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.global_role}`);
      console.log(`   Status: ${profile.status}\n`);
      return true;
    } else {
      console.log('❌ Perfil NÃO encontrado na tabela profiles\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar perfil:', error.message, '\n');
    return false;
  }
}

// Executar verificações
async function main() {
  console.log('🚀 Verificando status do usuário...\n');

  const authExists = await checkAuthUser();
  const profileExists = await checkProfile();

  console.log('📋 Status atual:');
  console.log(`   Usuário no Auth: ${authExists ? '✅ Existe' : '❌ Não existe'}`);
  console.log(`   Perfil no banco: ${profileExists ? '✅ Existe' : '❌ Não existe'}\n`);

  if (!authExists) {
    console.log('🔧 SOLUÇÃO: Criar usuário no Supabase Auth\n');
    console.log('📋 Passos para resolver:');
    console.log('1. Acesse: https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/auth/users');
    console.log('2. Clique em "Add user"');
    console.log('3. Preencha:');
    console.log('   - Email: raphacom.web@gmail.com');
    console.log('   - Password: [escolha uma senha segura]');
    console.log('   - User UID: 2115dd42-ea92-4525-8449-322073b49e62');
    console.log('4. Marque "Auto confirm user"');
    console.log('5. Clique em "Create user"\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('   - Anote a senha que você escolher!');
    console.log('   - Use esta senha para fazer login no app\n');

    if (profileExists) {
      console.log('✅ O perfil no banco já está configurado como super_admin');
      console.log('   Depois de criar o usuário no Auth, você poderá logar!\n');
    }
  } else if (authExists && profileExists) {
    console.log('🎉 Tudo está configurado! Tente fazer login novamente.\n');
    console.log('🔐 Use:');
    console.log('   Email: raphacom.web@gmail.com');
    console.log('   Senha: [a senha que você definiu]\n');
  } else {
    console.log('⚠️  Situação inconsistente. Execute o SQL novamente:');
    console.log('   https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql\n');
    console.log('   Use o conteúdo do arquivo create-tables.sql\n');
  }
}

main().catch(console.error);