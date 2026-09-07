const fs = require('fs');

let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');

// Replace hardcoded type: 'png' with dynamic type resolution in both places
code = code.replace(
  /type: 'png'/g,
  "type: imgUrl.includes('image/jpeg') || imgUrl.includes('.jpg') || imgUrl.includes('.jpeg') ? 'jpg' : 'png'"
);

fs.writeFileSync('src/utils/docxExport.ts', code);
