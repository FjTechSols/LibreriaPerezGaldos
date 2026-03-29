import https from 'https';

const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<inventoryUpdateRequest version="1.0">
  <action name="INVALID_ACTION_NAME">
    <username>PerezGaldos</username>
    <password>TestingPassword123</password>
  </action>
</inventoryUpdateRequest>`;

const req = https.request({
  hostname: 'inventoryupdate.abebooks.com',
  port: 10027,
  path: '/',
  method: 'POST',
  headers: { 
    'Content-Type': 'text/xml; charset=ISO-8859-1',
    'Content-Length': Buffer.byteLength(xml)
  }
}, res => {
  let data = '';
  console.log('Status code:', res.statusCode);
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', e => console.error(e));
req.write(xml);
req.end();
