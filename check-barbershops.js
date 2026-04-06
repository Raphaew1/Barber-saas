/**
 * Verificar barbearias criadas
 */

const fs = require('fs');

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ';

async function checkBarbershops() {
  console.log('=== Verificando Barbearias Criadas ===\n');

  try {
    // Ler token
    const accessToken = fs.readFileSync('access-token.txt', 'utf8').trim();
    console.log('1️⃣  Token carregado');

    // Headers para requests autenticadas
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY
    };

    // Buscar todas as barbearias
    console.log('2️⃣  Buscando barbearias criadas...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?select=*&order=created_at.desc`, {
      method: 'GET',
      headers
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const barbershops = await response.json();
      console.log(`\nEncontradas ${barbershops.length} barbearias na tabela 'barbershops'`);

      if (barbershops.length === 0) {
        console.log('\n🔍 Verificando outras possibilidades...');

        // Tentar buscar em outras tabelas possíveis
        const possibleTables = ['barbershop', 'barbearias', 'shops', 'businesses'];

        for (const tableName of possibleTables) {
          console.log(`\nVerificando tabela '${tableName}'...`);
          try {
            const tableResponse = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`, {
              method: 'GET',
              headers
            });

            if (tableResponse.ok) {
              const tableData = await tableResponse.json();
              console.log(`   ✅ Tabela '${tableName}' existe - ${tableData.length} registros`);
              if (tableData.length > 0) {
                console.log('   Primeiros registros:', tableData.slice(0, 2));
              }
            } else {
              console.log(`   ❌ Tabela '${tableName}' não acessível ou não existe`);
            }
          } catch (error) {
            console.log(`   ❌ Erro ao verificar '${tableName}':`, error.message);
          }
        }
      }

      barbershops.forEach((barbershop, index) => {
        console.log(`${index + 1}. 📍 ${barbershop.name}`);
        console.log(`   🆔 ID: ${barbershop.id}`);
        console.log(`   👤 Owner ID: ${barbershop.owner_id || 'N/A'}`);
        console.log(`   📅 Criado em: ${new Date(barbershop.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });

      if (barbershops.length > 0) {
        console.log('🎉 Parabéns! Você tem barbearias criadas no sistema!');
        console.log('💡 Agora você pode gerenciar seus clientes, agendamentos e serviços.');
      } else {
        console.log('\n🤔 Nenhuma barbearia encontrada.');
        console.log('💡 Isso pode significar que:');
        console.log('   - A criação não foi bem-sucedida apesar do status 201');
        console.log('   - Há políticas RLS que impedem a visualização');
        console.log('   - A tabela pode ter um nome diferente');
      }
    } else {
      const error = await response.text();
      console.log('❌ Erro ao buscar barbearias:', error);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkBarbershops();