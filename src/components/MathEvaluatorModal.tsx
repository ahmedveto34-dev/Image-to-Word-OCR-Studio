import React, { useState } from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  X, 
  ArrowRight, 
  Plus, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface MathEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  detectedFormulas: string[];
  fullText: string;
  onInsertEquation?: (eqText: string) => void;
}

export const MathEvaluatorModal: React.FC<MathEvaluatorModalProps> = ({
  isOpen,
  onClose,
  lang,
  detectedFormulas = [],
  fullText,
  onInsertEquation,
}) => {
  const t = translations[lang];

  const [customEquation, setCustomEquation] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleEvaluateAll = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_math',
          text: customEquation || fullText || detectedFormulas.join('\n'),
          targetLang: lang,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvaluationResult(data.result);
      }
    } catch (err) {
      console.error('Math evaluation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-900 border border-gray-200">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {t.mathModal.title}
              </h3>
              <p className="text-xs text-gray-500">
                {t.mathModal.subtitle}
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Detected Formulas List */}
          {detectedFormulas.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 font-cairo">
                {lang === 'ar' ? 'المعادلات والعمليات المكتشفة في المستند تلقائياً:' : 'Formulas & Arithmetic Detected in Scan:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detectedFormulas.map((formula, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCustomEquation(formula)}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors group"
                  >
                    <span className="font-mono text-sm text-gray-900 truncate">{formula}</span>
                    <span className="text-[11px] text-gray-900 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {lang === 'ar' ? 'فحص' : 'Verify'}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Custom Equation / Calculation Input */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5 font-cairo">
              {lang === 'ar' ? 'العملية الحسابية أو المعادلة المراد تدقيقها وحلها:' : 'Equation or Math Expression to Solve & Audit:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customEquation}
                onChange={e => setCustomEquation(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: 25 × (4 + 16) - 150 ÷ 3 أو x² - 5x + 6 = 0' : 'e.g. 25 * (4 + 16) - 150 / 3 or x^2 - 5x + 6 = 0'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-gray-900 text-sm font-mono text-gray-900 outline-hidden transition-colors"
              />
              <button
                type="button"
                onClick={handleEvaluateAll}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-xs transition-all disabled:opacity-50 active:scale-98"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{lang === 'ar' ? 'فحص وحل' : 'Audit & Solve'}</span>
              </button>
            </div>
          </div>

          {/* Solution / Audit Results Display */}
          {evaluationResult && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold font-cairo">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'نتيجة التدقيق والحل الرياضي المعتمد' : 'Verified Math Audit & Solution'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(evaluationResult)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-700 border border-gray-200 shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>

                  {onInsertEquation && (
                    <button
                      type="button"
                      onClick={() => {
                        onInsertEquation(`\n\n> 🧮 **${lang === 'ar' ? 'التدقيق الحسابي' : 'Math Audit'}:**\n${evaluationResult}\n\n`);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-black text-[11px] font-bold text-white shadow-xs transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'إدراج في المستند' : 'Insert in Doc'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-900 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-gray-200 leading-relaxed shadow-xs">
                {evaluationResult}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
