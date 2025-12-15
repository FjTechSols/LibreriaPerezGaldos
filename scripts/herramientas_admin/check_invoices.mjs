
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoices() {
    console.log("🔍 Diagnóstico de Facturas...");
    
    // Check Facturas (Headers)
    const { count: countFacturas, error: errF } = await supabase.from('facturas').select('*', { count: 'exact', head: true });
    if (errF) console.error("Error contando facturas:", errF.message);
    else console.log(`📄 Total Facturas: ${countFacturas}`);

    // Check Pedidos
    const { count: countPedidos, error: errP } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
    if (errP) console.error("Error contando pedidos:", errP.message);
    else console.log(`📦 Total Pedidos: ${countPedidos}`);
    
    // Check Clients
    const { count: countClientes, error: errC } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    if (errC) console.error("Error contando clientes:", errC.message);
    else console.log(`👥 Total Clientes: ${countClientes}`);
}

checkInvoices();
