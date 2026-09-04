import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Sparkles, 
  KeyRound, 
  Delete, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ChevronLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PasscodeLockScreenProps {
  onUnlock: () => void;
  lang?: 'ar' | 'en';
}

const CORRECT_PIN = '2008';

export const PasscodeLockScreen: React.FC<PasscodeLockScreenProps> = ({
  onUnlock,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle PIN verification
  const verifyPin = (currentPin: string) => {
    if (currentPin === CORRECT_PIN) {
      setIsSuccess(true);
      setError(false);
      setErrorMessage('');

      // Play soft success sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        // ignore audio errors
      }

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#D97706', '#10B981', '#FBBF24'],
      });

      setTimeout(() => {
        onUnlock();
      }, 700);
    } else {
      setError(true);
      setShake(true);
      setErrorMessage(
        isAr 
          ? 'الرمز السري غير صحيح، يرجى إدخال الرمز الصحيح (2008)' 
          : 'Incorrect passcode, please try again (2008)'
      );
      setTimeout(() => setShake(false), 500);
      setTimeout(() => {
        setPin('');
      }, 700);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isSuccess) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isSuccess) {
      setPin(prev => prev.slice(0, -1));
      setError(false);
      setErrorMessage('');
    }
  };

  const handleClear = () => {
    if (!isSuccess) {
      setPin('');
      setError(false);
      setErrorMessage('');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleKeyPress(e.key);
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const keypadNumbers = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B14] text-slate-100 font-cairo overflow-hidden select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Hidden input to catch mobile keyboard if tapped */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setPin(val);
          if (val.length === 4) verifyPin(val);
        }}
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        autoFocus
      />

      {/* Luxury Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/5 via-transparent to-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      
      {/* Subtle Pattern Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Luxury Lock Card */}
      <div className="relative w-full max-w-md mx-4 p-6 sm:p-8 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
        
        {/* Top Gold Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wider uppercase mb-5 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'منظومة الدخول الآمنة' : 'Secure VIP Gateway'}</span>
        </div>

        {/* Brand Crest / Icon with unlock transition */}
        <div className="relative mb-4 group cursor-pointer" onClick={() => inputRef.current?.focus()}>
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl border ${
            isSuccess 
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400 text-white scale-105 shadow-emerald-500/30' 
              : error
              ? 'bg-gradient-to-br from-rose-900 to-slate-900 border-rose-500/60 text-rose-400 shadow-rose-500/20'
              : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-amber-500/40 text-amber-400 shadow-amber-500/10'
          }`}>
            {isSuccess ? (
              <Unlock className="w-9 h-9 animate-bounce text-emerald-200" />
            ) : error ? (
              <AlertCircle className="w-9 h-9 animate-pulse text-rose-400" />
            ) : (
              <Lock className="w-9 h-9 text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]" />
            )}
          </div>
          
          {/* Subtle status dot */}
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
            isSuccess ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'
          }`} />
        </div>

        {/* App Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-black text-white font-cairo tracking-wide mb-1 flex items-center justify-center gap-2">
          <span>TAHWEEL</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
            PRO
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs mb-6">
          {isAr 
            ? 'يرجى إدخال الرمز السري للوصول إلى استوديو التحويل' 
            : 'Enter your 4-digit security PIN to access the OCR studio'}
        </p>

        {/* PIN Indicators */}
        <div className={`flex items-center justify-center gap-3.5 mb-5 transition-transform ${
          shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            const currentDigit = pin[index];
            return (
              <div
                key={index}
                className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-mono transition-all duration-200 border-2 ${
                  isSuccess
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : error
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                    : isFilled
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] scale-105'
                    : 'border-slate-700 bg-slate-800/60 text-slate-500'
                }`}
              >
                {isFilled ? (
                  showPin ? currentDigit : (
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  )
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error / Feedback Message */}
        <div className="h-6 mb-4 flex items-center justify-center">
          {errorMessage ? (
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </span>
          ) : isSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تم التحقق بنجاح! جارٍ الدخول...' : 'Passcode verified! Unlocking...'}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? (isAr ? 'إخفاء الأرقام' : 'Hide digits') : (isAr ? 'إظهار الأرقام' : 'Show digits')}</span>
            </button>
          )}
        </div>

        {/* Luxury Keypad */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[280px]">
          {keypadNumbers.map(({ num, sub }) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={isSuccess}
              className="h-14 sm:h-16 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-500/20 active:border-amber-400/60 border border-slate-700/80 text-white flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-sm group cursor-pointer"
            >
              <span className="text-lg sm:text-xl font-black font-mono group-hover:text-amber-400 transition-colors">
                {num}
              </span>
              {sub && (
                <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase -mt-0.5">
                  {sub}
                </span>
              )}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isSuccess || pin.length === 0}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900/50 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-bold transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center"
          >
            {isAr ? 'مسح' : 'Clear'}
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isSuccess}
            className="h-14 sm:h-16 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-500/20 active:border-amber-400/60 border border-slate-700/80 text-white flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-sm group cursor-pointer"
          >
            <span className="text-lg sm:text-xl font-black font-mono group-hover:text-amber-400 transition-colors">
              0
            </span>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase -mt-0.5">
              +
            </span>
          </button>

          {/* Delete Backspace Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSuccess || pin.length === 0}
            className="h-14 sm:h-16 rounded-2xl bg-slate-900/50 hover:bg-slate-800/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center"
            title={isAr ? 'حذف رقم' : 'Backspace'}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Hint / Info */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 w-full flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-amber-400 font-mono">
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN: 2008</span>
          </span>
          <span>TAHWEEL VIP Enterprise</span>
        </div>

      </div>

      {/* Shake animation css */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};
