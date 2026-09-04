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
  const [lang, setLang] = useState<Language>('ar');
  const [currentTab, setCurrentTab] = useState<AppTab>('convert');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);

  const t = translations[lang];

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

  return (
    <div className={`min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col font-cairo ${lang === 'ar' ? 'font-cairo' : 'font-sans'}`}>
      
      {/* Top Clean Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        lang={lang}
        onLangChange={setLang}
        savedCount={documents.length}
        activeDocTitle={activeDocument?.title}
        onNewScan={() => handleTabChange('convert')}
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
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4 max-w-2xl mx-auto px-6">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto text-gray-700">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-cairo">
                {lang === 'ar' ? 'لا يوجد مستند مفتوح حالياً' : 'No document currently open'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {lang === 'ar'
                  ? 'قم بتحويل صورة جديدة أو اختر مستنداً من المكتبة السحابية للبدء في التعديل والتنسيق'
                  : 'Convert an image or open one from your saved cloud library'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab('convert')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-xs hover:bg-black transition-colors shadow-xs"
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

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-gray-200 bg-white/80 py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-600">
              {lang === 'ar'
                ? 'استوديو تحويل الصور والكتب إلى وورد الذكي • مدعوم بأحدث تقنيات الذكاء الاصطناعي السحابي'
                : 'Smart Image & Book to Word OCR Studio • Cloud Multimodal AI'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span>Microsoft Word (.docx)</span>
            <span>•</span>
            <span>PDF Export</span>
            <span>•</span>
            <span>Watermark Filter</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
