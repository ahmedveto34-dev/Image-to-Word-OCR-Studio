const fs = require('fs');
let code = fs.readFileSync('src/services/ocrService.ts', 'utf-8');
code = code.replace(
  "systemInstruction,\n          temperature: 0.2,",
  "systemInstruction: systemInstruction + ' IMPORTANT: Return ONLY the transformed text. DO NOT add any conversational preamble like \"Here is the text\". DO NOT wrap the output in ```markdown blocks.',\n          temperature: 0.2,"
);
fs.writeFileSync('src/services/ocrService.ts', code);
