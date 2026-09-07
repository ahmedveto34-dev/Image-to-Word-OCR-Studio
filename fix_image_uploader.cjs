const fs = require('fs');

let code = fs.readFileSync('src/components/ImageUploader.tsx', 'utf-8');

// 1. Add `let combinedDrawings: Record<string, string> = {};` before the loop
code = code.replace(
  'let totalWordCount = 0;',
  'let totalWordCount = 0;\n      let combinedDrawings: Record<string, string> = {};'
);

// 2. Add `drawings: ocrResult.drawings,` to pages.push
code = code.replace(
  'detectedElements: ocrResult.detectedElements,',
  'detectedElements: ocrResult.detectedElements,\n          drawings: ocrResult.drawings,'
);

// 3. Merge drawings into combinedDrawings
code = code.replace(
  'if (ocrResult.markdown) {',
  'if (ocrResult.drawings) {\n          Object.assign(combinedDrawings, ocrResult.drawings);\n        }\n        if (ocrResult.markdown) {'
);

// 4. Add `drawings: combinedDrawings,` to newDoc
code = code.replace(
  'category: selectedFiles.length > 2',
  'drawings: combinedDrawings,\n        category: selectedFiles.length > 2'
);

fs.writeFileSync('src/components/ImageUploader.tsx', code);
