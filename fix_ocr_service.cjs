const fs = require('fs');

let code = fs.readFileSync('src/services/ocrService.ts', 'utf-8');

const processDrawingsNew = `async function processDrawings(data: OCRResult & { drawings?: any }, base64: string, mimeType: string): Promise<OCRResult> {
  const originalDrawings = data.drawings;
  data.drawings = {}; // Initialize as dictionary

  if (!originalDrawings || !Array.isArray(originalDrawings) || originalDrawings.length === 0) {
    return data;
  }
  
  // Ensure we have a valid data URL
  let imageSrc = base64;
  if (!base64.startsWith('data:')) {
    imageSrc = \`data:\${mimeType || 'image/jpeg'};base64,\${base64}\`;
  }

  for (const drawing of originalDrawings) {
    if (!drawing.id || !drawing.box || drawing.box.length !== 4) continue;
    
    try {
       const croppedBase64 = await cropImage(imageSrc, drawing.box);
       const drawingKey = \`__\${drawing.id.replace(/__/g, '')}__\`;
       data.drawings[drawingKey] = croppedBase64;
    } catch (e) {
       console.error("Failed to crop drawing", drawing.id, e);
    }
  }
  return data;
}`;

code = code.replace(
  /async function processDrawings[\s\S]*?async function cropImage/m,
  processDrawingsNew + '\n\nasync function cropImage'
);

fs.writeFileSync('src/services/ocrService.ts', code);
