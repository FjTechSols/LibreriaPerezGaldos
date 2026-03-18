
// scripts/abebooks-upload.js
// Script para automatizar la subida de inventario ABEBOOKS usando FTPS
// Requiere: npm install basic-ftp

import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Replicate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually if needed (for local manual execution)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            const val = values.join('=').trim().replace(/^["']|["']$/g, ''); // strip quotes
            if (!process.env[key.trim()]) {
                process.env[key.trim()] = val;
            }
        }
    });
    console.log('🌱 Loaded .env variables manually.');
}

// Configuración desde Variables de Entorno
// Configuración desde Variables de Entorno
const ABEBOOKS_USER = process.env.ABEBOOKS_USERNAME || process.env.ABEBOOKS_USER_ID; // Support both names
const ABEBOOKS_API_KEY = process.env.ABEBOOKS_API_KEY; // API Key (contraseña FTP)
let SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL;

// Fallback for Function URL if missing locally
if (!SUPABASE_FUNCTION_URL && process.env.VITE_SUPABASE_URL) {
    SUPABASE_FUNCTION_URL = `${process.env.VITE_SUPABASE_URL}/functions/v1`;
}

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!ABEBOOKS_USER || !ABEBOOKS_API_KEY || !SUPABASE_FUNCTION_URL || !SUPABASE_KEY) {
    console.error('❌ Falta configuración. Asegúrate de tener: ABEBOOKS_USERNAME (o USSER_ID), ABEBOOKS_API_KEY, SUPABASE_FUNCTION_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const TXT_PATH = path.join(__dirname, 'temp_abebooks_inventory.txt');
const LOCAL_OVERRIDE_PATH = path.resolve(__dirname, '../../scripts/files/abebooks_local_export.txt');

async function downloadTXT() {
    // Check if we have a locally generated file (from the new GitHub Actions step)
    if (fs.existsSync(LOCAL_OVERRIDE_PATH)) {
        console.log('📦 Detectado archivo local generado previamente. Usando este archivo en lugar de descargar de Supabase.');
        try {
            // Simply copy the local file to our temp path
            fs.copyFileSync(LOCAL_OVERRIDE_PATH, TXT_PATH);
            console.log('✅ Archivo local copiado a la ruta temporal de subida.');
            return; // Exit early, no need to download
        } catch (err) {
            console.warn('⚠️ Error al copiar archivo local, intentando descarga como fallback:', err.message);
        }
    }

    console.log('⬇️  Descargando inventario (TXT) desde Supabase...');
    
    return new Promise((resolve, reject) => {
        // Ensure we hit the generate-abebooks-csv endpoint, whether base URL or full URL is provided
        let fnUrl = SUPABASE_FUNCTION_URL;
        if (!fnUrl.endsWith('generate-abebooks-csv')) {
             // Append only if not present. simplified logic
             fnUrl = fnUrl.replace(/\/$/, '') + '/generate-abebooks-csv';
        }
        
        // Append purge flag if we are purging inventory
        if (process.env.PURGE_INVENTORY === 'true') {
            fnUrl += '?purge=true';
            console.log('🧨 MODO DE PURGA ACTIVADO: Se forzarán todos los stocks a 0.');
        }
        console.log('🔗 URL de generación:', fnUrl);

        const url = new URL(fnUrl);
        const options = {
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        };

        const req = https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                let responseBody = '';
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    console.error(`❌ Error descargando TXT: Status ${res.statusCode}`);
                    console.error(`❌ Detalles del servidor: ${responseBody}`);
                    reject(new Error(`Error descargando TXT: ${res.statusCode} - ${responseBody}`));
                });
                return;
            }

            // Encoding Fix: Collect all data as UTF-8 string, then write as Latin-1
            let rawData = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    // Write with 'latin1' to ensure special chars (ñ, á, etc.) are single-byte mapped
                    // This fixes the "Ã±" issue in AbeBooks
                    fs.writeFileSync(TXT_PATH, rawData, { encoding: 'latin1' });
                    console.log('✅ TXT descargado y convertido a Latin-1 correctamente.');
                    
                    // DEBUG: Check for Images and ISBN in the file
                    const lines = rawData.split('\r\n'); // Strictly CRLF from server
                    console.log('--- CONTENT CHECK (First 5 Rows) ---');
                    let count = 0;
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        const cols = line.split('\t');
                        // Image is Col 4 (index 3). ISBN is Col 12 (index 11).
                        if (count < 5) {
                            console.log(`Row ${count + 1}: SKU=${cols[0]} | IMG=${cols[3]} | ISBN=${cols[11] || 'MISSING'}`);
                            if (cols[3] && !cols[3].startsWith('"')) console.warn('⚠️ WARNING: Image column appears unquoted!');
                            count++;
                        }
                    }
                    console.log('--- END CHECK ---');

                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            fs.unlink(TXT_PATH, () => {});
            reject(err);
        });
    });
}

async function uploadToAbeBooksFTP() {
    const client = new Client();
    client.ftp.verbose = true; // Enable verbose logging for debugging
    
    try {
        console.log('🔐 Conectando a ftp.AbeBooks.com vía FTPS...');
        
        // Connect to AbeBooks FTP server with TLS
        await client.access({
            host: 'ftp.abebooks.com',
            user: ABEBOOKS_USER,
            password: ABEBOOKS_API_KEY,
            secure: true, // Use FTPS (FTP over TLS)
            secureOptions: {
                // Require TLS 1.2 or higher
                minVersion: 'TLSv1.2'
            }
        });
        
        console.log('✅ Conexión FTPS establecida.');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const remoteFilename = `purge_inventory_${timestamp}.txt`;

        
        console.log(`📤 Subiendo archivo como: ${remoteFilename}...`);
        
        // Upload the TXT file
        await client.uploadFrom(TXT_PATH, remoteFilename);
        
        console.log('✅ Archivo subido exitosamente!');
        console.log(`📊 Archivo remoto: ${remoteFilename}`);
        
    } catch (error) {
        console.error('❌ Error en el proceso FTP:', error);
        throw error;
    } finally {
        console.log('🔌 Cerrando conexión FTP...');
        client.close();
    }
}

async function run() {
    try {
        await downloadTXT();
        
        // Count books BEFORE uploading
        const fileContent = fs.readFileSync(TXT_PATH, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        const bookCount = lines.length; // NO hay cabecera en este formato tabulado custom
        console.log(`📊 Total books in TXT: ${bookCount}`);

        // DEBUG: Print first 500 chars to check format
        console.log('--- DEBUG: FILE CONTENT SNIPPET ---');
        console.log(JSON.stringify(fileContent.slice(0, 500)));
        console.log('--- END DEBUG ---');
        
        await uploadToAbeBooksFTP();
        console.log('🎉 ¡Sincronización completada con éxito!');
        
        // Output book count for GitHub Actions to capture
        console.log(`BOOK_COUNT=${bookCount}`);
        
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    } finally {
        // Clean up TXT file after everything is done
        if (fs.existsSync(TXT_PATH)) {
            fs.unlinkSync(TXT_PATH);
            console.log('🗑️  Archivo temporal eliminado.');
        }
    }
}

run();
