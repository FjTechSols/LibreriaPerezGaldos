
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
    // Add anti-bot detection args
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }); 
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        // 1. Login
        console.log('🔑 Iniciando sesión en AbeBooks...');
        await page.goto('https://www.abebooks.com/servlet/SellerLogin', { timeout: 60000 });

        // HANDLING COOKIE CONSENT (Possible blocker)
        // AbeBooks often uses OneTrust or similar. We try to click "Accept" or "Reject" if present.
        try {
            // Expanded selectors for cookies
            const cookieBtn = page.locator('button#onetrust-accept-btn-handler, button#onetrust-reject-all-handler, button[id*="cookie"], button:has-text("Accept All"), button:has-text("Aceptar todo"), button:has-text("Aceptar cookies"), .cookie-banner button');
            if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
                console.log('🍪 Aceptando/Gestionando Cookies...');
                await cookieBtn.first().click();
                await page.waitForTimeout(2000); // Wait for banner to disappear
            } else {
                 console.log('ℹ️ No se detectó botón de cookies visible.');
            }
        } catch (e) {
            console.log('⚠️ Error intentando cerrar banner de cookies (continuando...):', e.message);
        }
        
        // CHECK IF REDIRECTED TO HOMEPAGE (Bot protection quirk)
        const title = await page.title();
        if (title.includes('Shop for Books, Art & Collectibles') || title.includes('AbeBooks | Shop for Books')) {
            console.warn('⚠️ Redirigido a la Homepage en lugar del Login. Intentando navegar manualmente a "Sign On"...');
            // Click "Sign On" link
            const signOnLink = page.locator('a[href*="SignOn"], a:has-text("Sign On"), a:has-text("Iniciar sesión"), #sign-on');
            if (await signOnLink.count() > 0) {
                 await signOnLink.first().click();
                 await page.waitForNavigation({ timeout: 30000 });
                 console.log('✅ Navegación manual a Login completada.');
            } else {
                 console.error('❌ No se encontró enlace de "Sign On" en la Homepage.');
            }
        }

        // Wait for username field specifically
        console.log('⏳ Esperando campo de usuario...');
        // Try to verify if we are indeed on the login page or blocked
        try {
             await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 60000 }); 
        } catch (e) {
            console.error('❌ Timeout esperando input[name="username"].');
            // Check page title to see if we are blocked
            const currentTitle = await page.title();
            console.error(`📄 Page Title actual: "${currentTitle}"`);
            throw e;
        }

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
        
        // DEBUGGING INFO
        try {
            const currentUrl = page.url();
            const currentTitle = await page.title();
            console.log(`🔍 DEBUG INFO:`);
            console.log(`   - URL: ${currentUrl}`);
            console.log(`   - Title: ${currentTitle}`);
            
            // Check for specific blocker text
            const bodyText = await page.innerText('body');
            if (bodyText.includes('robot') || bodyText.includes('captcha') || bodyText.includes('denied')) {
                console.error('⚠️ POSIBLE BLOQUEO DETECTADO (Captcha/Bot)');
            }

            // Dump HTML snippet (first 500 chars)
            const content = await page.content();
            console.log(`   - HTML Start: ${content.substring(0, 500)}...`);
            
        } catch (debugError) {
            console.error('Error getting debug info:', debugError);
        }

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
