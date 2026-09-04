import pptxgenjs from 'pptxgenjs';

export interface PptxExportOptions {
  title: string;
  theme: 'luxury' | 'corporate' | 'emerald' | 'minimal';
  fontFace?: string;
  author?: string;
  splitBy?: 'heading' | 'page' | 'auto';
  readingDirection?: 'rtl' | 'ltr';
}

interface ParsedSlideData {
  title: string;
  subTitle?: string;
  bullets: string[];
  tables: Array<{ headers: string[]; rows: string[][] }>;
  notes?: string;
}

/**
 * Parses markdown into structured slides
 */
function parseMarkdownToSlides(markdown: string): ParsedSlideData[] {
  const slides: ParsedSlideData[] = [];
  
  // Normalize line endings
  const lines = markdown.split(/\r?\n/);
  
  let currentSlide: ParsedSlideData = {
    title: '',
    bullets: [],
    tables: [],
  };

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (inTable && (tableHeaders.length > 0 || tableRows.length > 0)) {
      currentSlide.tables.push({
        headers: tableHeaders,
        rows: tableRows,
      });
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const flushSlide = () => {
    flushTable();
    if (currentSlide.title || currentSlide.bullets.length > 0 || currentSlide.tables.length > 0) {
      if (!currentSlide.title && currentSlide.bullets.length > 0) {
        currentSlide.title = currentSlide.bullets[0].replace(/^[#*\-•\s]+/, '').slice(0, 60);
      }
      slides.push({ ...currentSlide });
    }
    currentSlide = {
      title: '',
      bullets: [],
      tables: [],
    };
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for explicit slide separator
    if (line === '---' || line === '***' || line === '___') {
      flushSlide();
      continue;
    }

    // Check for Heading 1 or Heading 2 as slide breakers
    if (line.startsWith('# ') || line.startsWith('## ')) {
      // If we already have content on this slide, start a new slide
      if (currentSlide.title || currentSlide.bullets.length > 0 || currentSlide.tables.length > 0) {
        flushSlide();
      }
      currentSlide.title = line.replace(/^#+\s*/, '').replace(/[*_`]/g, '');
      continue;
    }

    // Check for Subheading (H3 or H4)
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      const sub = line.replace(/^#+\s*/, '').replace(/[*_`]/g, '');
      if (!currentSlide.title) {
        currentSlide.title = sub;
      } else {
        currentSlide.bullets.push(sub);
      }
      continue;
    }

    // Check for Markdown Table Row
    if (line.startsWith('|') && line.endsWith('|')) {
      // Table separator check e.g. |---|---|
      if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) {
        inTable = true;
        continue;
      }

      const cells = line
        .split('|')
        .slice(1, -1)
        .map(c => c.trim().replace(/[*_`]/g, ''));

      if (!inTable && tableHeaders.length === 0) {
        tableHeaders = cells;
        inTable = true;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Bullet points / Lists
    if (/^[-*+•]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const cleanBullet = line.replace(/^[-*+•\d.]+\s+/, '').replace(/[*_`]/g, '');
      if (cleanBullet) {
        currentSlide.bullets.push(cleanBullet);
      }
      continue;
    }

    // Regular text paragraph
    if (line.length > 0) {
      // If no title yet, check if line can be slide title
      if (!currentSlide.title && line.length < 60) {
        currentSlide.title = line.replace(/[*_`]/g, '');
      } else {
        currentSlide.bullets.push(line.replace(/[*_`]/g, ''));
      }
    }
  }

  // Flush remaining slide
  flushSlide();

  // If no slides found, create at least one default slide
  if (slides.length === 0) {
    slides.push({
      title: 'مستند العرض التقديمي',
      bullets: [markdown.slice(0, 300)],
      tables: [],
    });
  }

  return slides;
}

/**
 * Generates and downloads a Microsoft PowerPoint presentation (.pptx)
 */
export async function exportToPowerPoint(
  markdown: string,
  options: PptxExportOptions
): Promise<void> {
  const pptx = new pptxgenjs();

  const isRtl = options.readingDirection !== 'ltr';
  const font = options.fontFace || (isRtl ? 'Cairo' : 'Arial');

  // Set Presentation Properties
  pptx.title = options.title || 'عرض تقديمي مصور';
  pptx.subject = 'Extracted Document Presentation';
  pptx.author = options.author || 'Image to Word OCR Studio';
  pptx.company = 'OCR Studio Pro';
  pptx.layout = 'LAYOUT_16x9';

  // Theme palettes
  const themes = {
    luxury: {
      bg: '0F172A', // Slate 900
      slideBg: 'FFFFFF',
      titleColor: 'B45309', // Amber 700
      accentColor: 'D97706', // Amber 600
      textColor: '1E293B', // Slate 800
      headerFill: '1E293B',
      headerText: 'F8FAFC',
      subText: '64748B',
    },
    corporate: {
      bg: '1E3A8A', // Blue 900
      slideBg: 'FFFFFF',
      titleColor: '1E40AF', // Blue 800
      accentColor: '3B82F6', // Blue 500
      textColor: '1E293B',
      headerFill: '1E40AF',
      headerText: 'FFFFFF',
      subText: '475569',
    },
    emerald: {
      bg: '064E3B', // Emerald 900
      slideBg: 'FFFFFF',
      titleColor: '065F46', // Emerald 800
      accentColor: '10B981', // Emerald 500
      textColor: '1E293B',
      headerFill: '065F46',
      headerText: 'FFFFFF',
      subText: '475569',
    },
    minimal: {
      bg: '18181B', // Zinc 900
      slideBg: 'FAFAFA',
      titleColor: '18181B',
      accentColor: '71717A',
      textColor: '27272A',
      headerFill: '27272A',
      headerText: 'FFFFFF',
      subText: '71717A',
    },
  };

  const currentTheme = themes[options.theme || 'luxury'];

  // Parse slides
  const slidesData = parseMarkdownToSlides(markdown);

  // 1. Cover / Title Slide
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: currentTheme.bg };

  coverSlide.addText(options.title || 'المستند المستخرج', {
    x: 0.8,
    y: 2.2,
    w: '88%',
    h: 1.8,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: font,
    align: isRtl ? 'right' : 'left',
    rtlMode: isRtl,
  });

  coverSlide.addText('تم الاستخراج والمعالجة بواسطة Image to Word OCR Studio Pro', {
    x: 0.8,
    y: 4.2,
    w: '88%',
    h: 0.6,
    fontSize: 16,
    color: '94A3B8',
    fontFace: font,
    align: isRtl ? 'right' : 'left',
    rtlMode: isRtl,
  });

  // Decorative Accent bar on cover
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: isRtl ? 9.8 : 0.8,
    y: 1.8,
    w: 0.15,
    h: 3.5,
    fill: { color: currentTheme.accentColor },
    line: { color: currentTheme.accentColor },
  });

  // 2. Content Slides
  slidesData.forEach((slideData, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: currentTheme.slideBg };

    // Slide Top Header Title
    slide.addText(slideData.title || `شريحة ${idx + 1}`, {
      x: 0.8,
      y: 0.5,
      w: '88%',
      h: 0.9,
      fontSize: 22,
      bold: true,
      color: currentTheme.titleColor,
      fontFace: font,
      align: isRtl ? 'right' : 'left',
      rtlMode: isRtl,
    });

    // Header divider line
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 1.35,
      w: 8.4,
      h: 0,
      line: { color: currentTheme.accentColor, width: 2 },
    });

    let currentY = 1.6;

    // Add Bullets / Text
    if (slideData.bullets.length > 0) {
      const textItems = slideData.bullets.map(b => ({
        text: b + '\n',
        options: {
          fontSize: 14,
          color: currentTheme.textColor,
          fontFace: font,
          breakLine: true,
          bullet: true,
          rtlMode: isRtl,
          align: (isRtl ? 'right' : 'left') as any,
          lineSpacing: 24,
        },
      }));

      slide.addText(textItems as any, {
        x: 0.8,
        y: currentY,
        w: '88%',
        h: slideData.tables.length > 0 ? 2.2 : 4.6,
        valign: 'top',
        rtlMode: isRtl,
        align: isRtl ? 'right' : 'left',
      });

      currentY += slideData.tables.length > 0 ? 2.3 : 0;
    }

    // Add Embedded Native PowerPoint Tables if detected
    if (slideData.tables.length > 0 && currentY < 6.0) {
      const tableData = slideData.tables[0];
      const pptxTableRows: any[][] = [];

      // Header row
      if (tableData.headers.length > 0) {
        pptxTableRows.push(
          tableData.headers.map(h => ({
            text: h,
            options: {
              fill: { color: currentTheme.headerFill },
              color: currentTheme.headerText,
              fontFace: font,
              bold: true,
              fontSize: 12,
              align: isRtl ? 'right' : 'left',
              valign: 'middle',
              rtlMode: isRtl,
            },
          }))
        );
      }

      // Body rows (max 6 rows per slide to prevent overflow)
      const previewRows = tableData.rows.slice(0, 5);
      previewRows.forEach((row, rIdx) => {
        pptxTableRows.push(
          row.map(cell => ({
            text: cell,
            options: {
              fill: { color: rIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
              color: currentTheme.textColor,
              fontFace: font,
              fontSize: 11,
              align: isRtl ? 'right' : 'left',
              valign: 'middle',
              rtlMode: isRtl,
            },
          }))
        );
      });

      if (pptxTableRows.length > 0) {
        slide.addTable(pptxTableRows, {
          x: 0.8,
          y: currentY,
          w: 8.4,
          colW: Array(tableData.headers.length || 3).fill(8.4 / (tableData.headers.length || 3)),
          border: { pt: 1, color: 'CBD5E1' },
          autoPage: false,
        });
      }
    }

    // Footer with Slide Number and Document Watermark
    slide.addText(`الصفحة ${idx + 1} من ${slidesData.length}`, {
      x: isRtl ? 0.8 : 7.2,
      y: 6.8,
      w: 2.0,
      h: 0.3,
      fontSize: 10,
      color: currentTheme.subText,
      fontFace: font,
      align: isRtl ? 'left' : 'right',
      rtlMode: isRtl,
    });

    slide.addText(options.title || 'Image to Word OCR Studio', {
      x: isRtl ? 3.0 : 0.8,
      y: 6.8,
      w: 4.5,
      h: 0.3,
      fontSize: 10,
      color: currentTheme.subText,
      fontFace: font,
      align: isRtl ? 'right' : 'left',
      rtlMode: isRtl,
    });
  });

  // Export and download
  const safeFilename = (options.title || 'presentation')
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  await pptx.writeFile({ fileName: `${safeFilename}.pptx` });
}
