import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { ParsedTable } from './tableExtractor';

export interface TableDocxOptions {
  title?: string;
  subtitle?: string;
  themeColor?: 'emerald' | 'navy' | 'gold' | 'slate' | 'teal';
  blankTemplate?: boolean; // if true, only exports header + empty blank rows for template filling
  blankRowsCount?: number;
  isRtl?: boolean;
  fontFamily?: string;
}

const TABLE_THEMES = {
  emerald: {
    headerBg: '065F46',
    headerText: 'FFFFFF',
    border: '047857',
    zebraBg: 'ECFDF5',
    titleColor: '065F46',
  },
  teal: {
    headerBg: '0F766E',
    headerText: 'FFFFFF',
    border: '0D9488',
    zebraBg: 'F0FDFA',
    titleColor: '0F766E',
  },
  navy: {
    headerBg: '1E3A8A',
    headerText: 'FFFFFF',
    border: '2563EB',
    zebraBg: 'EFF6FF',
    titleColor: '1E3A8A',
  },
  gold: {
    headerBg: 'B45309',
    headerText: 'FFFFFF',
    border: 'D97706',
    zebraBg: 'FFFBEB',
    titleColor: 'B45309',
  },
  slate: {
    headerBg: '1E293B',
    headerText: 'FFFFFF',
    border: '475569',
    zebraBg: 'F8FAFC',
    titleColor: '1E293B',
  },
};

/**
 * Builds a styled docx Table object from a ParsedTable
 */
export function createDocxTableFromParsed(
  parsedTable: ParsedTable,
  options: TableDocxOptions = {}
): Table {
  const isRtl = options.isRtl !== false;
  const theme = TABLE_THEMES[options.themeColor || 'teal'];
  const font = options.fontFamily || (isRtl ? 'Cairo' : 'Calibri');
  const numCols = Math.max(parsedTable.headers.length, 1);
  const colWidthPct = Math.floor(100 / numCols);

  const docxRows: TableRow[] = [];

  // 1. Header Row
  if (parsedTable.headers.length > 0) {
    const headerCells = parsedTable.headers.map(
      (hText) =>
        new TableCell({
          width: { size: colWidthPct, type: WidthType.PERCENTAGE },
          shading: {
            fill: theme.headerBg,
            type: ShadingType.CLEAR,
            color: 'auto',
          },
          margins: { top: 160, bottom: 160, left: 180, right: 180 },
          children: [
            new Paragraph({
              alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              bidirectional: isRtl,
              children: [
                new TextRun({
                  text: hText || '—',
                  bold: true,
                  size: 22, // 11pt
                  color: theme.headerText,
                  font,
                }),
              ],
            }),
          ],
        })
    );

    docxRows.push(
      new TableRow({
        tableHeader: true,
        children: headerCells,
      })
    );
  }

  // 2. Data Rows or Blank Template Rows
  if (options.blankTemplate) {
    const count = options.blankRowsCount || Math.max(parsedTable.rows.length, 5);
    for (let r = 0; r < count; r++) {
      const isZebra = r % 2 === 1;
      const blankCells = parsedTable.headers.map(
        () =>
          new TableCell({
            width: { size: colWidthPct, type: WidthType.PERCENTAGE },
            shading: isZebra
              ? { fill: theme.zebraBg, type: ShadingType.CLEAR, color: 'auto' }
              : undefined,
            margins: { top: 200, bottom: 200, left: 180, right: 180 },
            children: [
              new Paragraph({
                alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: isRtl,
                children: [
                  new TextRun({
                    text: ' ',
                    size: 20,
                    font,
                  }),
                ],
              }),
            ],
          })
      );

      docxRows.push(new TableRow({ children: blankCells }));
    }
  } else {
    parsedTable.rows.forEach((row, rIdx) => {
      const isZebra = rIdx % 2 === 1;
      const dataCells = parsedTable.headers.map((_, cIdx) => {
        const cellText = row[cIdx] || '';
        return new TableCell({
          width: { size: colWidthPct, type: WidthType.PERCENTAGE },
          shading: isZebra
            ? { fill: theme.zebraBg, type: ShadingType.CLEAR, color: 'auto' }
            : undefined,
          margins: { top: 140, bottom: 140, left: 180, right: 180 },
          children: [
            new Paragraph({
              alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              bidirectional: isRtl,
              children: [
                new TextRun({
                  text: cellText,
                  size: 20, // 10pt
                  color: '1E293B',
                  font,
                }),
              ],
            }),
          ],
        });
      });

      docxRows.push(new TableRow({ children: dataCells }));
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: theme.border },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: theme.border },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    },
    rows: docxRows,
  });
}

