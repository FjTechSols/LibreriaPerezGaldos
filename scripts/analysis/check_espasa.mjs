
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('scripts/analysis/advanced_cleanup_proposal.json', 'utf8'));
const espasa = data.topMerges.find(m => m.targetName === 'Espasa-Calpe');
if (espasa) {
    console.log("Found Espasa-Calpe group:");
    console.log(`Count: ${espasa.count}`);
    console.log("Variations sample:", espasa.variations.slice(0, 10));
} else {
    console.log("Espasa-Calpe not found in topMerges.");
    // Search in others?
    // Maybe verify if any group contains "Espasa"?
    const anyEspasa = data.topMerges.find(m => m.targetName.includes('Espasa') || m.variations.some(v => v.includes('Espasa')));
    if (anyEspasa) {
         console.log("Found SIMILAR group:", anyEspasa.targetName);
    }
}
