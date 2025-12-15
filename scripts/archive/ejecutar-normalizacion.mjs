import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno');
  process.exit(1);
}

async function ejecutarNormalizacion() {
  console.log('🔄 Llamando a la función de normalización...\n');

  try {
    const functionUrl = `${supabaseUrl}/functions/v1/normalizar-caracteres`;

    console.log(`📡 URL: ${functionUrl}\n`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta:', response.status, errorText);
      return;
    }

    const resultado = await response.json();

    console.log('\n✨ Resultado de la normalización:\n');
    console.log(`   📚 Total de libros: ${resultado.totalLibros}`);
    console.log(`   ✅ Actualizados: ${resultado.actualizados}`);
    console.log(`   ⏭️  Sin cambios: ${resultado.sinCambios}`);
    console.log(`   ❌ Errores: ${resultado.errores}`);

    if (resultado.detallesErrores && resultado.detallesErrores.length > 0) {
      console.log('\n⚠️  Primeros errores:');
      resultado.detallesErrores.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log(`\n${resultado.mensaje}\n`);

  } catch (error) {
    console.error('❌ Error al ejecutar normalización:', error.message);
  }
}

ejecutarNormalizacion();