/**
 * Generates a complete Word document (.docx Blob) for a single table / template
 */
export async function generateSingleTableDocx(
  table: ParsedTable,
  options: TableDocxOptions = {}
): Promise<Blob> {
  const isRtl = options.isRtl !== false;
  const theme = TABLE_THEMES[options.themeColor || 'teal'];
  const font = options.fontFamily || (isRtl ? 'Cairo' : 'Calibri');
  const title = options.title || (isRtl ? 'قالب جدول وورد' : 'Word Table Template');

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
      spacing: { before: 100, after: 150 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt
          color: theme.titleColor,
          font,
        }),
      ],
    })
  );

  // Subtitle/Template badge if requested
  if (options.blankTemplate || options.subtitle) {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: options.subtitle || (isRtl ? '📋 قالب تفريغ وتعبئة معتمد جاهز للتعديل والطباعة' : '📋 Editable Table Template Document'),
            italics: true,
            size: 20,
            color: '64748B',
            font,
          }),
        ],
      })
    );
  }

  // Add the Table
  children.push(createDocxTableFromParsed(table, options));

  // Footer text
  children.push(
    new Paragraph({
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: isRtl ? 'تم استخراج وتنسيق هذا القالب بواسطة نظام OCR الذكي' : 'Generated via Smart OCR Table Studio',
          size: 16,
          color: '94A3B8',
          font,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: isRtl,
                children: [
                  new TextRun({
                    text: title,
                    size: 16,
                    color: '94A3B8',
                    font,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '64748B',
                    font,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates a complete Word document (.docx Blob) containing ALL tables/templates in document
 */
export async function generateAllTablesDocx(
  tables: ParsedTable[],
  options: TableDocxOptions = {}
): Promise<Blob> {
  const isRtl = options.isRtl !== false;
  const theme = TABLE_THEMES[options.themeColor || 'teal'];
  const font = options.fontFamily || (isRtl ? 'Cairo' : 'Calibri');
  const title = options.title || (isRtl ? 'قوالب الجداول المستخرجة' : 'Extracted Table Templates');

  const children: (Paragraph | Table)[] = [];

  // Main Header Title
  children.push(
    new Paragraph({
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
      spacing: { before: 100, after: 150 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 34, // 17pt
          color: theme.titleColor,
          font,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRtl,
      spacing: { after: 250 },
      children: [
        new TextRun({
          text: isRtl
            ? `يتضمن هذا الملف ${tables.length} جداول مستخرجة ومصممة بأعلى معايير الجودة لبرنامج Word`
            : `Contains ${tables.length} table templates extracted and formatted for Microsoft Word`,
          size: 20,
          color: '64748B',
          font,
        }),
      ],
    })
  );

  // Add each table separated by clean headings
  tables.forEach((tbl, idx) => {
    children.push(
      new Paragraph({
        alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRtl,
        spacing: { before: 300, after: 120 },
        children: [
          new TextRun({
            text: isRtl ? `📌 الجدول رقم (${idx + 1})` : `📌 Table #${idx + 1}`,
            bold: true,
            size: 24, // 12pt
            color: theme.headerBg,
            font,
          }),
        ],
      })
    );

    children.push(createDocxTableFromParsed(tbl, options));
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
