
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const filePath = path.join(__dirname, 'libros.txt');

async function checkEncoding() {
  console.log('Checking file:', filePath);

  try {
    // We cannot easily use readline with 'binary' encoding in standard node quickly without stream hacking
    // But we can read as buffer and search.
    // Or just use 'latin1' encoding for fs.createReadStream
    
    console.log('--- Latin1/Binary Interpretation ---');
    const streamLatin1 = fs.createReadStream(filePath, { encoding: 'latin1' });
    const rlLatin1 = readline.createInterface({ input: streamLatin1, crlfDelay: Infinity });
    
    let foundLatin1 = false;
    for await (const line of rlLatin1) {
      if (line.includes('0000015')) {
        console.log(line);
        foundLatin1 = true;
        break; 
      }
    }
    if (!foundLatin1) console.log('Line 0000015 not found in Latin1 check');
    rlLatin1.close();


    console.log('\n--- UTF-8 Interpretation ---');
    const streamUtf8 = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rlUtf8 = readline.createInterface({ input: streamUtf8, crlfDelay: Infinity });

    let foundUtf8 = false;
    for await (const line of rlUtf8) {
      if (line.includes('0000015')) {
        console.log(line);
        foundUtf8 = true;
        break;
      }
    }
    if (!foundUtf8) console.log('Line 0000015 not found in UTF-8 check');
    rlUtf8.close();

  } catch (err) {
    console.error('Error:', err);
  }
}

checkEncoding();
