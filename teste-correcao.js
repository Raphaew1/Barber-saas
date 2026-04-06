const https = require('https');
const { URL } = require('url');

console.log('🧪 Testando acesso ao Supabase após correções...\n');

// Configurações do Supabase
const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

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

// Testar se as tabelas existem
async function testTables() {
  console.log('🔍 Testando tabelas...');

  try {
    // Testar profiles
    const profilesResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,global_role&limit=5`, {
      method: 'GET'
    });

    if (profilesResponse.statusCode === 200) {
      console.log('✅ Tabela profiles: OK');
      if (profilesResponse.body && profilesResponse.body.length > 0) {
        console.log(`   Encontrados ${profilesResponse.body.length} perfis`);
        const superAdmin = profilesResponse.body.find(p => p.global_role === 'super_admin');
        if (superAdmin) {
          console.log(`   ✅ Super admin encontrado: ${superAdmin.email}`);
        }
      }
    } else {
      console.log('❌ Tabela profiles: Problema');
      console.log(`   Status: ${profilesResponse.statusCode}`);
    }

    // Testar barbershops
    const barbershopsResponse = await makeRequest(`${SUPABASE_URL}/rest/v1/barbershops?select=id,name&limit=5`, {
      method: 'GET'
    });

    if (barbershopsResponse.statusCode === 200) {
      console.log('✅ Tabela barbershops: OK');
      if (barbershopsResponse.body && barbershopsResponse.body.length > 0) {
        console.log(`   Encontradas ${barbershopsResponse.body.length} barbearias`);
      }
    } else {
      console.log('❌ Tabela barbershops: Problema');
      console.log(`   Status: ${barbershopsResponse.statusCode}`);
    }

    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Erro ao testar tabelas:', error.message, '\n');
    return false;
  }
}

// Testar criação de barbearia (simular)
async function testBarbershopCreation() {
  console.log('🔍 Testando criação de barbearia...');

  try {
    const testData = {
      name: 'Barbearia Teste ' + Date.now(),
      description: 'Teste automático',
      email: 'teste@teste.com',
      plan_code: 'free',
      status: 'active'
    };

    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/barbershops`, {
      method: 'POST'
    }, testData);

    if (response.statusCode === 201) {
      console.log('✅ Criação de barbearia: OK');
      console.log(`   Criada barbearia: ${testData.name}`);
    } else {
      console.log('❌ Criação de barbearia: Problema');
      console.log(`   Status: ${response.statusCode}`);
      if (response.body) {
        console.log(`   Erro: ${JSON.stringify(response.body)}`);
      }
    }

    console.log('');
    return response.statusCode === 201;
  } catch (error) {
    console.log('❌ Erro ao testar criação:', error.message, '\n');
    return false;
  }
}

// Executar testes
async function main() {
  console.log('🚀 Iniciando testes...\n');

  const tablesOk = await testTables();
  const creationOk = await testBarbershopCreation();

  console.log('📋 Resultado dos testes:');
  console.log(`   Tabelas funcionais: ${tablesOk ? '✅' : '❌'}`);
  console.log(`   Criação de barbearia: ${creationOk ? '✅' : '❌'}`);

  if (tablesOk && creationOk) {
    console.log('\n🎉 Tudo funcionando! Você já pode usar o sistema.\n');
    console.log('🔐 Faça login com:');
    console.log('   Email: raphacom.web@gmail.com');
    console.log('   Senha: [sua senha normal]\n');
  } else {
    console.log('\n⚠️  Ainda há problemas. Verifique:');
    if (!tablesOk) {
      console.log('   - Execute o SQL no dashboard do Supabase');
      console.log('   - Verifique as instruções em INSTRUCOES-CORRECAO.md');
    }
    if (!creationOk) {
      console.log('   - Verifique as políticas RLS');
      console.log('   - Confirme se o perfil está como super_admin');
    }
    console.log('');
  }
}

main().catch(console.error);