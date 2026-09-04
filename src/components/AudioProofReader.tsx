import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  Sparkles, 
  X,
  Languages,
  Sliders
} from 'lucide-react';
import { Language } from '../types';

interface AudioProofReaderProps {
  text: string;
  lang: Language;
  onClose?: () => void;
}

export const AudioProofReader: React.FC<AudioProofReaderProps> = ({
  text,
  lang,
  onClose,
}) => {
  const isAr = lang === 'ar';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [supported, setSupported] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }

    const updateVoices = () => {
      const avail = window.speechSynthesis.getVoices();
      setVoices(avail);
      
      // Select Arabic voice by default if available
      const arabicVoice = avail.find(v => v.lang.startsWith('ar') || v.lang.includes('AR'));
      if (arabicVoice) {
        setSelectedVoice(arabicVoice.name);
      } else if (avail.length > 0) {
        setSelectedVoice(avail[0].name);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/[#*`_~]/g, '') // remove markdown marks
      .replace(/\|[\s\-:]+(\|[\s\-:]+)+\|?/g, ' ') // remove table separator lines
      .replace(/\|/g, ' ، ') // convert table cell pipes to gentle pauses
      .trim();
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utteranceRef.current = utterance;

    // Detect if Arabic
    const hasArabicChars = /[\u0600-\u06FF]/.test(clean);
    utterance.lang = hasArabicChars ? 'ar-SA' : 'en-US';

    if (selectedVoice) {
      const voiceObj = voices.find(v => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      handleStop();
      setTimeout(handlePlay, 100);
    }
  };

  if (!supported) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between font-cairo">
        <span>{isAr ? 'القارئ الصوتي غير مدعوم في هذا المتصفح' : 'Speech synthesis not supported'}</span>
        {onClose && <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>}
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-indigo-900 text-white shadow-xl border border-indigo-700/50 flex flex-wrap items-center justify-between gap-3 font-cairo animate-in slide-in-from-top-2 duration-150">
      
      {/* Title & Status */}
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl bg-indigo-800/80 text-indigo-200 border border-indigo-600/50 ${isPlaying ? 'animate-pulse' : ''}`}>
          <Volume2 className="w-4 h-4 text-indigo-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              {isAr ? 'القارئ الصوتي والتدقيق السمعي (Audio Proofing)' : 'Audio Reader & Speech Proofing'}
            </span>
            {isPlaying && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                {isAr ? 'جارِ القراءة...' : 'Playing...'}
              </span>
            )}
            {isPaused && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                {isAr ? 'مؤقت' : 'Paused'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-indigo-200/70">
            {isAr ? 'استمع إلى النص المستخرج بدقة لمطابقته مع الصورة' : 'Listen to extracted text for audio verification'}
          </span>
        </div>
      </div>

      {/* Controls: Play, Pause, Stop, Speed */}
      <div className="flex items-center gap-2">
        {!isPlaying || isPaused ? (
          <button
            type="button"
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? (isAr ? 'استئناف' : 'Resume') : (isAr ? 'تشغيل القراءة' : 'Play')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold shadow-xs transition-colors"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleStop}
          disabled={!isPlaying && !isPaused}
          className="p-2 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 text-indigo-200 hover:text-white transition-colors disabled:opacity-40"
          title={isAr ? 'إيقاف كامل' : 'Stop'}
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Speed presets */}
        <div className="flex items-center bg-indigo-950/60 rounded-xl p-0.5 border border-indigo-700/50">
          {[0.85, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleRateChange(s)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                rate === s ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-indigo-800 text-indigo-300 hover:text-white transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
};
