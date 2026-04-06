/**
 * Script para verificar as variáveis de ambiente da função edge
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkEnv() {
  console.log('=== Verificando Variáveis de Ambiente ===\n');

  try {
    console.log('1️⃣ Executando supabase functions get-env...');
    
    const { stdout, stderr } = await execPromise(
      'npx supabase@latest secrets list --project-ref kgpsfbuurggwmpcxrfpa'
    );

    console.log('\nSecrets configuradas:');
    console.log(stdout);

    if (stderr) {
      console.log('\nAviso:');
      console.log(stderr);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkEnv();
