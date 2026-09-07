const fs = require('fs');

function updateFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  
  const oldText = '- If the document contains engineering drawings, architectural plans, graphs, charts, or illustrations, you MUST isolate their position.';
  const newText = '- If the document contains engineering drawings, architectural plans, graphs, charts, or illustrations, you MUST isolate their position.\n   - VERY IMPORTANT: The bounding box MUST tightly wrap ONLY the visual/geometric shape itself. Any text, questions, or paragraphs located above, below, or around the shape MUST NOT be included in the image bounding box. You must transcribe that text normally as part of the markdown.';
  
  code = code.replace(oldText, newText);
  fs.writeFileSync(file, code);
}

updateFile('server.ts');
updateFile('src/services/ocrService.ts');
