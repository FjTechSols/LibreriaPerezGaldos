import https from 'https';

const ABE_USER = process.env.ABEBOOKS_USER_ID || 'dummy';
const ABE_KEY = process.env.ABEBOOKS_API_KEY || 'dummy';

const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<inventoryUpdateRequest version="1.0">
  <action name="bookupdate">
    <username>PerezGaldos</username>
    <password>TestingPassword123</password>
  </action>
  <AbebookList>
    <Abebook>
      <transactionType>add</transactionType>
      <vendorBookID>999999</vendorBookID>
      <isbn>9788412345678</isbn>
      <title><![CDATA[Test Book From API]]></title>
      <author><![CDATA[Author Test]]></author>
      <publisher><![CDATA[Test Publisher]]></publisher>
      <year>2026</year>
      <price>15.00</price>
      <quantity>1</quantity>
      <description><![CDATA[This is a test book description.]]></description>
    </Abebook>
  </AbebookList>
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
