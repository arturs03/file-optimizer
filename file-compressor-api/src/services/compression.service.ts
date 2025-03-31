import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { CompressionOptions, CompressionResult, FileInfo } from '../types';

if (!ffmpegStatic) {
  throw new Error('ffmpeg-static not found');
}

ffmpeg.setFfmpegPath(ffmpegStatic);

export class CompressionService {
  private static readonly DEFAULT_QUALITY = 80;

  private static validateFileInfo(fileInfo: FileInfo) {
    if (!fileInfo.path || !fs.existsSync(fileInfo.path)) {
      throw new Error(`File not found at path: ${fileInfo.path}`);
    }

    if (!fileInfo.mimeType) {
      throw new Error('File mime type is required');
    }

    if (!fileInfo.size || fileInfo.size <= 0) {
      throw new Error('Invalid file size');
    }
  }

  private static getPublicUrl(filePath: string): string {
    // Convert the full file path to a URL path starting with /uploads
    const fileName = path.basename(filePath);
    return `/uploads/${fileName}`;
  }

  static async compressImage(
    fileInfo: FileInfo,
    options: CompressionOptions = {},
    taskId: string
  ): Promise<CompressionResult> {
    this.validateFileInfo(fileInfo);

    const { quality = this.DEFAULT_QUALITY, format = 'webp' } = options;
    const outputPath = path.join(
      path.dirname(fileInfo.path),
      `${path.parse(fileInfo.filename).name}.${format}`
    );

    try {
      await sharp(fileInfo.path)
        .webp({ quality })
        .toFile(outputPath);

      const compressedSize = fs.statSync(outputPath).size;
      const compressionRatio = (compressedSize / fileInfo.size) * 100;

      console.log('Image compression completed:', {
        filename: fileInfo.filename,
        originalSize: fileInfo.size,
        compressedSize,
        compressionRatio
      });

      return {
        originalSize: fileInfo.size,
        compressedSize,
        compressionRatio,
        outputPath: this.getPublicUrl(outputPath),
        format,
        taskId
      };
    } catch (error) {
      console.error('Image compression failed:', {
        filename: fileInfo.filename,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async compressVideo(
    fileInfo: FileInfo,
    options: CompressionOptions = {},
    taskId: string
  ): Promise<CompressionResult> {
    this.validateFileInfo(fileInfo);

    const { format = 'webm' } = options;
    const outputPath = path.join(
      path.dirname(fileInfo.path),
      `${path.parse(fileInfo.filename).name}.${format}`
    );

    return new Promise((resolve, reject) => {
      ffmpeg(fileInfo.path)
        .toFormat(format)
        .videoCodec('libvpx-vp9')
        .audioCodec('libvorbis')
        .outputOptions([
          '-b:v 1M', // Video bitrate
          '-crf 30', // Constant Rate Factor (0-63, lower is better quality)
          '-b:a 128k', // Audio bitrate
          '-deadline good', // Encoding speed preset
          '-cpu-used 4' // CPU usage (0-5, higher is faster but lower quality)
        ])
        .on('progress', (progress) => {
          console.log('Video compression progress:', {
            filename: fileInfo.filename,
            ...progress
          });
        })
        .on('end', () => {
          try {
            const compressedSize = fs.statSync(outputPath).size;
            const compressionRatio = (compressedSize / fileInfo.size) * 100;

            console.log('Video compression completed:', {
              filename: fileInfo.filename,
              originalSize: fileInfo.size,
              compressedSize,
              compressionRatio
            });

            resolve({
              originalSize: fileInfo.size,
              compressedSize,
              compressionRatio,
              outputPath: this.getPublicUrl(outputPath),
              format,
              taskId
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          console.error('Video compression failed:', {
            filename: fileInfo.filename,
            error: err.message
          });
          reject(new Error(`Video compression failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  static async compress(
    fileInfo: FileInfo,
    options: CompressionOptions = {},
    taskId: string
  ): Promise<CompressionResult> {
    this.validateFileInfo(fileInfo);

    const isImage = fileInfo.mimeType.startsWith('image/');
    const isVideo = fileInfo.mimeType.startsWith('video/');

    console.log('Starting compression:', {
      filename: fileInfo.filename,
      mimeType: fileInfo.mimeType,
      size: fileInfo.size,
      type: isImage ? 'image' : isVideo ? 'video' : 'unknown'
    });

    if (isImage) {
      return this.compressImage(fileInfo, options, taskId);
    } else if (isVideo) {
      return this.compressVideo(fileInfo, options, taskId);
    }

    throw new Error(`Unsupported file type: ${fileInfo.mimeType}`);
  }
} 