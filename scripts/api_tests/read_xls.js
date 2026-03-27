import xlsx from 'xlsx';
import fs from 'fs';

const workbook = xlsx.readFile('scripts/files/abehelp-inventory-upload-template-2024-10.xls');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1});

fs.writeFileSync('scripts/api_tests/headers.json', JSON.stringify(data[0], null, 2));
console.log("Headers guardados en scripts/api_tests/headers.json");
