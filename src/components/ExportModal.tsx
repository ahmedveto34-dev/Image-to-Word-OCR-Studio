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
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocxExportOptions, Language } from '../types';
import { generateDocxBlob } from '../utils/docxExport';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-900 border border-gray-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {t.exportModal.title}
              </h3>
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'تخصيص الهوية البصرية والتنسيق لملف Microsoft Word (.docx)'
                  : 'Customize visual theme and layout for Microsoft Word (.docx)'}
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

        {/* Modal Form */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-colors shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تصدير كـ PDF بدلاً من ذلك' : 'Export as PDF'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-xs transition-all disabled:opacity-50 active:scale-98"
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
          </div>
        </div>

      </div>
    </div>
  );
};
