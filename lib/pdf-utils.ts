import pdfParse from 'pdf-parse';

export interface PDFText {
  text: string;
  hasImages: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_TEXT_LENGTH = 50; // Minimum characters to consider PDF has extractable text

export async function validatePDFFile(file: File): Promise<void> {
  // Check file type
  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF files are supported.');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit. Please use a smaller file.');
  }

  if (file.size < 100) {
    throw new Error('File is too small to be valid');
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFText> {
  try {
    const data = await pdfParse(buffer);
    const extractedText = data.text.trim();

    // If we got sufficient text, return it
    if (extractedText.length >= MIN_TEXT_LENGTH) {
      return {
        text: extractedText,
        hasImages: false,
      };
    }

    // If text extraction yielded little/no text, it's likely an image-based PDF
    // Signal to the client that OCR is needed
    throw new Error(
      'Image-based PDFs require OCR processing. Please use the image extraction flow.'
    );
  } catch (error) {
    console.error('PDF parsing error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse PDF file');
  }
}

// For larger files (>4MB), we'd use this approach with Supabase Storage
export function generateSupabaseUploadUrl(fileName: string): string {
  return `/api/upload/${fileName}`;
}
