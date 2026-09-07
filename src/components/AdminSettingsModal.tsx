import React, { useState, useEffect } from 'react';
import { Settings, Key, Lock, X, Check, Save } from 'lucide-react';
import { Language } from '../types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onOpenApiKeyModal: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onOpenApiKeyModal,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  // Lock passcode settings
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSaved, setPasscodeSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(false);
      setAdminPassword('');
      setError('');
      setNewPasscode(localStorage.getItem('tahweel_global_passcode') || '2008');
      setPasscodeSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'waheed') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
    }
  };

  const handleSavePasscode = () => {
    if (newPasscode.length >= 4) {
      localStorage.setItem('tahweel_global_passcode', newPasscode);
      setPasscodeSaved(true);
      setTimeout(() => setPasscodeSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-slate-900 text-white border-slate-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {lang === 'ar' ? 'إعدادات الإدارة' : 'Admin Settings'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!isAuthenticated ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm font-medium text-gray-600 font-cairo text-center mb-6">
                {lang === 'ar' ? 'يرجى إدخال كلمة مرور الإدارة للوصول' : 'Please enter admin password to access'}
              </p>
              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'كلمة المرور...' : 'Password...'}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 text-center text-lg focus:border-slate-900 focus:bg-white outline-hidden"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-600 text-center font-bold">{error}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold transition-all shadow-md active:scale-95"
              >
                {lang === 'ar' ? 'دخول' : 'Login'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* API Key Settings */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
                  <Key className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'إعدادات مفتاح الـ API' : 'API Key Settings'}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-cairo">
                  {lang === 'ar' 
                    ? 'إدارة مفتاح Google Gemini API الخاص بالتطبيق للذكاء الاصطناعي والـ OCR.' 
                    : 'Manage Google Gemini API key for AI & OCR features.'}
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenApiKeyModal();
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 transition-colors text-sm"
                >
                  {lang === 'ar' ? 'تعديل مفتاح الـ API' : 'Edit API Key'}
                </button>
              </div>

              {/* Global Passcode Settings */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
                  <Lock className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'رمز حماية التطبيق' : 'App Lock Passcode'}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-cairo mb-2">
                  {lang === 'ar'
                    ? 'تغيير الرمز السري لشاشة القفل الرئيسية.'
                    : 'Change main lock screen passcode.'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-slate-900 outline-hidden font-bold tracking-widest text-center"
                    placeholder="2008"
                  />
                  <button
                    onClick={handleSavePasscode}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-950 transition-colors flex items-center justify-center min-w-[80px]"
                  >
                    {passcodeSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
