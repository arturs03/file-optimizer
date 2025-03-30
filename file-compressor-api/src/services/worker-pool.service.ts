import { Worker } from 'worker_threads';
import path from 'path';
import { FileInfo, CompressionOptions, CompressionResult } from '../types';

export class WorkerPoolService {
  private workers: Worker[] = [];
  private queue: Array<{
    fileInfo: FileInfo;
    options: CompressionOptions;
    resolve: (result: CompressionResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeWorkers = 0;

  constructor(private maxWorkers: number = 4) {
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(
        path.join(__dirname, '../workers/compression.worker.ts')
      );

      worker.on('message', (result) => {
        this.activeWorkers--;
        this.processNextTask();

        if (result.success) {
          this.queue[0].resolve(result.result);
        } else {
          this.queue[0].reject(new Error(result.error));
        }

        this.queue.shift();
      });

      worker.on('error', (error) => {
        this.activeWorkers--;
        this.processNextTask();
        this.queue[0].reject(error);
        this.queue.shift();
      });

      this.workers.push(worker);
    }
  }

  private processNextTask() {
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.queue[0];
      const worker = this.workers[this.activeWorkers];
      
      this.activeWorkers++;
      worker.postMessage({
        fileInfo: task.fileInfo,
        options: task.options
      });
    }
  }

  async compress(fileInfo: FileInfo, options: CompressionOptions = {}): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fileInfo, options, resolve, reject });
      this.processNextTask();
    });
  }
} 