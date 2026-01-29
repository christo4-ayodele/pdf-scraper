'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Upload, Loader2 } from 'lucide-react';

export default function UploadComponent({
  onUploadComplete,
}: {
  onUploadComplete: (newCredits: number) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localCredits, setLocalCredits] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  // Use local credits if available, otherwise fall back to session credits
  const displayCredits =
    localCredits !== null ? localCredits : session?.user?.credits || 0;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (isUploading) return;

    setIsUploading(true);
    const uploadToast = toast.loading('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          throw new Error(
            data.error ||
              'Insufficient credits. Please upgrade your plan in Settings to continue.'
          );
        }
        // If server indicates image-based PDF, convert on client and call OCR endpoint
        const errMessage = String(data?.error || '').toLowerCase();
        if (response.status === 400 && errMessage.includes('image-based')) {
          toast.loading('Converting PDF to images for OCR...', {
            id: uploadToast,
          });
          // Dynamically import pdfjs (client-only to avoid SSR issues)
          const pdfjsLib = await import('pdfjs-dist');
          // Use local worker from node_modules
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          const pages = await convertPDFToImages(file, pdfjsLib);

          const extractRes = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pages }),
          });

          if (!extractRes.ok) {
            const err = await extractRes.json();
            throw new Error(err.error || 'OCR extraction failed');
          }

          const extractData = await extractRes.json();
          toast.success('OCR extraction successful!', { id: uploadToast });
          const newCredits = extractData.newCredits || displayCredits - 100;
          setLocalCredits(newCredits);
          onUploadComplete(newCredits);
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return; // Early return after OCR flow
        }

        throw new Error(data.error || 'Upload failed');
      }

      toast.success('PDF uploaded and processed successfully!', {
        id: uploadToast,
      });

      // Update local credits and notify parent
      const newCredits = data.newCredits || displayCredits - 100;
      setLocalCredits(newCredits);
      onUploadComplete(newCredits);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload PDF',
        { id: uploadToast }
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Convert the pages of a PDF to base64 PNG images using pdfjs (client-side)
  async function convertPDFToImages(
    file: File,
    pdfjsLib: typeof import('pdfjs-dist')
  ): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 10);
    const pages: string[] = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page
      // @ts-expect-error - pdfjs types are fine for this call in browser
      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/png');
      pages.push(dataUrl);
    }

    return pages;
  }

  const hasEnoughCredits = displayCredits >= 100;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black">Upload Resume PDF</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Credits:</span>
          <span
            className={`font-bold ${
              hasEnoughCredits ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {displayCredits}
          </span>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${
          isUploading ? 'pointer-events-none opacity-50' : ''
        } cursor-pointer`}
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
            <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            <p className="text-xs text-gray-500">
              Cost: 100 credits per extraction
            </p>
          </div>
        )}
      </div>

      {!hasEnoughCredits && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ You don&apos;t have enough credits (need 100, have{' '}
            {displayCredits}).
            <a
              href="/settings"
              className="ml-1 font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Upgrade your plan
            </a>{' '}
            to continue uploading resumes.
          </p>
        </div>
      )}
    </div>
  );
}
