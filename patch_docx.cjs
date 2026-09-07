const fs = require('fs');

let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');

// 1. Strip markdown wrapper
const stripCode = `
  if (options.drawings) {
    for (const [key, base64] of Object.entries(options.drawings)) {
      resolvedMarkdown = resolvedMarkdown.replace(new RegExp(key, 'g'), base64);
    }
  }

  // Strip markdown block if it wraps the whole document (AI hallucination)
  const mdMatch = resolvedMarkdown.match(/\`\`\`(?:markdown)?\\n([\\s\\S]*?)\\n\`\`\`/i);
  if (mdMatch && mdMatch[1].length > resolvedMarkdown.length * 0.5) {
    resolvedMarkdown = mdMatch[1];
  }
`;
code = code.replace(
  /if \(options\.drawings\) \{[\s\S]*?\}\n\s*\}/,
  stripCode.trim()
);

// 2. Fix Math block newlines
code = code.replace(
  /children: \[\s*new TextRun\(\{\s*text: codeText,\s*bold: true,\s*font: 'Cambria Math',\s*size: halfPoints \+ 2,\s*color: palette\.primary,\s*\}\),\s*\],/g,
  `children: codeBuffer.map((line, i) => new TextRun({
                text: line,
                bold: true,
                font: 'Cambria Math',
                size: halfPoints + 2,
                color: palette.primary,
                break: i > 0 ? 1 : 0
              })),`
);

// 3. Fix Code block newlines
code = code.replace(
  /children: \[\s*new TextRun\(\{\s*text: codeText,\s*font: 'Consolas',\s*size: halfPoints - 2,\s*color: palette\.secondary,\s*\}\),\s*\],/g,
  `children: codeBuffer.map((line, i) => new TextRun({
                text: line,
                font: 'Consolas',
                size: halfPoints - 2,
                color: palette.secondary,
                break: i > 0 ? 1 : 0
              })),`
);

fs.writeFileSync('src/utils/docxExport.ts', code);
