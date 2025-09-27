/**
 * Image compression utilities for faster uploads
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeKB = 500
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          const originalSize = file.size;
          const compressedSize = compressedFile.size;
          const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

          // If still too large, try lower quality
          if (compressedSize > maxSizeKB * 1024 && quality > 0.3) {
            compressImage(file, { ...options, quality: quality - 0.2 })
              .then(resolve)
              .catch(reject);
            return;
          }

          resolve({
            compressedFile,
            originalSize,
            compressedSize,
            compressionRatio
          });
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function generateThumbnail(file: File, size = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      // Calculate crop area for square thumbnail
      const { width, height } = img;
      const minSize = Math.min(width, height);
      const x = (width - minSize) / 2;
      const y = (height - minSize) / 2;

      ctx?.drawImage(img, x, y, minSize, minSize, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => reject(new Error('Failed to generate thumbnail'));
    img.src = URL.createObjectURL(file);
  });
}