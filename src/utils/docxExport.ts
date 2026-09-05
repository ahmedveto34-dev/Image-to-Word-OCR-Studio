import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  Packer,
  ShadingType,
} from 'docx';
import { DocxExportOptions } from '../types';

export const THEME_PALETTES = {
  gold: {
    primary: 'B45309', // Amber 700
    secondary: '78350F',
    accent: 'FEF3C7',
    border: 'D97706',
    tableHeader: 'D97706',
    tableHeaderText: 'FFFFFF',
    zebraLight: 'FFFBEB',
  },
  navy: {
    primary: '1E3A8A', // Blue 900
    secondary: '1E40AF',
    accent: 'DBEAFE',
    border: '3B82F6',
    tableHeader: '1E40AF',
    tableHeaderText: 'FFFFFF',
    zebraLight: 'EFF6FF',
  },
  emerald: {
    primary: '065F46', // Emerald 800
    secondary: '047857',
    accent: 'D1FAE5',
    border: '10B981',
    tableHeader: '047857',
    tableHeaderText: 'FFFFFF',
    zebraLight: 'ECFDF5',
  },
  crimson: {
    primary: '881337', // Rose 900
    secondary: '9F1239',
    accent: 'FFE4E6',
    border: 'F43F5E',
    tableHeader: '9F1239',
    tableHeaderText: 'FFFFFF',
    zebraLight: 'FFF1F2',
  },
  slate: {
    primary: '1E293B', // Slate 800
    secondary: '334155',
    accent: 'F1F5F9',
    border: '64748B',
    tableHeader: '334155',
    tableHeaderText: 'FFFFFF',
    zebraLight: 'F8FAFC',
  },
};

/**
 * Checks if a string contains Arabic characters
 */
export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Parses markdown into docx elements with complete fidelity to layout, direction (RTL/LTR),
 * tables, headers, callouts, lists, formulas, and fonts.
 */
