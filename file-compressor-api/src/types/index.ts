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
}

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  filename: string;
} 