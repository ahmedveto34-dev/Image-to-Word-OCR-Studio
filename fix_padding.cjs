const fs = require('fs');

let code = fs.readFileSync('src/services/ocrService.ts', 'utf-8');
code = code.replace(
  'const padding = 15;',
  'const padding = Math.max(15, Math.floor(Math.min(img.width, img.height) * 0.03)); // 3% padding'
);
fs.writeFileSync('src/services/ocrService.ts', code);
