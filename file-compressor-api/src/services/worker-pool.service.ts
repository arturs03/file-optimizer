import { Worker } from 'worker_threads';
import path from 'path';
import { FileInfo, CompressionOptions, CompressionResult, CompressionTask, CompressionProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WorkerPoolService {
  private workers: Worker[] = [];
  private queue: Array<{
    task: CompressionTask;
    resolve: (result: CompressionResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeWorkers = 0;
  private tasks: Map<string, CompressionTask> = new Map();

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
          const task = this.queue[0].task;
          task.progress = { progress: 100, status: 'completed' };
          task.result = { ...result.result, taskId: task.id };
          this.queue[0].resolve({ ...result.result, taskId: task.id });
        } else {
          const task = this.queue[0].task;
          task.progress = { 
            progress: 0, 
            status: 'error',
            message: result.error 
          };
          task.error = result.error;
          this.queue[0].reject(new Error(result.error));
        }

        this.queue.shift();
      });

      worker.on('error', (error) => {
        this.activeWorkers--;
        this.processNextTask();
        const task = this.queue[0].task;
        task.progress = { 
          progress: 0, 
          status: 'error',
          message: error.message 
        };
        task.error = error.message;
        this.queue[0].reject(error);
        this.queue.shift();
      });

      this.workers.push(worker);
    }
  }

  private processNextTask() {
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.queue[0].task;
      const worker = this.workers[this.activeWorkers];
      
      this.activeWorkers++;
      task.progress = { progress: 0, status: 'processing' };
      worker.postMessage({
        fileInfo: task.fileInfo,
        options: task.options
      });
    }
  }

  async compress(fileInfo: FileInfo, options: CompressionOptions = {}): Promise<CompressionResult> {
    const taskId = uuidv4();
    const task: CompressionTask = {
      id: taskId,
      fileInfo,
      options,
      progress: { progress: 0, status: 'pending' }
    };

    this.tasks.set(taskId, task);

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNextTask();
    });
  }

  getTaskStatus(taskId: string): CompressionTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): CompressionTask[] {
    return Array.from(this.tasks.values());
  }
} 