import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  currentFile?: File;
  uploadProgress?: number;
  uploadError?: string;
  isUploading?: boolean;
  previewUrl?: string;
  label: string;
  description: string;
}

export function FileUploadZone({
  onFileSelect,
  onFileRemove,
  accept = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  currentFile,
  uploadProgress = 0,
  uploadError,
  isUploading = false,
  previewUrl,
  label,
  description
}: FileUploadZoneProps) {
  const [dragError, setDragError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragError('');
    
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setDragError('File is too large. Maximum size is 10MB.');
      } else if (error.code === 'file-invalid-type') {
        setDragError('Invalid file type. Please upload JPEG, PNG, or WebP images.');
      } else {
        setDragError('File upload error. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isUploading
  });

  const hasFile = currentFile || previewUrl;
  const hasError = dragError || uploadError;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{label}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{dragError || uploadError}</AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive && !isDragReject ? 'border-primary bg-primary/5' : ''}
          ${isDragReject ? 'border-destructive bg-destructive/5' : 'border-border'}
          ${isUploading ? 'cursor-not-allowed opacity-60' : 'hover:border-primary hover:bg-accent/50'}
          ${hasFile ? 'border-success bg-success/5' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {previewUrl && (
          <div className="mb-4">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="mx-auto max-h-48 rounded-lg object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          {isUploading ? (
            <>
              <Upload className="h-8 w-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </>
          ) : hasFile ? (
            <>
              <Check className="h-8 w-8 mx-auto text-success" />
              <p className="text-sm font-medium text-success">
                {currentFile?.name || 'File uploaded'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentFile && `${(currentFile.size / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (JPEG, PNG, WebP - max 10MB)
              </p>
            </>
          )}
        </div>

        {hasFile && !isUploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
            }}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Ensure good lighting and no glare</p>
        <p>• Make sure text is clearly readable</p>
        <p>• Include all edges of the document</p>
        {label.toLowerCase().includes('selfie') && (
          <p>• Hold your ID next to your face with both clearly visible</p>
        )}
      </div>
    </div>
  );
}