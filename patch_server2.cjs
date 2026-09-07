const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "result: response.text || '',",
  "result: (response.text || '').replace(/^\\s*\`\`\`(?:markdown)?\\n([\\s\\S]*?)\\n\`\`\`\\s*$/i, '$1'),"
);

fs.writeFileSync('server.ts', code);
