import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressImage, isImageFile, formatFileSize, generateThumbnail } from '@/utils/imageCompression';
import { useToast } from '@/hooks/use-toast';

export interface UploadProgress {
  progress: number;
  stage: 'compressing' | 'uploading' | 'complete' | 'error';
  originalSize?: number;
  compressedSize?: number;
  thumbnailUrl?: string;
}

export interface UploadResult {
  url: string;
  originalSize: number;
  compressedSize?: number;
  thumbnailUrl?: string;
}

export function useOptimizedUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const { toast } = useToast();

  const uploadFile = useCallback(async (
    file: File,
    bucket: string,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    const uploadId = `${Date.now()}-${Math.random()}`;
    
    const updateProgress = (progress: UploadProgress) => {
      setUploads(prev => new Map(prev.set(uploadId, progress)));
      onProgress?.(progress);
    };

    try {
      let processedFile = file;
      let thumbnailUrl: string | undefined;
      let originalSize = file.size;
      let compressedSize: number | undefined;

      // Compress images for better performance
      if (isImageFile(file)) {
        updateProgress({ progress: 20, stage: 'compressing' });
        
        // Generate thumbnail first (fast operation)
        try {
          thumbnailUrl = await generateThumbnail(file);
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }

        // Compress image if it's larger than 200KB
        if (file.size > 200 * 1024) {
          const compressionResult = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
            maxSizeKB: 500
          });

          processedFile = compressionResult.compressedFile;
          compressedSize = compressionResult.compressedSize;
          
          console.log(`Compressed image from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)} (${compressionResult.compressionRatio.toFixed(1)}% reduction)`);
        }
      }

      updateProgress({ 
        progress: 40, 
        stage: 'uploading',
        originalSize,
        compressedSize,
        thumbnailUrl
      });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, processedFile, { 
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      updateProgress({ 
        progress: 80, 
        stage: 'uploading',
        originalSize,
        compressedSize,
        thumbnailUrl
      });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      updateProgress({ 
        progress: 100, 
        stage: 'complete',
        originalSize,
        compressedSize,
        thumbnailUrl
      });

      // Clean up progress tracking after a delay
      setTimeout(() => {
        setUploads(prev => {
          const next = new Map(prev);
          next.delete(uploadId);
          return next;
        });
      }, 2000);

      return {
        url: urlData.publicUrl,
        originalSize,
        compressedSize,
        thumbnailUrl
      };

    } catch (error) {
      updateProgress({ 
        progress: 0, 
        stage: 'error',
        originalSize: file.size
      });

      console.error('Upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: `Failed to upload ${file.name}. Please try again.`
      });

      throw error;
    }
  }, [toast]);

  const getUploadProgress = useCallback((uploadId: string) => {
    return uploads.get(uploadId);
  }, [uploads]);

  return {
    uploadFile,
    getUploadProgress,
    activeUploads: uploads
  };
}