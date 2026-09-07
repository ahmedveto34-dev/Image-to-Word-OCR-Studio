import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Columns, 
  Image as ImageIcon, 
  Search, 
  Replace, 
  Calculator, 
  Languages, 
  CheckCircle, 
  HelpCircle, 
  Save, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignRight,
  AlignLeft,
  AlignCenter,
  Table as TableIcon,
  Quote,
  Code,
  FileDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sliders,
  FileSpreadsheet,
  CheckCheck,
  Crop,
  SpellCheck,
  Volume2,
  Presentation,
  ChevronDown,
  ArrowLeftRight,
  Sparkle,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { DocumentItem, DocumentPage, Language } from '../types';
import { translations } from '../utils/i18n';
import { saveDocument } from '../utils/storage';
import { ExportModal } from './ExportModal';
import { MathEvaluatorModal } from './MathEvaluatorModal';
import { exportToPdf } from '../utils/pdfExport';
import { ImageEnhancerModal } from './ImageEnhancerModal';
import { TableExtractorModal } from './TableExtractorModal';
import { ImageCropModal } from './ImageCropModal';
import { SpellCheckerModal } from './SpellCheckerModal';
import { AudioProofReader } from './AudioProofReader';
import { copyFullDocumentToClipboard, extractTablesFromMarkdown } from '../utils/tableExtractor';
import { fileOrUrlToBase64 } from '../utils/imageFilters';
import { OCRResult } from '../types';
import { 
  processOcrImage, 
  getClientStoredApiKey, 
  transformTextWithAi, 
  detectTextPrimaryLanguage 
} from '../services/ocrService';

