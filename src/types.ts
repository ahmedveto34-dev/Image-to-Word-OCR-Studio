export type Language = 'ar' | 'en';
export type ThemeMode = 'dark' | 'light';
export type AppTab = 'convert' | 'editor' | 'books' | 'library' | 'math';

export interface OCRDetectedElements {
  hasTables: boolean;
  hasMath: boolean;
  hasHandwriting: boolean;
  watermarksDetectedAndFiltered: boolean;
  mathFormulas: string[];
  wordCount: number;
  confidenceScore: number;
}

export interface OCRResult {
  title: string;
  primaryLanguage: 'ar' | 'en' | 'mixed';
  readingDirection: 'rtl' | 'ltr';
  markdown: string;
  plainText: string;
  summary: string;
  detectedElements: OCRDetectedElements;
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  originalImage: string; // base64 or blob URL
  enhancedImage?: string;
  fileName: string;
  fileSize: number;
  extractedMarkdown: string;
  extractedPlainText: string;
  readingDirection: 'rtl' | 'ltr';
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  detectedElements?: OCRDetectedElements;
}

export interface DocumentItem {
  id: string;
  title: string;
  description?: string;
  category: 'books' | 'documents' | 'math' | 'invoices' | 'notes' | 'other';
  tags: string[];
  pages: DocumentPage[];
  combinedMarkdown: string;
  primaryLanguage: 'ar' | 'en' | 'mixed';
  readingDirection: 'rtl' | 'ltr';
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
  stats: {
    totalPages: number;
    totalWords: number;
    totalCharacters: number;
    mathEquationsCount: number;
    tablesCount: number;
  };
}

export interface ImageProcessingFilters {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  grayscale: boolean;
  binarizeThreshold: number; // 0 to 255, 0 = off
  invert: boolean;
  watermarkFilterStrength: 'none' | 'low' | 'medium' | 'high';
  rotation: number; // 0, 90, 180, 270
}

export interface DocxExportOptions {
  title: string;
  author: string;
  fontSize: number; // pt
  fontFamily: 'Cairo' | 'Calibri' | 'Times New Roman' | 'Arial' | 'Amiri';
  lineSpacing: number;
  includePageNumbers: boolean;
  includeTableOfContents: boolean;
  includeHeaderFooter: boolean;
  headerText?: string;
  themeColor: 'gold' | 'navy' | 'emerald' | 'crimson' | 'slate';
  rtl: boolean;
  highlightMath: boolean;
}

export interface PdfExportOptions {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  fontFamily: string;
  theme: 'lux-light' | 'clean-white' | 'academic';
  includeHeader: boolean;
  includeFooter: boolean;
  rtl: boolean;
}

export interface MathEvaluationResult {
  equation: string;
  isValid: boolean;
  result: string;
  explanation: string;
  correction?: string;
}
