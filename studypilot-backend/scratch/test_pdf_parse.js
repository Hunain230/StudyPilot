const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function test() {
  const pdfPath = path.join(__dirname, '..', 'uploads', 'pdfs', '633c46e5-3380-4814-a389-141afee0d110.pdf');
  console.log('Testing PDF parse on file:', pdfPath);
  
  if (!fs.existsSync(pdfPath)) {
    console.error('Test PDF file does not exist');
    return;
  }
  
  try {
    const buffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    
    console.log('--- Metadata ---');
    console.log('Total pages:', data.total);
    console.log('Text length:', data.text ? data.text.length : 0);
    console.log('--- Text Sample (first 500 chars) ---');
    console.log(data.text ? data.text.substring(0, 500) : 'NO TEXT');
  } catch (error) {
    console.error('Error during parsing:', error);
  }
}

test();
