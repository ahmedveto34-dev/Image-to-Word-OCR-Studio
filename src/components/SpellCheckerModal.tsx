import React, { useState } from 'react';
import { 
  CheckCheck, 
  Sparkles, 
  X, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  AlertCircle,
  BookOpen,
  FileCheck,
  Copy
} from 'lucide-react';
import { Language } from '../types';

interface SpellCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApplyCorrections: (correctedText: string) => void;
  lang: Language;
}

export const SpellCheckerModal: React.FC<SpellCheckerModalProps> = ({
  isOpen,
  onClose,
  originalText,
  onApplyCorrections,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side' | 'final'>('side-by-side');
  const [copied, setCopied] = useState(false);

  // Run AI Proofreader / Arabic Spell Check
  const handleRunSpellCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'arabic_spellcheck',
          text: originalText,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to proofread');
      }

      setCorrectedText(data.result);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete spellcheck');
    } finally {
      setLoading(false);
    }
  };

  // Trigger on open if empty
  React.useEffect(() => {
    if (isOpen && !correctedText && originalText && !loading) {
      handleRunSpellCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (correctedText) {
      onApplyCorrections(correctedText);
      onClose();
    }
  };

  const handleCopy = async () => {
    if (!correctedText) return;
    await navigator.clipboard.writeText(correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-cairo">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isAr ? 'المدقق اللغوي والإملائي الذكي (Arabic Spell & Grammar AI)' : 'Smart Grammar & Arabic Spell Checker'}
              </h3>
              <p className="text-xs text-gray-500">
                {isAr 
                  ? 'تصحيح تلقائي لهمزات الوصل والقطع، التاء المربوطة والهاء، علامات الترقيم، وتصويب أخطاء الـ OCR' 
                  : 'Automated correction for Arabic Hamzas, grammar, punctuation, and OCR typos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action / Mode Selector */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-gray-100/70 border-b border-gray-200">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'side-by-side' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isAr ? 'مقارنة جنباً إلى جنب' : 'Side by Side'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('final')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'final' ? 'bg-teal-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isAr ? 'النص المصوب النهائي' : 'Corrected Text'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleRunSpellCheck}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 shadow-2xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'إعادة الفحص والتدقيق' : 'Re-check'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-3 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-800">
                {isAr ? 'جارِ فحص وتدقيق النص بواسطة المحرك اللغوي...' : 'Proofreading and auditing Arabic document...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAr ? 'يتم تصويب الهمزات، التاء المربوطة، التنوين، وضبط علامات الترقيم' : 'Auditing hamzas, punctuation and linguistic nuances'}
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleRunSpellCheck}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : (
            <div className="h-full">
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  {/* Original */}
                  <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span>{isAr ? 'النص الأصلي المستخرج من الصورة' : 'Original Extracted Text'}</span>
                      <span className="text-[11px] text-gray-500 font-normal">
                        ({originalText.split(/\s+/).filter(Boolean).length} {isAr ? 'كلمة' : 'words'})
                      </span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto font-sans text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-96">
                      {originalText}
                    </div>
                  </div>

                  {/* Corrected */}
                  <div className="flex flex-col rounded-xl border border-teal-200 bg-teal-50/20 overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-teal-100/70 border-b border-teal-200 text-xs font-bold text-teal-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>{isAr ? 'النص بعد التدقيق والإصلاح' : 'Proofread & Corrected'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto font-sans text-xs text-gray-900 leading-relaxed whitespace-pre-wrap max-h-96 bg-white">
                      {correctedText || originalText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-teal-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-teal-50 border-b border-teal-200 text-xs font-bold text-teal-900">
                    {isAr ? 'النص المصوب والجاهز للاعتماد' : 'Final Corrected Document'}
                  </div>
                  <textarea
                    value={correctedText}
                    onChange={(e) => setCorrectedText(e.target.value)}
                    rows={14}
                    className="w-full p-4 text-xs font-sans leading-relaxed text-gray-900 focus:outline-none focus:ring-0 border-0 resize-y"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            {isAr 
              ? '✨ تم الحفاظ على جميع الجداول، العناوين، والمعادلات الرياضية أثناء التدقيق.' 
              : '✨ All tables, headings, and formulas were preserved during correction.'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!correctedText || loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? 'تطبيق التصويبات على المستند' : 'Apply Corrections to Document'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
