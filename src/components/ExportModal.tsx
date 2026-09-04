import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Palette, 
  Type, 
  Check, 
  X, 
  Sparkles, 
  Hash, 
  FileDown,
  Printer,
  Presentation,
  Layout,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocxExportOptions, Language } from '../types';
import { generateDocxBlob } from '../utils/docxExport';
import { exportToPowerPoint } from '../services/pptxExporter';
import { translations } from '../utils/i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  markdownContent: string;
  lang: Language;
  onExportPdf?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  markdownContent,
  lang,
  onExportPdf,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'docx' | 'pptx' | 'pdf'>('docx');

  const [options, setOptions] = useState<DocxExportOptions>({
    title: documentTitle || (lang === 'ar' ? 'مستند وورد منسق' : 'Formatted Word Document'),
    author: '',
    fontSize: 12,
    fontFamily: lang === 'ar' ? 'Cairo' : 'Calibri',
    lineSpacing: 1.5,
    includePageNumbers: true,
    includeTableOfContents: false,
    includeHeaderFooter: true,
    headerText: documentTitle || 'محول الصور إلى وورد الذكي',
    themeColor: 'gold',
    rtl: lang === 'ar',
    highlightMath: true,
  });

  // PowerPoint specific options
  const [pptxOptions, setPptxOptions] = useState<{
    title: string;
    theme: 'luxury' | 'corporate' | 'emerald' | 'minimal';
    fontFace: string;
    author: string;
    splitBy: 'heading' | 'page' | 'auto';
  }>({
    title: documentTitle || (lang === 'ar' ? 'عرض تقديمي مصور' : 'Slide Presentation'),
    theme: 'luxury',
    fontFace: lang === 'ar' ? 'Cairo' : 'Arial',
    author: 'Image to Word OCR Studio',
    splitBy: 'heading',
  });

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      const blob = await generateDocxBlob(markdownContent, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (options.title || 'document').replace(/[/\\?%*:|"<>]/g, '_');
      a.download = `${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D97706', '#F59E0B', '#10B981', '#3B82F6'],
      });

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Docx export failed:', err);
      setIsExporting(false);
    }
  };

  const handleDownloadPptx = async () => {
    setIsExporting(true);
    try {
      await exportToPowerPoint(markdownContent, {
        title: pptxOptions.title || documentTitle,
        theme: pptxOptions.theme,
        fontFace: pptxOptions.fontFace,
        author: pptxOptions.author,
        splitBy: pptxOptions.splitBy,
        readingDirection: lang === 'ar' ? 'rtl' : 'ltr',
      });

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D97706', '#B45309', '#3B82F6', '#8B5CF6'],
      });

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('PowerPoint export failed:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              activeTab === 'pptx' 
                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}>
              {activeTab === 'pptx' ? <Presentation className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {activeTab === 'pptx' 
                  ? (lang === 'ar' ? 'تصدير كعرض تقديمي PowerPoint (.pptx)' : 'Export PowerPoint (.pptx)')
                  : t.exportModal.title}
              </h3>
              <p className="text-xs text-gray-500">
                {activeTab === 'pptx'
                  ? (lang === 'ar' ? 'تحويل تلقائي للفقرات والجداول إلى شرائح PowerPoint احترافية' : 'Auto-convert paragraphs and tables into slides')
                  : (lang === 'ar'
                    ? 'تخصيص الهوية البصرية والتنسيق لملف Microsoft Word (.docx)'
                    : 'Customize visual theme and layout for Microsoft Word (.docx)')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100/80 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('docx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'docx'
                ? 'bg-white text-blue-800 shadow-xs border border-blue-200'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>{lang === 'ar' ? 'مستند Word (.docx)' : 'Word (.docx)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pptx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pptx'
                ? 'bg-white text-amber-900 shadow-xs border border-amber-300'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            <Presentation className="w-4 h-4 text-amber-600" />
            <span>{lang === 'ar' ? 'عرض شرائح PowerPoint (.pptx)' : 'PowerPoint (.pptx)'}</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-bold">New</span>
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {activeTab === 'pptx' ? (
            /* PowerPoint Configuration */
            <div className="space-y-5">
              {/* Presentation Title */}
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5 font-cairo">
                  {lang === 'ar' ? 'عنوان العرض التقديمي:' : 'Presentation Title:'}
                </label>
                <input
                  type="text"
                  value={pptxOptions.title}
                  onChange={e => setPptxOptions(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-amber-600 outline-hidden transition-colors"
                />
              </div>

              {/* Theme Palette */}
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-2 font-cairo">
                  {lang === 'ar' ? 'نمط وألوان الشرائح:' : 'Slide Theme & Palette:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'luxury', name: lang === 'ar' ? 'فاخر وداكن' : 'Luxury Obsidian', color: 'bg-slate-900 text-amber-400' },
                    { id: 'corporate', name: lang === 'ar' ? 'أزرق كلاسيكي' : 'Corporate Blue', color: 'bg-blue-900 text-white' },
                    { id: 'emerald', name: lang === 'ar' ? 'زمردي وإداري' : 'Emerald Green', color: 'bg-emerald-900 text-emerald-200' },
                    { id: 'minimal', name: lang === 'ar' ? 'رمادي بسيط' : 'Minimal Zinc', color: 'bg-zinc-800 text-white' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setPptxOptions(prev => ({ ...prev, theme: theme.id as any }))}
                      className={`p-3 rounded-xl border text-right font-cairo transition-all ${
                        pptxOptions.theme === theme.id
                          ? 'border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg mb-2 flex items-center justify-center font-bold text-xs ${theme.color}`}>
                        Slide Aa
                      </div>
                      <span className="text-xs font-bold text-gray-900 block">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Face */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1.5 font-cairo">
                    {lang === 'ar' ? 'نوع الخط:' : 'Font Family:'}
                  </label>
                  <select
                    value={pptxOptions.fontFace}
                    onChange={e => setPptxOptions(prev => ({ ...prev, fontFace: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white outline-hidden"
                  >
                    <option value="Cairo">Cairo (خط عصري أنيق)</option>
                    <option value="Amiri">Amiri (خط نسخي كلاسيكي)</option>
                    <option value="Arial">Arial (خط قياسي متوافق)</option>
                    <option value="Tahoma">Tahoma</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1.5 font-cairo">
                    {lang === 'ar' ? 'طريقة تقسيم الشرائح:' : 'Slide Split Logic:'}
                  </label>
                  <select
                    value={pptxOptions.splitBy}
                    onChange={e => setPptxOptions(prev => ({ ...prev, splitBy: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white outline-hidden"
                  >
                    <option value="heading">{lang === 'ar' ? 'حسب العناوين الرئيسية (# Heading)' : 'By Main Headings'}</option>
                    <option value="page">{lang === 'ar' ? 'حسب فواصل الصفحات (---)' : 'By Page Breaks'}</option>
                    <option value="auto">{lang === 'ar' ? 'تقسيم ذكي متوازن' : 'Auto Smart Balance'}</option>
                  </select>
                </div>
              </div>

              {/* Information callout */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1 font-cairo">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'ar' ? 'مزايا تصدير PowerPoint الذكي:' : 'Smart PowerPoint Features:'}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  {lang === 'ar'
                    ? 'يتم تحويل العناوين تلقائياً إلى رؤوس شرائح، والنقاط إلى قوائم نقطية، مع تحويل جداول الـ OCR إلى جداول PowerPoint حقيقية قابلة للتعديل والتحريك.'
                    : 'Headings become slide titles, bullet points are formatted, and OCR tables convert into native editable PowerPoint tables.'}
                </p>
              </div>
            </div>
          ) : (
            /* Word Configuration */
            <>
          {/* Quick Document Style Presets */}
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-2 font-cairo flex items-center justify-between">
              <span>{lang === 'ar' ? 'اختر قالب التنسيق الجاهز لمستند Word:' : 'Word Document Style Preset:'}</span>
              <span className="text-[11px] font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {lang === 'ar' ? 'تنسيق متكامل بنقرة واحدة' : '1-Click Presets'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                {
                  id: 'academic',
                  name: lang === 'ar' ? 'بحث أكاديمي' : 'Academic',
                  desc: 'Amiri / Times',
                  apply: () => setOptions(prev => ({
                    ...prev,
                    fontFamily: lang === 'ar' ? 'Amiri' : 'Times New Roman',
                    fontSize: 12,
                    themeColor: 'navy',
                    lineSpacing: 1.5,
                    includePageNumbers: true,
                    includeHeaderFooter: true,
                    highlightMath: true,
                  })),
                },
                {
                  id: 'financial',
                  name: lang === 'ar' ? 'تقرير مالي وفاتورة' : 'Financial',
                  desc: 'Cairo / Emerald',
                  apply: () => setOptions(prev => ({
                    ...prev,
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    themeColor: 'emerald',
                    lineSpacing: 1.15,
                    includePageNumbers: true,
                    includeHeaderFooter: true,
                    highlightMath: true,
                  })),
                },
                {
                  id: 'summary',
                  name: lang === 'ar' ? 'مذكرة وملخص' : 'Study Notes',
                  desc: 'Cairo / Amber',
                  apply: () => setOptions(prev => ({
                    ...prev,
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    themeColor: 'gold',
                    lineSpacing: 1.5,
                    includePageNumbers: true,
                    includeHeaderFooter: true,
                    highlightMath: true,
                  })),
                },
                {
                  id: 'legal',
                  name: lang === 'ar' ? 'عقد ووثيقة رسمية' : 'Legal & Formal',
                  desc: 'Amiri / Slate',
                  apply: () => setOptions(prev => ({
                    ...prev,
                    fontFamily: lang === 'ar' ? 'Amiri' : 'Arial',
                    fontSize: 12,
                    themeColor: 'slate',
                    lineSpacing: 1.5,
                    includePageNumbers: true,
                    includeHeaderFooter: true,
                    highlightMath: false,
                  })),
                },
                {
                  id: 'modern',
                  name: lang === 'ar' ? 'عصري حديث' : 'Modern Clean',
                  desc: 'Cairo / Crimson',
                  apply: () => setOptions(prev => ({
                    ...prev,
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    themeColor: 'crimson',
                    lineSpacing: 1.5,
                    includePageNumbers: true,
                    includeHeaderFooter: true,
                    highlightMath: true,
                  })),
                },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={preset.apply}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-900 transition-all text-center shadow-2xs group"
                >
                  <span className="text-xs font-bold text-gray-900 group-hover:text-black">{preset.name}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Document Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
                {lang === 'ar' ? 'عنوان المستند الرئيسي' : 'Document Main Title'}
              </label>
              <input
                type="text"
                value={options.title}
                onChange={e => setOptions(prev => ({ ...prev, title: e.target.value, headerText: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-gray-900 text-sm text-gray-900 outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
                {lang === 'ar' ? 'اسم المعد / الكاتب (اختياري)' : 'Author Name (Optional)'}
              </label>
              <input
                type="text"
                value={options.author}
                onChange={e => setOptions(prev => ({ ...prev, author: e.target.value }))}
                placeholder={lang === 'ar' ? 'د. فلان الفلاني...' : 'John Doe...'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-gray-900 text-sm text-gray-900 outline-hidden transition-colors"
              />
            </div>
          </div>

          {/* Theme Color Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2 font-cairo flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-gray-700" />
              {t.exportModal.themeColor}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'gold', name: t.exportModal.gold, bg: 'bg-amber-600', ring: 'ring-gray-900' },
                { id: 'navy', name: t.exportModal.navy, bg: 'bg-blue-700', ring: 'ring-gray-900' },
                { id: 'emerald', name: t.exportModal.emerald, bg: 'bg-emerald-600', ring: 'ring-gray-900' },
                { id: 'crimson', name: t.exportModal.crimson, bg: 'bg-rose-700', ring: 'ring-gray-900' },
                { id: 'slate', name: t.exportModal.slate, bg: 'bg-slate-700', ring: 'ring-gray-900' },
              ].map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setOptions(prev => ({ ...prev, themeColor: theme.id as any }))}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-center ${
                    options.themeColor === theme.id
                      ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900/10'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full ${theme.bg} shadow-xs`} />
                  <span className="text-[11px] font-medium text-gray-800 truncate w-full">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo flex items-center gap-1.5">
                <Type className="w-4 h-4 text-gray-700" />
                {t.exportModal.fontFamily}
              </label>
              <select
                value={options.fontFamily}
                onChange={e => setOptions(prev => ({ ...prev, fontFamily: e.target.value as any }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-hidden focus:border-gray-900 focus:bg-white"
              >
                <option value="Cairo">Cairo (خط حديث للغة العربية)</option>
                <option value="Amiri">Amiri (خط كلاسيكي تراثي)</option>
                <option value="Calibri">Calibri (الافتراضي لمايكروسوفت)</option>
                <option value="Arial">Arial (خط قياسي متوافق)</option>
                <option value="Times New Roman">Times New Roman (أكاديمي)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
                {t.exportModal.fontSize}
              </label>
              <select
                value={options.fontSize}
                onChange={e => setOptions(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-hidden focus:border-gray-900 focus:bg-white"
              >
                <option value="11">11 pt (مضغوط وموفر للصفحات)</option>
                <option value="12">12 pt (الحجم القياسي المعتمد)</option>
                <option value="14">14 pt (حجم مريح ومكبر)</option>
              </select>
            </div>
          </div>

          {/* Checkbox Features */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-3 text-xs text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includePageNumbers}
                onChange={e => setOptions(prev => ({ ...prev, includePageNumbers: e.target.checked }))}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
              />
              <span>{t.exportModal.includePageNum}</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includeHeaderFooter}
                onChange={e => setOptions(prev => ({ ...prev, includeHeaderFooter: e.target.checked }))}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
              />
              <span>{t.exportModal.includeHeader}</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.highlightMath}
                onChange={e => setOptions(prev => ({ ...prev, highlightMath: e.target.checked }))}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
              />
              <span>{t.exportModal.highlightMath}</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.rtl}
                onChange={e => setOptions(prev => ({ ...prev, rtl: e.target.checked }))}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
              />
              <span>{lang === 'ar' ? 'تفعيل محاذاة واتجاه النص من اليمين لليسار (RTL)' : 'Right-to-Left (RTL) Layout for Arabic'}</span>
            </label>
          </div>
          </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          {onExportPdf && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onExportPdf();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-all shadow-2xs active:scale-95"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>{lang === 'ar' ? 'تصدير كـ PDF بدلاً من ذلك' : 'Export as PDF'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            {activeTab === 'pptx' ? (
              <button
                type="button"
                onClick={handleDownloadPptx}
                disabled={isExporting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-sm shadow-md shadow-amber-500/25 transition-all disabled:opacity-50 active:scale-95"
              >
                {isExporting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جارٍ توليد الشرائح...' : 'Generating slides...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تحميل ملف PowerPoint (.pptx)' : 'Download PowerPoint (.pptx)'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isExporting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 active:scale-95"
              >
                {isExporting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>{t.exportModal.preparing}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t.exportModal.downloadBtn}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
