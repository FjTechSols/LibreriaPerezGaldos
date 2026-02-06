
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

// Configuración desde Variables de Entorno
const ABEBOOKS_USER = process.env.ABEBOOKS_USERNAME; // UserID en MAYÚSCULAS
const ABEBOOKS_API_KEY = process.env.ABEBOOKS_API_KEY; // API Key (contraseña FTP)
const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ABEBOOKS_USER || !ABEBOOKS_API_KEY || !SUPABASE_FUNCTION_URL || !SUPABASE_KEY) {
    console.error('❌ Falta configuración. Asegúrate de tener: ABEBOOKS_USERNAME, ABEBOOKS_API_KEY, SUPABASE_FUNCTION_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const CSV_PATH = path.join(__dirname, 'temp_abebooks_inventory.csv');

async function downloadCSV() {
    console.log('⬇️  Descargando inventario desde Supabase...');
    
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_FUNCTION_URL);
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
                    console.error(`❌ Error descargando CSV: Status ${res.statusCode}`);
                    console.error(`❌ Detalles del servidor: ${responseBody}`);
                    reject(new Error(`Error descargando CSV: ${res.statusCode} - ${responseBody}`));
                });
                return;
            }

            const file = fs.createWriteStream(CSV_PATH);
            res.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('✅ CSV descargado correctamente.');
                resolve();
            });
        });

        req.on('error', (err) => {
            fs.unlink(CSV_PATH, () => {});
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
        const remoteFilename = `inventory_update_${timestamp}.csv`;

        
        console.log(`📤 Subiendo archivo como: ${remoteFilename}...`);
        
        // Upload the CSV file
        await client.uploadFrom(CSV_PATH, remoteFilename);
        
        console.log('✅ Archivo subido exitosamente!');
        console.log(`📊 Archivo remoto: ${remoteFilename}`);
        
    } catch (error) {
        console.error('❌ Error en el proceso FTP:', error);
        throw error;
    } finally {
        console.log('🔌 Cerrando conexión FTP...');
        client.close();
        
        // Clean up local CSV file
        if (fs.existsSync(CSV_PATH)) {
            fs.unlinkSync(CSV_PATH);
            console.log('🗑️  Archivo temporal eliminado.');
        }
    }
}

async function run() {
    try {
        await downloadCSV();
        await uploadToAbeBooksFTP();
        console.log('🎉 ¡Sincronización completada con éxito!');
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

run();
