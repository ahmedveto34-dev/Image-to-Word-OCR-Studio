import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Upload, 
  Sparkles, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  FileText, 
  CheckCircle2,
  Layers,
  Check,
  Plus,
  AlertCircle,
  X
} from 'lucide-react';
import { DocumentItem, DocumentPage, Language, OCRResult } from '../types';
import { translations } from '../utils/i18n';
import { getSampleArabicBook } from '../utils/sampleData';
import { ExportModal } from './ExportModal';
import { fileOrUrlToBase64 } from '../utils/imageFilters';
import { renderPdfToImages } from '../utils/pdfParser';
import { processOcrImage } from '../services/ocrService';

interface BookBatchConverterProps {
  onBookCreated: (doc: DocumentItem) => void;
  lang: Language;
}

export const BookBatchConverter: React.FC<BookBatchConverterProps> = ({
  onBookCreated,
  lang,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bookTitle, setBookTitle] = useState(
    lang === 'ar' ? 'كتاب مصور مستخرج' : 'Extracted Scanned Book'
  );
  const [authorName, setAuthorName] = useState('');
  const [bookPages, setBookPages] = useState<{
    id: string;
    file?: File;
    previewUrl: string;
    name: string;
    chapterName?: string;
  }[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedDoc, setCompletedDoc] = useState<DocumentItem | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleAddFiles = async (files: FileList | null) => {
    if (!files) return;
    const filesArray = Array.from(files);
    const newItems: typeof bookPages = [];

    for (const file of filesArray) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setIsParsingPdf(true);
        setPdfProgressText(lang === 'ar' ? `جارٍ فك صفحات كتاب PDF: ${file.name}...` : `Extracting PDF book pages: ${file.name}...`);
        try {
          const renderedPages = await renderPdfToImages(file, (current, total) => {
            setPdfProgressText(
              lang === 'ar' 
                ? `معالجة صفحات الكتاب: ${current} من ${total}...` 
                : `Processing book pages: ${current} of ${total}...`
            );
          });

          // Auto-set title from book file name
          if (!authorName) {
            setBookTitle(file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '));
          }

          renderedPages.forEach((p) => {
            newItems.push({
              id: Math.random().toString(36).substring(2, 9),
              previewUrl: p.dataUrl,
              name: `${file.name.replace(/\.pdf$/i, '')}_p${p.pageNumber}.jpg`,
              chapterName: `${lang === 'ar' ? 'الصفحة' : 'Page'} ${bookPages.length + newItems.length + 1}`,
            });
          });
        } catch (pdfErr: any) {
          setErrorMessage(lang === 'ar' ? `فشل في قراءة ملف PDF: ${pdfErr?.message || ''}` : `PDF error: ${pdfErr?.message || ''}`);
        } finally {
          setIsParsingPdf(false);
        }
      } else if (file.type.startsWith('image/')) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          chapterName: `${lang === 'ar' ? 'الفصل / الصفحة' : 'Page'} ${bookPages.length + newItems.length + 1}`,
        });
      }
    }

    if (newItems.length > 0) {
      setBookPages(prev => [...prev, ...newItems]);
    }
  };

  const handleAddSamplePages = () => {
    const sample = getSampleArabicBook();
    const items = [
      {
        id: 'p1_' + Math.random().toString(36).substring(2, 5),
        previewUrl: sample,
        name: 'صفحة_1_المقدمة.jpg',
        chapterName: lang === 'ar' ? 'المقدمة: في فضل المعرفة' : 'Chapter 1: Intro',
      },
      {
        id: 'p2_' + Math.random().toString(36).substring(2, 5),
        previewUrl: sample,
        name: 'صفحة_2_الفصل_الأول.jpg',
        chapterName: lang === 'ar' ? 'الفصل الأول: مناهج التوثيق' : 'Chapter 2: Methods',
      },
      {
        id: 'p3_' + Math.random().toString(36).substring(2, 5),
        previewUrl: sample,
        name: 'صفحة_3_الجداول_والبراهين.jpg',
        chapterName: lang === 'ar' ? 'الفصل الثاني: البراهين الحسابية' : 'Chapter 3: Proofs',
      },
    ];
    setBookPages(prev => [...prev, ...items]);
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= bookPages.length) return;
    const copy = [...bookPages];
    const item = copy.splice(fromIndex, 1)[0];
    copy.splice(toIndex, 0, item);
    setBookPages(copy);
  };

  const handleConvertBook = async () => {
    if (bookPages.length === 0) return;
    setIsProcessing(true);
    setProgress(5);
    setErrorMessage(null);

    try {
      const pages: DocumentPage[] = [];
      let combinedBookText = `# ${bookTitle}\n\n`;
      if (authorName) {
        combinedBookText += `*${lang === 'ar' ? 'المؤلف' : 'Author'}: ${authorName}*\n\n---\n\n`;
      }

      // Table of contents placeholder
      combinedBookText += `## ${lang === 'ar' ? 'فهرس المحتويات' : 'Table of Contents'}\n\n`;
      bookPages.forEach((p, idx) => {
        combinedBookText += `- ${p.chapterName || `الصفحة ${idx + 1}`}\n`;
      });
      combinedBookText += `\n---\n\n`;

      let totalWords = 0;
      let totalChars = 0;

      for (let i = 0; i < bookPages.length; i++) {
        const item = bookPages[i];
        setProgress(Math.floor(10 + (i / bookPages.length) * 85));

        const source = item.file || item.previewUrl;
        const { base64Data, mimeType, dataUrl } = await fileOrUrlToBase64(source);

        let ocr: OCRResult | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((res) => setTimeout(res, 1000 * attempt));
            }
            const resData = await processOcrImage(
              base64Data,
              mimeType || 'image/jpeg',
              {
                removeWatermarks: true,
                extractMath: true,
                extractTables: true,
                mode: 'book',
              }
            );

            if (resData) {
              ocr = resData;
              break;
            }
          } catch (pErr) {
            // retry
          }
        }

        if (!ocr) {
          ocr = {
            title: item.chapterName || `الصفحة ${i + 1}`,
            primaryLanguage: 'ar',
            readingDirection: 'rtl',
            markdown: `> **[${lang === 'ar' ? 'تنبيه: تعذر استخراج هذه الصفحة آلياً' : 'Automatic extraction failed for this page'}]**`,
            plainText: item.chapterName || '',
            summary: '',
            detectedElements: {
              hasTables: false,
              hasMath: false,
              hasHandwriting: false,
              watermarksDetectedAndFiltered: false,
              mathFormulas: [],
              wordCount: 0,
              confidenceScore: 0,
            },
          };
        }

        pages.push({
          id: item.id,
          pageNumber: i + 1,
          originalImage: item.previewUrl || dataUrl,
          fileName: item.name,
          fileSize: 350 * 1024,
          extractedMarkdown: ocr.markdown || '',
          extractedPlainText: ocr.plainText || '',
          readingDirection: ocr.readingDirection || 'rtl',
          status: 'completed',
          detectedElements: ocr.detectedElements,
        });

        combinedBookText += `\n\n## ${item.chapterName || `الصفحة ${i + 1}`}\n\n${ocr.markdown}\n\n---`;

        if (ocr.detectedElements) {
          totalWords += ocr.detectedElements.wordCount || 0;
          totalChars += (ocr.plainText || '').length;
        }
      }

      setProgress(100);

      const newBookDoc: DocumentItem = {
        id: 'book_' + Date.now().toString(36),
        title: bookTitle,
        description: `${lang === 'ar' ? 'كتاب مصور محول بالكامل يتضمن' : 'Full converted book with'} ${pages.length} ${lang === 'ar' ? 'صفحة' : 'pages'}`,
        category: 'books',
        tags: ['كتاب', 'Book', 'OCR-MultiPage', 'Word'],
        pages,
        combinedMarkdown: combinedBookText,
        primaryLanguage: 'ar',
        readingDirection: 'rtl',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: true,
        stats: {
          totalPages: pages.length,
          totalWords: totalWords || combinedBookText.split(/\s+/).length,
          totalCharacters: totalChars || combinedBookText.length,
          mathEquationsCount: 0,
          tablesCount: 0,
        },
      };

      setCompletedDoc(newBookDoc);
      onBookCreated(newBookDoc);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Book conversion error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || (lang === 'ar' ? 'حدث خطأ أثناء تجميع وتحويل الكتاب' : 'Error processing book'));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gray-100 text-gray-900 border border-gray-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cairo">
              {t.books.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {t.books.subtitle}
            </p>
          </div>
        </div>

        {/* Book Title & Author inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
              {lang === 'ar' ? 'عنوان الكتاب الكامل' : 'Full Book Title'}
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:bg-white focus:border-gray-900 outline-hidden font-cairo transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
              {lang === 'ar' ? 'المؤلف / المحقق (اختياري)' : 'Author / Editor'}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder={lang === 'ar' ? 'اسم الكاتب أو المترجم...' : 'Author name...'}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:bg-white focus:border-gray-900 outline-hidden font-cairo transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Pages Queue & Controls */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-700" />
            <h3 className="text-base font-bold text-gray-900 font-cairo">
              {lang === 'ar' ? 'صفحات وفصول الكتاب المحددة' : 'Book Pages Queue'} ({bookPages.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf"
              onChange={e => handleAddFiles(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleAddSamplePages}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 border border-amber-300 shadow-2xs transition-all active:scale-95"
            >
              {lang === 'ar' ? 'تجربة 3 صفحات' : 'Add 3 Samples'}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة صور / كتاب PDF' : 'Add Images / PDF Book'}</span>
            </button>
          </div>
        </div>

        {/* PDF Book Parsing Banner */}
        {isParsingPdf && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-center gap-2.5 text-xs font-bold animate-pulse">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>{pdfProgressText || (lang === 'ar' ? 'جارٍ تفكيك صفحات كتاب PDF...' : 'Parsing PDF book...')}</span>
          </div>
        )}

        {/* Empty State */}
        {bookPages.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200 space-y-2">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-700 font-cairo">
              {lang === 'ar' ? 'لم يتم اختيار صفحات للكتاب بعد' : 'No book pages uploaded yet'}
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {lang === 'ar'
                ? 'ارفع صور صفحات الكتاب أو اضغط على "تجربة 3 صفحات كتاب" للبدء الفوري'
                : 'Upload scanned pages or use the sample button above'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {t.books.reorderNotice}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bookPages.map((page, idx) => (
                <div
                  key={page.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all"
                >
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-xs font-mono font-bold text-gray-900 border border-gray-200 shadow-xs">
                    {idx + 1}
                  </span>

                  <img
                    src={page.previewUrl}
                    alt={page.name}
                    className="w-12 h-16 object-cover rounded-md border border-gray-200 bg-white"
                  />

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={page.chapterName || ''}
                      onChange={e => {
                        const copy = [...bookPages];
                        copy[idx].chapterName = e.target.value;
                        setBookPages(copy);
                      }}
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-900 text-xs font-semibold text-gray-900 outline-hidden font-cairo"
                      placeholder={lang === 'ar' ? 'عنوان الفصل...' : 'Chapter title...'}
                    />
                    <p className="text-[10px] text-gray-400 truncate mt-1">{page.name}</p>
                  </div>

                  {/* Ordering arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePage(idx, idx - 1)}
                      className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === bookPages.length - 1}
                      onClick={() => movePage(idx, idx + 1)}
                      className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookPages(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold font-cairo">
                  {lang === 'ar' ? 'تنبيه في التحويل' : 'Conversion Notice'}
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  {errorMessage.includes('demand') || errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')
                    ? (lang === 'ar' ? 'خوادم المعالجة تشهد ضغطاً مؤقتاً. اضغط على إعادة المحاولة للمتابعة عبر المسار السريع.' : 'Model temporarily busy. Click retry to proceed via fast lane.')
                    : errorMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleConvertBook}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-cairo shadow-xs transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إعادة المحاولة الآن' : 'Retry Now'}</span>
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
                title={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Start Book Conversion CTA */}
        {bookPages.length > 0 && (
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              {lang === 'ar'
                ? `سيتم استخراج ${bookPages.length} صفحة وتجميعها في ملف Word موحد مع الفهرس والتنسيق التلقائي`
                : `Extracts and compiles ${bookPages.length} pages into a unified Word book`}
            </span>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvertBook}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-md shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ar' ? `جارٍ تجميع الكتاب (${progress}%)...` : `Converting Book (${progress}%)...`}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.books.mergeToSingleDoc}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Completed Book Download Prompt */}
      {completedDoc && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-900 font-cairo">
                {lang === 'ar' ? 'تم استخراج وتجميع الكتاب بنجاح!' : 'Book successfully converted!'}
              </h4>
              <p className="text-xs text-emerald-700">
                {completedDoc.stats.totalWords} {t.editor.wordCount} • {completedDoc.pages.length} {t.library.pages}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{t.editor.exportDocx}</span>
            </button>
          </div>
        </div>
      )}

      {isExportOpen && completedDoc && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          documentTitle={completedDoc.title}
          markdownContent={completedDoc.combinedMarkdown}
          document={completedDoc}
          lang={lang}
        />
      )}

    </div>
  );
};
