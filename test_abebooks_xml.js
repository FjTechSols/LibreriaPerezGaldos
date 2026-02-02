const url = "https://weaihscsaqxadxjgsfbt.supabase.co/functions/v1/upload-to-abebooks";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWloc2NzYXF4YWR4amdzZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzIwOTUsImV4cCI6MjA3NDg0ODA5NX0.uKzFp5yYPrbcjpDiKTKugfG6QzJ7raVf-swAPMsau9E";

async function test() {
  try {
    console.log("Testing connection to:", url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookId: 457430 }) 
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