export async function generateDocxBlob(
  markdownText: string,
  options: DocxExportOptions
): Promise<Blob> {
  const palette = THEME_PALETTES[options.themeColor] || THEME_PALETTES.gold;
  
  // Determine RTL: if explicitly provided use it; otherwise auto-detect from content
  const isRtl = options.rtl !== undefined ? options.rtl : isArabicText(markdownText);
  const defaultFont = isRtl ? 'Cairo' : 'Calibri';
  const fontFamily = options.fontFamily || defaultFont;
  const baseSizePt = options.fontSize || 12;
  const halfPoints = baseSizePt * 2; // docx uses half-points (24 = 12pt)

  const lines = markdownText.split(/\r?\n/);
  const children: (Paragraph | Table)[] = [];

  // Title page / Top Document Header Banner
  if (options.title) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { before: 200, after: 160 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: palette.border },
        },
        children: [
          new TextRun({
            text: options.title,
            bold: true,
            size: halfPoints + 14, // +7pt
            color: palette.primary,
            font: fontFamily,
            rightToLeft: isRtl,
          }),
        ],
      })
    );
  }

  if (options.author) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: `${isRtl ? 'إعداد: ' : 'Author: '} ${options.author}`,
            italics: true,
            size: halfPoints - 2,
            color: '64748B',
            font: fontFamily,
            rightToLeft: isRtl,
          }),
        ],
      })
    );
  }

  let tableBuffer: string[] = [];
  let inCodeOrMathBlock = false;
  let codeBuffer: string[] = [];
  let isMathBlock = false;

  const flushTableBuffer = () => {
    if (tableBuffer.length > 0) {
      const table = createDocxTable(tableBuffer, palette, fontFamily, halfPoints, isRtl);
      if (table) children.push(table);
      tableBuffer = [];
    }
  };

  const flushCodeBuffer = () => {
    if (codeBuffer.length > 0) {
      const codeText = codeBuffer.join('\n');
      if (isMathBlock) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: false,
            spacing: { before: 140, after: 140 },
            shading: {
              type: ShadingType.CLEAR,
              fill: palette.accent,
            },
            border: {
              left: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
              right: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
              top: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
            },
            children: [
              new TextRun({
                text: codeText,
                bold: true,
                font: 'Cambria Math',
                size: halfPoints + 2,
                color: palette.primary,
              }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            bidirectional: false,
            spacing: { before: 120, after: 120 },
            shading: {
              type: ShadingType.CLEAR,
              fill: 'F8FAFC',
            },
            border: {
              left: { style: BorderStyle.SINGLE, size: 10, color: palette.border },
              right: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
              top: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
            },
            children: [
              new TextRun({
                text: codeText,
                font: 'Consolas',
                size: halfPoints - 2,
                color: '0F172A',
              }),
            ],
          })
        );
      }
      codeBuffer = [];
      isMathBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for Math or Code block delimiters
    if (trimmed.startsWith('```') || trimmed.startsWith('$$')) {
      if (inCodeOrMathBlock) {
        flushCodeBuffer();
        inCodeOrMathBlock = false;
      } else {
        flushTableBuffer();
        inCodeOrMathBlock = true;
        isMathBlock = trimmed.startsWith('$$');
      }
      continue;
    }

    if (inCodeOrMathBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Markdown table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTableBuffer();
    }

    // Page Break or Horizontal Divider detection (e.g., ---, ***, ===)
    if (/^(\-{3,}|\*{3,}|={3,}|_{3,})$/.test(trimmed)) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          },
          children: [new TextRun({ text: '' })],
        })
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: '' })],
        })
      );
      continue;
    }

    // Determine line direction (if line is Arabic vs English)
    const lineIsArabic = isArabicText(trimmed);
    const lineRtl = isRtl || lineIsArabic;
    const lineAlign = lineRtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

    // Heading 1 (# Heading)
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 280, after: 140 },
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s+/, ''),
              bold: true,
              size: halfPoints + 10,
              color: palette.primary,
              font: fontFamily,
              rightToLeft: lineRtl,
            }),
          ],
        })
      );
      continue;
    }

    // Heading 2 (## Heading)
    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 220, after: 120 },
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s+/, ''),
              bold: true,
              size: halfPoints + 6,
              color: palette.secondary,
              font: fontFamily,
              rightToLeft: lineRtl,
            }),
          ],
        })
      );
      continue;
    }

    // Heading 3 (### Heading)
    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 180, after: 100 },
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s+/, ''),
              bold: true,
              size: halfPoints + 3,
              color: palette.secondary,
              font: fontFamily,
              rightToLeft: lineRtl,
            }),
          ],
        })
      );
      continue;
    }

    // Heading 4 (#### Heading)
    if (trimmed.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 140, after: 80 },
          children: [
            new TextRun({
              text: trimmed.replace(/^####\s+/, ''),
              bold: true,
              size: halfPoints + 1,
              color: palette.primary,
              font: fontFamily,
              rightToLeft: lineRtl,
            }),
          ],
        })
      );
      continue;
    }

    // Blockquote / Callout Note (> Text)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      const quoteBorder = lineRtl
        ? { right: { style: BorderStyle.SINGLE, size: 16, color: palette.border } }
        : { left: { style: BorderStyle.SINGLE, size: 16, color: palette.border } };

      children.push(
        new Paragraph({
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 120, after: 120 },
          shading: {
            type: ShadingType.CLEAR,
            fill: palette.accent,
          },
          border: quoteBorder,
          children: parseInlineFormatting(quoteText, fontFamily, halfPoints, '334155', lineRtl),
        })
      );
      continue;
    }

    // Checklist / Task item (- [x] or - [ ])
    if (/^[\-\*]\s+\[([ xX])\]\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^[\-\*]\s+\[([ xX])\]\s+(.*)$/);
      const isChecked = match && (match[1] === 'x' || match[1] === 'X');
      const itemText = match ? match[2] : trimmed;
      
      children.push(
        new Paragraph({
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: isChecked ? '☑ ' : '☐ ',
              bold: true,
              color: isChecked ? palette.primary : '64748B',
              size: halfPoints + 2,
              font: 'Arial',
            }),
            ...parseInlineFormatting(itemText, fontFamily, halfPoints, '1E293B', lineRtl),
          ],
        })
      );
      continue;
    }

    // Standalone Math / Equation line (e.g. formula with math symbols)
    if (
      options.highlightMath &&
      (trimmed.includes('=') && /[\+\-\*\/×÷√∑∫\^≤≥≠≈πθλ]/.test(trimmed) && trimmed.length < 140)
    ) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: false,
          spacing: { before: 120, after: 120 },
          shading: {
            type: ShadingType.CLEAR,
            fill: palette.accent,
          },
          border: {
            left: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
            right: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
            top: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: palette.border },
          },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              font: 'Cambria Math',
              size: halfPoints + 2,
              color: palette.primary,
            }),
          ],
        })
      );
      continue;
    }

    // Bullet points (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^[\-\*]\s+/, '');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 40, after: 40 },
          children: parseInlineFormatting(itemText, fontFamily, halfPoints, '1E293B', lineRtl),
        })
      );
      continue;
    }

    // Numbered list (1. or 1))
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);
      const prefix = match ? match[1] : '';
      const text = match ? match[2] : trimmed;
      children.push(
        new Paragraph({
          alignment: lineAlign,
          bidirectional: lineRtl,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: `${prefix} `,
              bold: true,
              color: palette.primary,
              font: fontFamily,
              size: halfPoints,
              rightToLeft: lineRtl,
            }),
            ...parseInlineFormatting(text, fontFamily, halfPoints, '1E293B', lineRtl),
          ],
        })
      );
      continue;
    }

    // Regular Paragraph with inline bold/italic/underline/strikethrough/code
    children.push(
      new Paragraph({
        alignment: lineAlign,
        bidirectional: lineRtl,
        spacing: { before: 60, after: 60, line: 360 }, // 1.5 line spacing
        children: parseInlineFormatting(rawLine, fontFamily, halfPoints, '1E293B', lineRtl),
      })
    );
  }

  flushTableBuffer();
  flushCodeBuffer();

  // Create complete Document with Header, Footer, and RTL/LTR configuration
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (1440 twips)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: options.includeHeaderFooter
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    bidirectional: isRtl,
                    border: {
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                    },
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: options.headerText || options.title || (isRtl ? 'محول الصور إلى وورد الذكي' : 'OCR Smart Document'),
                        size: 16,
                        color: '94A3B8',
                        font: fontFamily,
                        rightToLeft: isRtl,
                      }),
                      new TextRun({
                        text: isRtl ? '  |  إعداد: MR:Waheed' : '  |  Prepared by MR:Waheed',
                        size: 15,
                        color: 'CBD5E1',
                        font: fontFamily,
                        rightToLeft: isRtl,
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        footers: options.includePageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    border: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                    },
                    spacing: { before: 120 },
                    children: isRtl
                      ? [
                          new TextRun({ text: 'صفحة ', size: 16, color: '94A3B8', font: fontFamily, rightToLeft: true }),
                          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: palette.primary, bold: true, font: fontFamily }),
                          new TextRun({ text: ' من ', size: 16, color: '94A3B8', font: fontFamily, rightToLeft: true }),
                          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: fontFamily }),
                        ]
                      : [
                          new TextRun({ text: 'Page ', size: 16, color: '94A3B8', font: fontFamily }),
                          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: palette.primary, bold: true, font: fontFamily }),
                          new TextRun({ text: ' of ', size: 16, color: '94A3B8', font: fontFamily }),
                          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: fontFamily }),
                        ],
                  }),
                ],
              }),
            }
          : undefined,
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Parses inline bold, italic, code, underline, strikethrough in a text line
 */
