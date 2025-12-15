
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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log("Checking Orders Stats...");
     const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('estado, total');

  if (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }

  const estadisticas = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    procesando: pedidos.filter(p => p.estado === 'procesando').length,
    enviados: pedidos.filter(p => p.estado === 'enviado').length,
    completados: pedidos.filter(p => p.estado === 'completado').length,
    cancelados: pedidos.filter(p => p.estado === 'cancelado').length,
    totalVentas: pedidos
      .filter(p => p.estado !== 'cancelado')
      .reduce((sum, p) => sum + (p.total || 0), 0)
  };
  
  console.log("Stats:", estadisticas);
}

checkOrders();
