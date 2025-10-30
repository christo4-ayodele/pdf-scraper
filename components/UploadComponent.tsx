"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { Upload, Loader2 } from "lucide-react"

export default function UploadComponent({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (isUploading) return

    setIsUploading(true)
    const uploadToast = toast.loading("Uploading PDF...")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          throw new Error(data.error || "Insufficient credits. Please upgrade your plan in Settings to continue.")
        }
        throw new Error(data.error || "Upload failed")
      }

      toast.success("PDF uploaded and processed successfully!", { id: uploadToast })
      onUploadComplete()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Failed to upload PDF", { id: uploadToast })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const credits = (session?.user as any)?.credits || 0
  const hasEnoughCredits = credits >= 100

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black">Upload Resume PDF</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Credits:</span>
          <span className={`font-bold ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}>
            {credits}
          </span>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } ${isUploading ? "pointer-events-none opacity-50" : ""} cursor-pointer`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-gray-600">Processing PDF...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-12 h-12 text-gray-400" />
            <p className="text-lg font-medium text-gray-700">
              Drop your PDF here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: 10MB
            </p>
            <p className="text-xs text-gray-500">
              Cost: 100 credits per extraction
            </p>
          </div>
        )}
      </div>

      {!hasEnoughCredits && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ You don't have enough credits (need 100, have {credits}). 
            <a href="/settings" className="ml-1 font-medium text-blue-600 hover:text-blue-700 underline">
              Upgrade your plan
            </a>
            {" "}to continue uploading resumes.
          </p>
        </div>
      )}
    </div>
  )
}

