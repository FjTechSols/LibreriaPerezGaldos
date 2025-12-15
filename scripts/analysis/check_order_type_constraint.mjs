
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
    console.log("Checking constraint on pedidos.tipo...");
    
    // We can't easily see check constraints via JS client without running raw SQL or inspecting information_schema
    // So we will try to insert a dummy order with a new type and see if it fails.
    
    const dummyOrder = {
        usuario_id: '00000000-0000-0000-0000-000000000000', // Likely FK failure if we don't pick real one, but let's see if type fails first?
        // Actually, let's just inspect the error message if we try to insert an invalid type.
        tipo: 'TEST_TYPE_' + Date.now()
    };

    // We can't really insert without fulfilling non-nulls. 
    // Let's query pg_constraint if possible via rpc or something? 
    // Or just try to insert a row with minimal valid data but invalid type.
    
    // Better: Query information_schema
    // The client doesn't support raw SQL directly unless we have a specific function.
    
    // Alternative: Check if we can fetch `tipo` column definition?
    // Not easy.
    
    // Strategy: Assume we might need to update it. The best way is to try to insert valid data with 'perez_galdos'. 
    // If it fails with "check constraint violation", we know we need to update it.
    
    // Need a valid user id.
    const { data: users } = await supabase.from('usuarios').select('id').limit(1);
    if (!users || users.length === 0) {
        console.log("No users found to test.");
        return;
    }
    const userId = users[0].id;
    
    console.log(`Testing insert with type 'perez_galdos' for user ${userId}...`);
    
    const { error } = await supabase.from('pedidos').insert({
        usuario_id: userId,
        tipo: 'perez_galdos',
        estado: 'pendiente',
        metodo_pago: 'tarjeta',
        total: 0,
        subtotal: 0,
        iva: 0
    });
    
    if (error) {
        console.log("Error inserting:", error.message);
        if (error.message.includes("constraint")) {
            console.log("⚠️ CONSTRAINT DETECTED!");
        }
    } else {
        console.log("✅ Insert successful! No constraint blocking 'perez_galdos'.");
        // Clean up
        // await supabase.from('pedidos').delete().eq('tipo', 'perez_galdos'); // Be careful not to delete real ones if this worked?
        // Actually if it worked, it means we are good on DB side.
    }
}

checkConstraint();
