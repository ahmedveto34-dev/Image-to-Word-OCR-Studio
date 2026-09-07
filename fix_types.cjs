const fs = require('fs');

let code = fs.readFileSync('src/types.ts', 'utf-8');

// Add drawings to OCRResult
code = code.replace(
  '  detectedElements: OCRDetectedElements;\n}',
  '  detectedElements: OCRDetectedElements;\n  drawings?: Record<string, string>;\n}'
);

// Add drawings to DocumentPage
code = code.replace(
  '  detectedElements?: OCRDetectedElements;\n}',
  '  detectedElements?: OCRDetectedElements;\n  drawings?: Record<string, string>;\n}'
);

// Add drawings to DocumentItem
code = code.replace(
  '  stats: {\n    totalPages: number;',
  '  drawings?: Record<string, string>;\n  stats: {\n    totalPages: number;'
);

fs.writeFileSync('src/types.ts', code);
