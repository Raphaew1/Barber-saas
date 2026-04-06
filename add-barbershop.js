const https = require('https');
const { URL } = require('url');

console.log('🏪 Cadastrando nova barbearia...\n');

// Configurações do Supabase
const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY';

// SQL para cadastrar a barbearia
const SQL_SCRIPT = `
INSERT INTO public.barbershops (
  name, 
  description, 
  email, 
  phone, 
  address, 
  owner_id, 
  plan_code, 
  status,
  created_at,
  updated_at
)
VALUES (
  'Espanha barber',
  'Barbearia premium',
  'espanha@barbershop.com',
  '(11) 98765-4321',
  'São Paulo, SP',
  '2115dd42-ea92-4525-8449-322073b49e62',
  'free',
  'active',
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  status = 'active',
  updated_at = now()
RETURNING id, name, status, created_at;
`;

console.log('📝 SQL preparado para execução...\n');

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

// Função para executar SQL
async function executeSql(sql) {
  console.log('🔄 Executando SQL no Supabase...');

  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST'
    }, {
      query: sql
    });

    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('✅ SQL executado com sucesso!\n');
      return true;
    } else {
      console.log('❌ Erro na resposta:', response.statusCode, response.body);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao executar SQL:', error.message);
    return false;
  }
}

// Executar o script
async function main() {
  const success = await executeSql(SQL_SCRIPT.trim());

  if (success) {
    console.log('🎉 Barbearia cadastrada com sucesso!\n');

    console.log('📋 Detalhes do cadastro:');
    console.log('  ✓ Nome: Espanha barber');
    console.log('  ✓ Descrição: Barbearia premium');
    console.log('  ✓ Email: espanha@barbershop.com');
    console.log('  ✓ Telefone: (11) 98765-4321');
    console.log('  ✓ Endereço: São Paulo, SP');
    console.log('  ✓ Plano: free');
    console.log('  ✓ Status: active\n');

    console.log('🔍 A barbearia já está disponível para uso no sistema!');
  } else {
    console.log('\n❌ Falha ao cadastrar a barbearia. Tente executar manualmente no dashboard:');
    console.log('   https://app.supabase.com/project/kgpsfbuurggwmpcxrfpa/sql\n');
    console.log('📄 SQL para colar:');
    console.log(SQL_SCRIPT.trim());
  }
}

main().catch(console.error);
