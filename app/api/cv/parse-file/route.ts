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
  const requestId = `parse-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error(`[API] [${requestId}] No file provided`);
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
    const fileSize = file.size;
    
    console.log(`[API] [${requestId}] File upload:`, {
      name: file.name,
      type: fileType,
      size: fileSize,
      extension: fileName.substring(fileName.lastIndexOf('.')),
    });
    
    let text = '';

    // Parse based on file type
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log(`[API] [${requestId}] Parsing PDF file...`);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[API] [${requestId}] PDF buffer size: ${buffer.length} bytes`);
        
        text = await parsePDF(buffer);
        console.log(`[API] [${requestId}] ✅ PDF parsed successfully, extracted ${text.length} characters`);
      } catch (pdfError) {
        console.error(`[API] [${requestId}] ❌ PDF parsing error:`, pdfError);
        throw new Error(
          `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}. ` +
          'Please ensure the PDF is not password-protected or corrupted.'
        );
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      console.log(`[API] [${requestId}] Parsing TXT file...`);
      const arrayBuffer = await file.arrayBuffer();
      text = Buffer.from(arrayBuffer).toString('utf-8');
      console.log(`[API] [${requestId}] ✅ TXT parsed successfully, extracted ${text.length} characters`);
    } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Legacy .doc files are not supported. Please convert to .docx or PDF.',
        },
        { status: 400 }
      );
    } else {
      console.error(`[API] [${requestId}] ❌ Unsupported file type: ${fileType} (${fileName})`);
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${fileType}. Please upload a PDF, DOCX, or TXT file.`,
        },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      console.error(`[API] [${requestId}] ❌ File appears to be empty after parsing`);
      return NextResponse.json(
        {
          success: false,
          error: 'File appears to be empty or could not be parsed. Please ensure the file contains text content.',
        },
        { status: 400 }
      );
    }

    console.log(`[API] [${requestId}] ✅ File parsed successfully: ${text.length} characters extracted`);
    return NextResponse.json({
      success: true,
      data: text,
      message: 'File parsed successfully',
    });
  } catch (error) {
    console.error(`[API] [${requestId}] ❌ File parsing error:`, error);
    
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
