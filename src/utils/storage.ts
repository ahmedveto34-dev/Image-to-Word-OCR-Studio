import { DocumentItem } from '../types';
import { getSampleArabicBook } from './sampleData';

const STORAGE_KEY = 'basira_ocr_documents_v1';

/**
 * Loads all saved documents from LocalStorage / IndexedDB cache
 */
export function getLocalDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load local documents:', err);
    return [];
  }
}

export const loadDocuments = getLocalDocuments;

/**
 * Seeds initial document if library is empty
 */
export function seedInitialSampleIfEmpty(): void {
  const existing = getLocalDocuments();
  if (existing.length > 0) return;

  const sampleDoc: DocumentItem = {
    id: 'doc_sample_intro_01',
    title: 'مقدمة في مناهج التوثيق والمخطوطات العربية',
    description: 'مستند توضيحي تم استخراجه من مخطوطة تراثية مع تنقية العلامات المائية',
    category: 'books',
    tags: ['تراث', 'مخطوطة', 'OCR-Pro', 'عربي'],
    pages: [
      {
        id: 'page_s1',
        pageNumber: 1,
        originalImage: getSampleArabicBook(),
        fileName: 'مخطوطة_تراثية_صفحة_1.jpg',
        fileSize: 320 * 1024,
        extractedMarkdown: `# مقدمة في مناهج التوثيق والمخطوطات العربية

> **ملحوظة:** تم استخراج هذا النص وتصفيته بنجاح من صورة عالية التباين مع تنقية العلامة المائية.

## الباب الأول: أهمية التوثيق الرقمي
إن حفظ التراث العلمي والمخطوطات الورقية ونقلها إلى بيئات رقمية قابلة للبحث والتعديل يمثل ركيزة أساسية للبحث الأكاديمي الحديث.

### مميزات المستندات المعالجة:
1. إمكانية البحث الفوري داخل الكلمات والعبارات.
2. التصدير المباشر بتنسيق وورد **Word (.docx)** مع المحافظة على الهوية والترقيم.
3. دعم العمليات الحسابية والمعادلات الرياضية بدقة متناهية.

| المعيار | الطريقة التقليدية | استوديو التحويل الذكي |
| :--- | :--- | :--- |
| دقة التعرف (OCR) | 70% | **99.4%** |
| تصفية العلامات المائية | يدوية بطيئة | **تلقائية بالذكاء الاصطناعي** |
| دعم التصدير لوورد | نص عادي غير منسق | **ملف DOCX منسق وفاخر** |
`,
        extractedPlainText: 'مقدمة في مناهج التوثيق والمخطوطات العربية...',
        readingDirection: 'rtl',
        status: 'completed',
        detectedElements: {
          hasTables: true,
          hasMath: false,
          hasHandwriting: false,
          watermarksDetectedAndFiltered: true,
          mathFormulas: [],
          wordCount: 145,
          confidenceScore: 0.99,
        },
      },
    ],
    combinedMarkdown: `# مقدمة في مناهج التوثيق والمخطوطات العربية

> **ملحوظة:** تم استخراج هذا النص وتصفيته بنجاح من صورة عالية التباين مع تنقية العلامة المائية.

## الباب الأول: أهمية التوثيق الرقمي
إن حفظ التراث العلمي والمخطوطات الورقية ونقلها إلى بيئات رقمية قابلة للبحث والتعديل يمثل ركيزة أساسية للبحث الأكاديمي الحديث.

### مميزات المستندات المعالجة:
1. إمكانية البحث الفوري داخل الكلمات والعبارات.
2. التصدير المباشر بتنسيق وورد **Word (.docx)** مع المحافظة على الهوية والترقيم.
3. دعم العمليات الحسابية والمعادلات الرياضية بدقة متناهية.

| المعيار | الطريقة التقليدية | استوديو التحويل الذكي |
| :--- | :--- | :--- |
| دقة التعرف (OCR) | 70% | **99.4%** |
| تصفية العلامات المائية | يدوية بطيئة | **تلقائية بالذكاء الاصطناعي** |
| دعم التصدير لوورد | نص عادي غير منسق | **ملف DOCX منسق وفاخر** |
`,
    primaryLanguage: 'ar',
    readingDirection: 'rtl',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSynced: true,
    stats: {
      totalPages: 1,
      totalWords: 145,
      totalCharacters: 820,
      mathEquationsCount: 0,
      tablesCount: 1,
    },
  };

  saveLocalDocuments([sampleDoc]);
}

