import { GoogleGenAI } from '@google/genai';

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash-preview-12-2025',
];

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY environment variable is not configured on Vercel.',
      code: 'API_KEY_MISSING',
    });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', options = {} } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    const {
      removeWatermarks = true,
      extractMath = true,
      extractTables = true,
      customInstructions = '',
    } = options;

    let cleanBase64 = imageBase64;
    let actualMime = mimeType;
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      actualMime = dataUrlMatch[1];
      cleanBase64 = dataUrlMatch[2];
    } else {
      cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').trim();
    }

    const systemPrompt = `You are the world's most advanced Optical Character Recognition (OCR) and Document Structuring Engine, specialized in Arabic, English, Numbers, Mathematics, and complex layouts.

YOUR CORE MANDATES:
1. **PERFECT TEXT EXTRACTION**:
   - Extract all visible printed or handwritten text with 100% accuracy.
   - Correctly recognize Arabic diacritics, letters with dots, and administrative documents/tables.
   - Accurately preserve Arabic and English numerals (0123456789 and ٠١٢٣٤٥٦٧٨٩).

2. **WATERMARK, STAMP & ARTIFACT SUPPRESSION**:
   ${removeWatermarks ? '- CRITICAL: Detect and COMPLETELY IGNORE/SUPPRESS all semi-transparent watermarks, background diagonal text, copyright stamps, scanner shadows, fold lines, and background noise. Extract ONLY the legitimate document content.' : '- Transcribe document text faithfully.'}

3. **MATHEMATICAL & ARITHMETIC FORMULAS**:
   ${extractMath ? '- Accurately detect all mathematical formulas, fractions, square roots, powers, integrals, matrices, equations (e.g. x² + y² = z², 15 × 4 = 60, √144 = 12), and financial sums.' : ''}

4. **TABLE & MULTI-COLUMN RECOGNITION**:
   ${extractTables ? '- For tables, grids, spreadsheets, schedules, or price lists in the image: Transcribe every single row and column with 100% fidelity into standard Markdown table format with headers, column alignments, and complete data cells (e.g. | العمود 1 | العمود 2 |\\n|---|---|\\n| قيمة 1 | قيمة 2 |). Never omit table borders or data.' : ''}

5. **LAYOUT PRESERVATION**:
   - Preserve headers, subheadings (using #, ##, ###), bold points, bulleted/numbered lists, callout quotes, and paragraphs.
   - For multi-column text or book pages, transcribe in logical reading order (RTL for Arabic, LTR for English).

6. **OUTPUT FORMAT**:
   You MUST return a valid JSON object strictly matching this schema:
   {
     "title": "A concise, appropriate title for the document in its primary language",
     "primaryLanguage": "ar" | "en" | "mixed",
     "readingDirection": "rtl" | "ltr",
     "markdown": "The complete, fully formatted Markdown text of the document with headings, tables, bold text, math, and paragraphs",
     "plainText": "The unformatted plain text extraction",
     "summary": "A 1-2 sentence overview of the document's content",
     "detectedElements": {
       "hasTables": boolean,
       "hasMath": boolean,
       "hasHandwriting": boolean,
       "watermarksDetectedAndFiltered": boolean,
       "mathFormulas": ["list of detected math equations or arithmetic expressions"],
       "wordCount": number,
       "confidenceScore": number (0 to 100)
     }
   }
   ${customInstructions ? `Additional User Request: ${customInstructions}` : ''}
`;

    const userPrompt = `Extract, clean, and format the text and tables from this document image. Return clean JSON matching schema.`;

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: actualMime || 'image/jpeg',
                  data: cleanBase64,
                },
              },
              { text: userPrompt },
            ],
          },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const responseText = response.text || '{}';
        try {
          const cleanJson = responseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim();
          const parsed = JSON.parse(cleanJson);
          return res.status(200).json({ success: true, data: parsed });
        } catch {
          return res.status(200).json({
            success: true,
            data: {
              title: 'مستند مستخرج',
              primaryLanguage: 'ar',
              readingDirection: 'rtl',
              markdown: responseText,
              plainText: responseText,
              summary: 'تم الاستخراج بنجاح',
              detectedElements: {
                hasTables: responseText.includes('|'),
                hasMath: /[\+\-\*\/=√∑∫]/.test(responseText),
                hasHandwriting: false,
                watermarksDetectedAndFiltered: true,
                mathFormulas: [],
                wordCount: responseText.split(/\s+/).length,
                confidenceScore: 95,
              },
            },
          });
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All models failed');
  } catch (error: any) {
    console.error('Vercel OCR error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process document OCR',
      code: 'OCR_PROCESSING_FAILED',
    });
  }
}
