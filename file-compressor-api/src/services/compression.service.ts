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

  static async compressImage(
    fileInfo: FileInfo,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const { quality = this.DEFAULT_QUALITY, format = 'webp' } = options;
    const outputPath = path.join(
      path.dirname(fileInfo.path),
      `${path.parse(fileInfo.filename).name}.${format}`
    );

    await sharp(fileInfo.path)
      .webp({ quality })
      .toFile(outputPath);

    const compressedSize = fs.statSync(outputPath).size;
    const compressionRatio = (compressedSize / fileInfo.size) * 100;

    return {
      originalSize: fileInfo.size,
      compressedSize,
      compressionRatio,
      outputPath,
      format
    };
  }

  static async compressVideo(
    fileInfo: FileInfo,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
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
        .on('end', () => {
          const compressedSize = fs.statSync(outputPath).size;
          const compressionRatio = (compressedSize / fileInfo.size) * 100;

          resolve({
            originalSize: fileInfo.size,
            compressedSize,
            compressionRatio,
            outputPath,
            format
          });
        })
        .on('error', (err) => {
          reject(new Error(`Video compression failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  static async compress(
    fileInfo: FileInfo,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const isImage = fileInfo.mimeType.startsWith('image/');
    const isVideo = fileInfo.mimeType.startsWith('video/');

    if (isImage) {
      return this.compressImage(fileInfo, options);
    } else if (isVideo) {
      return this.compressVideo(fileInfo, options);
    }

    throw new Error('Unsupported file type');
  }
} 