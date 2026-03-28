import https from 'https';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<inventoryUpdateRequest>
  <authentication>
    <userId>someUser</userId>
    <password>somePass</password>
  </authentication>
  <action>add</action>
  <book>
    <vendorBookID>99999</vendorBookID>
    <title><![CDATA[Test Book]]></title>
    <author><![CDATA[Test Author]]></author>
    <price>15.00</price>
    <quantity>1</quantity>
  </book>
</inventoryUpdateRequest>`;

const req = https.request({
  hostname: 'inventoryupdate.abebooks.com',
  port: 10027,
  path: '/',
  method: 'POST',
  headers: { 
    'Content-Type': 'text/xml',
    'Content-Length': Buffer.byteLength(xml)
  }
}, res => {
  let data = '';
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', e => console.error(e));
req.write(xml);
req.end();
