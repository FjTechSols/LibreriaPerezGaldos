import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const ABEBOOKS_API_URL = 'https://inventoryupdate.abebooks.com:10027';
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
const DELAY_MS = Number(process.env.ABEBOOKS_DELETE_DELAY_MS || 500);
const DELETE_SCOPE = process.env.ABEBOOKS_DELETE_SCOPE || 'ineligible';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const abeUser = process.env.ABEBOOKS_USERNAME || process.env.ABEBOOKS_USER_ID;
const abeKey = process.env.ABEBOOKS_API_KEY;

if (!supabaseUrl || !supabaseKey || !abeUser || !abeKey) {
  console.error('Falta configuracion. Necesitas Supabase URL/key y ABEBOOKS_USERNAME/USER_ID + ABEBOOKS_API_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function escapeXml(value) {
  return String(value || '').replace(/[<>&'"]/g, char => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

function buildDeleteXml(vendorIds) {
  const booksXml = vendorIds.map(vendorId => `    <Abebook>
      <transactionType>delete</transactionType>
      <vendorBookID>${escapeXml(vendorId)}</vendorBookID>
    </Abebook>`).join('\n');

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<inventoryUpdateRequest version="1.0">
  <action name="bookupdate">
    <username>${escapeXml(abeUser)}</username>
    <password>${escapeXml(abeKey)}</password>
  </action>
  <AbebookList>
${booksXml}
  </AbebookList>
</inventoryUpdateRequest>`;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMinPrice() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'integrations')
      .single();

    return Number(data?.value?.abeBooks?.ftps?.minPrice || 12);
  } catch (error) {
    console.warn(`No se pudo leer minPrice. Usando 12. ${error.message}`);
    return 12;
  }
}

async function collectDeleteVendorIds(minPrice) {
  const vendorIds = [];
  let from = 0;

  while (true) {
    const { data: books, error } = await supabase
      .from('libros')
      .select('legacy_id, stock, precio')
      .not('legacy_id', 'is', null)
      .neq('legacy_id', '')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!books || books.length === 0) break;

    for (const book of books) {
      const vendorId = String(book.legacy_id || '').trim();
      if (!vendorId) continue;

      if (DELETE_SCOPE === 'all' || Number(book.stock) < 1 || Number(book.precio) < minPrice) {
        vendorIds.push(vendorId);
      }
    }

    console.log(`Revisados ${from + books.length} libros. Bajas candidatas: ${vendorIds.length}`);

    if (books.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return vendorIds;
}

async function sendDeleteBatch(vendorIds, batchNumber, totalBatches) {
  const response = await fetch(ABEBOOKS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=ISO-8859-1',
    },
    body: buildDeleteXml(vendorIds),
  });

  const text = await response.text();
  const lowerText = text.toLowerCase();
  const ok = response.ok && !lowerText.includes('<requesterror') && !lowerText.includes('failure');

  if (!ok) {
    throw new Error(`Lote ${batchNumber}/${totalBatches} rechazado: HTTP ${response.status} ${text.slice(0, 500)}`);
  }

  console.log(`Lote ${batchNumber}/${totalBatches} enviado (${vendorIds.length} bajas).`);
}

async function run() {
  const minPrice = await getMinPrice();
  console.log(`Buscando libros para baja en AbeBooks. scope=${DELETE_SCOPE}, minPrice=${minPrice}`);

  const vendorIds = await collectDeleteVendorIds(minPrice);
  const uniqueVendorIds = [...new Set(vendorIds)];
  const totalBatches = Math.ceil(uniqueVendorIds.length / BATCH_SIZE);

  console.log(`Total bajas a enviar: ${uniqueVendorIds.length}. Lotes: ${totalBatches}`);

  if (process.env.DRY_RUN === 'true') {
    console.log('DRY_RUN=true. No se envia nada a AbeBooks.');
    console.log(`DELETE_COUNT=${uniqueVendorIds.length}`);
    return;
  }

  let sent = 0;
  for (let i = 0; i < uniqueVendorIds.length; i += BATCH_SIZE) {
    const batch = uniqueVendorIds.slice(i, i + BATCH_SIZE);
    await sendDeleteBatch(batch, Math.floor(i / BATCH_SIZE) + 1, totalBatches);
    sent += batch.length;
    if (i + BATCH_SIZE < uniqueVendorIds.length && DELAY_MS > 0) {
      await wait(DELAY_MS);
    }
  }

  console.log(`Bajas enviadas: ${sent}`);
  console.log(`DELETE_COUNT=${sent}`);
}

run().catch(error => {
  console.error('FAILED:', error);
  process.exit(1);
});
