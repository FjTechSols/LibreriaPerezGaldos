import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  console.log('Loaded .env variables manually.');
}

const ABEBOOKS_USER = process.env.ABEBOOKS_USERNAME || process.env.ABEBOOKS_USER_ID;
const ABEBOOKS_API_KEY = process.env.ABEBOOKS_API_KEY;
let SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL;

if (!SUPABASE_FUNCTION_URL && process.env.VITE_SUPABASE_URL) {
  SUPABASE_FUNCTION_URL = `${process.env.VITE_SUPABASE_URL}/functions/v1`;
}

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!ABEBOOKS_USER || !ABEBOOKS_API_KEY || !SUPABASE_FUNCTION_URL || !SUPABASE_KEY) {
  console.error('Falta configuracion. Necesitas ABEBOOKS_USERNAME/USER_ID, ABEBOOKS_API_KEY, SUPABASE_FUNCTION_URL y SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const CSV_PATH = path.join(__dirname, 'temp_abebooks_inventory.csv');
const LOCAL_OVERRIDE_PATH = path.resolve(__dirname, '../../scripts/files/abebooks_local_export.csv');

async function downloadCSV() {
  if (fs.existsSync(LOCAL_OVERRIDE_PATH)) {
    console.log('Usando CSV local ya generado.');
    fs.copyFileSync(LOCAL_OVERRIDE_PATH, CSV_PATH);
    return;
  }

  console.log('Descargando inventario CSV desde Supabase...');

  return new Promise((resolve, reject) => {
    let fnUrl = SUPABASE_FUNCTION_URL;
    if (!fnUrl.endsWith('generate-abebooks-csv')) {
      fnUrl = fnUrl.replace(/\/$/, '') + '/generate-abebooks-csv';
    }

    if (process.env.PURGE_INVENTORY === 'true') {
      fnUrl += '?purge=true';
      console.log('Modo purge activado.');
    }

    const url = new URL(fnUrl);
    const options = {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    };

    const req = https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => reject(new Error(`Error descargando CSV: ${res.statusCode} - ${responseBody}`)));
        return;
      }

      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        try {
          fs.writeFileSync(CSV_PATH, rawData, { encoding: 'utf8' });
          console.log('CSV descargado correctamente.');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      fs.unlink(CSV_PATH, () => {});
      reject(err);
    });
  });
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function removeOutOfStockRows() {
  if (process.env.PURGE_INVENTORY === 'true') {
    return { bookCount: 0, removedCount: 0 };
  }

  const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    return { bookCount: 0, removedCount: 0 };
  }

  const headers = parseCsvLine(lines[0]).map(header => header.trim());
  const quantityIndex = headers.indexOf('Quantity');

  if (quantityIndex === -1) {
    throw new Error('El CSV de AbeBooks no tiene columna Quantity.');
  }

  const rowsWithStock = [lines[0]];
  let removedCount = 0;

  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const quantity = Number(row[quantityIndex]);

    if (Number.isFinite(quantity) && quantity > 0) {
      rowsWithStock.push(line);
    } else {
      removedCount++;
    }
  }

  fs.writeFileSync(CSV_PATH, rowsWithStock.join('\n') + '\n', { encoding: 'utf8' });

  return {
    bookCount: rowsWithStock.length - 1,
    removedCount
  };
}

async function uploadToAbeBooksFTP() {
  const client = new Client();
  client.ftp.verbose = true;

  try {
    console.log('Conectando a ftp.abebooks.com via FTPS...');

    await client.access({
      host: 'ftp.abebooks.com',
      user: ABEBOOKS_USER,
      password: ABEBOOKS_API_KEY,
      secure: true,
      secureOptions: {
        minVersion: 'TLSv1.2'
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const remoteFilename = process.env.PURGE_INVENTORY === 'true'
      ? `purge_inventory_${timestamp}.csv`
      : `abebooks_inventory_${timestamp}.csv`;

    console.log(`Subiendo archivo como: ${remoteFilename}`);
    await client.uploadFrom(CSV_PATH, remoteFilename);
    console.log(`Archivo remoto subido: ${remoteFilename}`);
  } finally {
    client.close();
  }
}

async function run() {
  try {
    await downloadCSV();

    const { bookCount, removedCount } = removeOutOfStockRows();
    if (removedCount > 0) {
      console.log(`Filas omitidas por Quantity <= 0: ${removedCount}`);
    }
    console.log(`Total books in CSV: ${bookCount}`);

    await uploadToAbeBooksFTP();
    console.log(`BOOK_COUNT=${bookCount}`);
  } catch (error) {
    console.error('FAILED:', error);
    process.exit(1);
  } finally {
    if (fs.existsSync(CSV_PATH)) {
      fs.unlinkSync(CSV_PATH);
    }
  }
}

run();
