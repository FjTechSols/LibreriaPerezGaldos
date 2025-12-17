
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env.development');
    if (!fs.existsSync(envPath)) {
        console.error('ERROR: .env.development file not found at:', envPath);
        process.exit(1);
    }
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    console.log('Connecting to Supabase...');
    console.log('URL:', envConfig.VITE_SUPABASE_URL); 
    // Do not log key for security, but verify it exists
    console.log('Key exists:', !!envConfig.VITE_SUPABASE_ANON_KEY);

    const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

    const { data, error, count } = await supabase
      .from('ubicaciones')
      .select('*', { count: 'exact' });

    if (error) {
        console.error('SUPABASE ERROR:', error);
    } else {
        console.log(`Found ${count} locations:`);
        console.table(data);
    }
} catch (e) {
    console.error('SCRIPT ERROR:', e);
}
