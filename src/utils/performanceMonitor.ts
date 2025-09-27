/**
 * Performance monitoring utilities for upload and messaging optimization
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private enabled = process.env.NODE_ENV === 'development';

  startTimer(operation: string, metadata?: Record<string, any>): string {
    if (!this.enabled) return '';
    
    const id = `${operation}-${Date.now()}-${Math.random()}`;
    this.metrics.set(id, {
      operation,
      startTime: performance.now(),
      metadata
    });
    
    return id;
  }

  endTimer(id: string): number | null {
    if (!this.enabled || !id) return null;
    
    const metric = this.metrics.get(id);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation: ${metric.operation} took ${duration.toFixed(2)}ms`, metric.metadata);
    } else {
      console.log(`⚡ ${metric.operation}: ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  logUploadPerformance(
    fileName: string,
    originalSize: number,
    compressedSize: number,
    uploadDuration: number
  ) {
    if (!this.enabled) return;

    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    const uploadSpeed = compressedSize / (uploadDuration / 1000); // bytes per second
    
    console.log('📸 Upload Performance:', {
      fileName,
      originalSize: this.formatBytes(originalSize),
      compressedSize: this.formatBytes(compressedSize),
      compressionRatio: `${compressionRatio.toFixed(1)}%`,
      uploadDuration: `${uploadDuration.toFixed(2)}ms`,
      uploadSpeed: `${this.formatBytes(uploadSpeed)}/s`
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const startTimer = (operation: string, metadata?: Record<string, any>) => 
  performanceMonitor.startTimer(operation, metadata);

export const endTimer = (id: string) => 
  performanceMonitor.endTimer(id);

export const logUploadPerformance = (
  fileName: string,
  originalSize: number,
  compressedSize: number,
  uploadDuration: number
) => performanceMonitor.logUploadPerformance(fileName, originalSize, compressedSize, uploadDuration);