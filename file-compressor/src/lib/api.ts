import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
});

export interface UploadResponse {
  message: string;
  originalFilename: string;
  compressedFilename: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  taskId: string;
  outputPath: string;
}

export interface CompressionTask {
  id: string;
  fileInfo: {
    path: string;
    size: number;
    mimeType: string;
    filename: string;
  };
  options: {
    quality?: number;
    format?: 'webp' | 'webm';
  };
  progress: {
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'error';
    message?: string;
  };
  result?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    outputPath: string;
    format: string;
    taskId: string;
  };
  error?: string;
}

export const getFileUrl = (path: string) => {
  if (!path) return '';
  // If the path is already a full URL, return it as is
  if (path.startsWith('http')) return path;
  // Otherwise, prepend the API URL
  return `${API_URL}${path}`;
};

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getTaskStatus = async (taskId: string): Promise<CompressionTask> => {
  const response = await api.get<CompressionTask>(`/tasks/${taskId}`);
  return response.data;
};

export const getAllTasks = async (): Promise<CompressionTask[]> => {
  const response = await api.get<CompressionTask[]>('/tasks');
  return response.data;
};

export const cleanupFiles = async (): Promise<void> => {
  await api.post('/cleanup');
}; 