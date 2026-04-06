/**
 * Script para configurar os secrets das funções edge
 * Execução: node setup-function-secrets.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmd3bXBjeHJmcGEiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA5NzAyNDAwLCJleHAiOjE4Njc0Njg0MDB9.5aCVplK1T5V1BsZl6p4z3eV-8YvmXIZK5NvGTlUZ5DY';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function setupSecrets() {
  console.log('=== Configurando Secrets das Funções Edge ===\n');

  try {
    // Primeiro, vamos listar os secrets atuais
    console.log('1️⃣ Listando secrets atuais...');
    
    const { stdout: listOutput } = await execPromise(
      'npx supabase@latest secrets list --project-ref kgpsfbuurggwmpcxrfpa'
    );
    
    console.log(listOutput);
    console.log('');

    // Agora vamos adicionar/atualizar os secrets necessários
    console.log('2️⃣ Adicionando SUPABASE_URL');
    try {
      await execPromise(
        `npx supabase@latest secrets set SUPABASE_URL="${SUPABASE_URL}" --project-ref kgpsfbuurggwmpcxrfpa`
      );
      console.log('   ✓ SUPABASE_URL configurada');
    } catch (e) {
      console.log('   ⚠ Já existe ou erro:', e.message.substring(0, 100));
    }

    console.log('3️⃣ Adicionando SUPABASE_SERVICE_ROLE_KEY');
    try {
      await execPromise(
        `npx supabase@latest secrets set SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" --project-ref kgpsfbuurggwmpcxrfpa`
      );
      console.log('   ✓ SUPABASE_SERVICE_ROLE_KEY configurada');
    } catch (e) {
      console.log('   ⚠ Já existe ou erro:', e.message.substring(0, 100));
    }

    console.log('4️⃣ Adicionando SUPABASE_ANON_KEY');
    try {
      await execPromise(
        `npx supabase@latest secrets set SUPABASE_ANON_KEY="${ANON_KEY}" --project-ref kgpsfbuurggwmpcxrfpa`
      );
      console.log('   ✓ SUPABASE_ANON_KEY configurada');
    } catch (e) {
      console.log('   ⚠ Já existe ou erro:', e.message.substring(0, 100));
    }

    console.log('\n5️⃣ Verificando secrets finais...');
    const { stdout: finalOutput } = await execPromise(
      'npx supabase@latest secrets list --project-ref kgpsfbuurggwmpcxrfpa'
    );
    
    console.log(finalOutput);

    console.log('\n✅ Secrets configurados com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Redeploy as funções: npm run scripts/deploy-and-verify.ps1');
    console.log('2. Tente criar uma barbearia novamente: node test-now.js');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

setupSecrets();
