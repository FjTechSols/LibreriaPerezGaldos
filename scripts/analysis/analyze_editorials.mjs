
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

let envConfig = dotenv.config({ path: path.join(rootDir, '.env') });
if (envConfig.error) {
  envConfig = dotenv.config({ path: path.join(rootDir, '.env.development') });
}

console.log("Starting analysis script...");
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.error("Missing Supabase URL or Key");
   process.exit(1);
}
console.log(`URL: ${supabaseUrl}`);
console.log(`Key present: ${!!supabaseKey} (Service Role: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY})`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeEditorials() {
    console.log("📊 Analyzing Editorials...");
    
    // 1. Total Count
    const { count, error } = await supabase.from('editoriales').select('*', { count: 'exact', head: true });
    if (error) {
        console.error("Error counts:", error);
        return;
    }
    console.log(`Total Editorials: ${count}`);

    // 2. Fetch all to check for simple duplicates or issues
    // Using pagination if too large, but let's try getting name only
    const { data: editorials, error: errFetch } = await supabase
        .from('editoriales')
        .select('id, nombre')
        .limit(1000)
        .order('nombre');
        
    if (errFetch) {
        console.error("Error fetching names:", errFetch);
        return;
    }

    // 3. Analyze content
    const nameMap = new Map();
    const suspicious = [];
    
    editorials.forEach(ed => {
        const nameClean = ed.nombre.trim().toLowerCase();
        if (!nameMap.has(nameClean)) {
            nameMap.set(nameClean, []);
        }
        nameMap.get(nameClean).push(ed);
        
        if (ed.nombre.trim() === '') suspicious.push({ type: 'Empty Name', ...ed });
        if (ed.nombre.length < 2) suspicious.push({ type: 'Very Short Name', ...ed });
    });

    // 4. Report Duplicates
    const duplicates = Array.from(nameMap.entries())
        .filter(([_, list]) => list.length > 1)
        .map(([name, list]) => ({ name, count: list.length, ids: list.map(i => i.id) }));
        
    const report = {
        total: count,
        duplicatesCount: duplicates.length,
        potentialDuplicates: duplicates.slice(0, 50), // Increased sample
        suspiciousCount: suspicious.length,
        suspiciousSample: suspicious.slice(0, 20)
    };
    
    const fs = await import('fs');
    fs.writeFileSync('scripts/analysis/analysis_editorials_result.json', JSON.stringify(report, null, 2));
    console.log("Report written to scripts/analysis/analysis_editorials_result.json");
}

analyzeEditorials();
