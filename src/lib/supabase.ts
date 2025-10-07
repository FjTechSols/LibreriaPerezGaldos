import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-mode';

console.log('Supabase config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
