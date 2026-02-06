
// scripts/abebooks-upload.js
// Script para automatizar la subida de inventario ABEBOOKS usando Playwright
// Requiere: npm install playwright axios

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Replicate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración desde Variables de Entorno
const ABEBOOKS_USER = process.env.ABEBOOKS_USERNAME;
const ABEBOOKS_PASS = process.env.ABEBOOKS_PASSWORD;
const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL; // URL completa de generate-abebooks-csv
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Para autenticar con Supabase

if (!ABEBOOKS_USER || !ABEBOOKS_PASS || !SUPABASE_FUNCTION_URL || !SUPABASE_KEY) {
    console.error('❌ Falta configuración. Asegúrate de tener: ABEBOOKS_USERNAME, ABEBOOKS_PASSWORD, SUPABASE_FUNCTION_URL, SUPABASE_SERVICE_ROLE_KEY');
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
                // Read response body to see diagnostic error
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

async function uploadToAbeBooks() {
    console.log('🚀 Iniciando navegador...');
    const browser = await chromium.launch({ headless: true }); // Headless: true para CI
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Login
        console.log('🔑 Iniciando sesión en AbeBooks...');
        await page.goto('https://www.abebooks.com/servlet/SellerLogin', { timeout: 60000 });
        
        await page.fill('input[name="username"]', ABEBOOKS_USER);
        await page.fill('input[name="password"]', ABEBOOKS_PASS);
        
        // Click login and wait for navigation
        await Promise.all([
            page.waitForNavigation(),
            page.click('input[id="login-button"], button[type="submit"], input[type="submit"]') // Selector genérico
        ]);

        // Verificar login
        if (await page.locator('.error-message, .alert-danger').count() > 0) {
            throw new Error('❌ Falló el inicio de sesión. Verifica credenciales.');
        }
        console.log('✅ Login exitoso.');

        // 2. Ir a la página de subida
        console.log('📂 Navegando a "Upload Inventory"...');
        
        // URL directa a la herramienta de subida (puede cambiar, mejor navegar o usar link directo conocido)
        // Opción segura: Navegar desde el menú o usar URL conocida:
        await page.goto('https://www.abebooks.com/servlet/FileUpload', { timeout: 60000 });
        // O alternativamente: https://members.abebooks.com/books/Sell/upload-inventory.shtml (redirige)

        // 3. Subir archivo
        console.log('📤 Subiendo archivo...');
        
        // Buscar el input file. AbeBooks suele usar <input type="file" name="uploadFile" ...>
        const fileInput = page.locator('input[type="file"]');
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        
        await fileInput.setInputFiles(CSV_PATH);

        // Click en "Upload" o "Send"
        // Buscar el botón de submit
        const submitBtn = page.locator('input[type="submit"][value*="Upload"], button:has-text("Upload")');
        await submitBtn.click();

        // 4. Esperar confirmación
        console.log('⏳ Esperando confirmación...');
        // Buscar mensaje de éxito
        // AbeBooks suele mostrar: "Your file has been received..."
        await page.waitForTimeout(5000); // Espera inicial
        
        const successMessage = page.locator('text=received|uploaded|successful|processed'); 
        if (await successMessage.count() > 0) {
            console.log('✅ Archivo subido exitosamente!');
        } else {
            console.warn('⚠️ No se detectó mensaje de éxito claro. Verifica capturas si falla.');
            // En CI podríamos tomar screenshot
        }

    } catch (error) {
        console.error('❌ Error en el proceso:', error);
        // Tomar screenshot en error
        try {
            await page.screenshot({ path: 'error_screenshot.png' });
        } catch (e) {
            console.error('Could not take screenshot', e);
        }
        throw error;
    } finally {
        await browser.close();
        // Limpiar archivo temporal
        if (fs.existsSync(CSV_PATH)) fs.unlinkSync(CSV_PATH);
    }
}

async function run() {
    try {
        await downloadCSV();
        await uploadToAbeBooks();
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

run();
