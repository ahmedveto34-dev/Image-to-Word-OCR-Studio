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
import { fileOrUrlToBase64 } from '../utils/imageFilters';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEnhanceIndex, setActiveEnhanceIndex] = useState<number | null>(null);

  // Handle files selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: typeof selectedFiles = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: url,
        name: file.name,
        size: file.size,
      });
    });

    setSelectedFiles(prev => [...prev, ...newItems]);
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
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gray-600" />
            <span>{t.hero.tag}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight font-cairo mb-3">
            {t.hero.title}
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal mb-5">
            {t.hero.description}
          </p>

          {/* Quick interactive sample chips */}
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 font-cairo">
              {t.upload.sampleBtn} :
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('book')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors shadow-xs group"
              >
                <BookOpen className="w-3.5 h-3.5 text-gray-600" />
                <span>{t.samples.sampleBookTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('math')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors shadow-xs group"
              >
                <Calculator className="w-3.5 h-3.5 text-gray-600" />
                <span>{t.samples.sampleMathTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('invoice')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors shadow-xs group"
              >
                <TableIcon className="w-3.5 h-3.5 text-gray-600" />
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
        className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
          isDragging
            ? 'border-gray-900 bg-gray-50/80 scale-[1.005]'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/40 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
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
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 border border-gray-200 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 font-cairo mb-1">
              {isDragging ? t.upload.dropNotice : t.upload.dragTitle}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
              {t.upload.dragSub}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-medium text-xs sm:text-sm shadow-xs active:scale-98 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اختيار صور من الجهاز' : 'Browse Images'}</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm border border-gray-200 shadow-xs active:scale-98 transition-all"
            >
              <Camera className="w-4 h-4 text-gray-600" />
              <span>{t.upload.cameraBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Images Queue Grid */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4 bg-white border border-gray-200 p-6 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 font-cairo">
                {t.upload.batchSize} ({selectedFiles.length})
              </h4>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                Ready
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.upload.clearAll}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedFiles.map((item, idx) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all p-2 flex flex-col shadow-xs"
              >
                <div className="relative aspect-3/4 w-full rounded-lg overflow-hidden bg-gray-100 mb-2 flex items-center justify-center border border-gray-200/60">
                  <img
                    src={item.enhancedUrl || item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Page Badge */}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/90 text-[10px] font-mono text-gray-900 font-bold border border-gray-200 shadow-xs">
                    #{idx + 1}
                  </span>

                  {item.enhancedUrl && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-[9px] font-bold text-white shadow-xs">
                      {lang === 'ar' ? 'منقى' : 'Cleaned'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-medium text-gray-700 truncate mb-1.5">
                  {item.name}
                </p>

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveEnhanceIndex(idx)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900"
                    title={lang === 'ar' ? 'تنقية العلامات المائية وفلاتر الصورة' : 'Image cleaner & filters'}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تنقية' : 'Filter'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-rose-600 transition-colors p-1"
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
      <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <Zap className="w-4 h-4 text-gray-700" />
          <h4 className="text-sm font-bold text-gray-900 font-cairo">
            {lang === 'ar' ? 'إعدادات المعالجة والذكاء الاصطناعي الذكية' : 'Smart OCR & AI Configuration'}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Watermark Removal Toggle */}
          <div 
            onClick={() => setRemoveWatermarks(!removeWatermarks)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              removeWatermarks
                ? 'bg-gray-50 border-gray-900 text-gray-900 shadow-xs'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Droplets className="w-4 h-4 text-gray-700" />
              <input
                type="checkbox"
                checked={removeWatermarks}
                onChange={() => {}}
                className="w-4 h-4 accent-gray-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-gray-900">{t.options.watermarkRemoval}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">{t.options.watermarkSub}</p>
          </div>

          {/* Math Equations Recognition */}
          <div 
            onClick={() => setDetectMath(!detectMath)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              detectMath
                ? 'bg-gray-50 border-gray-900 text-gray-900 shadow-xs'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Calculator className="w-4 h-4 text-gray-700" />
              <input
                type="checkbox"
                checked={detectMath}
                onChange={() => {}}
                className="w-4 h-4 accent-gray-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-gray-900">{t.options.detectMath}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {lang === 'ar' ? 'التعرف على الكسور والجذور والمعادلات الحسابية' : 'Recognize fractions, roots, and arithmetic'}
            </p>
          </div>

          {/* Tables Extraction */}
          <div 
            onClick={() => setDetectTables(!detectTables)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              detectTables
                ? 'bg-gray-50 border-gray-900 text-gray-900 shadow-xs'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <TableIcon className="w-4 h-4 text-gray-700" />
              <input
                type="checkbox"
                checked={detectTables}
                onChange={() => {}}
                className="w-4 h-4 accent-gray-900"
              />
            </div>
            <p className="text-xs font-bold font-cairo mb-1 text-gray-900">{t.options.detectTables}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {lang === 'ar' ? 'استخراج الجداول المعقدة وتنسيقها كأعمدة Word' : 'Convert complex grids to formatted tables'}
            </p>
          </div>

          {/* Language Preference */}
          <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <Globe className="w-4 h-4 text-gray-700" />
              <span className="text-[10px] font-mono text-gray-400">OCR Engine</span>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1.5 font-cairo">
                {t.options.languageDetect}
              </label>
              <select
                value={languageMode}
                onChange={e => setLanguageMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 outline-hidden focus:border-gray-900"
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
          <label className="text-xs font-medium text-gray-700 block mb-1.5 font-cairo">
            {lang === 'ar' ? 'تعليمات إضافية اختيارية للذكاء الاصطناعي (مثل: ركز على أسئلة الامتحان، أو استخرج الفاتورة بدون ملاحظات الهامش)' : 'Optional custom prompt instructions for extraction'}
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder={lang === 'ar' ? 'مثال: قم بتمييز عناوين الفصول بخط عريض، وحول الأرقام العربية إلى إنجليزية...' : 'e.g., Bold all section titles and format math equations clearly...'}
            className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-gray-900 outline-hidden"
          />
        </div>

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
                onClick={handleStartOCR}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-cairo shadow-xs transition-colors flex items-center gap-1.5"
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
          <div className="flex items-center gap-2 text-xs text-gray-500">
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
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-xs active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{lang === 'ar' ? `جارٍ الاستخراج الذكي (${processProgress}%)...` : `Processing OCR (${processProgress}%)...`}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
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

    </div>
  );
};
