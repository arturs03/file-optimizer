"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X } from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"

interface FileWithPreview extends File {
  preview?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    ))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    }
  })

  const removeFile = (fileToRemove: FileWithPreview) => {
    setFiles(files.filter(file => file !== fileToRemove))
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
  }

  const handleUpload = async () => {
    setUploading(true)
    // TODO: Implement actual upload logic
    setProgress(0)
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
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
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2">
                <div className="text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>

          {uploading && (
            <Progress value={progress} className="w-full" />
          )}
        </div>
      )}
    </div>
  )
}