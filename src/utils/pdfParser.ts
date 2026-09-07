import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Could not set PDF worker from version, using fallback CDN:', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
}

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  textSnippet: string;
}

/**
 * Loads a PDF file and renders all (or selected) pages to high-resolution JPEG Data URLs
 */
export async function renderPdfToImages(
  file: File | ArrayBuffer,
  onProgress?: (current: number, total: number) => void,
  maxPages: number = 1000
): Promise<RenderedPdfPage[]> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const renderedPages: RenderedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Scale 2.0 provides crisp 150-200 DPI suitable for OCR
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (ctx) {
      // White background for transparent PDF layers
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext: any = {
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas,
      };

      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Extract text content snippet if available
      let textSnippet = '';
      try {
        const textContent = await page.getTextContent();
        textSnippet = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .slice(0, 200);
      } catch (_) {}

      renderedPages.push({
        pageNumber: pageNum,
        dataUrl,
        width: viewport.width,
        height: viewport.height,
        textSnippet,
      });
    }

    if (onProgress) {
      onProgress(pageNum, numPages);
    }
  }

  return renderedPages;
}
