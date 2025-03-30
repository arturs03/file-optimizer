import { FileUpload } from "@/components/file-upload"

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">
        File Compressor
      </h1>
      <FileUpload />
    </div>
  )
}