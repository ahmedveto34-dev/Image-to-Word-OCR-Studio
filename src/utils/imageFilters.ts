import { ImageProcessingFilters } from '../types';

export const DEFAULT_FILTERS: ImageProcessingFilters = {
  brightness: 0,
  contrast: 0,
  grayscale: false,
  binarizeThreshold: 0, // 0 = off
  invert: false,
  watermarkFilterStrength: 'none',
  rotation: 0,
};

/**
 * Applies canvas image processing filters to an image source URL or base64.
 * Returns processed data URL (JPEG/PNG)
 */
export async function applyImageFilters(
  imageSrc: string,
  filters: ImageProcessingFilters
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(imageSrc);
      }

      // Handle rotation dimensions
      const isRotated90or270 = filters.rotation % 180 !== 0;
      canvas.width = isRotated90or270 ? img.height : img.width;
      canvas.height = isRotated90or270 ? img.width : img.height;

      ctx.save();
      // Rotate canvas center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((filters.rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Pixel manipulation for Brightness, Contrast, Grayscale, Binarize, Watermark suppression
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;

      const brightnessFactor = (filters.brightness / 100) * 255;
      // Contrast: -100..100 -> factor
      const contrastFactor =
        filters.contrast === 100
          ? 100
          : (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast));

      // Watermark suppression luminance threshold
      let watermarkCutoff = 0;
      if (filters.watermarkFilterStrength === 'low') watermarkCutoff = 190;
      if (filters.watermarkFilterStrength === 'medium') watermarkCutoff = 170;
      if (filters.watermarkFilterStrength === 'high') watermarkCutoff = 150;

      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Grayscale luminance
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (filters.grayscale || filters.binarizeThreshold > 0 || filters.watermarkFilterStrength !== 'none') {
          r = gray;
          g = gray;
          b = gray;
        }

        // 2. Brightness
        if (filters.brightness !== 0) {
          r += brightnessFactor;
          g += brightnessFactor;
          b += brightnessFactor;
        }

        // 3. Contrast
        if (filters.contrast !== 0) {
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;
        }

        // 4. Watermark suppression: Boost high luminance values to pure white #FFFFFF
        if (watermarkCutoff > 0) {
          const lum = (r + g + b) / 3;
          if (lum > watermarkCutoff) {
            r = 255;
            g = 255;
            b = 255;
          }
        }

        // 5. Binarization (Otsu/Threshold style)
        if (filters.binarizeThreshold > 0) {
          const avg = (r + g + b) / 3;
          const val = avg >= filters.binarizeThreshold ? 255 : 0;
          r = val;
          g = val;
          b = val;
        }

        // 6. Invert
        if (filters.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        // Clamp
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}

/**
 * Converts a File, Blob, Blob URL, or Data URL to an optimized Base64 data string and mimeType.
 * Automatically downscales oversized scans/photos (> 2048px) for optimal speed and reliability.
 */
export async function fileOrUrlToBase64(
  input: File | Blob | string
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> {
  const MAX_DIMENSION = 2048; // Optimal resolution for Gemini OCR without bloat
  const JPEG_QUALITY = 0.92;

  // Helper to load an image element and compress/downscale via canvas if needed
  const optimizeImageSrc = (src: string): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Check if downscale is needed
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const match = src.match(/^data:([^;]+);base64,(.+)$/s);
          if (match) {
            return resolve({ mimeType: match[1], base64Data: match[2], dataUrl: src });
          }
          return resolve({ mimeType: 'image/jpeg', base64Data: src, dataUrl: src });
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
        resolve({
          mimeType: 'image/jpeg',
          base64Data: match ? match[2] : dataUrl,
          dataUrl,
        });
      };
      img.onerror = (err) => reject(new Error('Failed to load image for processing: ' + err));
      img.src = src;
    });
  };

  if (input instanceof File || input instanceof Blob) {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });
    return optimizeImageSrc(dataUrl);
  }

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      return optimizeImageSrc(input);
    }

    try {
      const response = await fetch(input);
      const blob = await response.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return optimizeImageSrc(dataUrl);
    } catch {
      return optimizeImageSrc(input);
    }
  }

  throw new Error('Unsupported image format');
}
