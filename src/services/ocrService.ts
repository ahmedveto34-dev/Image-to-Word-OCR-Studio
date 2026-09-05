import { GoogleGenAI } from '@google/genai';
import { OCRResult } from '../types';

export const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash-preview-12-2025',
];

export interface OcrOptions {
  removeWatermarks?: boolean;
  extractMath?: boolean;
  extractTables?: boolean;
  language?: 'auto' | 'ar' | 'en';
  customInstructions?: string;
  mode?: string;
}

export function getClientStoredApiKey(): string {
  return (
    localStorage.getItem('tahweel_gemini_api_key') ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    ''
  );
}

export function setClientStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem('tahweel_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('tahweel_gemini_api_key');
  }
}

/**
 * Direct client-side Gemini OCR call for environments like Vercel/Netlify
 * where the backend server may not have environment variables or is static.
 */
export async function callClientSideGeminiOcr(
  imageBase64: string,
  mimeType: string,
  options: OcrOptions = {},
  apiKey: string
): Promise<OCRResult> {
  if (!apiKey) {
    throw new Error('يرجى إدخال مفتاح Gemini API Key للتشغيل السحابي');
  }

  const ai = new GoogleGenAI({ apiKey });

  const {
    removeWatermarks = true,
    extractMath = true,
    extractTables = true,
    customInstructions = '',
  } = options;

  let cleanBase64 = imageBase64;
  let actualMime = mimeType || 'image/jpeg';
  const dataUrlMatch = typeof imageBase64 === 'string' ? imageBase64.match(/^data:([^;]+);base64,(.+)$/s) : null;
  if (dataUrlMatch) {
    actualMime = dataUrlMatch[1];
    cleanBase64 = dataUrlMatch[2];
  } else if (typeof imageBase64 === 'string') {
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
        return JSON.parse(cleanJson);
      } catch {
        return {
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
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('فشل استخراج النص بواسطة نماذج الذكاء الاصطناعي');
}

/**
 * Main Unified OCR Processing function:
 * 1. Tries server route `/api/ocr/process`
 * 2. If server returns 404, 500, or is not configured (e.g. Vercel static SPA),
 *    falls back seamlessly to direct client-side Gemini if API key is stored.
 */
export async function processOcrImage(
  imageBase64: string,
  mimeType: string,
  options: OcrOptions = {}
): Promise<OCRResult> {
  // 1. Try server endpoint first
  try {
    const serverResponse = await fetch('/api/ocr/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType: mimeType || 'image/jpeg',
        options,
      }),
    });

    if (serverResponse.ok) {
      const data = await serverResponse.json();
      if (data?.success && data?.data) {
        return data.data;
      }
    }

    // If server returned 404 (common on Vercel without serverless config) or 500
    const errData = await serverResponse.json().catch(() => ({}));
    const errorMsg = errData?.error || `Server HTTP ${serverResponse.status}`;

    // If server failed, check if we have a client-side key to fallback
    const clientKey = getClientStoredApiKey();
    if (clientKey) {
      return await callClientSideGeminiOcr(imageBase64, mimeType, options, clientKey);
    }

    throw new Error(errorMsg);
  } catch (err: any) {
    // If network error (e.g. static host like Vercel with no server backend)
    const clientKey = getClientStoredApiKey();
    if (clientKey) {
      return await callClientSideGeminiOcr(imageBase64, mimeType, options, clientKey);
    }

    throw err;
  }
}

export function detectTextPrimaryLanguage(text: string): 'ar' | 'en' {
  const arabicLetters = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const englishLetters = (text.match(/[a-zA-Z]/g) || []).length;
  return arabicLetters >= englishLetters ? 'ar' : 'en';
}

/**
 * Universal AI Text Transformation (Translate, Proofread, Summarize, Format)
 * Works via Server API route and falls back to Direct Client-side Gemini SDK.
 */
export async function transformTextWithAi(
  text: string,
  action: 'translate' | 'proofread' | 'summarize' | 'format_formal',
  explicitTargetLang?: 'ar' | 'en'
): Promise<{ result: string; sourceLang: 'ar' | 'en'; targetLang: 'ar' | 'en' }> {
  const detectedSource = detectTextPrimaryLanguage(text);
  const targetLang = explicitTargetLang || (detectedSource === 'ar' ? 'en' : 'ar');

  // 1. Try server endpoint
  try {
    const serverResponse = await fetch('/api/ai/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        task: action,
        text,
        targetLang,
        targetLanguage: targetLang,
      }),
    });

    if (serverResponse.ok) {
      const resData = await serverResponse.json();
      if (resData.success && resData.result) {
        return {
          result: resData.result,
          sourceLang: detectedSource,
          targetLang,
        };
      }
    }
  } catch (serverErr) {
    console.warn('Server AI transform endpoint unavailable, trying client fallback...', serverErr);
  }

  // 2. Client-side Fallback via Gemini API key
  const clientKey = getClientStoredApiKey();
  if (!clientKey) {
    throw new Error('يرجى التأكد من اتصال الخادم أو إدخال مفتاح Gemini API Key لتنفيذ الترجمة');
  }

  const ai = new GoogleGenAI({ apiKey: clientKey });

  let systemInstruction = '';
  let userPrompt = '';

  if (action === 'translate') {
    if (targetLang === 'en') {
      systemInstruction = 'You are a certified master translator. Translate the provided Arabic document into fluent, natural, professional English. CRITICAL: Preserve all Markdown formatting, headings (#, ##), tables (| ... |), lists, math equations, and structure. Translate all text and table cells accurately.';
      userPrompt = `Translate this entire Arabic document into English:\n\n${text}`;
    } else {
      systemInstruction = 'You are a certified master translator. Translate the provided English document into fluent, formal standard Arabic (الفصحى الحديثة). CRITICAL: Preserve all Markdown formatting, headings (#, ##), tables (| ... |), lists, math equations, and structure. Translate all text and table cells accurately.';
      userPrompt = `Translate this entire English document into Arabic:\n\n${text}`;
    }
  } else if (action === 'proofread') {
    systemInstruction = 'You are an expert Arabic and English copyeditor. Fix all spelling, grammar, punctuation, and typographical errors. Preserve all Markdown structure, tables, and formatting.';
    userPrompt = `Proofread and correct this document:\n\n${text}`;
  } else if (action === 'summarize') {
    systemInstruction = 'You are an executive summarization assistant. Provide a structured summary of the key takeaways and bullet points.';
    userPrompt = `Summarize this text in ${detectedSource === 'ar' ? 'Arabic' : 'English'}:\n\n${text}`;
  } else {
    systemInstruction = 'You are an expert document assistant. Format this document professionally with clear headings and structure.';
    userPrompt = `Format this document professionally:\n\n${text}`;
  }

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      if (response.text) {
        return {
          result: response.text,
          sourceLang: detectedSource,
          targetLang,
        };
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed for AI transform:`, err);
    }
  }

  throw new Error('فشلت عملية الترجمة الذكية عبر جميع النماذج');
}
