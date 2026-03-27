import 'dotenv/config';
import { Client } from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_FILE = path.join(__dirname, 'files', 'abebooks_local_export.txt');
const REMOTE_NAME = `purge_inventory_manual_fix_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.txt`;

async function uploadManual() {
    const client = new Client();
    client.ftp.verbose = true;
    
    try {
        await client.access({
            host: 'ftp.abebooks.com',
            user: process.env.ABEBOOKS_USERNAME,
            password: process.env.ABEBOOKS_API_KEY,
            secure: true,
            secureOptions: { minVersion: 'TLSv1.2' }
        });
        
        console.log('✅ Conexo a AbeBooks.');
        console.log(`📤 Subiendo ${LOCAL_FILE} como ${REMOTE_NAME}...`);
        
        await client.uploadFrom(LOCAL_FILE, REMOTE_NAME);
        
        console.log('✅ ¡Subida de emergencia completada con éxito!');
        
    } catch (err) {
        console.error('❌ Error en la subida:', err);
    } finally {
        client.close();
    }
}

uploadManual();
