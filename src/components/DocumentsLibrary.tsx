import React, { useState, useMemo } from 'react';
import { 
  FolderArchive, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  BookOpen, 
  Calculator, 
  Table as TableIcon, 
  Calendar, 
  Tag, 
  ExternalLink,
  Sparkles,
  CloudCheck,
  Filter
} from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../utils/i18n';
import { searchDocuments } from '../utils/storage';
import { generateDocxBlob } from '../utils/docxExport';
import confetti from 'canvas-confetti';

interface DocumentsLibraryProps {
  documents: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  lang: Language;
}

export const DocumentsLibrary: React.FC<DocumentsLibraryProps> = ({
  documents,
  onOpenDocument,
  onDeleteDocument,
  lang,
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    return searchDocuments(documents, searchQuery, selectedCategory);
  }, [documents, searchQuery, selectedCategory]);

  const handleQuickWordDownload = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    setDownloadingId(doc.id);
    try {
      const blob = await generateDocxBlob(doc.combinedMarkdown, {
        title: doc.title,
        author: '',
        fontSize: 12,
        fontFamily: lang === 'ar' ? 'Cairo' : 'Calibri',
        lineSpacing: 1.5,
        includePageNumbers: true,
        includeTableOfContents: false,
        includeHeaderFooter: true,
        headerText: doc.title,
        themeColor: 'gold',
        rtl: doc.readingDirection === 'rtl',
        highlightMath: true,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error('Quick download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-900 border border-gray-200">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-cairo">
                {t.library.title} ({documents.length})
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'بحث سريع في النصوص المستخرجة، الجداول، والمعادلات المحفوظة سحابياً'
                  : 'Full-text search across cloud synced documents, tables, and math'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
            <CloudCheck className="w-4 h-4" />
            <span>{lang === 'ar' ? 'سحابة المزامنة الفورية نشطة' : 'Real-time Cloud Active'}</span>
          </div>
        </div>

        {/* Full-Text Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 rtl:right-4 rtl:left-auto ltr:left-4 ltr:right-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.library.searchPlaceholder}
            className="w-full py-2.5 px-11 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-gray-900 outline-hidden font-cairo transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto text-xs text-gray-400 hover:text-gray-900"
            >
              ×
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', name: lang === 'ar' ? 'الكل' : 'All', color: 'slate' },
            { id: 'books', name: lang === 'ar' ? 'كتب مصورة' : 'Books', color: 'emerald' },
            { id: 'documents', name: lang === 'ar' ? 'مستندات وتقارير' : 'Documents', color: 'blue' },
            { id: 'math', name: lang === 'ar' ? 'رياضيات ومعادلات' : 'Math', color: 'purple' },
            { id: 'invoices', name: lang === 'ar' ? 'فواتير وجداول' : 'Invoices', color: 'amber' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            let activeClasses = 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold';
            let inactiveClasses = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';

            if (cat.id === 'books') {
              activeClasses = 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold';
              inactiveClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
            } else if (cat.id === 'documents') {
              activeClasses = 'bg-blue-700 text-white border-blue-700 shadow-xs font-bold';
              inactiveClasses = 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
            } else if (cat.id === 'math') {
              activeClasses = 'bg-purple-700 text-white border-purple-700 shadow-xs font-bold';
              inactiveClasses = 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100';
            } else if (cat.id === 'invoices') {
              activeClasses = 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold';
              inactiveClasses = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
            }

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap border active:scale-95 ${
                  isActive ? activeClasses : inactiveClasses
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white border border-dashed border-gray-200 space-y-2">
          <FolderArchive className="w-10 h-10 text-gray-400 mx-auto" />
          <p className="text-base font-bold text-gray-700 font-cairo">
            {searchQuery ? (lang === 'ar' ? 'لم يتم العثور على نتائج للبحث' : 'No search matches found') : t.library.empty}
          </p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {lang === 'ar' ? 'جرّب البحث بكلمات أخرى أو ارفع صورة جديدة للبدء' : 'Try different keywords or upload a new image to start'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenDocument(item)}
              className="group relative rounded-2xl bg-white border border-slate-200 hover:border-slate-400 p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              {/* Card Header & Category */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    item.category === 'books'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.category === 'math'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {item.category === 'books' ? 'BOOK' : item.category === 'math' ? 'MATH' : 'DOCX'}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors font-cairo line-clamp-1 mb-2">
                  {item.title}
                </h3>

                {/* Snippet / Description */}
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-4">
                  {item.description || item.combinedMarkdown.replace(/[#*`_]/g, '').slice(0, 120)}...
                </p>
              </div>

              {/* Stats & Footer Action Row */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                  <span>{item.stats.totalWords} {lang === 'ar' ? 'كلمة' : 'words'}</span>
                  <span>•</span>
                  <span>{item.pages.length} {t.library.pages}</span>
                  {item.stats.mathEquationsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">{item.stats.mathEquationsCount} math</span>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleQuickWordDownload(e, item)}
                    disabled={downloadingId === item.id}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-xs font-semibold transition-all shadow-2xs active:scale-95"
                    title={t.library.exportWord}
                  >
                    {downloadingId === item.id ? (
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(item.id);
                    }}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 text-xs transition-all shadow-2xs active:scale-95"
                    title={t.library.deleteDoc}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
