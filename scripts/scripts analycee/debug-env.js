console.log("Keys in process.env:");
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('VITE')) {
    console.log(key);
  }
});
