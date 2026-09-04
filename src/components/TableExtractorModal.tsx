import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Download, 
  X, 
  ExternalLink,
  Code,
  FileText
} from 'lucide-react';
import { Language } from '../types';
import { 
  ParsedTable, 
  extractTablesFromMarkdown, 
  copyTableToClipboard, 
  tableToCsv, 
  tableToTsv 
} from '../utils/tableExtractor';

interface TableExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  lang: Language;
}

export const TableExtractorModal: React.FC<TableExtractorModalProps> = ({
  isOpen,
  onClose,
  markdownContent,
  lang,
}) => {
  const isAr = lang === 'ar';
  const tables: ParsedTable[] = extractTablesFromMarkdown(markdownContent);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'tsv'>('preview');

  if (!isOpen) return null;

  const handleCopy = async (table: ParsedTable, format: 'excel' | 'tsv' | 'csv' | 'markdown') => {
    let success = false;
    if (format === 'excel') {
      success = await copyTableToClipboard(table, isAr);
    } else if (format === 'tsv') {
      await navigator.clipboard.writeText(tableToTsv(table));
      success = true;
    } else if (format === 'csv') {
      await navigator.clipboard.writeText(tableToCsv(table));
      success = true;
    } else {
      await navigator.clipboard.writeText(table.rawMarkdown);
      success = true;
    }

    if (success) {
      setCopiedId(`${table.id}-${format}`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownloadCsv = (table: ParsedTable, index: number) => {
    const csvData = tableToCsv(table);
    const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-${index + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden font-cairo animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isAr ? 'مدير ومستخرج الجداول الذكي' : 'Smart Tables Manager & Extractor'}
              </h3>
              <p className="text-xs text-gray-500">
                {isAr 
                  ? `تم العثور على ${tables.length} جدول في الصورة، جاهزة للنسخ إلى Excel و Word أو التنزيل كـ CSV` 
                  : `Found ${tables.length} table(s) ready to copy to Excel/Word or export to CSV`}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tables.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-300">
              <TableIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">
                {isAr ? 'لم يتم العثور على جداول في النص الحالي' : 'No tables detected in the current document'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {isAr 
                  ? 'تأكد من تفعيل خيار "استخراج وتنسيق الجداول تلقائياً" عند رفع الصورة، أو أضف جدولاً عبر شريط الأدوات.'
                  : 'Make sure table extraction option is enabled during OCR, or insert a table via toolbar.'}
              </p>
            </div>
          ) : (
            tables.map((table, idx) => (
              <div 
                key={table.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Table Card Header & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50/90 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white text-[11px] font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800">
                      {isAr ? `جدول ${idx + 1}` : `Table ${idx + 1}`}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      ({table.rowCount} {isAr ? 'صفوف' : 'rows'} × {table.colCount} {isAr ? 'أعمدة' : 'cols'})
                    </span>
                  </div>

                  {/* Actions: Copy for Excel, Copy Markdown, Download CSV */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(table, 'excel')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                      title={isAr ? 'نسخ منسق للصق المباشر في Excel و Word' : 'Copy formatted for Excel & Word'}
                    >
                      {copiedId === `${table.id}-excel` ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedId === `${table.id}-excel` 
                          ? (isAr ? 'تم نسخ الجدول!' : 'Table Copied!') 
                          : (isAr ? 'نسخ لـ Excel / Word' : 'Copy for Excel/Word')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(table, 'tsv')}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300 shadow-2xs active:scale-95 transition-all"
                      title="TSV / Google Sheets"
                    >
                      <Copy className="w-3.5 h-3.5 text-teal-600" />
                      <span>TSV / Sheets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadCsv(table, idx)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-300 shadow-2xs active:scale-95 transition-all"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-600" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table Data Preview */}
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 border-b border-gray-200">
                        {table.headers.map((h, hIdx) => (
                          <th 
                            key={hIdx}
                            className="p-3 font-bold text-gray-900 border-x border-gray-200/60 first:border-r-0 last:border-l-0 text-right whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          {row.map((cell, cIdx) => (
                            <td 
                              key={cIdx}
                              className="p-3 text-gray-700 border-x border-gray-200/40 first:border-r-0 last:border-l-0"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            {isAr 
              ? '💡 يمكنك لصق الجداول المنسوخة مباشرة في Word أو Excel أو Google Sheets مع الحفاظ التام على الأعمدة والألوان.'
              : '💡 Copied tables preserve headers and cell alignment when pasted into Word, Excel, or Google Docs.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
