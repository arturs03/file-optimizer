import { parentPort } from 'worker_threads';
import { CompressionService } from '../services/compression.service';
import { FileInfo, CompressionOptions } from '../types';

if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

parentPort.on('message', async (data: { fileInfo: FileInfo; options: CompressionOptions; taskId: string }) => {
  try {
    console.log('Worker received task:', {
      taskId: data.taskId,
      filename: data.fileInfo.filename,
      mimeType: data.fileInfo.mimeType,
      options: data.options
    });

    const result = await CompressionService.compress(data.fileInfo, data.options, data.taskId);
    
    console.log('Compression completed:', {
      taskId: data.taskId,
      filename: data.fileInfo.filename,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio
    });

    parentPort?.postMessage({ 
      success: true, 
      result: { ...result, taskId: data.taskId }
    });
  } catch (error) {
    console.error('Compression failed:', {
      taskId: data.taskId,
      filename: data.fileInfo.filename,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    parentPort?.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}); 