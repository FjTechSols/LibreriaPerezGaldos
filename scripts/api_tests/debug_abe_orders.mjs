import fs from 'fs';

const xmlText = fs.readFileSync('test_out.txt', 'utf8');

const orderMatches = [...xmlText.matchAll(/<purchaseOrder\b([^>]*)>([\s\S]*?)<\/purchaseOrder>/gis)];
console.log(`✅ Found ${orderMatches.length} orders in XML response.`);

const orders = [];

for (const match of orderMatches) {
  const orderAttr = match[1];
  const xml = match[2];

  const idMatch = orderAttr.match(/id="([^"]+)"/i);
  const orderIdAttr = idMatch ? idMatch[1] : '';

  const getTag = (tag) => {
    const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? m[1].trim() : '';
  };

  const getNum = (tag) => {
    const val = getTag(tag);
    return val ? parseFloat(val) : 0;
  };

  // Parse order items  (<purchaseOrderItem> blocks)
  const itemMatches = [...xml.matchAll(/<purchaseOrderItem\b[^>]*>([\s\S]*?)<\/purchaseOrderItem>/gi)];
  const items = itemMatches.map(im => {
    const ix = im[1];
    const getItemTag = (tag) => {
      const m = ix.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    return {
      sku: getItemTag('vendorKey') || getItemTag('bookId') || getItemTag('sku') || '',
      title: getItemTag('title') || '',
      author: getItemTag('author') || '',
      quantity: 1, // AbeBooks orders are always 1 item per purchaseOrderItem
      price: parseFloat(getItemTag('price') || getItemTag('bookPrice') || '0'),
    };
  });

  const orderId = orderIdAttr || getTag('abepoid') || getTag('purchaseOrderNumber') || getTag('id') || '';
  const rawStatus = getTag('orderStatus') || getTag('status') || 'Ordered';
  
  const statusMap = {
    'Ordered': 'New',
    'Processed': 'Acknowledged',
    'Shipped': 'Shipped',
    'Cancelled': 'Cancelled',
    'Expired': 'Cancelled',
    'Rejected': 'Cancelled',
  };
  const status = statusMap[rawStatus] || 'New';

  const year = getTag('year');
  const month = getTag('month');
  const day = getTag('day');
  let orderDate;
  if (year && month && day) {
    orderDate = new Date(parseInt(year), parseInt(month)-1, parseInt(day)).toISOString();
  } else {
    orderDate = getTag('orderDate') || getTag('dateOrdered') || new Date().toISOString();
  }

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

console.log(JSON.stringify(orders, null, 2));
