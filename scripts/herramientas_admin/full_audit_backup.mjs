
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
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

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const sessionDir = path.join(backupDir, `backup-${timestamp}`);
fs.mkdirSync(sessionDir);

const TABLES = ['libros', 'clientes', 'facturas', 'factura_items', 'categorias', 'editoriales', 'configuracion'];

async function backupTable(table) {
    console.log(`📦 Contando ${table}...`);
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    
    console.log(`   Descargando ${count} registros de ${table}...`);
    let allRows = [];
    let page = 0;
    const pageSize = 1000;
    
    while(true) {
        const { data, error } = await supabase.from(table).select('*').range(page*pageSize, (page+1)*pageSize-1);
        if (error) {
            console.error(`❌ Error en ${table}:`, error.message);
            break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        process.stdout.write(`\r   Progreso: ${allRows.length} / ${count}`);
        page++;
    }
    console.log(`\n   ✅ ${table} completado.`);
    
    fs.writeFileSync(path.join(sessionDir, `${table}.json`), JSON.stringify(allRows, null, 2));
}

async function runBackup() {
    console.log(`🚀 Iniciando COPIA DE SEGURIDAD en: ${sessionDir}`);
    for (const t of TABLES) {
        await backupTable(t);
    }
    console.log(`\n✨ Copia de seguridad finalizada exitosamente.`);
    console.log(`📁 Archivos guardados en: ${sessionDir}`);
}

runBackup();
