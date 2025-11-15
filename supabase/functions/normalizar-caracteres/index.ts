import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Mapa de reemplazos para caracteres mal codificados
const caracteresReemplazo: Record<string, string> = {
  // Vocales con tilde
  '�': 'á', '�': 'é', '�': 'í', '�': 'ó', '�': 'ú',
  // Vocales con tilde mayúsculas
  '�': 'Á', '�': 'É', '�': 'Í', '�': 'Ó', '�': 'Ú',
  // Eñe
  '�': 'ñ', '�': 'Ñ',
  // Diéresis
  '�': 'ü', '�': 'Ü',
  // Símbolos ordinales
  '�': 'ª', '�': 'º',
  // Signos de puntuación
  '�': '¿', '�': '¡',
  // Comillas
  '�': '"', '�': '"', '�': "'",
  // Otros caracteres comunes
  '�': '€', '�': '–', '�': '—', '�': '…', '�': '·',
};

function normalizarTexto(texto: string | null): string | null {
  if (!texto) return texto;

  let textoNormalizado = texto;

  // Reemplazar caracteres mal codificados
  for (const [mal, bien] of Object.entries(caracteresReemplazo)) {
    textoNormalizado = textoNormalizado.split(mal).join(bien);
  }

  return textoNormalizado;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Crear cliente de Supabase con service_role para bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando normalización de caracteres...');

    // Obtener todos los libros (con service_role bypaseamos RLS)
    const { data: libros, error } = await supabase
      .from('libros')
      .select('id, titulo, autor, descripcion, ubicacion');

    if (error) {
      console.error('❌ Error al obtener libros:', error);
      throw error;
    }

    console.log(`📚 Se encontraron ${libros.length} libros para procesar`);

    let actualizados = 0;
    let sinCambios = 0;
    const errores: string[] = [];

    // Procesar en lotes de 10 para no sobrecargar
    const batchSize = 10;
    for (let i = 0; i < libros.length; i += batchSize) {
      const batch = libros.slice(i, i + batchSize);

      await Promise.all(batch.map(async (libro) => {
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
            errores.push(`Error en libro ${libro.id}: ${updateError.message}`);
          } else {
            actualizados++;
          }
        } else {
          sinCambios++;
        }
      }));

      // Log de progreso cada 100 libros
      if ((i + batchSize) % 100 === 0) {
        console.log(`✅ Procesados ${i + batchSize} / ${libros.length} libros...`);
      }
    }

    const resultado = {
      success: true,
      totalLibros: libros.length,
      actualizados,
      sinCambios,
      errores: errores.length,
      detallesErrores: errores.slice(0, 10), // Solo primeros 10 errores
      mensaje: `✨ Normalización completada: ${actualizados} libros actualizados, ${sinCambios} sin cambios, ${errores.length} errores`
    };

    console.log('📊 Resumen:', resultado);

    return new Response(
      JSON.stringify(resultado),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
