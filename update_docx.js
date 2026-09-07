const fs = require('fs');

let code = fs.readFileSync('src/utils/docxExport.ts', 'utf-8');

// 1. Replace parseInlineFormatting definition
code = code.replace(
  /function parseInlineFormatting\([\s\S]*?return runs\.length > 0 \? runs : \[new TextRun\(\{ text: '' \}\)\];\n\}/m,
  `async function parseInlineFormatting(
  text: string,
  fontFamily: string,
  halfPoints: number,
  color: string,
  isRtl: boolean
): Promise<(TextRun | ImageRun)[]> {
  const runs: (TextRun | ImageRun)[] = [];
  const parts = text.split(/(!\\[.*?\\]\\(.*?\\)|\\*\\*.*?\\*\\*|\\*.*?\\*|\`.*?\`|~~.*?~~|<u>.*?<\\/u>|==.*?==)/g);

  for (const chunk of parts) {
    if (!chunk) continue;

    if (chunk.startsWith('![') && chunk.includes('](') && chunk.endsWith(')')) {
      const imgMatch = chunk.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
      if (imgMatch) {
        const altText = imgMatch[1];
        const imgUrl = imgMatch[2];
        const imageBuffer = await fetchImageBuffer(imgUrl);
        if (imageBuffer) {
          try {
            const dims = await getImageDimensions(imgUrl);
            const maxWidth = 550;
            const scale = Math.min(1, maxWidth / dims.width);
            const width = Math.round(dims.width * scale);
            const height = Math.round(dims.height * scale);
            runs.push(
              new ImageRun({
                data: imageBuffer,
                transformation: { width, height },
                type: 'png'
              })
            );
            continue;
          } catch(e) {
            console.error("Failed to inject inline markdown image", e);
          }
        }
      }
    } else if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          italics: true,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('~~') && chunk.endsWith('~~') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          strike: true,
          font: fontFamily,
          size: halfPoints,
          color: '94A3B8',
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('<u>') && chunk.endsWith('</u>')) {
      runs.push(
        new TextRun({
          text: chunk.slice(3, -4),
          underline: {},
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('==') && chunk.endsWith('==') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          shading: {
            type: ShadingType.CLEAR,
            fill: 'FEF08A',
          },
          font: fontFamily,
          size: halfPoints,
          color: '854D0E',
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('\`') && chunk.endsWith('\`') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          font: 'Consolas',
          size: halfPoints - 2,
          color: 'B45309',
          shading: {
            type: ShadingType.CLEAR,
            fill: 'F1F5F9',
          },
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: chunk,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: '' })];
}`
);

// 2. Replace calls to parseInlineFormatting with await parseInlineFormatting
code = code.replace(/children:\s*parseInlineFormatting\(/g, 'children: await parseInlineFormatting(');
code = code.replace(/\.\.\.parseInlineFormatting\(/g, '...(await parseInlineFormatting(');
// The spread ones need to close the paren: ...await parseInlineFormatting(...) is invalid, we need ...(await parseInlineFormatting(...))
// Wait, the regex replace above: `...(await parseInlineFormatting(args` misses the closing parenthesis!
