import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfOptions {
  title: string;
  elementId: string;
  rtl: boolean;
}

/**
 * Generates and downloads a PDF document from an HTML element
 */
export async function exportToPdf(options: PdfOptions): Promise<void> {
  const element = document.getElementById(options.elementId);
  if (!element) {
    throw new Error('Element not found for PDF export');
  }

  // Clone element to apply print-optimized styling
  const canvas = await html2canvas(element, {
    scale: 2, // High resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth - 20; // 10mm margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10; // 10mm top margin

  pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
  heightLeft -= (pdfHeight - 20);

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);
  }

  pdf.save(`${(options.title || 'document').replace(/\s+/g, '_')}.pdf`);
}
