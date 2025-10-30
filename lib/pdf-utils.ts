import pdfParse from "pdf-parse"

export interface PDFText {
  text: string
  hasImages: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function validatePDFFile(file: File): Promise<void> {
  // Check file type
  if (file.type !== "application/pdf") {
    throw new Error("Invalid file type. Only PDF files are supported.")
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 10MB limit. Please use a smaller file.")
  }

  if (file.size < 100) {
    throw new Error("File is too small to be valid")
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFText> {
  try {
    const data = await pdfParse(buffer)
    
    return {
      text: data.text,
      hasImages: false, // pdf-parse doesn't handle images, we'd need OCR for that
    }
  } catch (error) {
    console.error("PDF parsing error:", error)
    throw new Error("Failed to parse PDF file")
  }
}

// For larger files (>4MB), we'd use this approach with Supabase Storage
export function generateSupabaseUploadUrl(fileName: string): string {
  return `/api/upload/${fileName}`
}

