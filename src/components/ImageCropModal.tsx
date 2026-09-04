import React, { useState, useRef, useEffect } from 'react';
import { 
  Crop, 
  X, 
  Sparkles, 
  RotateCw, 
  Check, 
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Copy,
  PlusCircle
} from 'lucide-react';
import { Language } from '../types';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropAndOCR: (croppedBase64: string, insertMode: 'replace' | 'append') => Promise<void>;
  lang: Language;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCropAndOCR,
  lang,
}) => {
  const isAr = lang === 'ar';
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Selection box in percentages (0-100)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, box: { x: 0, y: 0, width: 0, height: 0 } });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('append');

  // Generate snippet preview on box change
  useEffect(() => {
    if (!isOpen || !imgRef.current) return;
    const generatePreview = () => {
      const img = imgRef.current;
      if (!img || !img.naturalWidth) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sx = (cropBox.x / 100) * img.naturalWidth;
      const sy = (cropBox.y / 100) * img.naturalHeight;
      const sw = (cropBox.width / 100) * img.naturalWidth;
      const sh = (cropBox.height / 100) * img.naturalHeight;

      canvas.width = Math.max(10, sw);
      canvas.height = Math.max(10, sh);

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      setCroppedPreview(canvas.toDataURL('image/jpeg', 0.95));
    };

    const timer = setTimeout(generatePreview, 100);
    return () => clearTimeout(timer);
  }, [cropBox, isOpen]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox },
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dxPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dyPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

    let { x, y, width, height } = dragStart.box;

    if (dragMode === 'move') {
      x = Math.max(0, Math.min(100 - width, x + dxPercent));
      y = Math.max(0, Math.min(100 - height, y + dyPercent));
    } else if (dragMode === 'se') {
      width = Math.max(5, Math.min(100 - x, width + dxPercent));
      height = Math.max(5, Math.min(100 - y, height + dyPercent));
    } else if (dragMode === 'nw') {
      const newX = Math.max(0, Math.min(x + width - 5, x + dxPercent));
      const newY = Math.max(0, Math.min(y + height - 5, y + dyPercent));
      width += (x - newX);
      height += (y - newY);
      x = newX;
      y = newY;
    } else if (dragMode === 'ne') {
      const newY = Math.max(0, Math.min(y + height - 5, y + dyPercent));
      width = Math.max(5, Math.min(100 - x, width + dxPercent));
      height += (y - newY);
      y = newY;
    } else if (dragMode === 'sw') {
      const newX = Math.max(0, Math.min(x + width - 5, x + dxPercent));
      width += (x - newX);
      height = Math.max(5, Math.min(100 - y, height + dyPercent));
      x = newX;
    }

    setCropBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const handleExecuteCropOCR = async () => {
    if (!croppedPreview) return;
    setIsProcessing(true);
    try {
      await onCropAndOCR(croppedPreview, insertMode);
      onClose();
    } catch (err) {
      console.error('Crop OCR failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-cairo select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isAr ? 'قص وتحديد منطقة مخصصة للتحويل (Area OCR)' : 'Interactive Area & Section OCR'}
              </h3>
              <p className="text-xs text-gray-500">
                {isAr 
                  ? 'اسحب إطار التحديد لاختيار فقرة أو جدول أو رسم بياني معين واستخراجه بدقة فائقة'
                  : 'Drag the selection box to extract a specific paragraph, table, or formula'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-200 bg-gray-100">
          
          {/* Main Interactive Canvas Viewer */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            <div 
              ref={containerRef}
              className="relative max-h-[60vh] max-w-full inline-block overflow-hidden rounded-lg shadow-md border border-gray-300 bg-white"
            >
              <img 
                ref={imgRef}
                src={imageUrl} 
                alt="Source OCR crop"
                className="max-h-[58vh] w-auto object-contain block pointer-events-none"
              />

              {/* Dimmed Overlay */}
              <div 
                className="absolute inset-0 bg-black/40 pointer-events-none" 
              />

              {/* Active Selection Box */}
              <div
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
                className="absolute border-2 border-amber-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] cursor-move"
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-amber-300/50" />
                  <div className="border-r border-b border-amber-300/50" />
                  <div className="border-b border-amber-300/50" />
                  <div className="border-r border-b border-amber-300/50" />
                  <div className="border-r border-b border-amber-300/50" />
                  <div className="border-b border-amber-300/50" />
                  <div className="border-r border-amber-300/50" />
                  <div className="border-r border-amber-300/50" />
                  <div />
                </div>

                {/* Corner Resizing Handles */}
                <div 
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full cursor-nwse-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                />
                <div 
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full cursor-nesw-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                />
                <div 
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full cursor-nesw-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                />
                <div 
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full cursor-nwse-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar Preview & Options */}
          <div className="w-full md:w-80 bg-white p-5 flex flex-col justify-between border-t md:border-t-0 border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {isAr ? 'معاينة الجزء المحدد:' : 'Selected Snippet Preview:'}
                </label>
                <div className="h-40 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center p-2">
                  {croppedPreview ? (
                    <img 
                      src={croppedPreview} 
                      alt="Crop Preview" 
                      className="max-h-full max-w-full object-contain rounded shadow-xs"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">
                      {isAr ? 'حدد جزءاً من الصورة للمعاينة' : 'Select an area to preview'}
                    </span>
                  )}
                </div>
              </div>

              {/* Destination Placement Option */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {isAr ? 'طريقة إدراج النص المستخرج:' : 'Insert Target:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInsertMode('append')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      insertMode === 'append'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAr ? 'إضافة لنهاية المستند' : 'Append to End'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInsertMode('replace')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      insertMode === 'replace'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAr ? 'استبدال المستند' : 'Replace All'}</span>
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-700">
                  {isAr ? 'مقاسات سريعة:' : 'Quick Select:'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCropBox({ x: 5, y: 5, width: 90, height: 25 })}
                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold rounded-lg text-sky-800 transition-colors"
                  >
                    {isAr ? 'الترويسة' : 'Header'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropBox({ x: 5, y: 25, width: 90, height: 50 })}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold rounded-lg text-purple-800 transition-colors"
                  >
                    {isAr ? 'المتن والوسط' : 'Body'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropBox({ x: 5, y: 70, width: 90, height: 25 })}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[11px] font-bold rounded-lg text-teal-800 transition-colors"
                  >
                    {isAr ? 'التذييل' : 'Footer'}
                  </button>
                </div>
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleExecuteCropOCR}
                disabled={isProcessing || !croppedPreview}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isAr ? 'جارِ معالجة واستخراج الجزء...' : 'Extracting section...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isAr ? 'تحويل الجزء المحدد فقط' : 'OCR Selected Area'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
