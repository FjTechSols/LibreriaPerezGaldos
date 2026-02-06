
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

        // HANDLING COOKIE CONSENT (Possible blocker)
        // AbeBooks often uses OneTrust or similar. We try to click "Accept" or "Reject" if present.
        try {
            const cookieBtn = page.locator('button#onetrust-accept-btn-handler, button#onetrust-reject-all-handler, button[id*="cookie"], button:has-text("Accept All"), button:has-text("Aceptar todo")');
            if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
                console.log('🍪 Aceptando/Gestionando Cookies...');
                await cookieBtn.first().click();
                await page.waitForTimeout(1000); // Wait for banner to disappear
            }
        } catch (e) {
            console.log('⚠️ No se detectó o no se pudo cerrar banner de cookies (continuando...)');
        }
        
        // Wait for username field specifically
        console.log('⏳ Esperando campo de usuario...');
        await page.waitForSelector('input[name="username"]', { timeout: 60000 }); // Increased timeout

        await page.fill('input[name="username"]', ABEBOOKS_USER);
        await page.fill('input[name="password"]', ABEBOOKS_PASS);
        
        // Click login and wait for navigation
        await Promise.all([
            page.waitForNavigation({ timeout: 60000 }),
            page.click('input[id="login-button"], button[type="submit"], input[type="submit"]')
        ]);

        // Verificar login
        if (await page.locator('.error-message, .alert-danger').count() > 0) {
            throw new Error('❌ Falló el inicio de sesión. Verifica credenciales.');
        }
        console.log('✅ Login exitoso.');

        // 2. Ir a la página de subida
        console.log('📂 Navegando a "Upload Inventory"...');
        
        await page.goto('https://www.abebooks.com/servlet/FileUpload', { timeout: 60000 });
        
        // 3. Subir archivo
        console.log('📤 Subiendo archivo...');
        
        const fileInput = page.locator('input[type="file"]');
        await fileInput.waitFor({ state: 'attached', timeout: 30000 });
        
        await fileInput.setInputFiles(CSV_PATH);

        // Click en "Upload"
        const submitBtn = page.locator('input[type="submit"][value*="Upload"], button:has-text("Upload")');
        await submitBtn.click();

        // 4. Esperar confirmación
        console.log('⏳ Esperando confirmación...');
        await page.waitForTimeout(5000); 
        
        const successMessage = page.locator('text=received|uploaded|successful|processed|Recibido'); 
        // Wait up to 30s for success message
        try {
            await successMessage.first().waitFor({ state: 'visible', timeout: 30000 });
            console.log('✅ Archivo subido exitosamente!');
        } catch (e) {
             console.warn('⚠️ No se detectó mensaje de éxito claro, pero el proceso terminó sin error fatal.');
             // Check for specific error messages on screen
             if (await page.locator('.error, .alert-danger').count() > 0) {
                 throw new Error('❌ Error reportado en la página de subida.');
             }
        }

    } catch (error) {
        console.error('❌ Error en el proceso:', error);
        // Tomar screenshot en error
        try {
            const screenshotPath = path.join(process.cwd(), 'error_screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot guardado en: ${screenshotPath}`);
        } catch (e) {
            console.error('Could not take screenshot', e);
        }
        throw error;
    } finally {
        await browser.close();
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
