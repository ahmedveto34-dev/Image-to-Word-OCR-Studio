const fs = require('fs');
let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');
code = code.replace(
  'const lines = markdownText.split(/\\r?\\n/);',
  'const preprocessedText = markdownText.replace(/!\\[(.*?)\\]\\((.*?)\\)/g, \'\\n\\n![$1]($2)\\n\\n\');\n  const lines = preprocessedText.split(/\\r?\\n/);'
);
fs.writeFileSync('src/utils/docxExport.ts', code);
