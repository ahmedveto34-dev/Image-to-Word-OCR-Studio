const fs = require('fs');

function updateFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(
    /Insert exactly `\!\[Engineering Drawing\]\(__DRAWING_0__\)` in the markdown where the first drawing appears, `\!\[Engineering Drawing\]\(__DRAWING_1__\)` for the second, etc\./g,
    'Insert exactly `![<وصف موجز للرسمة>](__DRAWING_0__)` in the markdown where the first drawing appears, replacing <وصف موجز للرسمة> with a short descriptive title in the document language (e.g., `![رسم بياني](__DRAWING_0__)`). Use __DRAWING_1__ for the second, etc.'
  );
  fs.writeFileSync(file, code);
}

updateFile('server.ts');
updateFile('src/services/ocrService.ts');
