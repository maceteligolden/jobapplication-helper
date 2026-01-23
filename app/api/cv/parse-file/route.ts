/**
 * File Parsing API Route
 * Handles PDF, DOCX, and TXT file parsing on the server
 */

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import type { ApiResponse } from '@/src/shared/types';
import { parsePDF } from '@/src/infrastructure/utils/pdfParser';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/cv/parse-file
 * Parse uploaded file and return text content
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<string>>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    let text = '';

    // Parse based on file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await parsePDF(buffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const arrayBuffer = await file.arrayBuffer();
      text = Buffer.from(arrayBuffer).toString('utf-8');
    } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Legacy .doc files are not supported. Please convert to .docx or PDF.',
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${fileType}`,
        },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'File appears to be empty or could not be parsed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: text,
      message: 'File parsed successfully',
    });
  } catch (error) {
    console.error('File parsing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Failed to parse file: ${error.message}`
            : 'Failed to parse file. Please ensure the file is not corrupted.',
      },
      { status: 500 }
    );
  }
}
