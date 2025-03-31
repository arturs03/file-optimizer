"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, Download } from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { uploadFile, getTaskStatus, CompressionTask } from "@/lib/api"
import { toast } from "sonner"

export function FileUpload() {
  const [files, setFiles] = useState<Array<{
    file: File;
    task?: CompressionTask;
  }>>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [
      ...prev,
      ...acceptedFiles.map(file => ({ file, task: undefined }))
    ])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setUploading(true)
    
    for (let i = 0; i < files.length; i++) {
      try {
        const response = await uploadFile(files[i].file)
        
        // Start polling for task status
        const pollTaskStatus = async () => {
          const task = await getTaskStatus(response.taskId)
          setFiles(prev => prev.map((f, index) => 
            index === i ? { ...f, task } : f
          ))
          
          if (task.progress.status === 'processing') {
            setTimeout(pollTaskStatus, 1000)
          } else if (task.progress.status === 'completed') {
            toast.success(`File ${files[i].file.name} compressed successfully`)
          } else if (task.progress.status === 'error') {
            toast.error(`Failed to compress ${files[i].file.name}: ${task.error}`)
          }
        }
        
        pollTaskStatus()
      } catch {
        toast.error(`Failed to upload ${files[i].file.name}`)
      }
    }
    
    setUploading(false)
  }

  const getProgress = (task?: CompressionTask) => {
    if (!task) return 0
    return task.progress.progress
  }

  const getStatus = (task?: CompressionTask) => {
    if (!task) return 'pending'
    return task.progress.status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'processing':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/10" : "border-border"}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag & drop files here, or click to select files
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2">
                <div className="text-sm">{file.file.name}</div>
                <div className="text-xs text-muted-foreground">
                  ({(file.file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${getStatusColor(getStatus(file.task))}`}>
                  {getStatus(file.task)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            {files.map((file, index) => (
              file.task && (
                <Progress 
                  key={index} 
                  value={getProgress(file.task)} 
                  className="w-full"
                />
              )
            ))}
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>

          {files.map((file, index) => (
            file.task?.progress.status === 'completed' && (
              <Button
                key={index}
                variant="outline"
                className="w-full"
                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/uploads/${file.task?.result?.outputPath.split('/').pop()}`, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Compressed File
              </Button>
            )
          ))}
        </div>
      )}
    </div>
  )
}