const fs = require('fs');
let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');

const replacement = `  let resolvedMarkdown = markdownText;
  if (options.drawings) {
    for (const [key, base64] of Object.entries(options.drawings)) {
      resolvedMarkdown = resolvedMarkdown.replace(new RegExp(key, 'g'), base64);
    }
  }
  const preprocessedText = resolvedMarkdown.replace(/!\\[(.*?)\\]\\((.*?)\\)/g, '\\n\\n![$1]($2)\\n\\n');`;

code = code.replace(
  "  const preprocessedText = markdownText.replace(/!\\[(.*?)\\]\\((.*?)\\)/g, '\\n\\n![$1]($2)\\n\\n');",
  replacement
);

fs.writeFileSync('src/utils/docxExport.ts', code);
