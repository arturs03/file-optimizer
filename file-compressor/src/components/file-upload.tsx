"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { uploadFile, getTaskStatus, CompressionTask, getFileUrl } from "@/lib/api"
import { toast } from "sonner"

interface FileWithTask {
  file: File;
  task?: CompressionTask;
}

export function FileUpload() {
  const [files, setFiles] = useState<FileWithTask[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [
      ...prev,
      ...acceptedFiles.map(file => ({ file }))
    ])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov']
    }
  })

  const handleUpload = async () => {
    setIsUploading(true)
    try {
      for (const fileWithTask of files) {
        if (!fileWithTask.task) {
          try {
            const result = await uploadFile(fileWithTask.file)
            const task = await getTaskStatus(result.taskId)
            setFiles(prev => prev.map(f => 
              f.file === fileWithTask.file ? { ...f, task } : f
            ))
            toast.success(`Successfully compressed ${fileWithTask.file.name}`)
          } catch {
            toast.error(`Failed to compress ${fileWithTask.file.name}`)
          }
        }
      }
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove))
  }

  const getProgress = (task?: CompressionTask) => {
    if (!task) return 0
    if (task.progress.status === 'completed') return 100
    if (task.progress.status === 'error') return 0
    return task.progress.progress || 0
  }

  const getStatusColor = (task?: CompressionTask) => {
    if (!task) return 'bg-gray-200'
    switch (task.progress.status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'processing':
        return 'bg-blue-500'
      default:
        return 'bg-gray-200'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag & drop files here, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-4">
          {files.map(({ file, task }) => (
            <div key={file.name} className="flex items-center gap-4 p-4 bg-background rounded-lg shadow">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{file.name}</span>
                  <div className="flex items-center gap-2">
                    {task?.result && (
                      <a
                        href={getFileUrl(task.result.outputPath)}
                        download={`compressed-${file.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          const link = document.createElement('a');
                          link.href = getFileUrl(task.result!.outputPath);
                          link.download = `compressed-${file.name}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-2 hover:bg-accent rounded-full"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => removeFile(file)}
                      className="text-sm text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <Progress value={getProgress(task)} className={getStatusColor(task)} />
                {task?.result && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Compressed from {formatFileSize(task.result.originalSize)} to{' '}
                    {formatFileSize(task.result.compressedSize)} ({(100 - task.result.compressionRatio).toFixed(2)}% reduction)
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.every(f => f.task)}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload and Compress'}
          </Button>
        </div>
      )}
    </div>
  )
}