/**
 * Utility to parse, transform, and export extracted Markdown tables
 * into various formats (Clipboard, CSV, Excel/TSV, HTML, Word/DOCX Table)
 */

export interface ParsedTable {
  id: string;
  headers: string[];
  rows: string[][];
  rawMarkdown: string;
  rowCount: number;
  colCount: number;
}

/**
 * Extracts all tables from a Markdown string
 */
export function extractTablesFromMarkdown(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = markdown.split(/\r?\n/);
  
  let currentTableLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.startsWith('|') && line.endsWith('|');

    if (isTableRow) {
      inTable = true;
      currentTableLines.push(line);
    } else {
      if (inTable && currentTableLines.length > 0) {
        const parsed = parseSingleMarkdownTable(currentTableLines);
        if (parsed) tables.push(parsed);
        currentTableLines = [];
        inTable = false;
      }
    }
  }

  // Flush remaining table at EOF
  if (inTable && currentTableLines.length > 0) {
    const parsed = parseSingleMarkdownTable(currentTableLines);
    if (parsed) tables.push(parsed);
  }

  return tables;
}

function parseSingleMarkdownTable(lines: string[]): ParsedTable | null {
  const rawMarkdown = lines.join('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    // Skip divider line like |---|---|
    if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) {
      continue;
    }

    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return null;

  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  return {
    id: Math.random().toString(36).substring(2, 9),
    headers,
    rows: dataRows,
    rawMarkdown,
    rowCount: dataRows.length,
    colCount: headers.length,
  };
}

/**
 * Converts parsed table to TSV (Tab Separated Values) for direct pasting into Microsoft Excel / Google Sheets
 */
export function tableToTsv(table: ParsedTable): string {
  const allRows = [table.headers, ...table.rows];
  return allRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join('\t')).join('\n');
}

/**
 * Converts parsed table to CSV
 */
export function tableToCsv(table: ParsedTable): string {
  const allRows = [table.headers, ...table.rows];
  return allRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Converts parsed table to clean HTML table format
 */
export function tableToHtml(table: ParsedTable, isRtl = true): string {
  const dir = isRtl ? 'rtl' : 'ltr';
  let html = `<table dir="${dir}" border="1" style="border-collapse: collapse; font-family: Cairo, Arial, sans-serif; width: 100%;">\n`;
  
  if (table.headers.length > 0) {
    html += '  <thead>\n    <tr style="background-color: #f1f5f9; font-weight: bold;">\n';
    for (const h of table.headers) {
      html += `      <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: ${isRtl ? 'right' : 'left'};">${h}</th>\n`;
    }
    html += '    </tr>\n  </thead>\n';
  }

  html += '  <tbody>\n';
  table.rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    html += `    <tr style="background-color: ${bg};">\n`;
    for (const cell of row) {
      html += `      <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: ${isRtl ? 'right' : 'left'};">${cell}</td>\n`;
    }
    html += '    </tr>\n';
  });
  html += '  </tbody>\n</table>';

  return html;
}

/**
 * Copies rich HTML table or TSV to clipboard so it pastes cleanly into Excel, Word, or Google Docs
 */
export async function copyTableToClipboard(table: ParsedTable, isRtl = true): Promise<boolean> {
  const tsv = tableToTsv(table);
  const html = tableToHtml(table, isRtl);

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobText = new Blob([tsv], { type: 'text/plain' });
      const blobHtml = new Blob([html], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })];
      await navigator.clipboard.write(data);
      return true;
    } else {
      await navigator.clipboard.writeText(tsv);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, falling back to writeText:', err);
    try {
      await navigator.clipboard.writeText(tsv);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Copies complete document (all text, tables, math formulas) to clipboard in rich format (HTML + Plain Text/Markdown)
 */
export async function copyFullDocumentToClipboard(markdown: string, isRtl = true): Promise<boolean> {
  try {
    // Generate styled HTML representation for rich paste (into MS Word / Google Docs)
    const paragraphs = markdown.split(/\n\n+/);
    let htmlContent = `<div dir="${isRtl ? 'rtl' : 'ltr'}" style="font-family: Cairo, Arial, sans-serif; line-height: 1.8; color: #1e293b;">\n`;

    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const parsedTable = parseSingleMarkdownTable(trimmed.split('\n'));
        if (parsedTable) {
          htmlContent += tableToHtml(parsedTable, isRtl) + '\n<br/>\n';
          continue;
        }
      }
      if (trimmed.startsWith('# ')) {
        htmlContent += `<h1 style="color: #b45309; font-size: 24px; margin-bottom: 8px;">${trimmed.replace(/^#\s+/, '')}</h1>\n`;
      } else if (trimmed.startsWith('## ')) {
        htmlContent += `<h2 style="color: #78350f; font-size: 20px; margin-bottom: 6px;">${trimmed.replace(/^##\s+/, '')}</h2>\n`;
      } else if (trimmed.startsWith('### ')) {
        htmlContent += `<h3 style="color: #1e293b; font-size: 16px; margin-bottom: 4px;">${trimmed.replace(/^###\s+/, '')}</h3>\n`;
      } else {
        htmlContent += `<p style="margin-bottom: 12px;">${trimmed.replace(/\n/g, '<br/>')}</p>\n`;
      }
    }
    htmlContent += `</div>`;

    if (navigator.clipboard && window.ClipboardItem) {
      const blobText = new Blob([markdown], { type: 'text/plain' });
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })];
      await navigator.clipboard.write(data);
      return true;
    } else {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch (err) {
    console.warn('Full copy failed, falling back to writeText:', err);
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }
}
