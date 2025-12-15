
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const booksFile = path.resolve(__dirname, '../files/libros_convertidos_schema.json');

const books = JSON.parse(fs.readFileSync(booksFile, 'utf8'));
if (books.length > 0) {
    console.log("Keys in first book:", Object.keys(books[0]));
}
