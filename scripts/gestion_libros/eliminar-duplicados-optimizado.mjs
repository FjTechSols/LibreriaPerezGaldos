
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Intentar cargar .env, luego .env.development
let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Prefer SERVICE_ROLE_KEY for admin tasks, fallback to ANON_KEY (which will likely fail for deletes)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno necesario.');
  console.error('Se requiere VITE_SUPABASE_URL y (SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_ANON_KEY)');
  console.error('Buscando en:', rootDir);
  process.exit(1);
}

const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`🔑 Usando clave API: ${isServiceRole ? 'SERVICE_ROLE (Admin)' : 'ANON (Pública)'}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function encontrarYBorrarDuplicadosOptimizado() {
  console.log('🚀 Iniciando búsqueda y ELIMINACIÓN OPTIMIZADA de libros duplicados...');
  
  let allBooks = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 1. Obtener todos los libros
  console.log('📥 Descargando catálogo...');
  while (hasMore) {
    if (page % 10 === 0) process.stdout.write(`.`); // Progress indicator
    
    // Solo necesitamos ID y legacy_id para identificar duplicados
    const { data, error } = await supabase
      .from('libros')
      .select('id, legacy_id') 
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('\nError al obtener libros:', error);
      break;
    }

    if (data.length === 0) {
      hasMore = false;
    } else {
      allBooks = [...allBooks, ...data];
      page++;
      if (data.length < pageSize) hasMore = false;
    }
  }

  console.log(`\n📚 Total de libros analizados: ${allBooks.length}`);

  // 2. Agrupar por legacy_id
  const groups = new Map();
  allBooks.forEach(book => {
    if (book.legacy_id) {
       const key = book.legacy_id.trim();
       if (!groups.has(key)) {
         groups.set(key, []);
       }
       groups.get(key).push(book);
    }
  });

  // 3. Identificar grupos con > 1 elemento
  const duplicateGroups = Array.from(groups.values()).filter(group => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No se encontraron duplicados.');
    return;
  }

  console.log(`⚠️ Se encontraron ${duplicateGroups.length} grupos de duplicados.`);
  
  // 4. Recopilar IDs a eliminar
  let idsToDelete = [];
  
  duplicateGroups.forEach(group => {
    // Ordenar por ID ascendente para mantener el más antiguo
    group.sort((a, b) => a.id - b.id);
    
    // El primero (índice 0) se queda (es el original), los demás se borran
    // group.slice(1) devuelve los duplicados
    const duplicates = group.slice(1);
    
    duplicates.forEach(dup => {
        idsToDelete.push(dup.id);
    });
  });

  console.log(`🔥 Total de registros a eliminar: ${idsToDelete.length}`);
  
  // 5. Procesar eliminaciones por lotes
  const BATCH_SIZE = 500; // Supabase soporta filtros largos, pero mejor ir por partes
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
      const batchIds = idsToDelete.slice(i, i + BATCH_SIZE);
      console.log(`🗑️ Eliminando lote ${Math.floor(i/BATCH_SIZE) + 1} de ${Math.ceil(idsToDelete.length/BATCH_SIZE)} (${batchIds.length} items)...`);
      
      const { error } = await supabase
          .from('libros')
          .delete()
          .in('id', batchIds);
          
      if (error) {
          console.error('❌ Error eliminando lote:', error);
      } else {
          deletedCount += batchIds.length;
      }
  }

  console.log('\n===================================================');
  console.log(`✅ PROCESO COMPLETADO.`);
  console.log(`Total de registros eliminados: ${deletedCount}`);
  
  // Guardar log simple de IDs
  fs.writeFileSync('ids_eliminados.json', JSON.stringify(idsToDelete));
}

encontrarYBorrarDuplicadosOptimizado().catch(console.error);
