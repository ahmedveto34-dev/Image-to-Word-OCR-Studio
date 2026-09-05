import { GoogleGenAI } from '@google/genai';

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash-preview-12-2025',
];

export default async function handler(req: any, res: any) {
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
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
  }

  try {
    const { text, task, targetLanguage = 'ar', customPrompt = '' } = req.body || {};
    if (!text && !customPrompt) {
      return res.status(400).json({ error: 'Text or prompt is required' });
    }

    let systemInstruction = '';
    let userPrompt = '';

    switch (task) {
      case 'proofread':
        systemInstruction = 'You are an expert Arabic and English linguist and editor. Fix all spelling, grammar, punctuation, and structural errors in the provided text. Return ONLY the fully corrected text preserving the original Markdown formatting.';
        userPrompt = `Correct and proofread this document text:\n\n${text}`;
        break;
      case 'summarize':
        systemInstruction = 'You are an executive summarization assistant. Generate a clear, structured summary of the key points, actions, and decisions in the text using bullet points.';
        userPrompt = `Summarize this text in Arabic:\n\n${text}`;
        break;
      case 'translate':
        systemInstruction = `You are a certified technical translator. Translate the text into ${targetLanguage === 'ar' ? 'fluent modern standard Arabic' : 'natural fluent English'}. Preserve all Markdown headers, tables, lists, and numbers.`;
        userPrompt = `Translate the following text:\n\n${text}`;
        break;
      default:
        systemInstruction = 'You are an expert AI document assistant. Help format and enhance the document content as requested.';
        userPrompt = `${customPrompt}\n\nDocument Text:\n${text}`;
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: { systemInstruction, temperature: 0.2 },
        });
        return res.status(200).json({ success: true, result: response.text || '' });
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Transformation failed across all models');
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'AI transformation failed' });
  }
}