interface DocumentEditorProps {
  document: DocumentItem;
  onUpdateDocument: (doc: DocumentItem) => void;
  lang: Language;
  onOpenApiKeyModal?: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document: initialDoc,
  onUpdateDocument,
  lang,
  onOpenApiKeyModal,
}) => {
  const t = translations[lang];

  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'image'>('split');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState<string>('');
  const [aiActionFeedback, setAiActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [reExtractError, setReExtractError] = useState<string | null>(null);

  // Search & Replace state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [isEnhancerModalOpen, setIsEnhancerModalOpen] = useState(false);
  const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSpellModalOpen, setIsSpellModalOpen] = useState(false);
  const [showAudioProof, setShowAudioProof] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  // Zoom & Pan state for original image
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  // Synchronized Scroll state & refs
  const [isSyncScroll, setIsSyncScroll] = useState(true);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingSource = useRef<'image' | 'text' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const activePage: DocumentPage | undefined = doc.pages[activePageIndex] || doc.pages[0];

  // Synchronized Scroll handlers
  const handleImageScroll = () => {
    if (!isSyncScroll || isScrollingSource.current === 'text' || !imageScrollRef.current || !textareaRef.current) return;
    isScrollingSource.current = 'image';
    const imgEl = imageScrollRef.current;
    const textEl = textareaRef.current;
    const maxImgScroll = imgEl.scrollHeight - imgEl.clientHeight;
    const maxTextScroll = textEl.scrollHeight - textEl.clientHeight;
    if (maxImgScroll > 0 && maxTextScroll > 0) {
      const ratio = imgEl.scrollTop / maxImgScroll;
      textEl.scrollTop = ratio * maxTextScroll;
    }
    setTimeout(() => {
      if (isScrollingSource.current === 'image') isScrollingSource.current = null;
    }, 50);
  };

  const handleTextScroll = () => {
    if (!isSyncScroll || isScrollingSource.current === 'image' || !imageScrollRef.current || !textareaRef.current) return;
    isScrollingSource.current = 'text';
    const imgEl = imageScrollRef.current;
    const textEl = textareaRef.current;
    const maxImgScroll = imgEl.scrollHeight - imgEl.clientHeight;
    const maxTextScroll = textEl.scrollHeight - textEl.clientHeight;
    if (maxImgScroll > 0 && maxTextScroll > 0) {
      const ratio = textEl.scrollTop / maxTextScroll;
      imgEl.scrollTop = ratio * maxImgScroll;
    }
    setTimeout(() => {
      if (isScrollingSource.current === 'text') isScrollingSource.current = null;
    }, 50);
  };

  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    const updated = { ...doc, title: newTitle, updatedAt: new Date().toISOString() };
    setDoc(updated);
    setIsSaved(false);
    onUpdateDocument(updated);
  };

  // Handle content change
  const handleContentChange = (newContent: string) => {
    let updatedPages = [...doc.pages];
    if (updatedPages[activePageIndex]) {
      updatedPages[activePageIndex] = {
        ...updatedPages[activePageIndex],
        extractedMarkdown: newContent,
      };
    }

    const combined = updatedPages.map(p => p.extractedMarkdown).join('\n\n---\n\n');
    const words = combined.split(/\s+/).filter(Boolean).length;
    const chars = combined.length;

    const updated: DocumentItem = {
      ...doc,
      pages: updatedPages,
      combinedMarkdown: combined,
      updatedAt: new Date().toISOString(),
      stats: {
        ...doc.stats,
        totalWords: words,
        totalCharacters: chars,
      },
    };

    setDoc(updated);
    setIsSaved(false);
    onUpdateDocument(updated);
  };

  // Manual or automatic Save
  const handleSave = async () => {
    await saveDocument(doc);
    setIsSaved(true);
  };

  // Insert markdown helper at cursor
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = activePage?.extractedMarkdown || doc.combinedMarkdown;
    const selected = currentText.substring(start, end);

    const replacement = `${prefix}${selected || (lang === 'ar' ? 'نص' : 'text')}${suffix}`;
    const nextText = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleContentChange(nextText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 3));
    }, 50);
  };

  // AI Copilot Transformations (Proofreading, Translation AR ⇄ EN, Summarization, Formal Formatting)
  const handleAiAction = async (
    action: 'proofread' | 'translate' | 'format_formal' | 'summarize',
    explicitTargetLang?: 'ar' | 'en'
  ) => {
    setIsTranslateMenuOpen(false);
    const targetText = activePage?.extractedMarkdown || doc.combinedMarkdown;
    if (!targetText || !targetText.trim()) {
      setAiActionFeedback({
        type: 'error',
        message: lang === 'ar' ? 'لا يوجد نص لتنفيذ العملية عليه' : 'No text available to process',
      });
      setTimeout(() => setAiActionFeedback(null), 3000);
      return;
    }

    const currentLang = detectTextPrimaryLanguage(targetText);
    const targetLang = explicitTargetLang || (currentLang === 'ar' ? 'en' : 'ar');

    setIsAiLoading(true);
    setAiActionFeedback(null);

    if (action === 'translate') {
      setAiLoadingMessage(
        targetLang === 'en'
          ? (lang === 'ar' ? 'جارٍ الترجمة الفورية من العربية إلى الإنجليزية...' : 'Translating from Arabic to English...')
          : (lang === 'ar' ? 'جارٍ الترجمة الفورية من الإنجليزية إلى العربية...' : 'Translating from English to Arabic...')
      );
    } else if (action === 'proofread') {
      setAiLoadingMessage(lang === 'ar' ? 'جارٍ التدقيق الإملائي والنحوي بالذكاء الاصطناعي...' : 'Proofreading with AI...');
    } else if (action === 'summarize') {
      setAiLoadingMessage(lang === 'ar' ? 'جارٍ تلخيص المستند واستخراج النقاط...' : 'Generating AI summary...');
    } else {
      setAiLoadingMessage(lang === 'ar' ? 'جارٍ التنسيق الذكي للمستند...' : 'Formatting document with AI...');
    }

    try {
      const response = await transformTextWithAi(targetText, action, explicitTargetLang);
      if (response && response.result) {
        if (action === 'summarize') {
          handleContentChange(`${targetText}\n\n> 📋 **${lang === 'ar' ? 'ملخص الذكاء الاصطناعي' : 'AI Summary'}:**\n${response.result}\n`);
        } else {
          handleContentChange(response.result);
        }

        const successMsg = action === 'translate'
          ? (lang === 'ar' 
              ? `✅ تمت الترجمة بنجاح (${response.sourceLang === 'ar' ? 'من العربي للانجليزي' : 'من الانجليزي للعربي'})` 
              : `✅ Successfully translated from ${response.sourceLang.toUpperCase()} to ${response.targetLang.toUpperCase()}`)
          : (lang === 'ar' ? '✅ تم تنفيذ العملية بنجاح' : '✅ Completed successfully');

        setAiActionFeedback({ type: 'success', message: successMsg });
        setTimeout(() => setAiActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('AI action failed:', err);
      setAiActionFeedback({
        type: 'error',
        message: err?.message || (lang === 'ar' ? 'تعذر تنفيذ العملية، يرجى التحقق من مفتاح API' : 'Action failed, please check API key'),
      });
      setTimeout(() => setAiActionFeedback(null), 6000);
    } finally {
      setIsAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // Re-Extract active page OCR using AI
  const handleReOcrPage = async () => {
    if (!activePage) return;
    setIsReExtracting(true);
    setReExtractError(null);

    try {
      const source = activePage.enhancedImage || activePage.originalImage;
      const { base64Data, mimeType } = await fileOrUrlToBase64(source);

      let ocr: OCRResult | null = null;
      let lastErrMessage = '';

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
              mode: 'document',
            }
          );

          if (resData) {
            ocr = resData;
            break;
          }
        } catch (callErr: any) {
          lastErrMessage = callErr?.message || 'Network error';
        }
      }

      if (!ocr) {
        throw new Error(lastErrMessage || 'تعذر استخراج الصفحة بعد عدة محاولات.');
      }

      let updatedPages = [...doc.pages];
      if (updatedPages[activePageIndex]) {
        updatedPages[activePageIndex] = {
          ...updatedPages[activePageIndex],
          extractedMarkdown: ocr.markdown || '',
          extractedPlainText: ocr.plainText || '',
          readingDirection: ocr.readingDirection || 'rtl',
          status: 'completed',
          detectedElements: ocr.detectedElements,
        };
      }

      const combined = updatedPages.map(p => p.extractedMarkdown).join('\n\n---\n\n');
      const words = combined.split(/\s+/).filter(Boolean).length;
      const chars = combined.length;

      const updated: DocumentItem = {
        ...doc,
        pages: updatedPages,
        combinedMarkdown: combined,
        readingDirection: ocr.readingDirection || doc.readingDirection,
        updatedAt: new Date().toISOString(),
        stats: {
          ...doc.stats,
          totalWords: words,
          totalCharacters: chars,
        },
      };

      setDoc(updated);
      setIsSaved(false);
      onUpdateDocument(updated);
    } catch (err: any) {
      console.error('Re-OCR failed:', err);
      setReExtractError(err?.message || (lang === 'ar' ? 'فشل استخراج الصفحة، يرجى المحاولة ثانية أو إدخال مفتاح API' : 'Extraction failed'));
    } finally {
      setIsReExtracting(false);
    }
  };

  // Search & Replace
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const currentText = activePage?.extractedMarkdown || doc.combinedMarkdown;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newText = currentText.replace(regex, replaceQuery);
    handleContentChange(newText);
  };

  // Copy plain text
  const handleCopyText = () => {
    const text = activePage?.extractedMarkdown || doc.combinedMarkdown;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Full Rich Copy (Complete Document with all tables and formulas formatted)
  const handleCopyFullDocument = async () => {
    const text = activePage?.extractedMarkdown || doc.combinedMarkdown;
    const success = await copyFullDocumentToClipboard(text, doc.readingDirection === 'rtl');
    if (success) {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2500);
    }
  };

  // Direct PDF Export
  const handlePdfExport = async () => {
    try {
      await exportToPdf({
        title: doc.title,
        elementId: 'printable-document-view',
        rtl: doc.readingDirection === 'rtl',
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Document Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-white border border-gray-200 shadow-xs">
        
        {/* Title & Metadata */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold border border-gray-200">
              DOCX & PDF READY
            </span>
            {activePage?.detectedElements?.watermarksDetectedAndFiltered && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {lang === 'ar' ? '✓ تمت تصفية العلامة المائية' : '✓ Watermarks Suppressed'}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {isSaved ? (lang === 'ar' ? 'تم الحفظ سحابياً' : 'Saved to Cloud') : (lang === 'ar' ? 'تعديلات غير محفوظة' : 'Unsaved edits')}
            </span>
          </div>

          <input
            type="text"
            value={doc.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-lg sm:text-xl font-extrabold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-900 text-gray-900 outline-hidden font-cairo transition-colors py-1"
            placeholder={t.editor.titlePlaceholder}
          />
        </div>

        {/* Action Buttons: Save, Word Export, PDF, Math, Copy */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Quick AI Re-OCR active page button */}
          <button
            type="button"
            disabled={isReExtracting}
            onClick={handleReOcrPage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            title={lang === 'ar' ? 'إعادة استخراج نص وجداول الصفحة الحالية بالذكاء الاصطناعي' : 'Re-extract current page with AI OCR'}
          >
            <RefreshCw className={`w-4 h-4 text-white ${isReExtracting ? 'animate-spin' : ''}`} />
            <span>{isReExtracting ? (lang === 'ar' ? 'جارٍ الاستخراج...' : 'Extracting...') : (lang === 'ar' ? 'استخراج الصفحة (OCR)' : 'Extract Page')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs transition-all active:scale-95"
            title={t.editor.saveCloud}
          >
            <Save className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t.editor.saveCloud}</span>
          </button>

          {/* Tables Manager & Excel Export Button */}
          <button
            type="button"
            onClick={() => setIsTablesModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300 shadow-2xs transition-all active:scale-95"
            title={t.editor.tablesManager}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>{lang === 'ar' ? 'استخراج الجداول' : 'Tables'}</span>
          </button>

          {/* Spell & Grammar Audit Button */}
          <button
            type="button"
            onClick={() => setIsSpellModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-300 shadow-2xs transition-all active:scale-95"
            title={lang === 'ar' ? 'تدقيق إملائي ونحوي ذكي' : 'Smart Spell & Grammar Audit'}
          >
            <SpellCheck className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'ar' ? 'التدقيق اللغوي' : 'Spellcheck'}</span>
          </button>

          {/* Audio Proofreading Player Toggle */}
          <button
            type="button"
            onClick={() => setShowAudioProof(!showAudioProof)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-2xs active:scale-95 ${
              showAudioProof
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title={lang === 'ar' ? 'قراءة صوتية للتدقيق والتحقق' : 'Audio Proofreader'}
          >
            <Volume2 className={`w-4 h-4 ${showAudioProof ? 'text-white' : 'text-amber-600'}`} />
            <span className="hidden sm:inline">{lang === 'ar' ? 'مراجعة صوتية' : 'Audio Proof'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMathModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 text-xs font-bold border border-fuchsia-300 shadow-2xs transition-all active:scale-95"
            title={t.editor.evaluateMath}
          >
            <Calculator className="w-4 h-4 text-fuchsia-600" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'فحص الحسابات' : 'Math Audit'}</span>
          </button>

          {/* Copy Full Image Document (Text + Tables) */}
          <button
            type="button"
            onClick={handleCopyFullDocument}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-all active:scale-95 ${
              copiedFull
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title={t.editor.copyFullRich}
          >
            {copiedFull ? <CheckCheck className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-slate-700" />}
            <span>{copiedFull ? (lang === 'ar' ? 'تم نسخ كامل الصورة!' : 'Full Copy Done!') : (lang === 'ar' ? 'نسخ كامل الصورة' : 'Copy All')}</span>
          </button>

          {/* PowerPoint (.pptx) Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            title={lang === 'ar' ? 'تصدير كعرض تقديمي PowerPoint' : 'Export as PowerPoint presentation'}
          >
            <Presentation className="w-4 h-4 text-amber-100" />
            <span>PowerPoint</span>
          </button>

          {/* Primary Word Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all border border-blue-500/30"
          >
            <Download className="w-4 h-4" />
            <span>{t.editor.exportDocx}</span>
          </button>
        </div>

      </div>

      {/* Stats & View Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 shadow-xs">
        
        {/* Document Stats */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-500">{t.editor.wordCount}: </span>
            <span className="font-mono font-bold text-gray-900">{doc.stats.totalWords}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.editor.charCount}: </span>
            <span className="font-mono font-bold text-gray-900">{doc.stats.totalCharacters}</span>
          </div>
          {doc.stats.mathEquationsCount > 0 && (
            <div className="flex items-center gap-1 text-gray-700">
              <Calculator className="w-3.5 h-3.5" />
              <span>{doc.stats.mathEquationsCount} {t.editor.mathCount}</span>
            </div>
          )}
          {doc.pages.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">{t.editor.page}: </span>
              <span className="font-mono font-bold text-gray-900">{activePageIndex + 1} {t.editor.of} {doc.pages.length}</span>
            </div>
          )}
        </div>

        {/* View Layout Switcher & Synchronized Scroll Toggle */}
        <div className="flex items-center gap-2">
          {viewMode === 'split' && (
            <button
              type="button"
              onClick={() => setIsSyncScroll(!isSyncScroll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSyncScroll
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
              title={lang === 'ar' ? 'تمرير الصورة والنص في نفس اللحظة للمقارنة والتدقيق' : 'Scroll image and text together for synchronized proofreading'}
            >
              <ArrowUpDown className={`w-3.5 h-3.5 ${isSyncScroll ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`} />
              <span>{lang === 'ar' ? 'تزامن التمرير' : 'Sync Scroll'}</span>
              <span className={`w-2 h-2 rounded-full ${isSyncScroll ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-gray-300'}`} />
            </button>
          )}

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200/80">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'split' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.editor.splitView}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'editor' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.editor.fullEditor}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('image')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'image' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.editor.fullImage}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Multi-page Navigation Ribbon (if multi-page) */}
      {doc.pages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {doc.pages.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePageIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${
                activePageIndex === idx
                  ? 'bg-gray-900 text-white border-gray-900 font-bold shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{lang === 'ar' ? 'صفحة' : 'Page'} {idx + 1}</span>
              <span className="text-[10px] opacity-75">({p.fileName.slice(0, 12)}...)</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Working Area: Split Image & Editor */}
      <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Left Column: Original Scanned Image Viewer */}
        {(viewMode === 'split' || viewMode === 'image') && activePage && (
          <div className="flex flex-col rounded-2xl bg-white border border-gray-200 overflow-hidden min-h-[500px] shadow-xs">
            
            {/* Image Viewer Header & Tools */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-700" />
                <span className="text-xs font-bold text-gray-900 font-cairo">
                  {t.editor.originalImage}
                </span>
              </div>

              {/* Zoom & Rotation Controls */}
              <div className="flex items-center gap-1.5 text-slate-600">
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1 font-bold text-slate-700">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation(r => (r + 90) % 360)}
                  className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border border-amber-600/30 text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                  title={lang === 'ar' ? 'تحديد واقتصاص جزء معين من الصورة لاستخراج النص منه' : 'Crop and OCR a specific area'}
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'قص واقتصاص OCR' : 'Crop Area'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEnhancerModalOpen(true)}
                  className="flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-[11px] font-bold shadow-2xs transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-sky-600" />
                  <span>{t.editor.filterWatermarkPreview}</span>
                </button>
              </div>
            </div>

            {/* Image Canvas View with Synchronized Scroll */}
            <div 
              ref={imageScrollRef}
              onScroll={handleImageScroll}
              className="flex-1 flex flex-col items-center justify-start p-4 bg-gray-100/60 overflow-y-auto max-h-[650px] scroll-smooth"
            >
              <img
                src={activePage.enhancedImage || activePage.originalImage}
                alt="Document Scan"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                }}
                className="w-auto object-contain rounded-lg shadow-sm select-none border border-gray-200 bg-white"
              />
            </div>

          </div>
        )}

        {/* Right Column: Formatting Toolbar & Editable Document */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div className="flex flex-col rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 text-gray-700">
              
              {/* Headings */}
              <button
                type="button"
                onClick={() => insertFormatting('# ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('## ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>

              <span className="w-px h-5 bg-gray-200 mx-1" />

              {/* Bold / Italic / Code */}
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors font-bold"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors italic"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`', '`')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Inline Code / Formula"
              >
                <Code className="w-4 h-4" />
              </button>

              <span className="w-px h-5 bg-gray-200 mx-1" />

              {/* Lists & Quote */}
              <button
                type="button"
                onClick={() => insertFormatting('- ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Callout Quote"
              >
                <Quote className="w-4 h-4" />
              </button>

              {/* Table & Math Insertion */}
              <button
                type="button"
                onClick={() => insertFormatting('\n| البند | الكمية | السعر |\n|---|---|---|\n| قيمة 1 | 10 | $100 |\n| قيمة 2 | 5 | $50 |\n')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Insert Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('$$', '$$')}
                className="p-1.5 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors font-mono"
                title="Insert Math Equation"
              >
                <Calculator className="w-4 h-4" />
              </button>

              <span className="w-px h-5 bg-gray-200 mx-1" />

              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-gray-900 text-white' : 'hover:bg-gray-200 hover:text-gray-900'}`}
                title={t.editor.findReplace}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* AI Copilot Dropdown / Actions */}
              <div className="flex items-center gap-1.5 mr-auto">
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleAiAction('proofread')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold border border-violet-300 transition-all disabled:opacity-50 shadow-2xs active:scale-95"
                  title={t.editor.proofread}
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  <span className="hidden sm:inline">{t.editor.proofread}</span>
                </button>

                {/* Instant Bidirectional Translation (Arabic ⇄ English) */}
                <div className="relative inline-flex items-center rounded-xl bg-emerald-50 border border-emerald-300 shadow-2xs">
                  <button
                    type="button"
                    disabled={isAiLoading}
                    onClick={() => handleAiAction('translate')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-900 hover:bg-emerald-100 text-xs font-bold rounded-l-xl rtl:rounded-l-none rtl:rounded-r-xl transition-all disabled:opacity-50 active:scale-95"
                    title={lang === 'ar' ? 'ترجمة فورية ذكية (تلقائياً: من العربي للإنجليزي، أو من الإنجليزي للعربي)' : 'Smart Instant Translation (Auto: Arabic ⇄ English)'}
                  >
                    <Languages className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === 'ar' ? 'ترجمة فورية (عربي ⇄ EN)' : 'Translate (AR ⇄ EN)'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isAiLoading}
                    onClick={() => setIsTranslateMenuOpen(!isTranslateMenuOpen)}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl border-l rtl:border-l-0 rtl:border-r border-emerald-300 transition-all"
                    title={lang === 'ar' ? 'خيارات الترجمة' : 'Translation options'}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isTranslateMenuOpen && (
                    <div className="absolute top-full mt-1.5 end-0 z-30 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-1 text-xs animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => handleAiAction('translate', 'en')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-start hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-bold transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <span>🇸🇦 ➔ 🇬🇧</span>
                          <span>{lang === 'ar' ? 'ترجمة إلى الإنجليزية' : 'Translate to English'}</span>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-mono">EN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiAction('translate', 'ar')}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-start hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-bold transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <span>🇬🇧 ➔ 🇸🇦</span>
                          <span>{lang === 'ar' ? 'ترجمة إلى العربية' : 'Translate to Arabic'}</span>
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-mono">AR</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Find & Replace Drawer */}
            {showSearch && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs">
                <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === 'ar' ? 'البحث عن كلمة...' : 'Find text...'}
                    className="w-full px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-900 outline-hidden focus:border-gray-900"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  <Replace className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={e => setReplaceQuery(e.target.value)}
                    placeholder={lang === 'ar' ? 'استبدال بـ...' : 'Replace with...'}
                    className="w-full px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-gray-900 outline-hidden focus:border-gray-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleReplaceAll}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  {lang === 'ar' ? 'استبدال الكل' : 'Replace All'}
                </button>
              </div>
            )}

            {/* Audio Proofreading Bar */}
            {showAudioProof && (
              <div className="p-3 bg-amber-50/70 border-b border-amber-200/80">
                <AudioProofReader
                  text={activePage ? activePage.extractedMarkdown : doc.combinedMarkdown}
                  lang={lang}
                />
              </div>
            )}

            {/* Editable Text Area */}
            <div className="relative flex-1 min-h-[500px] flex flex-col bg-white">
              {isAiLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-xs animate-fadeIn">
                  <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-emerald-300 text-slate-900 text-sm font-bold shadow-xl">
                    <Sparkles className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-extrabold font-cairo text-slate-900">
                        {aiLoadingMessage || (lang === 'ar' ? 'جارٍ المعالجة بالذكاء الاصطناعي...' : 'AI Copilot working...')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {lang === 'ar' ? 'الحفاظ على الجداول والتنسيقات والمعادلات بدقة' : 'Preserving markdown tables and structure'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Action Feedback Toast / Banner */}
              {aiActionFeedback && (
                <div 
                  className={`mx-4 mt-3 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn ${
                    aiActionFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {aiActionFeedback.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{aiActionFeedback.message}</span>
                  </div>
                  {aiActionFeedback.type === 'error' && onOpenApiKeyModal && (
                    <button
                      type="button"
                      onClick={onOpenApiKeyModal}
                      className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shrink-0 transition-colors"
                    >
                      {lang === 'ar' ? 'فحص مفتاح API' : 'Check API Key'}
                    </button>
                  )}
                </div>
              )}

              {isReExtracting && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs gap-3">
                  <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-amber-300 text-amber-950 text-sm font-bold shadow-xl">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                    <div className="flex flex-col">
                      <span className="font-extrabold">{lang === 'ar' ? 'جارٍ استخراج وتنسيق هذه الصفحة بالذكاء الاصطناعي...' : 'Extracting & formatting page with AI...'}</span>
                      <span className="text-xs text-amber-800 font-normal">{lang === 'ar' ? 'يتم قراءة النصوص والجداول والأرقام بدقة فائقة' : 'Processing text, tables, and mathematical formulas'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice Banner if Page is in Fallback state */}
              {activePage?.extractedMarkdown && (activePage.extractedMarkdown.includes('تعذر استخراج') || activePage.extractedMarkdown.includes('[تنبيه:')) && (
                <div className="m-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950 font-cairo">
                          {lang === 'ar' ? 'هذه الصفحة جاهزة للاستخراج الآلي الذكي' : 'Ready to extract text & tables from image'}
                        </h4>
                        <p className="text-xs text-amber-800/90">
                          {lang === 'ar' ? 'انقر على الزر لاستخراج كافة الجداول والقرارات الإدارية والنصوص بدقة 100%' : 'Click below to extract all tables and text from this page scan'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isReExtracting}
                      onClick={handleReOcrPage}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'ar' ? '⚡ استخراج نص وجداول الصفحة الآن' : '⚡ Extract Page Now'}</span>
                    </button>
                  </div>
                  {reExtractError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <span>{reExtractError}</span>
                      {onOpenApiKeyModal && (
                        <button
                          type="button"
                          onClick={onOpenApiKeyModal}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all shrink-0"
                        >
                          {lang === 'ar' ? 'إدخال مفتاح Gemini API' : 'Enter API Key'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={activePage ? activePage.extractedMarkdown : doc.combinedMarkdown}
                onChange={(e) => handleContentChange(e.target.value)}
                onScroll={handleTextScroll}
                dir={doc.readingDirection}
                className="w-full flex-1 p-6 bg-transparent text-gray-900 font-cairo text-base leading-relaxed resize-none outline-hidden focus:ring-0"
                placeholder={lang === 'ar' ? 'اكتب أو عدل النص المستخرج هنا...' : 'Type or edit the extracted text here...'}
              />
            </div>

          </div>
        )}

      </div>

      {/* Hidden printable element used for high-res PDF generation */}
      <div className="hidden">
        <div
          id="printable-document-view"
          ref={printAreaRef}
          dir={doc.readingDirection}
          className="p-12 bg-white text-slate-900 font-cairo max-w-4xl mx-auto"
        >
          <div className="border-b-2 border-amber-600 pb-4 mb-6">
            <h1 className="text-3xl font-bold text-amber-700 mb-2">{doc.title}</h1>
            <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="text-base leading-relaxed whitespace-pre-wrap">
            {doc.combinedMarkdown}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          documentTitle={doc.title}
          markdownContent={doc.combinedMarkdown}
          document={doc}
          lang={lang}
          onExportPdf={handlePdfExport}
        />
      )}

      {isMathModalOpen && (
        <MathEvaluatorModal
          isOpen={isMathModalOpen}
          onClose={() => setIsMathModalOpen(false)}
          lang={lang}
          detectedFormulas={activePage?.detectedElements?.mathFormulas || []}
          fullText={doc.combinedMarkdown}
          onInsertEquation={(eq) => handleContentChange((activePage?.extractedMarkdown || doc.combinedMarkdown) + eq)}
        />
      )}

      {isEnhancerModalOpen && activePage && (
        <ImageEnhancerModal
          isOpen={isEnhancerModalOpen}
          onClose={() => setIsEnhancerModalOpen(false)}
          originalImage={activePage.originalImage}
          lang={lang}
          onApply={(enhancedUrl) => {
            const copyPages = [...doc.pages];
            if (copyPages[activePageIndex]) {
              copyPages[activePageIndex].enhancedImage = enhancedUrl;
            }
            const updated = { ...doc, pages: copyPages };
            setDoc(updated);
            onUpdateDocument(updated);
          }}
        />
      )}

      {/* Crop & Targeted OCR Modal */}
      {isCropModalOpen && activePage && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageUrl={activePage.enhancedImage || activePage.originalImage}
          lang={lang}
          onCropAndOCR={async (croppedBase64, insertMode) => {
            const res = await processOcrImage(croppedBase64, 'image/jpeg', {
              removeWatermarks: true,
              extractMath: true,
              extractTables: true,
            });
            const extracted = res.markdown || res.plainText || '';
            const currentText = activePage?.extractedMarkdown || doc.combinedMarkdown;
            if (insertMode === 'replace') {
              handleContentChange(extracted);
            } else {
              handleContentChange(currentText + '\n\n' + extracted);
            }
          }}
        />
      )}

      {/* Smart Arabic Spellchecker Modal */}
      {isSpellModalOpen && (
        <SpellCheckerModal
          isOpen={isSpellModalOpen}
          onClose={() => setIsSpellModalOpen(false)}
          text={activePage ? activePage.extractedMarkdown : doc.combinedMarkdown}
          lang={lang}
          onApplyCorrectedText={(corrected) => {
            handleContentChange(corrected);
          }}
        />
      )}

      {/* Table Extractor & Excel / Word Export Modal */}
      {isTablesModalOpen && (
        <TableExtractorModal
          isOpen={isTablesModalOpen}
          onClose={() => setIsTablesModalOpen(false)}
          markdownContent={activePage?.extractedMarkdown || doc.combinedMarkdown}
          lang={lang}
          documentTitle={doc.title}
          imageSrc={activePage?.enhancedImage || activePage?.originalImage}
          onUpdateMarkdown={(newContent) => handleContentChange(newContent)}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}

    </div>
  );
};
