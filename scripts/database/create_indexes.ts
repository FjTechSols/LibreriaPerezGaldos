import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createIndexes() {
  console.log('Creating database indexes for performance optimization...');
  
  const sqlFile = path.resolve(__dirname, 'create_indexes.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  try {
    // Note: Supabase client doesn't support raw SQL execution directly
    // You need to run this in the Supabase SQL Editor
    console.log('\n⚠️  IMPORTANT: This script generates SQL that must be run in Supabase SQL Editor\n');
    console.log('Copy and paste the following SQL into your Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\nAfter running the SQL, your queries will be much faster!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createIndexes();
