import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  checkCredits,
  deductCredits,
} from '@/lib/server-utils';
import { openai } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasCredits = await checkCredits(user.id, 100);
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 },
      );
    }

    const body = await req.json();
    const pages = body?.pages as string[] | undefined;
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'No PDF pages provided' },
        { status: 400 },
      );
    }

    // Limit pages for cost control
    const maxPages = Math.min(pages.length, 10);
    const imageInputs = pages.slice(0, maxPages).map((base64) => ({
      type: 'image_url',
      image_url: { url: base64 },
    }));

    // Create OpenAI completion - image messages
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an OCR and resume parser. Extract all structured data (name, email, phone, location, skills, education, experience, languages, interests) as JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Here are the resume pages:' },
            // Type assertion because OpenAI TypeScript typings may not include image types
            ...(imageInputs as any),
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
    }

    // Deduct credits
    await deductCredits(user.id, 100);
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });

    // Save to database
    const upload = await prisma.resumeHistory.create({
      data: {
        userId: user.id,
        fileName: 'image-based-resume',
        resumeData: JSON.parse(JSON.stringify(result)),
      },
    });

    return NextResponse.json({
      success: true,
      newCredits: updatedUser?.credits || 0,
      upload: {
        id: upload.id,
        fileName: upload.fileName,
        uploadedAt: upload.uploadedAt,
        resumeData: result,
      },
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Extraction failed' },
      { status: 500 },
    );
  }
}
