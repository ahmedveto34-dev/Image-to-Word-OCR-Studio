import React, { useState, useEffect } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  ImageUploader 
} from './components/ImageUploader';
import { 
  DocumentEditor 
} from './components/DocumentEditor';
import { 
  BookBatchConverter 
} from './components/BookBatchConverter';
import { 
  DocumentsLibrary 
} from './components/DocumentsLibrary';
import { 
  MathEvaluatorModal 
} from './components/MathEvaluatorModal';
import { 
  PasscodeLockScreen 
} from './components/PasscodeLockScreen';
import { 
  AppTab, 
  DocumentItem, 
  Language 
} from './types';
import { 
  loadDocuments, 
  saveDocument, 
  deleteDocument as removeDocStorage,
  seedInitialSampleIfEmpty
} from './utils/storage';
import { translations } from './utils/i18n';
import { Sparkles, Calculator } from 'lucide-react';

export function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('tahweel_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [lang, setLang] = useState<Language>('ar');
  const [currentTab, setCurrentTab] = useState<AppTab>('convert');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);

  const t = translations[lang];

  // Handle locking app
  const handleLockApp = () => {
    try {
      sessionStorage.removeItem('tahweel_unlocked');
    } catch (e) {}
    setIsUnlocked(false);
  };

  // Handle unlocking app
  const handleUnlockApp = () => {
    try {
      sessionStorage.setItem('tahweel_unlocked', 'true');
    } catch (e) {}
    setIsUnlocked(true);
  };

  // Load cloud/local saved docs on launch
  useEffect(() => {
    seedInitialSampleIfEmpty();
    const stored = loadDocuments();
    setDocuments(stored);
    if (stored.length > 0) {
      setActiveDocument(stored[0]);
    }
  }, []);

  // Update HTML document direction and title
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handle document creation
  const handleDocumentCreated = async (doc: DocumentItem) => {
    await saveDocument(doc);
    setDocuments(prev => [doc, ...prev.filter(d => d.id !== doc.id)]);
    setActiveDocument(doc);
    setCurrentTab('editor');
  };

  // Handle updating active document
  const handleUpdateDocument = async (updated: DocumentItem) => {
    setActiveDocument(updated);
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
    await saveDocument(updated);
  };

  // Handle deleting document
  const handleDeleteDocument = async (id: string) => {
    await removeDocStorage(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocument?.id === id) {
      const remaining = documents.filter(d => d.id !== id);
      setActiveDocument(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Handle open document in editor
  const handleOpenDocument = (doc: DocumentItem) => {
    setActiveDocument(doc);
    setCurrentTab('editor');
  };

  // Handle navigation tab clicks
  const handleTabChange = (tab: AppTab) => {
    if (tab === 'math') {
      setIsMathModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  // If locked, render luxury Passcode screen
  if (!isUnlocked) {
    return (
      <PasscodeLockScreen
        onUnlock={handleUnlockApp}
        lang={lang}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-cairo ${lang === 'ar' ? 'font-cairo' : 'font-sans'} relative selection:bg-slate-900 selection:text-amber-200`}>
      
      {/* Top Clean Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        lang={lang}
        onLangChange={setLang}
        savedCount={documents.length}
        activeDocTitle={activeDocument?.title}
        onNewScan={() => handleTabChange('convert')}
        onLockApp={handleLockApp}
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'convert' && (
          <ImageUploader
            onDocumentCreated={handleDocumentCreated}
            lang={lang}
          />
        )}

        {currentTab === 'editor' && (
          activeDocument ? (
            <DocumentEditor
              document={activeDocument}
              onUpdateDocument={handleUpdateDocument}
              lang={lang}
            />
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-4 max-w-2xl mx-auto px-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center mx-auto text-amber-400 shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-cairo">
                {lang === 'ar' ? 'لا يوجد مستند مفتوح حالياً' : 'No document currently open'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {lang === 'ar'
                  ? 'قم بتحويل صورة أو ملف PDF جديد، أو اختر مستنداً محفوظاً من المكتبة السحابية للبدء في التعديل والتنسيق الفاخر'
                  : 'Convert an image or PDF, or open one from your saved cloud library'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab('convert')}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 border border-slate-800"
              >
                {t.nav.convert}
              </button>
            </div>
          )
        )}

        {currentTab === 'books' && (
          <BookBatchConverter
            onBookCreated={handleDocumentCreated}
            lang={lang}
          />
        )}

        {currentTab === 'library' && (
          <DocumentsLibrary
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={handleDeleteDocument}
            lang={lang}
          />
        )}
      </main>

      {/* Standalone Math Audit Modal when triggered from nav */}
      {isMathModalOpen && (
        <MathEvaluatorModal
          isOpen={isMathModalOpen}
          onClose={() => setIsMathModalOpen(false)}
          lang={lang}
          detectedFormulas={activeDocument?.pages?.[0]?.detectedElements?.mathFormulas || []}
          fullText={activeDocument?.combinedMarkdown || ''}
          onInsertEquation={(eq) => {
            if (activeDocument) {
              handleUpdateDocument({
                ...activeDocument,
                combinedMarkdown: activeDocument.combinedMarkdown + eq,
              });
            }
          }}
        />
      )}

      {/* Clean Luxury Footer */}
      <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-sm py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs animate-pulse" />
            <span className="text-slate-700 font-medium">
              {lang === 'ar'
                ? 'منصة TAHWEEL الذكية • الإصدار الاحترافي لتحويل الوثائق والمخطوطات والكتب إلى Word و PowerPoint'
                : 'TAHWEEL Smart OCR Studio • Pro Edition for Documents, Books & Slides'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-medium text-[11px]">
            <span className="hover:text-slate-600 transition-colors">Microsoft Word (.docx)</span>
            <span>•</span>
            <span className="hover:text-slate-600 transition-colors">PDF Export</span>
            <span>•</span>
            <span className="hover:text-slate-600 transition-colors">AI Watermark Engine</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
