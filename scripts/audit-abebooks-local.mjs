import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_PATH = path.join(__dirname, 'files', 'abebooks_local_export.txt');

async function auditExportFile() {
  console.log('🧐 Iniciando auditoría de abebooks_local_export.txt...');
  
  if (!fs.existsSync(EXPORT_PATH)) {
    console.error('❌ Archivo no encontrado');
    return;
  }

  const content = fs.readFileSync(EXPORT_PATH, 'utf8');
  const lines = content.split('\r\n').filter(l => l.trim() !== '');
  
  let errors = [];
  let stats = {
    totalLines: lines.length,
    colCounts: {},
    priceChecks: { ok: 0, fail: 0 },
    samples: []
  };

  const targetedIds = ['02293682', '02293606', '00001377H', 'N0000928'];

  lines.forEach((line, index) => {
    const cols = line.split('\t');
    const count = cols.length;
    
    // Check column count
    stats.colCounts[count] = (stats.colCounts[count] || 0) + 1;
    if (count !== 12) {
      errors.push(`Línea ${index + 1}: Columnas incorrectas (${count}).`);
    }

    // Check price format (Col 9)
    const price = cols[9];
    if (price && !isNaN(parseFloat(price))) {
      stats.priceChecks.ok++;
    } else {
      stats.priceChecks.fail++;
      if (errors.length < 20) errors.push(`Línea ${index + 1}: Precio inválido [${price}]`);
    }

    // Capture targeted samples
    const id = cols[0].replace(/"/g, '');
    if (targetedIds.includes(id)) {
      stats.samples.push({
        line: index + 1,
        id,
        cols: cols.map((c, i) => `${i}: ${c}`)
      });
    }
  });

  console.log('\n📊 RESULTADOS DE AUDITORÍA:');
  console.log(`Total líneas: ${stats.totalLines}`);
  console.log('Conteo de columnas:', stats.colCounts);
  console.log(`Chequeo de precios: OK=${stats.priceChecks.ok}, FAIL=${stats.priceChecks.fail}`);
  
  if (errors.length > 0) {
    console.log('❌ SE ENCONTRARON ERRORES:');
    errors.slice(0, 10).forEach(e => console.log(e));
    if (errors.length > 10) console.log(`... y ${errors.length - 10} errores más.`);
  } else {
    console.log('✅ Estructura de columnas perfecta (12/12 en todas las líneas).');
  }

  console.log('\n🔍 VERIFICACIÓN DE MUESTRAS SOLICITADAS:');
  stats.samples.forEach(s => {
    console.log(`\n--- Libro ${s.id} (Línea ${s.line}) ---`);
    s.cols.forEach(c => console.log(c));
  });

  if (errors.length === 0 && stats.samples.length >= 3) {
    console.log('\n💎 CONCLUSIÓN: Archivo verificado y listo para producción.');
  } else {
    console.log('\n⚠️ CONCLUSIÓN: No se encontraron todas las muestras o hay errores.');
  }
}

auditExportFile();
