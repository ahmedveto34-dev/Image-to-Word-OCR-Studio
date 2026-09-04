import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Camera, 
  Sparkles, 
  Droplets, 
  Calculator, 
  Table as TableIcon, 
  Globe, 
  Trash2, 
  Sliders, 
  BookOpen, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  FileCode,
  FileType,
  X
} from 'lucide-react';
import { DocumentItem, DocumentPage, Language, OCRResult } from '../types';
import { translations } from '../utils/i18n';
import { 
  getSampleArabicBook, 
  getSampleMathSheet, 
  getSampleBilingualInvoice 
} from '../utils/sampleData';
import { ImageEnhancerModal } from './ImageEnhancerModal';
import { CameraScannerModal } from './CameraScannerModal';
import { fileOrUrlToBase64 } from '../utils/imageFilters';
import { renderPdfToImages } from '../utils/pdfParser';

interface ImageUploaderProps {
  onDocumentCreated: (doc: DocumentItem) => void;
  lang: Language;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onDocumentCreated,
  lang,
}) => {
  const t = translations[lang];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    id: string;
    file?: File;
    previewUrl: string;
    enhancedUrl?: string;
    name: string;
    size: number;
  }[]>([]);

  const [removeWatermarks, setRemoveWatermarks] = useState(true);
  const [detectMath, setDetectMath] = useState(true);
  const [detectTables, setDetectTables] = useState(true);
  const [languageMode, setLanguageMode] = useState<'auto' | 'ar' | 'en'>('auto');
  const [customInstructions, setCustomInstructions] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfStatusText, setPdfStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEnhanceIndex, setActiveEnhanceIndex] = useState<number | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Handle files selection (both Images and PDFs)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: typeof selectedFiles = [];
    const filesArray = Array.from(files);

    for (const file of filesArray) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Direct PDF rendering
        setIsParsingPdf(true);
        setPdfStatusText(lang === 'ar' ? `جارٍ استخراج صفحات ملف PDF: ${file.name}...` : `Extracting pages from PDF: ${file.name}...`);
        try {
          const renderedPages = await renderPdfToImages(file, (current, total) => {
            setPdfStatusText(
              lang === 'ar' 
                ? `جارٍ معالجة صفحات الـ PDF: صفحة ${current} من ${total}...` 
                : `Processing PDF page ${current} of ${total}...`
            );
          });

          renderedPages.forEach((p) => {
            newItems.push({
              id: Math.random().toString(36).substring(2, 9),
              previewUrl: p.dataUrl,
              name: `${file.name.replace(/\.pdf$/i, '')}_صفحة_${p.pageNumber}.jpg`,
              size: Math.round(p.dataUrl.length * 0.75),
            });
          });
        } catch (pdfErr: any) {
          console.error('PDF parsing error:', pdfErr);
          setErrorMessage(lang === 'ar' ? `فشل في تفكيك صفحات ملف PDF: ${pdfErr?.message || ''}` : `Failed to parse PDF: ${pdfErr?.message || ''}`);
        } finally {
          setIsParsingPdf(false);
        }
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl: url,
          name: file.name,
          size: file.size,
        });
      }
    }

    if (newItems.length > 0) {
      setSelectedFiles(prev => [...prev, ...newItems]);
    }
  };

  // Load interactive samples
  const handleLoadSample = (sampleType: 'book' | 'math' | 'invoice') => {
    let dataUrl = '';
    let name = '';
    if (sampleType === 'book') {
      dataUrl = getSampleArabicBook();
      name = 'صفحة_كتاب_تراثي_مع_علامة_مائية.jpg';
    } else if (sampleType === 'math') {
      dataUrl = getSampleMathSheet();
      name = 'ورقة_تمارين_ومعادلات_رياضية.jpg';
    } else {
      dataUrl = getSampleBilingualInvoice();
      name = 'فاتورة_معتمدة_باللغتين.jpg';
    }

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      previewUrl: dataUrl,
      name,
      size: 450 * 1024,
    };

    setSelectedFiles(prev => [...prev, newItem]);
  };

  // Process OCR
  const handleStartOCR = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(10);
    setErrorMessage(null);

    try {
      const pages: DocumentPage[] = [];
      let combinedMarkdown = '';
      let detectedMathList: string[] = [];
      let totalWordCount = 0;
      let totalCharCount = 0;
      let totalTables = 0;
      let mainTitle = '';
      let primaryLanguage: 'ar' | 'en' | 'mixed' = 'ar';
      let readingDirection: 'rtl' | 'ltr' = 'rtl';

      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i];
        setProcessProgress(Math.floor(20 + (i / selectedFiles.length) * 70));

        // Reliably convert image source (file, enhancedUrl, or blob url) to Base64 data
        const source = item.enhancedUrl || item.file || item.previewUrl;
        const { base64Data, mimeType, dataUrl } = await fileOrUrlToBase64(source);

        const response = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: mimeType || 'image/jpeg',
            options: {
              removeWatermarks,
              extractMath: detectMath,
              extractTables: detectTables,
              language: languageMode,
              customInstructions,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `OCR extraction failed for image ${i + 1} (${item.name})`);
        }

        const resData = await response.json();
        const ocr: OCRResult = resData.data;

        if (i === 0) {
          mainTitle = ocr.title || item.name.replace(/\.[^/.]+$/, '');
          primaryLanguage = ocr.primaryLanguage || 'ar';
          readingDirection = ocr.readingDirection || 'rtl';
        }

        pages.push({
          id: item.id,
          pageNumber: i + 1,
          originalImage: item.previewUrl || dataUrl,
          enhancedImage: item.enhancedUrl,
          fileName: item.name,
          fileSize: item.size,
          extractedMarkdown: ocr.markdown || '',
          extractedPlainText: ocr.plainText || '',
          readingDirection: ocr.readingDirection || 'rtl',
          status: 'completed',
          detectedElements: ocr.detectedElements,
        });

        if (ocr.markdown) {
          if (combinedMarkdown) combinedMarkdown += `\n\n---\n\n## ${lang === 'ar' ? 'الصفحة' : 'Page'} ${i + 1}\n\n`;
          combinedMarkdown += ocr.markdown;
        }

        if (ocr.detectedElements) {
          totalWordCount += ocr.detectedElements.wordCount || 0;
          totalCharCount += (ocr.plainText || '').length;
          if (ocr.detectedElements.hasTables) totalTables += 1;
          if (ocr.detectedElements.mathFormulas) {
            detectedMathList.push(...ocr.detectedElements.mathFormulas);
          }
        }
      }

      setProcessProgress(100);

      // Construct final Document Item
      const newDoc: DocumentItem = {
        id: 'doc_' + Date.now().toString(36),
        title: mainTitle || (lang === 'ar' ? 'مستند وورد مستخرج' : 'Extracted Word Document'),
        description: pages[0]?.detectedElements?.watermarksDetectedAndFiltered
          ? (lang === 'ar' ? 'تم استخراج النص وتنقية العلامات المائية بنجاح' : 'Text extracted and watermarks filtered successfully')
          : undefined,
        category: selectedFiles.length > 2 ? 'books' : detectMath && detectedMathList.length > 0 ? 'math' : 'documents',
        tags: [primaryLanguage === 'ar' ? 'عربي' : 'English', 'OCR-PRO', 'Word-DOCX'],
        pages,
        combinedMarkdown,
        primaryLanguage,
        readingDirection,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: true,
        stats: {
          totalPages: pages.length,
          totalWords: totalWordCount || combinedMarkdown.split(/\s+/).length,
          totalCharacters: totalCharCount || combinedMarkdown.length,
          mathEquationsCount: detectedMathList.length,
          tablesCount: totalTables,
        },
      };

      setTimeout(() => {
        setIsProcessing(false);
        onDocumentCreated(newDoc);
      }, 500);

    } catch (err: any) {
      console.error('Batch OCR Processing Error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || (lang === 'ar' ? 'حدث خطأ أثناء معالجة الصورة واستخراج النص' : 'Failed to process image and extract text'));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-bold mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.hero.tag}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight font-cairo mb-3">
            {t.hero.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mb-5">
            {t.hero.description}
          </p>

          {/* Quick interactive sample chips */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 font-cairo">
              {t.upload.sampleBtn} :
            </span>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleLoadSample('book')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-300 transition-all shadow-2xs group active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>{t.samples.sampleBookTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('math')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-800 border border-purple-300 transition-all shadow-2xs group active:scale-95"
              >
                <Calculator className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>{t.samples.sampleMathTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('invoice')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800 border border-sky-300 transition-all shadow-2xs group active:scale-95"
              >
                <TableIcon className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                <span>{t.samples.sampleInvoiceTitle}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/50 scale-[1.005]'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.pdf"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 text-white shadow-lg shadow-indigo-500/25">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-cairo mb-1">
              {isDragging ? t.upload.dropNotice : t.upload.dragTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {lang === 'ar'
                ? 'اسحب وأفلت صور المستندات أو ملفات PDF مباشرة (JPG, PNG, WEBP, PDF)'
                : 'Drag & drop document images or PDF files directly (JPG, PNG, WEBP, PDF)'}
            </p>
          </div>

          {/* PDF Ingestion Progress Banner */}
          {isParsingPdf && (
            <div className="w-full p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-center gap-2.5 text-xs font-bold animate-pulse shadow-2xs">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>{pdfStatusText || (lang === 'ar' ? 'جارٍ تفكيك صفحات ملف PDF...' : 'Parsing PDF pages...')}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اختيار صور / PDF' : 'Browse Images / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 active:scale-95 transition-all"
            >
              <FileType className="w-4 h-4 text-white" />
              <span>{lang === 'ar' ? 'رفع ملف PDF' : 'Upload PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>{t.upload.cameraBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Images Queue Grid */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 font-cairo">
                {t.upload.batchSize} ({selectedFiles.length})
              </h4>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold">
                Ready
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.upload.clearAll}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedFiles.map((item, idx) => (
              <div
                key={item.id}
                className="relative group rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/90 hover:border-slate-400 transition-all p-2 flex flex-col shadow-2xs hover:shadow-xs"
              >
                <div className="relative aspect-3/4 w-full rounded-xl overflow-hidden bg-slate-100 mb-2 flex items-center justify-center border border-slate-200/60">
                  <img
                    src={item.enhancedUrl || item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Page Badge */}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/95 text-[10px] font-mono text-slate-900 font-bold border border-slate-200 shadow-xs">
                    #{idx + 1}
                  </span>

                  {item.enhancedUrl && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-[9px] font-bold text-white shadow-xs">
                      {lang === 'ar' ? 'منقى' : 'Cleaned'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-bold text-slate-800 truncate mb-1.5">
                  {item.name}
                </p>

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-slate-200/80 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveEnhanceIndex(idx)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-800 border border-amber-200/80 transition-colors"
                    title={lang === 'ar' ? 'تنقية العلامات المائية وفلاتر الصورة' : 'Image cleaner & filters'}
                  >
                    <Sliders className="w-3 h-3 text-amber-600" />
                    <span>{lang === 'ar' ? 'تنقية' : 'Filter'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced OCR Options & AI Configuration */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80">
          <Zap className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-black text-slate-900 font-cairo">
            {lang === 'ar' ? 'إعدادات المعالجة والذكاء الاصطناعي الفاخرة' : 'Smart OCR & AI Configuration'}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Watermark Removal Toggle */}
          <div 
            onClick={() => setRemoveWatermarks(!removeWatermarks)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              removeWatermarks
                ? 'bg-amber-50/50 border-amber-400/90 text-slate-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Droplets className="w-4 h-4 text-amber-600" />
              <input
                type="checkbox"
                checked={removeWatermarks}
                onChange={() => {}}
                className="w-4 h-4 accent-slate-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-slate-900">{t.options.watermarkRemoval}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{t.options.watermarkSub}</p>
          </div>

          {/* Math Equations Recognition */}
          <div 
            onClick={() => setDetectMath(!detectMath)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              detectMath
                ? 'bg-amber-50/50 border-amber-400/90 text-slate-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Calculator className="w-4 h-4 text-amber-600" />
              <input
                type="checkbox"
                checked={detectMath}
                onChange={() => {}}
                className="w-4 h-4 accent-slate-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-slate-900">{t.options.detectMath}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar' ? 'التعرف على الكسور والجذور والمعادلات الحسابية' : 'Recognize fractions, roots, and arithmetic'}
            </p>
          </div>

          {/* Tables Extraction */}
          <div 
            onClick={() => setDetectTables(!detectTables)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              detectTables
                ? 'bg-amber-50/50 border-amber-400/90 text-slate-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <TableIcon className="w-4 h-4 text-amber-600" />
              <input
                type="checkbox"
                checked={detectTables}
                onChange={() => {}}
                className="w-4 h-4 accent-slate-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-slate-900">{t.options.detectTables}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar' ? 'استخراج الجداول المعقدة وتنسيقها كأعمدة Word' : 'Convert complex grids to formatted tables'}
            </p>
          </div>

          {/* Language Preference */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <Globe className="w-4 h-4 text-slate-700" />
              <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">OCR Engine</span>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5 font-cairo">
                {t.options.languageDetect}
              </label>
              <select
                value={languageMode}
                onChange={e => setLanguageMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-hidden focus:border-slate-900"
              >
                <option value="auto">{t.options.langAuto}</option>
                <option value="ar">{t.options.langAr}</option>
                <option value="en">{t.options.langEn}</option>
              </select>
            </div>
          </div>

        </div>

        {/* Optional Custom Instructions Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 font-cairo">
            {lang === 'ar' ? 'تعليمات إضافية اختيارية للذكاء الاصطناعي (مثل: ركز على أسئلة الامتحان، أو استخرج الفاتورة بدون ملاحظات الهامش)' : 'Optional custom prompt instructions for extraction'}
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder={lang === 'ar' ? 'مثال: قم بتمييز عناوين الفصول بخط عريض، وحول الأرقام العربية إلى إنجليزية...' : 'e.g., Bold all section titles and format math equations clearly...'}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 outline-hidden transition-colors"
          />
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
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
                onClick={handleStartOCR}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-cairo shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
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

        {/* Start OCR CTA Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {lang === 'ar'
                ? 'يتم فحص الصور وتصفية الشوائب بأعلى معايير الدقة والسرعة السحابية'
                : 'Processed securely with high-precision multimodal AI'}
            </span>
          </div>

          <button
            type="button"
            disabled={selectedFiles.length === 0 || isProcessing}
            onClick={handleStartOCR}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none border border-indigo-400/30"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>{lang === 'ar' ? `جارٍ الاستخراج الذكي (${processProgress}%)...` : `Processing OCR (${processProgress}%)...`}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.upload.startBatch} ({selectedFiles.length})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Single Image Enhancer Modal */}
      {activeEnhanceIndex !== null && selectedFiles[activeEnhanceIndex] && (
        <ImageEnhancerModal
          isOpen={true}
          onClose={() => setActiveEnhanceIndex(null)}
          originalImage={selectedFiles[activeEnhanceIndex].previewUrl}
          lang={lang}
          onApply={(enhancedUrl) => {
            setSelectedFiles(prev => {
              const copy = [...prev];
              copy[activeEnhanceIndex].enhancedUrl = enhancedUrl;
              return copy;
            });
          }}
        />
      )}

      {/* Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        lang={lang}
        onCaptureComplete={(capturedFiles) => {
          const dt = new DataTransfer();
          capturedFiles.forEach(f => dt.items.add(f));
          handleFiles(dt.files);
        }}
      />

    </div>
  );
};
