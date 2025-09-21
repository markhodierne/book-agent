#!/usr/bin/env tsx
// Simple database-only connection test

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Simple environment loader for .env.local
function loadEnvFile() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('Could not load .env.local file');
  }
}

// Load environment variables
loadEnvFile();

async function testDatabaseOnly() {
  console.log('🔧 Testing Supabase Connection Only\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('Environment check:');
  console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
  console.log(`- SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  try {
    // Create simple client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test connection
    console.log('Testing connection...');
    const startTime = Date.now();

    const { data, error } = await supabase
      .from('book_sessions')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      if (error.message.includes('relation "book_sessions" does not exist')) {
        console.log(`✅ Connected successfully (${latency}ms)`);
        console.log('⚠️  Tables not created yet - need to run migrations');
        console.log('   Run: npx tsx scripts/run-migrations.ts');
      } else {
        console.log(`❌ Connection error: ${error.message}`);
      }
    } else {
      console.log(`✅ Connected successfully (${latency}ms)`);
      console.log(`📊 Tables exist and accessible`);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error instanceof Error ? error.message : error);
  }
}

testDatabaseOnly().catch(console.error);