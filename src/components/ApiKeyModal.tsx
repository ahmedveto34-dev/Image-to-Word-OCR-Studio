import React, { useState, useEffect } from 'react';
import { Key, Sparkles, CheckCircle2, AlertCircle, X, ExternalLink, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { getClientStoredApiKey, setClientStoredApiKey } from '../services/ocrService';
import { GoogleGenAI } from '@google/genai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, lang }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getClientStoredApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setClientStoredApiKey(apiKey.trim());
    onClose();
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim() || getClientStoredApiKey();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال مفتاح API أولاً' : 'Please enter an API key first',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'Ping test. Reply with OK.',
      });

      if (response.text) {
        setTestResult({
          success: true,
          message: lang === 'ar' ? '✅ تم الاتصال بنجاح! المفتاح صالح وجاهز للاستخدام الفوري.' : '✅ Connected successfully! API Key is active.',
        });
        setClientStoredApiKey(keyToTest);
      } else {
        throw new Error('No response');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: lang === 'ar' ? `❌ خطأ في التحقق من المفتاح: ${err.message || 'المفتاح غير صالح'}` : `❌ Verification failed: ${err.message || 'Invalid key'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-800 relative"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rtl:left-5 rtl:right-auto ltr:right-5 ltr:left-auto p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 font-cairo">
              {lang === 'ar' ? 'إعداد مفتاح الذكاء الاصطناعي (Gemini API Key)' : 'Gemini AI API Key Settings'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'للعمل المباشر على Vercel والاستخراج فائق السرعة' : 'For direct Vercel hosting & fast client-side OCR'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2 text-xs text-blue-900 leading-relaxed font-medium">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{lang === 'ar' ? 'تشغيل آمن ومجاني 100%' : '100% Free & Secure Client Storage'}</span>
          </div>
          <p>
            {lang === 'ar'
              ? 'إذا قمت بنشر التطبيق على Vercel، يمكنك إدخال مفتاح Gemini API Key المجاني هنا ليعمل الاستخراج فوراً في متصفحك دون الحاجة لخادم، أو إضافته في متغيرات بيئة Vercel باسم GEMINI_API_KEY.'
              : 'When deployed on Vercel or static hosts, enter your free Gemini API key below to process OCR directly in your browser.'}
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-700 font-bold hover:underline pt-1"
          >
            <span>{lang === 'ar' ? 'الحصول على مفتاح API مجاناً من Google AI Studio' : 'Get a free key from Google AI Studio'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 font-cairo flex items-center justify-between">
            <span>{lang === 'ar' ? 'مفتاح Gemini API Key:' : 'Gemini API Key:'}</span>
            {apiKey && (
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'محفوظ محلياً' : 'Stored locally'}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-mono bg-slate-50/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test Result feedback */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-red-50 border border-red-300 text-red-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="break-all">{testResult.message}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isTesting || !apiKey.trim()}
            onClick={handleTestKey}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>{lang === 'ar' ? 'جارٍ التحقق...' : 'Testing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'ar' ? 'اختبار المفتاح ⚡' : 'Test Key ⚡'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{lang === 'ar' ? 'حفظ وتفعيل' : 'Save & Enable'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
