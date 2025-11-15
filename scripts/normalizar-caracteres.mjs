import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapa de reemplazos para caracteres mal codificados
const caracteresReemplazo = {
  // Vocales con tilde
  '�': 'á',
  '�': 'é',
  '�': 'í',
  '�': 'ó',
  '�': 'ú',
  // Vocales con tilde mayúsculas
  '�': 'Á',
  '�': 'É',
  '�': 'Í',
  '�': 'Ó',
  '�': 'Ú',
  // Eñe
  '�': 'ñ',
  '�': 'Ñ',
  // Diéresis
  '�': 'ü',
  '�': 'Ü',
  // Símbolos ordinales
  '�': 'ª',
  '�': 'º',
  // Signos de puntuación
  '�': '¿',
  '�': '¡',
  // Comillas
  '�': '"',
  '�': '"',
  '�': "'",
  // Otros caracteres comunes
  '�': '€',
  '�': '–',
  '�': '—',
  '�': '…',
  '�': '·',
};

function normalizarTexto(texto) {
  if (!texto) return texto;

  let textoNormalizado = texto;

  // Reemplazar caracteres mal codificados
  for (const [mal, bien] of Object.entries(caracteresReemplazo)) {
    textoNormalizado = textoNormalizado.split(mal).join(bien);
  }

  return textoNormalizado;
}

async function normalizarLibros() {
  console.log('🔄 Iniciando normalización de caracteres en libros...\n');

  try {
    // Obtener todos los libros (primero intentar sin filtros)
    console.log('📡 Consultando base de datos...');
    const { data: libros, error, count } = await supabase
      .from('libros')
      .select('id, titulo, autor, descripcion, ubicacion', { count: 'exact' });

    if (error) {
      console.error('❌ Error al obtener libros:', error);
      console.error('   Mensaje:', error.message);
      console.error('   Detalles:', error.details);
      return;
    }

    console.log(`📊 Total de registros en la tabla: ${count}`);
    console.log(`📦 Registros obtenidos: ${libros?.length || 0}\n`);

    console.log(`📚 Se encontraron ${libros.length} libros para procesar\n`);

    let actualizados = 0;
    let sinCambios = 0;
    let errores = 0;

    for (const libro of libros) {
      const tituloNormalizado = normalizarTexto(libro.titulo);
      const autorNormalizado = normalizarTexto(libro.autor);
      const descripcionNormalizada = normalizarTexto(libro.descripcion);
      const ubicacionNormalizada = normalizarTexto(libro.ubicacion);

      // Verificar si hubo cambios
      const huboChangios =
        tituloNormalizado !== libro.titulo ||
        autorNormalizado !== libro.autor ||
        descripcionNormalizada !== libro.descripcion ||
        ubicacionNormalizada !== libro.ubicacion;

      if (huboChangios) {
        // Actualizar el libro
        const { error: updateError } = await supabase
          .from('libros')
          .update({
            titulo: tituloNormalizado,
            autor: autorNormalizado,
            descripcion: descripcionNormalizada,
            ubicacion: ubicacionNormalizada
          })
          .eq('id', libro.id);

        if (updateError) {
          console.error(`❌ Error al actualizar libro ${libro.id}:`, updateError);
          errores++;
        } else {
          actualizados++;
          if (actualizados % 100 === 0) {
            console.log(`✅ Procesados ${actualizados} libros...`);
          }
        }
      } else {
        sinCambios++;
      }
    }

    console.log('\n📊 Resumen de la normalización:');
    console.log(`   ✅ Libros actualizados: ${actualizados}`);
    console.log(`   ⏭️  Libros sin cambios: ${sinCambios}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('\n✨ Normalización completada!\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar el script
normalizarLibros();
