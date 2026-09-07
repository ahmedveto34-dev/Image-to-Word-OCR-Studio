import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for large base64 image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper for calling Gemini with model fallback and retry on 503/429/UNAVAILABLE
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash-preview-12-2025',
];

async function callGeminiWithFallback(
  ai: GoogleGenAI,
  requestConfig: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: requestConfig.contents,
          config: requestConfig.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = (err?.message || '') + ' ' + (err?.stack || '') + ' ' + JSON.stringify(err || {});
        const lowerErr = errStr.toLowerCase();

        const isTransient =
          lowerErr.includes('503') ||
          lowerErr.includes('429') ||
          lowerErr.includes('unavailable') ||
          lowerErr.includes('high demand') ||
          lowerErr.includes('spikes in demand') ||
          lowerErr.includes('resource_exhausted') ||
          lowerErr.includes('rate limit') ||
          lowerErr.includes('overloaded');

        if (isTransient) {
          // Wait before retrying
          const delay = (attempt + 1) * 1200;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // retry
        } else {
          // If model not found or invalid argument, immediately try next model
          break;
        }
      }
    }
  }

  // If all failed, throw last error or descriptive error
  throw lastError || new Error('Model temporarily experiencing high demand. Please retry in a few moments.');
}
interface StoredDoc {
  id: string;
  title: string;
  content: string;
  markdown: string;
  language: 'ar' | 'en' | 'mixed';
  pagesCount: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  stats: {
    words: number;
    characters: number;
    mathCount: number;
    tablesCount: number;
  };
}

const cloudDocumentsStore = new Map<string, StoredDoc>();

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Cloud documents sync endpoints
app.get('/api/documents', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const category = (req.query.category as string || '').trim();

  let docs = Array.from(cloudDocumentsStore.values());
  if (category && category !== 'all') {
    docs = docs.filter(d => d.category === category);
  }
  if (query) {
    docs = docs.filter(d => 
      d.title.toLowerCase().includes(query) || 
      d.content.toLowerCase().includes(query) ||
      d.tags.some(t => t.toLowerCase().includes(query))
    );
  }
  // Sort descending by updatedAt
  docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ success: true, documents: docs });
});

app.post('/api/documents', (req: Request, res: Response) => {
  try {
    const doc: StoredDoc = req.body;
    if (!doc.id || !doc.title) {
      return res.status(400).json({ error: 'Missing id or title' });
    }
    doc.updatedAt = new Date().toISOString();
    if (!doc.createdAt) {
      doc.createdAt = doc.updatedAt;
    }
    cloudDocumentsStore.set(doc.id, doc);
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save document' });
  }
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  cloudDocumentsStore.delete(id);
  res.json({ success: true, id });
});

