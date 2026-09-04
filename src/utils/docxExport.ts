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
  NumberFormat,
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
 * Parses markdown into docx elements (Paragraphs, Tables, Math blocks)
 */
export async function generateDocxBlob(
  markdownText: string,
  options: DocxExportOptions
): Promise<Blob> {
  const palette = THEME_PALETTES[options.themeColor] || THEME_PALETTES.gold;
  const isRtl = options.rtl;
  const fontFamily = options.fontFamily || (isRtl ? 'Cairo' : 'Calibri');
  const baseSizePt = options.fontSize || 12;
  const halfPoints = baseSizePt * 2; // docx uses half-points (24 = 12pt)

  const lines = markdownText.split(/\r?\n/);
  const children: (Paragraph | Table)[] = [];

  // Title page / Top Banner
  children.push(
    new Paragraph({
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: options.title || 'مستند مستخرج',
          bold: true,
          size: halfPoints + 16, // +8pt
          color: palette.primary,
          font: fontFamily,
        }),
      ],
    })
  );

  if (options.author) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${isRtl ? 'إعداد: ' : 'Author: '} ${options.author}`,
            italics: true,
            size: halfPoints - 2,
            color: '64748B',
            font: fontFamily,
          }),
        ],
      })
    );
  }

  let tableBuffer: string[] = [];
  let inCodeOrMathBlock = false;
  let codeBuffer: string[] = [];

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
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          bidirectional: false,
          spacing: { before: 100, after: 100 },
          shading: {
            type: ShadingType.CLEAR,
            fill: palette.accent,
          },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: palette.border },
            right: { style: BorderStyle.SINGLE, size: 12, color: palette.border },
            top: { style: BorderStyle.SINGLE, size: 12, color: palette.border },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: palette.border },
          },
          children: [
            new TextRun({
              text: codeText,
              font: 'Courier New',
              size: halfPoints - 2,
              color: '1E293B',
            }),
          ],
        })
      );
      codeBuffer = [];
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

    // Empty line
    if (!trimmed) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: '' })],
        })
      );
      continue;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isRtl,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s+/, ''),
              bold: true,
              size: halfPoints + 8,
              color: palette.primary,
              font: fontFamily,
            }),
          ],
        })
      );
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isRtl,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s+/, ''),
              bold: true,
              size: halfPoints + 4,
              color: palette.secondary,
              font: fontFamily,
            }),
          ],
        })
      );
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isRtl,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s+/, ''),
              bold: true,
              size: halfPoints + 2,
              color: palette.secondary,
              font: fontFamily,
            }),
          ],
        })
      );
      continue;
    }

    // Math block or arithmetic callout detection
    if (
      options.highlightMath &&
      (trimmed.includes('=') && /[\+\-\*\/×÷√∑∫\^]/.test(trimmed) && trimmed.length < 120)
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
              font: 'JetBrains Mono',
              size: halfPoints + 2,
              color: palette.primary,
            }),
          ],
        })
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^[\-\*]\s+/, '');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isRtl,
          spacing: { before: 40, after: 40 },
          children: parseInlineFormatting(itemText, fontFamily, halfPoints, '1E293B'),
        })
      );
      continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);
      const prefix = match ? match[1] : '';
      const text = match ? match[2] : trimmed;
      children.push(
        new Paragraph({
          alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isRtl,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: `${prefix} `,
              bold: true,
              color: palette.primary,
              font: fontFamily,
              size: halfPoints,
            }),
            ...parseInlineFormatting(text, fontFamily, halfPoints, '1E293B'),
          ],
        })
      );
      continue;
    }

    // Regular Paragraph with inline bold/italic
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { before: 60, after: 60, line: 360 }, // 1.5 line spacing
        children: parseInlineFormatting(rawLine, fontFamily, halfPoints, '1E293B'),
      })
    );
  }

  flushTableBuffer();
  flushCodeBuffer();

  // Create complete Document with Header, Footer, and RTL configuration
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
                    alignment: isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
                    bidirectional: isRtl,
                    children: [
                      new TextRun({
                        text: options.headerText || options.title || 'محول الصور إلى وورد الذكي',
                        size: 18,
                        color: '94A3B8',
                        font: fontFamily,
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
                    children: [
                      new TextRun({
                        children: ['صفحة ', PageNumber.CURRENT, ' من ', PageNumber.TOTAL_PAGES],
                        size: 18,
                        color: '94A3B8',
                        font: fontFamily,
                      }),
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
 * Parses inline bold, italic, inline code in a text line
 */
function parseInlineFormatting(
  text: string,
  fontFamily: string,
  halfPoints: number,
  color: string
): TextRun[] {
  const runs: TextRun[] = [];
  // Tokenize **bold**, *italic*, `code`, etc.
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^\*`]+)/g;
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
        })
      );
    } else if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      runs.push(
        new TextRun({
          text: chunk.slice(1, -1),
          font: 'JetBrains Mono',
          size: halfPoints - 2,
          color: 'B45309',
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: chunk,
          font: fontFamily,
          size: halfPoints,
          color,
        })
      );
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: fontFamily, size: halfPoints, color })];
}

/**
 * Builds a styled docx Table from Markdown table lines
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
      return new TableCell({
        width: { size: Math.floor(9000 / rowCells.length), type: WidthType.DXA },
        shading: {
          type: ShadingType.CLEAR,
          fill: isHeader ? palette.tableHeader : rowIndex % 2 === 0 ? palette.zebraLight : 'FFFFFF',
        },
        margins: {
          top: 120,
          bottom: 120,
          left: 140,
          right: 140,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: palette.border },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: palette.border },
          left: { style: BorderStyle.SINGLE, size: 4, color: palette.border },
          right: { style: BorderStyle.SINGLE, size: 4, color: palette.border },
        },
        children: [
          new Paragraph({
            alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional: isRtl,
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                font: fontFamily,
                size: isHeader ? halfPoints : halfPoints - 2,
                color: isHeader ? palette.tableHeaderText : '1E293B',
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
    alignment: AlignmentType.CENTER,
    rows,
  });
}
