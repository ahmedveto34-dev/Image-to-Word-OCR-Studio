import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  Sun, 
  Contrast, 
  Layers, 
  X, 
  Check, 
  Eye,
  ShieldAlert,
  Droplets
} from 'lucide-react';
import { ImageProcessingFilters, Language } from '../types';
import { applyImageFilters, DEFAULT_FILTERS } from '../utils/imageFilters';
import { translations } from '../utils/i18n';

interface ImageEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  onApply: (enhancedDataUrl: string, filters: ImageProcessingFilters) => void;
  lang: Language;
}

export const ImageEnhancerModal: React.FC<ImageEnhancerModalProps> = ({
  isOpen,
  onClose,
  originalImage,
  onApply,
  lang,
}) => {
  const t = translations[lang];
  const [filters, setFilters] = useState<ImageProcessingFilters>(DEFAULT_FILTERS);
  const [previewUrl, setPreviewUrl] = useState<string>(originalImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'processed' | 'original'>('split');

  useEffect(() => {
    if (isOpen && originalImage) {
      updatePreview();
    }
  }, [filters, isOpen, originalImage]);

  const updatePreview = async () => {
    setIsProcessing(true);
    try {
      const result = await applyImageFilters(originalImage, filters);
      setPreviewUrl(result);
    } catch (err) {
      console.error('Filter preview error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRotate = (deg: number) => {
    setFilters(prev => ({
      ...prev,
      rotation: (prev.rotation + deg + 360) % 360,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100 text-gray-900 border border-gray-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {t.enhancer.title}
              </h3>
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'ضبط الإضاءة، التباين، وإزالة العلامات المائية لضمان أعلى دقة استخراج'
                  : 'Optimize lighting, contrast, and suppress watermarks for maximum OCR accuracy'}
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

        {/* Body Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto flex-1">
          
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-5 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
            
            {/* Quick Presets */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 font-cairo">
                {lang === 'ar' ? 'فلاتر تنقية سريعة' : 'Quick Clean Presets'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({
                    ...DEFAULT_FILTERS,
                    grayscale: true,
                    contrast: 35,
                    brightness: 10,
                    watermarkFilterStrength: 'medium'
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 text-xs font-semibold text-gray-800 border border-gray-200 shadow-xs transition-colors"
                >
                  <Droplets className="w-3.5 h-3.5 text-gray-700" />
                  <span>{lang === 'ar' ? 'تنقية العلامات المائية' : 'Clean Watermark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({
                    ...DEFAULT_FILTERS,
                    grayscale: true,
                    contrast: 60,
                    binarizeThreshold: 140,
                    watermarkFilterStrength: 'high'
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 text-xs font-semibold text-gray-800 border border-gray-200 shadow-xs transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-gray-700" />
                  <span>{lang === 'ar' ? 'مستند أبيض وأسود حاد' : 'High-B&W Scan'}</span>
                </button>
              </div>
            </div>

            {/* Brightness Slider */}
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-gray-600" />
                  {t.enhancer.brightness}
                </span>
                <span className="font-mono font-bold text-gray-900">{filters.brightness > 0 ? `+${filters.brightness}` : filters.brightness}</span>
              </div>
              <input
                type="range"
                min="-80"
                max="80"
                value={filters.brightness}
                onChange={e => setFilters(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                className="w-full accent-gray-900 cursor-pointer"
              />
            </div>

            {/* Contrast Slider */}
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Contrast className="w-3.5 h-3.5 text-gray-600" />
                  {t.enhancer.contrast}
                </span>
                <span className="font-mono font-bold text-gray-900">{filters.contrast > 0 ? `+${filters.contrast}` : filters.contrast}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                value={filters.contrast}
                onChange={e => setFilters(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                className="w-full accent-gray-900 cursor-pointer"
              />
            </div>

            {/* Watermark Suppression Threshold */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-gray-600" />
                {lang === 'ar' ? 'قوة عزل العلامات المائية' : 'Watermark Isolation Level'}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['none', 'low', 'medium', 'high'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, watermarkFilterStrength: lvl }))}
                    className={`py-1.5 text-xs font-medium rounded-md border transition-all ${
                      filters.watermarkFilterStrength === lvl
                        ? 'bg-gray-900 text-white border-gray-900 font-bold shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {lvl === 'none' ? (lang === 'ar' ? 'معطل' : 'Off') :
                     lvl === 'low' ? (lang === 'ar' ? 'خفيف' : 'Low') :
                     lvl === 'medium' ? (lang === 'ar' ? 'متوسط' : 'Med') :
                     (lang === 'ar' ? 'قوي' : 'High')}
                  </button>
                ))}
              </div>
            </div>

            {/* Binarization Threshold */}
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>{t.enhancer.binarize}</span>
                <span className="font-mono font-bold text-gray-900">{filters.binarizeThreshold === 0 ? (lang === 'ar' ? 'معطل' : 'Off') : filters.binarizeThreshold}</span>
              </div>
              <input
                type="range"
                min="0"
                max="220"
                step="5"
                value={filters.binarizeThreshold}
                onChange={e => setFilters(prev => ({ ...prev, binarizeThreshold: Number(e.target.value) }))}
                className="w-full accent-gray-900 cursor-pointer"
              />
            </div>

            {/* Checkbox Toggles */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.grayscale}
                  onChange={e => setFilters(prev => ({ ...prev, grayscale: e.target.checked }))}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
                />
                <span>{t.enhancer.grayscale}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.invert}
                  onChange={e => setFilters(prev => ({ ...prev, invert: e.target.checked }))}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 w-4 h-4"
                />
                <span>{t.enhancer.invert}</span>
              </label>
            </div>

            {/* Rotation Controls */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white hover:bg-gray-100 text-xs font-medium text-gray-800 border border-gray-200 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.enhancer.rotateLeft}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white hover:bg-gray-100 text-xs font-medium text-gray-800 border border-gray-200 shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{t.enhancer.rotateRight}</span>
                </button>
              </div>
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t.enhancer.reset}
            </button>
          </div>

          {/* Visual Preview Canvas Column */}
          <div className="lg:col-span-2 flex flex-col bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            
            {/* View Mode Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-gray-700" />
                <span className="text-xs font-semibold text-gray-800">
                  {lang === 'ar' ? 'المعاينة الفورية' : 'Live Preview'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'split' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {lang === 'ar' ? 'مقارنة منقسمة' : 'Split'}
                </button>
                <button
                  onClick={() => setViewMode('processed')}
                  className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'processed' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {lang === 'ar' ? 'المعدلة' : 'Enhanced'}
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded transition-colors ${viewMode === 'original' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {lang === 'ar' ? 'الأصلية' : 'Original'}
                </button>
              </div>
            </div>

            {/* Canvas / Image Container */}
            <div className="relative flex-1 min-h-[350px] p-4 flex items-center justify-center bg-gray-100 overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-xs">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs font-medium shadow-sm">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جارٍ معالجة الفلاتر...' : 'Applying filters...'}</span>
                  </div>
                </div>
              )}

              {viewMode === 'split' ? (
                <div className="grid grid-cols-2 gap-3 w-full h-full max-h-[450px]">
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 shadow-xs overflow-hidden">
                    <span className="text-[11px] font-bold text-gray-500 mb-2">
                      {lang === 'ar' ? 'قبل التنقية (الأصلية)' : 'Original Scan'}
                    </span>
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      className="max-h-[350px] w-auto object-contain rounded"
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-900/40 shadow-xs overflow-hidden">
                    <span className="text-[11px] font-bold text-gray-900 mb-2">
                      {lang === 'ar' ? 'بعد المعالجة والتنقية' : 'Filtered & Cleaned'}
                    </span>
                    <img 
                      src={previewUrl} 
                      alt="Enhanced" 
                      className="max-h-[350px] w-auto object-contain rounded"
                    />
                  </div>
                </div>
              ) : viewMode === 'processed' ? (
                <img 
                  src={previewUrl} 
                  alt="Enhanced Full" 
                  className="max-h-[450px] w-auto object-contain rounded-lg shadow-sm"
                />
              ) : (
                <img 
                  src={originalImage} 
                  alt="Original Full" 
                  className="max-h-[450px] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={() => {
              onApply(previewUrl, filters);
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-xs transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>{t.enhancer.applyFilter}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
