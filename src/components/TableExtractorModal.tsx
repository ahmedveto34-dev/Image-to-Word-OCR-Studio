import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Download, 
  X, 
  FileText,
  Sparkles,
  RefreshCw,
  Layers,
  Palette,
  FileDown,
  CheckCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Language } from '../types';
import { 
  ParsedTable, 
  extractTablesFromMarkdown, 
  copyTableToClipboard, 
  tableToCsv, 
  tableToTsv 
} from '../utils/tableExtractor';
import {
  generateSingleTableDocx,
  generateAllTablesDocx,
  TableDocxOptions
} from '../utils/tableDocxExporter';
import { processOcrImage } from '../services/ocrService';

interface TableExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  lang: Language;
  documentTitle?: string;
  imageSrc?: string;
  onUpdateMarkdown?: (newContent: string) => void;
  onOpenApiKeyModal?: () => void;
}

export const TableExtractorModal: React.FC<TableExtractorModalProps> = ({
  isOpen,
  onClose,
  markdownContent,
  lang,
  documentTitle = '',
  imageSrc,
  onUpdateMarkdown,
  onOpenApiKeyModal,
}) => {
  const isAr = lang === 'ar';
  const tables: ParsedTable[] = extractTablesFromMarkdown(markdownContent);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<'teal' | 'emerald' | 'navy' | 'gold' | 'slate'>('teal');
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // Download Single Table as Word Document (.docx)
  const handleDownloadTableWord = async (table: ParsedTable, index: number, isBlank = false) => {
    const downloadId = `${table.id}-${isBlank ? 'blank' : 'filled'}`;
    setIsExportingDocx(downloadId);
    try {
      const opt: TableDocxOptions = {
        title: documentTitle ? `${documentTitle} - ${isAr ? `جدول ${index + 1}` : `Table ${index + 1}`}` : (isAr ? `قالب جدول ${index + 1}` : `Table Template ${index + 1}`),
        themeColor,
        blankTemplate: isBlank,
        isRtl: isAr,
        subtitle: isBlank 
          ? (isAr ? '📋 قالب تفريغ وتعبئة فارغ معتمد للطباعة والتعديل' : '📋 Blank Editable Template')
          : (isAr ? '📊 جدول بيانات مستخرج بالذكاء الاصطناعي' : '📊 Extracted Data Table'),
      };

      const blob = await generateSingleTableDocx(table, opt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (documentTitle || 'table-template').replace(/[/\\?%*:|"<>]/g, '_');
      a.download = `${cleanName}-${isBlank ? 'blank-template' : 'table'}-${index + 1}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0D9488', '#10B981', '#3B82F6', '#F59E0B'],
      });
    } catch (err) {
      console.error('Failed to export table docx:', err);
    } finally {
      setIsExportingDocx(null);
    }
  };

  // Download All Tables as Single Word Document (.docx)
  const handleDownloadAllTablesWord = async (isBlank = false) => {
    setIsExportingDocx('all');
    try {
      const opt: TableDocxOptions = {
        title: documentTitle || (isAr ? 'قوالب الجداول المستخرجة' : 'Extracted Table Templates'),
        themeColor,
        blankTemplate: isBlank,
        isRtl: isAr,
      };

      const blob = await generateAllTablesDocx(tables, opt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (documentTitle || 'all-tables-template').replace(/[/\\?%*:|"<>]/g, '_');
      a.download = `${cleanName}-${isBlank ? 'blank-templates' : 'tables'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0D9488', '#10B981', '#3B82F6', '#F59E0B'],
      });
    } catch (err) {
      console.error('Failed to export all tables docx:', err);
    } finally {
      setIsExportingDocx(null);
    }
  };

  // Extract Tables with AI from the image if not already in markdown or to enhance
  const handleExtractWithAi = async () => {
    if (!imageSrc || !onUpdateMarkdown) return;
    setIsExtractingAi(true);
    setAiError(null);

    try {
      const result = await processOcrImage(imageSrc, 'image/jpeg', {
        extractTables: true,
        removeWatermarks: true,
        extractMath: true,
        customInstructions: 'Extract all tables, forms, administrative templates, and structures with exact markdown table format.',
      });

      if (result.markdown) {
        onUpdateMarkdown(result.markdown);
      } else if (result.plainText) {
        onUpdateMarkdown(result.plainText);
      }
    } catch (err: any) {
      console.error('AI Table extraction failed:', err);
      setAiError(err?.message || (isAr ? 'تعذر استخراج الجداول من الصورة، يرجى فحص مفتاح API' : 'Failed to extract tables'));
    } finally {
      setIsExtractingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden font-cairo animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-800 shadow-xs">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {isAr ? 'استخراج وتحميل قوالب الجداول (Word / Excel)' : 'Smart Tables & Template Manager (Word / Excel)'}
                </h3>
                {tables.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[11px] font-extrabold shadow-2xs">
                    {tables.length} {isAr ? 'جداول' : 'Tables'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {isAr 
                  ? 'استخراج القوالب والجداول بدقة وتحميلها مباشرة بصيغة Microsoft Word (.docx) أو نسخها إلى Excel'
                  : 'Extract templates and tables with high accuracy and download as Word (.docx) or copy to Excel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Theme Selector for Docx Table styling */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1">
                {(['teal', 'emerald', 'navy', 'gold', 'slate'] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setThemeColor(color)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      themeColor === color ? 'scale-125 ring-2 ring-slate-900 ring-offset-1' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor:
                        color === 'teal' ? '#0F766E' :
                        color === 'emerald' ? '#065F46' :
                        color === 'navy' ? '#1E3A8A' :
                        color === 'gold' ? '#B45309' : '#1E293B'
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Actions Bar (When tables exist: Download all as Word) */}
        {tables.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-b border-teal-200 text-xs">
            <div className="flex items-center gap-2 text-teal-950 font-bold">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>
                {isAr 
                  ? `تم استخراج ${tables.length} جدول وقالب جاهزة للتصدير المباشر:`
                  : `${tables.length} table templates ready for instant export:`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isExportingDocx !== null}
                onClick={() => handleDownloadAllTablesWord(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                title={isAr ? 'تحميل كافة الجداول في ملف Word واحد' : 'Download All Tables in a Word (.docx) document'}
              >
                <FileDown className="w-4 h-4" />
                <span>{isAr ? '📄 تحميل كافة الجداول في ملف Word (.docx)' : '📄 Download All Tables in Word (.docx)'}</span>
              </button>

              <button
                type="button"
                disabled={isExportingDocx !== null}
                onClick={() => handleDownloadAllTablesWord(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
                title={isAr ? 'تحميل قالب فارغ لكافة الجداول لكتابة وتعبئة البيانات' : 'Download Blank Templates in Word'}
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>{isAr ? '📝 تحميل كقوالب فارغة (Word)' : '📝 Blank Templates (Word)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI Extraction Error Banner */}
          {aiError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{aiError}</span>
              </div>
              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                >
                  {isAr ? 'ضبط مفتاح API' : 'Configure API Key'}
                </button>
              )}
            </div>
          )}

          {tables.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
                <TableIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800">
                  {isAr ? 'لم يتم العثور على جداول في النص الحالي' : 'No tables detected in the document text'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isAr 
                    ? 'يمكنك استخراج الجداول والقوالب مباشرة من صورة المستند باستخدام الذكاء الاصطناعي وتحميلها فوراً بصيغة Word.'
                    : 'You can extract tables and templates directly from the document image using AI and download as Word (.docx).'}
                </p>
              </div>

              {imageSrc && onUpdateMarkdown && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isExtractingAi}
                    onClick={handleExtractWithAi}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-black shadow-lg shadow-teal-600/25 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 text-teal-200 ${isExtractingAi ? 'animate-spin' : ''}`} />
                    <span>
                      {isExtractingAi 
                        ? (isAr ? 'جارٍ قراءة واستخراج القوالب والجداول بالذكاء الاصطناعي...' : 'Extracting tables with AI...') 
                        : (isAr ? '⚡ استخراج قالب الجداول من الصورة الآن بالذكاء الاصطناعي' : '⚡ Extract Table Template from Image Now')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            tables.map((table, idx) => (
              <div 
                key={table.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Table Card Header & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-black">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {isAr ? `قالب الجدول رقم ${idx + 1}` : `Table Template #${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">
                      ({table.rowCount} {isAr ? 'صفوف' : 'rows'} × {table.colCount} {isAr ? 'أعمدة' : 'cols'})
                    </span>
                  </div>

                  {/* Actions: Download Word Docx, Copy Excel, Download CSV */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Main Word (.docx) Download Button */}
                    <button
                      type="button"
                      disabled={isExportingDocx !== null}
                      onClick={() => handleDownloadTableWord(table, idx, false)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-xs active:scale-95 transition-all disabled:opacity-50"
                      title={isAr ? 'تحميل هذا الجدول بصيغة وورد Word (.docx)' : 'Download this table as Word (.docx)'}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>
                        {isExportingDocx === `${table.id}-filled`
                          ? (isAr ? 'جارٍ التحميل...' : 'Downloading...')
                          : (isAr ? 'تحميل وورد (.docx)' : 'Download Word')}
                      </span>
                    </button>

                    {/* Blank Template Word (.docx) Button */}
                    <button
                      type="button"
                      disabled={isExportingDocx !== null}
                      onClick={() => handleDownloadTableWord(table, idx, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
                      title={isAr ? 'تحميل كقالب وورد فارغ جاهز للكتابة والتفريغ' : 'Download blank template in Word'}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isAr ? 'قالب فارغ (Word)' : 'Blank Template'}</span>
                    </button>

                    {/* Copy to Excel / Word formatted */}
                    <button
                      type="button"
                      onClick={() => handleCopy(table, 'excel')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 shadow-2xs active:scale-95 transition-all"
                      title={isAr ? 'نسخ منسق للصق المباشر في Excel و Word' : 'Copy formatted for Excel & Word'}
                    >
                      {copiedId === `${table.id}-excel` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      <span>
                        {copiedId === `${table.id}-excel` 
                          ? (isAr ? 'تم النسخ!' : 'Copied!') 
                          : (isAr ? 'نسخ لـ Excel' : 'Copy for Excel')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadCsv(table, idx)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                      title="Download CSV"
                    >
                      <Download className="w-3 h-3 text-slate-600" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table Data Preview */}
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        {table.headers.map((h, hIdx) => (
                          <th 
                            key={hIdx}
                            className="p-3 font-bold text-slate-900 border-x border-slate-200 first:border-r-0 last:border-l-0 text-start whitespace-nowrap"
                          >
                            {h || '—'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          {table.headers.map((_, cIdx) => (
                            <td 
                              key={cIdx}
                              className="p-3 text-slate-800 border-x border-slate-200/60 first:border-r-0 last:border-l-0"
                            >
                              {row[cIdx] || ''}
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isAr 
                ? '💡 يتم تصدير ملفات Word (.docx) بتنسيق RTL كامل مع تظليل الرؤوس، حدود واضحة، ودعم كامل للغة العربية.'
                : '💡 Word documents (.docx) are exported with full RTL alignment, shaded headers, and clear borders.'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition-colors shadow-xs active:scale-95"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