function parseInlineFormatting(
  text: string,
  fontFamily: string,
  halfPoints: number,
  color: string,
  isRtl: boolean
): TextRun[] {
  const runs: TextRun[] = [];
  // Tokenize **bold**, *italic*, `code`, ~~strike~~, <u>underline</u>, etc.
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~|<u>.*?<\/u>|==.*?==|[^\*`~<=\n]+|<[^>]+>)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          italics: true,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('~~') && chunk.endsWith('~~') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          strike: true,
          font: fontFamily,
          size: halfPoints,
          color: '94A3B8',
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('<u>') && chunk.endsWith('</u>')) {
      runs.push(
        new TextRun({
          text: chunk.slice(3, -4),
          underline: {},
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('==') && chunk.endsWith('==') && chunk.length >= 4) {
      runs.push(
        new TextRun({
          text: chunk.slice(2, -2),
          bold: true,
          shading: {
            type: ShadingType.CLEAR,
            fill: 'FEF08A', // Yellow highlight
          },
          font: fontFamily,
          size: halfPoints,
          color: '854D0E',
          rightToLeft: isRtl,
        })
      );
    } else if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          font: 'Consolas',
          size: halfPoints - 2,
          color: 'B45309',
          shading: {
            type: ShadingType.CLEAR,
            fill: 'F1F5F9',
          },
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: chunk,
          font: fontFamily,
          size: halfPoints,
          color,
          rightToLeft: isRtl,
        })
      );
    }
  }

  return runs.length > 0
    ? runs
    : [new TextRun({ text, font: fontFamily, size: halfPoints, color, rightToLeft: isRtl })];
}

/**
 * Builds a styled docx Table from Markdown table lines with RTL/LTR precision
 */
function createDocxTable(
  lines: string[],
  palette: any,
  fontFamily: string,
  halfPoints: number,
  isRtl: boolean
): Table | null {
  const rows: TableRow[] = [];
  const parsedRows: string[][] = [];

  for (const line of lines) {
    // Ignore separator line e.g. |---|---|
    if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) {
      continue;
    }
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1); // remove outer empty items
    if (cells.length > 0) {
      parsedRows.push(cells);
    }
  }

  if (parsedRows.length === 0) return null;

  parsedRows.forEach((rowCells, rowIndex) => {
    const isHeader = rowIndex === 0;
    const tableCells = rowCells.map(cellText => {
      const cellIsArabic = isArabicText(cellText);
      const cellRtl = isRtl || cellIsArabic;
      const cellAlign = cellRtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

      return new TableCell({
        width: { size: Math.floor(9000 / rowCells.length), type: WidthType.DXA },
        shading: {
          type: ShadingType.CLEAR,
          fill: isHeader ? palette.tableHeader : rowIndex % 2 === 0 ? palette.zebraLight : 'FFFFFF',
        },
        margins: {
          top: 140,
          bottom: 140,
          left: 160,
          right: 160,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: palette.border },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: palette.border },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        },
        children: [
          new Paragraph({
            alignment: cellAlign,
            bidirectional: cellRtl,
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                font: fontFamily,
                size: isHeader ? halfPoints : halfPoints - 2,
                color: isHeader ? palette.tableHeaderText : '1E293B',
                rightToLeft: cellRtl,
              }),
            ],
          }),
        ],
      });
    });

    rows.push(
      new TableRow({
        tableHeader: isHeader,
        children: tableCells,
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    rows,
  });
}

