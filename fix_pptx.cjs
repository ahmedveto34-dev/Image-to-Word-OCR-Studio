const fs = require('fs');
let code = fs.readFileSync('src/services/pptxExporter.ts', 'utf-8');

const replacement = `export async function exportToPowerPoint(
  markdown: string,
  options: PptxExportOptions & { drawings?: Record<string, string> }
): Promise<void> {
  let resolvedMarkdown = markdown;
  if (options.drawings) {
    for (const [key, base64] of Object.entries(options.drawings)) {
      resolvedMarkdown = resolvedMarkdown.replace(new RegExp(key, 'g'), base64);
    }
  }

  const pptx = new pptxgenjs();`;

code = code.replace(
  /export async function exportToPowerPoint\([\s\S]*?const pptx = new pptxgenjs\(\);/,
  replacement
);

code = code.replace(
  'const slidesData = parseMarkdownToSlides(markdown);',
  'const slidesData = parseMarkdownToSlides(resolvedMarkdown);'
);

fs.writeFileSync('src/services/pptxExporter.ts', code);
