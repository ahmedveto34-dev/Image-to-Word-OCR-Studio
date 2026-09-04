import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  Trash2, 
  Sparkles, 
  Layers, 
  FlipHorizontal,
  Maximize2,
  AlertCircle
} from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (capturedFiles: File[]) => void;
  lang?: 'ar' | 'en';
}

interface CapturedFrame {
  id: string;
  dataUrl: string;
  blob: Blob;
  file: File;
  timestamp: number;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [resolution, setResolution] = useState<'hd' | 'fhd'>('fhd');

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user') => {
    try {
      setCameraError(null);
      
      // Stop previous stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: resolution === 'fhd' ? 1920 : 1280 },
          height: { ideal: resolution === 'fhd' ? 1080 : 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      // If environment fails (e.g. on laptop without back camera), fallback to user camera
      if (facing === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          setStream(fallbackStream);
          setFacingMode('user');
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          return;
        } catch (fallbackErr: any) {
          console.error('Fallback camera error:', fallbackErr);
        }
      }
      setCameraError(
        isAr 
          ? 'تعذر الوصول إلى الكاميرا. يرجى التحقق من منح الإذن للمتصفح أو التأكد من توصيل الكاميرا.' 
          : 'Unable to access camera. Please check camera permissions in your browser.'
      );
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode, resolution]);

  // Capture current video frame
  const handleCapture = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    // Audio click sound using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      // Ignore audio error if not allowed
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = Date.now();
          const fileName = `scan_page_${capturedFrames.length + 1}_${timestamp}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          setCapturedFrames(prev => [
            ...prev,
            {
              id: 'frame_' + timestamp,
              dataUrl,
              blob,
              file,
              timestamp,
            }
          ]);
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.95);
    } else {
      setIsCapturing(false);
    }
  };

  // Flip camera (Front / Back)
  const handleToggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Remove single frame
  const handleRemoveFrame = (id: string) => {
    setCapturedFrames(prev => prev.filter(f => f.id !== id));
  };

  // Finish and Send to OCR
  const handleFinish = () => {
    if (capturedFrames.length === 0) return;
    const files = capturedFrames.map(f => f.file);
    
    // Stop stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    onCaptureComplete(files);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-cairo">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl bg-slate-950 text-white shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                {isAr ? 'المسح الضوئي المباشر بالكاميرا (Live Camera OCR Scanner)' : 'Live Document Camera Scanner'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr 
                  ? 'وجه الكاميرا نحو المستند أو صفحة الكتاب والتقط صورة واحدة أو عدة صفحات متتالية'
                  : 'Point camera at document and capture single or multiple sequential pages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Resolution Selector */}
            <button
              type="button"
              onClick={() => setResolution(prev => (prev === 'fhd' ? 'hd' : 'fhd'))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700 transition-colors"
              title="Camera Quality"
            >
              {resolution === 'fhd' ? '1080p FHD' : '720p HD'}
            </button>

            {/* Switch Camera Button */}
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title={isAr ? 'تبديل الكاميرا (أمامية / خلفية)' : 'Switch Camera'}
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                if (stream) stream.getTracks().forEach(t => t.stop());
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px] sm:min-h-[440px]">
          
          {cameraError ? (
            <div className="text-center p-6 max-w-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">{isAr ? 'خطأ في الكاميرا' : 'Camera Error'}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg transition-colors"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : (
            <>
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              {/* Document Alignment Frame Box */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-teal-400/60 rounded-2xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner markers */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                </div>

                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-teal-300 text-[11px] font-bold border border-teal-500/40">
                    {isAr ? '📐 حاذِ حواف المستند أو الكتاب داخل الإطار' : '📐 Align document inside the box'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                </div>
              </div>

              {/* Shutter Flash Animation */}
              {flashAnimation && (
                <div className="absolute inset-0 bg-white opacity-90 transition-opacity duration-150 pointer-events-none z-30" />
              )}
            </>
          )}
        </div>

        {/* Captured Pages Strip (Multi-page scanning) */}
        {capturedFrames.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 shrink-0">
              <Layers className="w-4 h-4" />
              <span>{isAr ? `الصفحات الملتقطة (${capturedFrames.length}):` : `Captured (${capturedFrames.length}):`}</span>
            </div>

            <div className="flex items-center gap-2.5">
              {capturedFrames.map((frame, idx) => (
                <div 
                  key={frame.id}
                  className="relative group shrink-0 w-14 h-18 rounded-lg overflow-hidden border border-slate-700 bg-black shadow-md"
                >
                  <img 
                    src={frame.dataUrl} 
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-bold text-white">
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFrame(frame.id)}
                    className="absolute inset-0 bg-rose-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isAr ? 'حذف الصفحة' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Controls Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900/95 border-t border-slate-800">
          
          <div className="text-xs text-slate-400">
            {capturedFrames.length === 0 ? (
              <span>{isAr ? 'اضغط على زر الالتقاط لأخذ صورة للمستند' : 'Press capture button to take document photo'}</span>
            ) : (
              <span className="text-teal-300 font-bold">
                {isAr ? `جاهز لتحويل ${capturedFrames.length} صفحة عبر الذكاء الاصطناعي` : `Ready to OCR ${capturedFrames.length} pages`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Main Shutter Button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || !!cameraError}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-teal-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
              <Camera className="w-4 h-4" />
              <span>{isAr ? 'التقاط الصفحة' : 'Capture Page'}</span>
            </button>

            {/* Complete & Process Button */}
            {capturedFrames.length > 0 && (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-500/25 active:scale-95 transition-all animate-bounce"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? `بدء التحويل (${capturedFrames.length})` : `Start OCR (${capturedFrames.length})`}</span>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
