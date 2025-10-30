import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  checkCredits,
  deductCredits,
} from '@/lib/server-utils';
import { validatePDFFile, extractTextFromPDF } from '@/lib/pdf-utils';
import { extractResumeData } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has sufficient credits
    const hasCredits = await checkCredits(user.id, 100);

    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate PDF file
    await validatePDFFile(file);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const { text } = await extractTextFromPDF(buffer);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            'No text found in PDF. Image-based PDFs require OCR processing.',
        },
        { status: 400 }
      );
    }

    // Extract structured data using OpenAI
    const resumeData = await extractResumeData(text);

    // Deduct credits after successful extraction
    await deductCredits(user.id, 100);

    // Get updated user credits
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });

    // Save to database
    const upload = await prisma.resumeHistory.create({
      data: {
        userId: user.id,
        fileName: file.name,
        resumeData: JSON.parse(JSON.stringify(resumeData)),
      },
    });

    return NextResponse.json({
      success: true,
      newCredits: updatedUser?.credits || 0,
      upload: {
        id: upload.id,
        fileName: upload.fileName,
        uploadedAt: upload.uploadedAt,
        resumeData,
      },
    });
  } catch (error: unknown) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process PDF',
      },
      { status: 500 }
    );
  }
}
