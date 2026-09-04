import React from 'react';
import { 
  FileText, 
  BookOpen, 
  FolderArchive, 
  Sparkles, 
  Globe, 
  CloudCheck, 
  Calculator,
  Plus,
  Lock
} from 'lucide-react';
import { Language, AppTab } from '../types';
import { translations } from '../utils/i18n';

interface NavbarProps {
  currentTab: AppTab | 'mathVerifier';
  onTabChange?: (tab: AppTab) => void;
  setCurrentTab?: (tab: AppTab) => void;
  lang: Language;
  onLangChange?: (lang: Language) => void;
  setLang?: (lang: Language) => void;
  savedCount?: number;
  isSynced?: boolean;
  activeDocTitle?: string;
  onNewScan?: () => void;
  onLockApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  setCurrentTab,
  lang,
  onLangChange,
  setLang,
  isSynced = true,
  activeDocTitle,
  onNewScan,
  onLockApp,
}) => {
  const t = translations[lang];

  const handleTab = (tab: AppTab) => {
    if (onTabChange) onTabChange(tab);
    else if (setCurrentTab) setCurrentTab(tab);
  };

  const toggleLanguage = () => {
    const newLang: Language = lang === 'ar' ? 'en' : 'ar';
    if (onLangChange) onLangChange(newLang);
    else if (setLang) setLang(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleScanClick = () => {
    if (onNewScan) onNewScan();
    handleTab('convert');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => handleTab('convert')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-amber-400 shadow-md border border-slate-700/60 group-hover:scale-105 transition-all">
            <FileText className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 font-cairo bg-gradient-to-r from-slate-950 via-slate-800 to-slate-900 bg-clip-text uppercase">
                TAHWEEL
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs">
                PRO OCR
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs font-normal">
              {lang === 'ar' ? 'تحويل الصور والكتب إلى Word منسق بدقة فائقة' : 'Image & Book to Formatted Word'}
            </p>
          </div>
        </div>

        {/* Navigation Segmented Control */}
        <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
          <button
            id="nav-tab-convert"
            onClick={() => handleTab('convert')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'convert'
                ? 'bg-white text-slate-950 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.nav.convert}</span>
          </button>

          <button
            id="nav-tab-editor"
            onClick={() => handleTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'editor'
                ? 'bg-white text-slate-950 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.nav.editor}</span>
            {activeDocTitle && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>

          <button
            id="nav-tab-books"
            onClick={() => handleTab('books')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'books'
                ? 'bg-white text-slate-950 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.nav.books}</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => handleTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'library'
                ? 'bg-white text-slate-950 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.nav.library}</span>
          </button>

          <button
            id="nav-tab-math"
            onClick={() => handleTab('math')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'math' || currentTab === 'mathVerifier'
                ? 'bg-white text-slate-950 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-violet-600" />
            <span>{t.nav.mathVerifier}</span>
          </button>
        </nav>

        {/* Right Actions: Sync status, Language toggle, Quick Scan */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Cloud Sync Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs">
            <CloudCheck className="w-4 h-4 text-emerald-600" />
            <span>{t.sync.synced}</span>
          </div>

          {/* Language Switcher */}
          <button
            id="btn-lang-toggle"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-bold text-sky-800 transition-all shadow-2xs active:scale-95"
            title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>{t.nav.language}</span>
          </button>

          {/* Lock App Button */}
          {onLockApp && (
            <button
              id="btn-lock-app"
              onClick={onLockApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all shadow-2xs active:scale-95"
              title={lang === 'ar' ? 'قفل التطبيق برقم سري' : 'Lock App with Passcode'}
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden lg:inline">{lang === 'ar' ? 'قفل' : 'Lock'}</span>
            </button>
          )}

          {/* Quick Scan Action Button */}
          <button
            id="btn-new-scan"
            onClick={handleScanClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 border border-amber-600/50"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'مسح جديد' : 'New Scan'}</span>
          </button>
        </div>

      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-t border-gray-200 bg-white px-2 py-1.5 justify-around">
        <button
          onClick={() => handleTab('convert')}
          className={`flex flex-col items-center py-1 px-2 text-xs ${
            currentTab === 'convert' ? 'text-gray-900 font-bold' : 'text-gray-500'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>{t.nav.convert}</span>
        </button>
        <button
          onClick={() => handleTab('editor')}
          className={`flex flex-col items-center py-1 px-2 text-xs ${
            currentTab === 'editor' ? 'text-gray-900 font-bold' : 'text-gray-500'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>{t.nav.editor}</span>
        </button>
        <button
          onClick={() => handleTab('books')}
          className={`flex flex-col items-center py-1 px-2 text-xs ${
            currentTab === 'books' ? 'text-gray-900 font-bold' : 'text-gray-500'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>{t.nav.books}</span>
        </button>
        <button
          onClick={() => handleTab('library')}
          className={`flex flex-col items-center py-1 px-2 text-xs ${
            currentTab === 'library' ? 'text-gray-900 font-bold' : 'text-gray-500'
          }`}
        >
          <FolderArchive className="w-4 h-4 mb-0.5" />
          <span>{t.nav.library}</span>
        </button>
        <button
          onClick={() => handleTab('math')}
          className={`flex flex-col items-center py-1 px-2 text-xs ${
            currentTab === 'math' || currentTab === 'mathVerifier' ? 'text-gray-900 font-bold' : 'text-gray-500'
          }`}
        >
          <Calculator className="w-4 h-4 mb-0.5" />
          <span>{t.nav.mathVerifier}</span>
        </button>
      </div>
    </header>
  );
};
