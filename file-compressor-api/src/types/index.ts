export interface CompressionOptions {
  quality?: number;
  format?: 'webp' | 'webm';
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  outputPath: string;
  format: string;
  taskId: string;
}

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  filename: string;
}

export interface CompressionProgress {
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

export interface CompressionTask {
  id: string;
  fileInfo: FileInfo;
  options: CompressionOptions;
  progress: CompressionProgress;
  result?: CompressionResult;
  error?: string;
} 