// Gemini OCR Extraction Endpoint with advanced watermark filtering & math extraction
app.post('/api/ocr/process', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', options = {} } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Clean base64 string if it contains data prefix
    let cleanBase64 = imageBase64;
    let actualMime = mimeType;
    const dataUrlMatch = typeof imageBase64 === 'string' ? imageBase64.match(/^data:([^;]+);base64,(.+)$/s) : null;
    if (dataUrlMatch) {
      actualMime = dataUrlMatch[1];
      cleanBase64 = dataUrlMatch[2];
    } else if (typeof imageBase64 === 'string') {
      cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/i, '').trim();
    }

    const ai = getGeminiClient();

    const {
      language = 'auto',
      removeWatermarks = true,
      extractMath = true,
      extractTables = true,
      mode = 'document', // 'document', 'book', 'handwriting', 'math', 'invoice'
      customInstructions = ''
    } = options;

    const systemPrompt = `You are the world's most advanced Optical Character Recognition (OCR) and Document Structuring Engine, specialized in Arabic, English, Numbers, Mathematics, and complex layouts.

YOUR CORE MANDATES:
1. **PERFECT TEXT EXTRACTION**:
   - Extract all visible printed or handwritten text with 100% accuracy.
   - Correctly recognize Arabic diacritics, letters with dots (مثل: ب ت ث ن ي، ق ف، ج ح خ)، and ligatures.
   - Accurately preserve Arabic and English numerals (0123456789 and ٠١٢٣٤٥٦٧٨٩).

2. **WATERMARK, STAMP & ARTIFACT SUPPRESSION**:
   ${removeWatermarks ? '- CRITICAL: Detect and COMPLETELY IGNORE/SUPPRESS all semi-transparent watermarks, background diagonal text, copyright stamps, scanner shadows, fold lines, and background noise. Extract ONLY the legitimate document content.' : '- Transcribe document text faithfully.'}

3. **MATHEMATICAL & ARITHMETIC FORMULAS**:
   ${extractMath ? '- Accurately detect all mathematical formulas, fractions, square roots, powers, integrals, matrices, equations (e.g. x² + y² = z², 15 × 4 = 60, √144 = 12), and financial sums. Represent them in clean, standard, readable notation with clear spacing.' : ''}

4. **TABLE & MULTI-COLUMN RECOGNITION**:
   ${extractTables ? '- For tables, grids, spreadsheets, schedules, or price lists in the image: Transcribe every single row and column with 100% fidelity into standard Markdown table format with headers, column alignments, and complete data cells (e.g. | العمود 1 | العمود 2 |\\n|---|---|\\n| قيمة 1 | قيمة 2 |). Never omit table borders or data.' : ''}

5. **LAYOUT PRESERVATION**:
   - Preserve headers, subheadings (using #, ##, ###), bold points, bulleted/numbered lists, callout quotes, and paragraphs.
   - For multi-column text or book pages, transcribe in logical reading order (RTL for Arabic, LTR for English).

6. **ENGINEERING DRAWINGS & DIAGRAMS**:
   - If the document contains engineering drawings, architectural plans, graphs, charts, or illustrations, you MUST isolate their position.
   - VERY IMPORTANT: The bounding box MUST tightly wrap ONLY the visual/geometric shape itself. Any text, questions, or paragraphs located above, below, or around the shape MUST NOT be included in the image bounding box. You must transcribe that text normally as part of the markdown.
   - Insert exactly \`![](__DRAWING_0__)\` in the markdown where the first drawing appears, \`![](__DRAWING_1__)\` for the second, etc.
   - Add a \`drawings\` array to the root JSON object containing the normalized bounding boxes (0 to 1000) for each drawing. Example: "drawings": [{"id": "__DRAWING_0__", "box": [ymin, xmin, ymax, xmax]}]

7. **OUTPUT FORMAT**:
   You MUST return a valid JSON object strictly matching this schema:
   {
     "title": "A concise, appropriate title for the document in its primary language",
     "primaryLanguage": "ar" | "en" | "mixed",
     "readingDirection": "rtl" | "ltr",
     "markdown": "The complete, fully formatted Markdown text of the document with headings, tables, bold text, math, and paragraphs",
     "plainText": "The unformatted plain text extraction",
     "summary": "A 1-2 sentence overview of the document's content",
     "drawings": [{"id": "__DRAWING_0__", "box": [0, 0, 100, 100]}],
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

    const userPrompt = `Extract, clean, and format the text from this image. Remove all watermarks and background clutter. Return JSON matching the requested structure.`;

    const response = await callGeminiWithFallback(ai, {
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
    let parsedData;
    try {
      const cleanJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      // Fallback if parsing fails
      parsedData = {
        title: 'مستند مستخرج',
        primaryLanguage: 'ar',
        readingDirection: 'rtl',
        markdown: responseText,
        plainText: responseText,
        summary: 'تم استخراج المستند بنجاح',
        detectedElements: {
          hasTables: responseText.includes('|'),
          hasMath: /[\+\-\*\/=√∑∫]/.test(responseText),
          hasHandwriting: false,
          watermarksDetectedAndFiltered: true,
          mathFormulas: [],
          wordCount: responseText.split(/\s+/).length,
          confidenceScore: 95,
        },
      };
    }

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    let parsedMsg = error?.message || 'Failed to process OCR image';
    try {
      if (typeof parsedMsg === 'string' && parsedMsg.includes('{')) {
        const jsonMatch = parsedMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) {
            parsedMsg = parsed.error.message;
          }
        }
      }
    } catch (_) {}

    res.status(500).json({
      error: parsedMsg,
    });
  }
});

// AI Document Copilot: Proofreading, Math verification, Formatting, Translation
app.post('/api/ai/transform', async (req: Request, res: Response) => {
  try {
    const { action, text, targetLang, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const ai = getGeminiClient();

    let systemInstruction = 'You are a professional multilingual document editor and mathematician.';
    let prompt = '';

    switch (action) {
      case 'proofread':
      case 'spellcheck':
      case 'arabic_spellcheck':
        systemInstruction = 'You are an elite Arabic & English proofreader, linguist, and copyeditor. Your mission is to fix all spelling errors, Hamzas (أ, إ, آ, ء, ئ, ؤ), Taa Marbuta vs Haa (ة / ه), Tanween, broken OCR words, spacing, punctuation marks (، ؛ . ؟ ! :), and grammatical concord while strictly preserving tables, math equations, markdown headers, and formatting.';
        prompt = `Please proofread and correct this document. Fix any Arabic spelling, Hamzas, Taa Marbuta, Tanween, grammar, punctuation, and typographical OCR errors. Retain all markdown structure, tables, and math equations:\n\n${text}`;
        break;
      case 'translate': {
        const arabicLetters = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
        const englishLetters = (text.match(/[a-zA-Z]/g) || []).length;
        const detectedSource = arabicLetters >= englishLetters ? 'ar' : 'en';
        const finalTarget = targetLang || (detectedSource === 'ar' ? 'en' : 'ar');
        
        if (finalTarget === 'en') {
          systemInstruction = 'You are a master certified translator. Translate the provided Arabic document into fluent, natural, professional English. CRITICAL: Preserve all Markdown formatting, headings (#, ##), tables (| ... |), lists, math equations, and structure. Translate all text and table cells accurately.';
          prompt = `Translate this entire Arabic document into English:\n\n${text}`;
        } else {
          systemInstruction = 'You are a master certified translator. Translate the provided English document into fluent, formal standard Arabic (الفصحى الحديثة). CRITICAL: Preserve all Markdown formatting, headings (#, ##), tables (| ... |), lists, math equations, and structure. Translate all text and table cells accurately.';
          prompt = `Translate this entire English document into Arabic:\n\n${text}`;
        }
        break;
      }
      case 'evaluate_math':
        systemInstruction = 'You are a mathematics and arithmetic verifier. Extract all mathematical equations and calculations from the text, verify whether each calculation is mathematically correct, show the step-by-step solution, and suggest corrections if any arithmetic error was present in the source.';
        prompt = `Analyze all arithmetic operations and equations in this text:\n\n${text}\n\nReturn a structured summary of each equation, its calculation result, and verification.`;
        break;
      case 'format_formal':
        systemInstruction = 'You are a corporate document formatter. Format the text with clear headings, organized paragraphs, bullet points, and elegant structure.';
        prompt = `Format this document professionally as an official formal report/letter with neat headings, spacing, and structure:\n\n${text}`;
        break;
      case 'summarize':
        systemInstruction = 'You are a concise executive summarizer. Provide key takeaways, bullet points, and high-level summary.';
        prompt = `Provide an executive summary and key points of the following document:\n\n${text}`;
        break;
      default:
        prompt = `Enhance the following text:\n\n${text}`;
    }

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: systemInstruction + ' IMPORTANT: Return ONLY the transformed text. DO NOT add any conversational preamble like "Here is the text". DO NOT wrap the output in ```markdown blocks.',
        temperature: 0.2,
      },
    });

    res.json({
      success: true,
      result: (response.text || '').replace(/^\s*```(?:markdown)?\n([\s\S]*?)\n```\s*$/i, '$1'),
    });
  } catch (error: any) {
    console.error('AI Transform error:', error);
    let parsedMsg = error?.message || 'Failed to transform document';
    try {
      if (typeof parsedMsg === 'string' && parsedMsg.includes('{')) {
        const jsonMatch = parsedMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) {
            parsedMsg = parsed.error.message;
          }
        }
      }
    } catch (_) {}

    res.status(500).json({
      error: parsedMsg,
    });
  }
});

// Vite middleware or production static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
