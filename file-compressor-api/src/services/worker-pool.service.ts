import { Worker } from 'worker_threads';
import path from 'path';
import { FileInfo, CompressionOptions, CompressionResult, CompressionTask, CompressionProgress } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WorkerPoolService {
  private workers: Array<{ worker: Worker; busy: boolean }> = [];
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
        const currentTask = this.queue[0];
        if (!currentTask) {
          console.error('No task found in queue when processing worker message');
          return;
        }

        const task = currentTask.task;
        if (result.success) {
          task.progress = { progress: 100, status: 'completed' };
          const resultWithTaskId = { ...result.result, taskId: task.id };
          task.result = resultWithTaskId;
          currentTask.resolve(resultWithTaskId);
        } else {
          task.progress = { 
            progress: 0, 
            status: 'error',
            message: result.error 
          };
          task.error = result.error;
          currentTask.reject(new Error(result.error));
        }

        this.queue.shift();
        this.activeWorkers--;
        
        // Mark the worker as available
        const workerIndex = this.workers.findIndex(w => w.worker === worker);
        if (workerIndex !== -1) {
          this.workers[workerIndex].busy = false;
        }

        this.processNextTask();
      });

      worker.on('error', (error) => {
        const currentTask = this.queue[0];
        if (!currentTask) {
          console.error('No task found in queue when processing worker error');
          return;
        }

        const task = currentTask.task;
        task.progress = { 
          progress: 0, 
          status: 'error',
          message: error.message 
        };
        task.error = error.message;
        currentTask.reject(error);
        this.queue.shift();
        this.activeWorkers--;

        // Mark the worker as available
        const workerIndex = this.workers.findIndex(w => w.worker === worker);
        if (workerIndex !== -1) {
          this.workers[workerIndex].busy = false;
        }

        this.processNextTask();
      });

      this.workers.push({ worker, busy: false });
    }
  }

  private getAvailableWorker(): { worker: Worker; busy: boolean } | undefined {
    return this.workers.find(w => !w.busy);
  }

  private processNextTask() {
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const currentTask = this.queue[0];
      if (!currentTask) {
        console.error('No task found in queue when processing next task');
        return;
      }

      const task = currentTask.task;
      const availableWorker = this.getAvailableWorker();
      
      if (!availableWorker) {
        console.error('No available workers found');
        return;
      }

      this.activeWorkers++;
      availableWorker.busy = true;
      task.progress = { progress: 0, status: 'processing' };
      availableWorker.worker.postMessage({
        fileInfo: task.fileInfo,
        options: task.options,
        taskId: task.id
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