/**
 * Saves documents list locally
 */
export function saveLocalDocuments(docs: DocumentItem[]): void {
  try {
    // Strip heavy base64 image data before saving to prevent QuotaExceededError
    let optimizedDocs = docs.map(doc => ({
      ...doc,
      pages: doc.pages.map(page => ({
        ...page,
        originalImage: undefined,
        enhancedImage: undefined,
        croppedImage: undefined,
      }))
    }));
    
    let success = false;
    while (!success && optimizedDocs.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(optimizedDocs));
        success = true;
      } catch (err: any) {
        if (err.name === 'QuotaExceededError' || (err.message && err.message.toLowerCase().includes('quota'))) {
          console.warn('LocalStorage quota exceeded. Attempting to free space...');
          
          let strippedAny = false;
          const base64Regex = /data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g;
          
          optimizedDocs = optimizedDocs.map(d => {
            if (base64Regex.test(d.combinedMarkdown) || d.pages.some(p => base64Regex.test(p.extractedMarkdown))) {
              strippedAny = true;
              return {
                ...d,
                combinedMarkdown: d.combinedMarkdown.replace(base64Regex, '[تم إزالة الصورة لتوفير المساحة]'),
                pages: d.pages.map(p => ({
                  ...p,
                  extractedMarkdown: p.extractedMarkdown.replace(base64Regex, '[تم إزالة الصورة لتوفير المساحة]')
                }))
              };
            }
            return d;
          });

          if (!strippedAny) {
            // If no heavy base64 left, remove the oldest document (last in the array)
            optimizedDocs.pop();
          }
        } else {
          console.error('Failed to save local documents:', err);
          break;
        }
      }
    }
  } catch (err) {
    console.error('Fatal error preparing local documents for save:', err);
  }
}

/**
 * Saves or updates a single document (both locally and to server cloud store)
 */
export async function saveDocument(doc: DocumentItem): Promise<boolean> {
  const docs = getLocalDocuments();
  const existingIdx = docs.findIndex(d => d.id === doc.id);
  doc.updatedAt = new Date().toISOString();

  if (existingIdx >= 0) {
    docs[existingIdx] = doc;
  } else {
    docs.unshift(doc);
  }
  saveLocalDocuments(docs);

  // Sync to server background
  try {
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: doc.id,
        title: doc.title,
        content: doc.combinedMarkdown,
        markdown: doc.combinedMarkdown,
        language: doc.primaryLanguage,
        pagesCount: doc.pages.length,
        category: doc.category,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        thumbnail: doc.pages[0]?.enhancedImage || doc.pages[0]?.originalImage,
        stats: {
          words: doc.stats.totalWords,
          characters: doc.stats.totalCharacters,
          mathCount: doc.stats.mathEquationsCount,
          tablesCount: doc.stats.tablesCount,
        },
      }),
    });
    return true;
  } catch (err) {
    console.warn('Cloud sync offline fallback:', err);
    return false;
  }
}

/**
 * Deletes a document locally and on server
 */
export async function deleteDocument(id: string): Promise<void> {
  const docs = getLocalDocuments().filter(d => d.id !== id);
  saveLocalDocuments(docs);
  try {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Could not delete from server:', err);
  }
}

/**
 * Performs full-text search and filtering across all stored documents
 */
export function searchDocuments(
  docs: DocumentItem[],
  query: string,
  category?: string
): DocumentItem[] {
  let result = docs;
  if (category && category !== 'all') {
    result = result.filter(d => d.category === category);
  }
  if (!query.trim()) return result;

  const q = query.toLowerCase().trim();
  return result.filter(d => {
    return (
      d.title.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      d.combinedMarkdown.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q)) ||
      d.pages.some(p => p.extractedMarkdown.toLowerCase().includes(q))
    );
  });
}
