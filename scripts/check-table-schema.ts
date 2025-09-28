#!/usr/bin/env npx tsx

/**
 * Check workflow_states table schema
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { createServiceClient } from '@/lib/database/supabaseClient';

async function checkTableSchema() {
  console.log('🔍 Checking workflow_states table schema...\n');

  try {
    const supabase = createServiceClient();

    // Get table columns
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'workflow_states' });

    if (error) {
      console.log('❌ Could not get table schema:', error.message);

      // Try alternative approach - describe the table
      const { data: altData, error: altError } = await supabase
        .from('workflow_states')
        .select('*')
        .limit(1);

      if (altError) {
        console.log('❌ Alternative approach failed:', altError.message);
      } else {
        console.log('✅ Table exists and is queryable');
        console.log('Sample data keys:', altData?.[0] ? Object.keys(altData[0]) : 'No data');
      }
      return;
    }

    console.log('✅ Table schema retrieved');
    console.log('Columns:', data);

  } catch (error) {
    console.log('❌ Unexpected error:', error);
  }
}

checkTableSchema();