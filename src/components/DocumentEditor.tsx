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
  Volume2
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

interface DocumentEditorProps {
  document: DocumentItem;
  onUpdateDocument: (doc: DocumentItem) => void;
  lang: Language;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document: initialDoc,
  onUpdateDocument,
  lang,
}) => {
  const t = translations[lang];

  const [doc, setDoc] = useState<DocumentItem>(initialDoc);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'image'>('split');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const activePage: DocumentPage | undefined = doc.pages[activePageIndex] || doc.pages[0];

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

  // AI Copilot Transformations
  const handleAiAction = async (action: 'proofread' | 'translate' | 'format_formal' | 'summarize') => {
    setIsAiLoading(true);
    const targetText = activePage?.extractedMarkdown || doc.combinedMarkdown;

    try {
      const response = await fetch('/api/ai/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: targetText,
          targetLang: lang === 'ar' ? 'en' : 'ar',
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.result) {
        if (action === 'summarize') {
          handleContentChange(`${targetText}\n\n> 📋 **${lang === 'ar' ? 'ملخص الذكاء الاصطناعي' : 'AI Summary'}:**\n${resData.result}\n`);
        } else {
          handleContentChange(resData.result);
        }
      }
    } catch (err) {
      console.error('AI action failed:', err);
    } finally {
      setIsAiLoading(false);
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
          
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 shadow-xs transition-colors"
            title={t.editor.saveCloud}
          >
            <Save className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t.editor.saveCloud}</span>
          </button>

          {/* Tables Manager & Excel Export Button */}
          <button
            type="button"
            onClick={() => setIsTablesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs transition-colors"
            title={t.editor.tablesManager}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'استخراج الجداول' : 'Tables'}</span>
          </button>

          {/* Spell & Grammar Audit Button */}
          <button
            type="button"
            onClick={() => setIsSpellModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 shadow-xs transition-colors"
            title={lang === 'ar' ? 'تدقيق إملائي ونحوي ذكي' : 'Smart Spell & Grammar Audit'}
          >
            <SpellCheck className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'ar' ? 'التدقيق اللغوي' : 'Spellcheck'}</span>
          </button>

          {/* Audio Proofreading Player Toggle */}
          <button
            type="button"
            onClick={() => setShowAudioProof(!showAudioProof)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors shadow-xs ${
              showAudioProof
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title={lang === 'ar' ? 'قراءة صوتية للتدقيق والتحقق' : 'Audio Proofreader'}
          >
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'مراجعة صوتية' : 'Audio Proof'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMathModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 shadow-xs transition-colors"
            title={t.editor.evaluateMath}
          >
            <Calculator className="w-4 h-4 text-gray-700" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'فحص الحسابات' : 'Math Audit'}</span>
          </button>

          {/* Copy Full Image Document (Text + Tables) */}
          <button
            type="button"
            onClick={handleCopyFullDocument}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold border border-gray-300 shadow-xs transition-all"
            title={t.editor.copyFullRich}
          >
            {copiedFull ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-700" />}
            <span>{copiedFull ? (lang === 'ar' ? 'تم نسخ كامل الصورة!' : 'Full Copy Done!') : (lang === 'ar' ? 'نسخ كامل الصورة' : 'Copy All')}</span>
          </button>

          {/* Primary Word Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-xs active:scale-98 transition-all"
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

        {/* View Layout Switcher */}
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
              <div className="flex items-center gap-1 text-gray-600">
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation(r => (r + 90) % 360)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-700"
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 transition-colors"
                  title={lang === 'ar' ? 'تحديد واقتصاص جزء معين من الصورة لاستخراج النص منه' : 'Crop and OCR a specific area'}
                >
                  <Crop className="w-3 h-3 text-amber-600" />
                  <span>{lang === 'ar' ? 'قص واقتصاص OCR' : 'Crop Area'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEnhancerModalOpen(true)}
                  className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-medium hover:bg-gray-200 transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{t.editor.filterWatermarkPreview}</span>
                </button>
              </div>
            </div>

            {/* Image Canvas View */}
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-100/60 overflow-auto max-h-[650px]">
              <img
                src={activePage.enhancedImage || activePage.originalImage}
                alt="Document Scan"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="max-h-[580px] w-auto object-contain rounded-lg shadow-sm select-none border border-gray-200 bg-white"
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
              <div className="flex items-center gap-1 mr-auto">
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleAiAction('proofread')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 transition-colors disabled:opacity-50 shadow-xs"
                  title={t.editor.proofread}
                >
                  <Sparkles className="w-3.5 h-3.5 text-gray-600" />
                  <span className="hidden sm:inline">{t.editor.proofread}</span>
                </button>

                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleAiAction('translate')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 transition-colors disabled:opacity-50 shadow-xs"
                  title={t.editor.translate}
                >
                  <Languages className="w-3.5 h-3.5 text-gray-600" />
                  <span className="hidden sm:inline">{t.editor.translate}</span>
                </button>
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
                  className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg shadow-xs"
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
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 text-sm font-semibold shadow-lg">
                    <Sparkles className="w-5 h-5 animate-spin text-gray-700" />
                    <span>{lang === 'ar' ? 'جارٍ التدقيق والتنسيق الذكي...' : 'AI Copilot working...'}</span>
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={activePage ? activePage.extractedMarkdown : doc.combinedMarkdown}
                onChange={(e) => handleContentChange(e.target.value)}
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
          imageSrc={activePage.enhancedImage || activePage.originalImage}
          lang={lang}
          onCroppedOCR={(extractedText, mode) => {
            const currentText = activePage?.extractedMarkdown || doc.combinedMarkdown;
            if (mode === 'replace') {
              handleContentChange(extractedText);
            } else {
              handleContentChange(currentText + '\n\n' + extractedText);
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

      {/* Table Extractor & Excel Export Modal */}
      {isTablesModalOpen && (
        <TableExtractorModal
          isOpen={isTablesModalOpen}
          onClose={() => setIsTablesModalOpen(false)}
          markdownContent={activePage?.extractedMarkdown || doc.combinedMarkdown}
          lang={lang}
        />
      )}

    </div>
  );
};
