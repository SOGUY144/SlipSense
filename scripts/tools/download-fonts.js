const https = require('https');
const fs = require('fs');
const path = require('path');

const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
const fontBoldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf';

async function downloadAndEncode(url, name) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        resolve({ name, base64 });
      });
      res.on('error', reject);
    });
  });
}

async function main() {
  try {
    const regular = await downloadAndEncode(fontUrl, 'Sarabun');
    const bold = await downloadAndEncode(fontBoldUrl, 'Sarabun-Bold');
    
    const tsContent = `export const THSarabun = "${regular.base64}";\nexport const THSarabunBold = "${bold.base64}";\n`;
    
    const dir = path.join(__dirname, 'lib', 'fonts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(path.join(dir, 'Sarabun.ts'), tsContent);
    console.log('Font successfully encoded and saved!');
  } catch (error) {
    console.error('Failed to download fonts:', error);
  }
}

main();
