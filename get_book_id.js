import https from 'node:https';

const url = "https://weaihscsaqxadxjgsfbt.supabase.co/rest/v1/libros?select=id,titulo&limit=1";
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzIwOTUsImV4cCI6MjA3NDg0ODA5NX0.uKzFp5yYPrbcjpDiKTKugfG6QzJ7raVf-swAPMsau9E";

const options = {
  headers: {
    'apikey': apikey,
    'Authorization': `Bearer ${apikey}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
