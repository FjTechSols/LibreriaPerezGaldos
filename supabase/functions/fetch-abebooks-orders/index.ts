
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

// AbeBooks Order Update API endpoint (POST with XML body)
// Docs: https://www.abebooks.com/docs/AbeBooks-order-update-API.pdf
const ABEBOOKS_ORDER_API = 'https://orderupdate.abebooks.com:10003';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // AbeBooks uses userId (username) + apiKey (password) for auth
    const userId = Deno.env.get('ABEBOOKS_USER_ID') || Deno.env.get('ABEBOOKS_USERNAME');
    const apiKey = Deno.env.get('ABEBOOKS_API_KEY');

    if (!userId || !apiKey) {
      throw new Error('AbeBooks credentials not configured. Need ABEBOOKS_USER_ID (or ABEBOOKS_USERNAME) and ABEBOOKS_API_KEY.');
    }

    console.log(`📦 Fetching orders from AbeBooks API for user: ${userId.substring(0, 4)}...`);

    // Build the XML request body per AbeBooks Order Update API spec
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<orderUpdateRequest version="1.1">
  <action name="getAllNewOrders">
    <username>${escapeXml(userId)}</username>
    <password>${escapeXml(apiKey)}</password>
  </action>
</orderUpdateRequest>`;

    console.log('📤 Sending POST XML request to AbeBooks Order API...');

    // Add 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(ABEBOOKS_ORDER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'Accept': 'text/xml',
        },
        body: xmlBody,
        signal: controller.signal
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({
          error: 'AbeBooks API timeout (30s). The API may be slow, try again later.'
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    const xmlText = await response.text();
    console.log(`📄 Received response (HTTP ${response.status}, ${(xmlText.length / 1024).toFixed(2)} KB)`);
    console.log(`🔍 Response preview: ${xmlText.substring(0, 500)}`);

    // AbeBooks may return errors in the XML even with 200 status
    if (xmlText.includes('<error>') || xmlText.includes('<Error>')) {
      const errorMatch = xmlText.match(/<(?:error|Error)>(.*?)<\/(?:error|Error)>/s);
      const errorMsg = errorMatch ? errorMatch[1].trim() : 'Unknown AbeBooks API Error';
      throw new Error(`AbeBooks API Error: ${errorMsg}`);
    }

    if (!response.ok && !xmlText.includes('<purchaseOrderList')) {
      throw new Error(`AbeBooks API HTTP error: ${response.status} - ${xmlText.substring(0, 200)}`);
    }

    // Parse orders from the purchaseOrderList XML
    // The response wraps orders in <purchaseOrder> tags (not <order>)
    // Each order may have one or more <purchaseOrderItem> tags
    const orderMatches = [...xmlText.matchAll(/<purchaseOrder>(.*?)<\/purchaseOrder>/gs)];
    console.log(`✅ Found ${orderMatches.length} orders in XML response.`);

    const orders = [];

    for (const match of orderMatches) {
      const xml = match[1];

      const getTag = (tag: string) => {
        const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].trim() : '';
      };

      const getNum = (tag: string) => {
        const val = getTag(tag);
        return val ? parseFloat(val) : 0;
      };

      // Parse order items  (<purchaseOrderItem> blocks)
      const itemMatches = [...xml.matchAll(/<purchaseOrderItem>([\s\S]*?)<\/purchaseOrderItem>/gi)];
      const items = itemMatches.map(im => {
        const ix = im[1];
        const getItemTag = (tag: string) => {
          const m = ix.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return m ? m[1].trim() : '';
        };
        return {
          sku: getItemTag('bookId') || getItemTag('sku') || '',
          title: getItemTag('title') || '',
          author: getItemTag('author') || '',
          quantity: 1, // AbeBooks orders are always 1 item per purchaseOrderItem
          price: parseFloat(getItemTag('price') || getItemTag('bookPrice') || '0'),
        };
      });

      // Map AbeBooks XML fields to our DB schema
      const orderId = getTag('abepoid') || getTag('purchaseOrderNumber') || getTag('id') || '';
      // Map AbeBooks status to our internal statuses
      const rawStatus = getTag('orderStatus') || getTag('status') || 'Ordered';
      const statusMap: Record<string, string> = {
        'Ordered': 'New',
        'Processed': 'Acknowledged',
        'Shipped': 'Shipped',
        'Cancelled': 'Cancelled',
        'Expired': 'Cancelled',
        'Rejected': 'Cancelled',
      };
      const status = statusMap[rawStatus] || 'New';

      const orderDate = getTag('orderDate') || getTag('dateOrdered') || new Date().toISOString();

      orders.push({
        abebooks_order_id: orderId,
        order_date: orderDate,
        status,
        raw_status: rawStatus,
        customer: {
          name: getTag('buyerName') || getTag('name') || '',
          address: getTag('shippingAddress1') || getTag('address1') || '',
          address2: getTag('shippingAddress2') || getTag('address2') || '',
          city: getTag('shippingCity') || getTag('city') || '',
          postalCode: getTag('shippingPostalCode') || getTag('postalCode') || getTag('zip') || '',
          state: getTag('shippingState') || getTag('state') || '',
          country: getTag('shippingCountry') || getTag('country') || '',
          phone: getTag('buyerPhone') || getTag('phone') || '',
          email: getTag('buyerEmail') || getTag('email') || '',
        },
        items,
        subtotal: getNum('subtotal') || getNum('orderSubtotal'),
        shipping_cost: getNum('shippingCost') || getNum('shippingAmount'),
        total: getNum('orderTotal') || getNum('total'),
        currency: getTag('currency') || getTag('currencyCode') || 'EUR',
        estimated_delivery: getTag('estimatedDeliveryDate') || null,
        tracking_number: getTag('trackingNumber') || null,
        last_updated: new Date().toISOString(),
      });
    }

    // Upsert to local cache table
    if (orders.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, i + BATCH_SIZE);
        const { error: upsertError } = await supabase
          .from('abebooks_orders_cache')
          .upsert(batch, { onConflict: 'abebooks_order_id' });

        if (upsertError) {
          console.error(`DB Upsert Error batch ${i}:`, upsertError);
          throw upsertError;
        }
        console.log(`  Upserted batch ${i + 1}-${Math.min(i + BATCH_SIZE, orders.length)}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      synced: orders.length,
      message: `Successfully synced ${orders.length} orders from AbeBooks.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in fetch-abebooks-orders:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
