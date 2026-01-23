'use client';

/**
 * Results Page
 * Displays generated CV and cover letter with download options (PDF, DOCX, TXT, Copy)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  downloadAsTXT,
  downloadAsPDF,
  downloadAsDOCX,
  copyToClipboard,
} from '@/src/shared/utils/download';

export default function ResultsPage() {
  const router = useRouter();
  const generation = useAppSelector((state) => state.generation);
  const [copyFeedback, setCopyFeedback] = useState<{ cv: boolean; letter: boolean }>({
    cv: false,
    letter: false,
  });

  // Redirect if no results
  useEffect(() => {
    if (generation.status !== 'completed' || !generation.result) {
      router.push('/');
    }
  }, [generation, router]);

  /**
   * Handle CV download in different formats
   */
  const handleCVDownload = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!generation.result?.optimizedCV) return;

    switch (format) {
      case 'txt':
        downloadAsTXT(generation.result.optimizedCV, 'optimized-cv');
        break;
      case 'pdf':
        downloadAsPDF(generation.result.optimizedCV, 'optimized-cv');
        break;
      case 'docx':
        await downloadAsDOCX(generation.result.optimizedCV, 'optimized-cv');
        break;
    }
  };

  /**
   * Handle cover letter download in different formats
   */
  const handleCoverLetterDownload = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!generation.result?.coverLetter) return;

    switch (format) {
      case 'txt':
        downloadAsTXT(generation.result.coverLetter, 'cover-letter');
        break;
      case 'pdf':
        downloadAsPDF(generation.result.coverLetter, 'cover-letter');
        break;
      case 'docx':
        await downloadAsDOCX(generation.result.coverLetter, 'cover-letter');
        break;
    }
  };

  /**
   * Copy CV to clipboard
   */
  const handleCopyCV = async () => {
    if (!generation.result?.optimizedCV) return;
    const success = await copyToClipboard(generation.result.optimizedCV);
    if (success) {
      setCopyFeedback({ ...copyFeedback, cv: true });
      setTimeout(() => setCopyFeedback({ ...copyFeedback, cv: false }), 2000);
    }
  };

  /**
   * Copy cover letter to clipboard
   */
  const handleCopyCoverLetter = async () => {
    if (!generation.result?.coverLetter) return;
    const success = await copyToClipboard(generation.result.coverLetter);
    if (success) {
      setCopyFeedback({ ...copyFeedback, letter: true });
      setTimeout(() => setCopyFeedback({ ...copyFeedback, letter: false }), 2000);
    }
  };

  if (generation.status !== 'completed' || !generation.result) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Ta-da! 🎉 Your Optimized CV & Cover Letter
            </h1>
            <p className="text-lg text-gray-400">
              Ready to impress? I think so! 😎 Download in your preferred format below.
            </p>
          </div>

          {/* CV Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 mb-8 border border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl font-bold">Optimized CV</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleCVDownload('pdf')}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-sm"
                  size="sm"
                >
                  PDF 📄
                </Button>
                <Button
                  onClick={() => handleCVDownload('docx')}
                  className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-sm"
                  size="sm"
                >
                  DOCX 📝
                </Button>
                <Button
                  onClick={() => handleCVDownload('txt')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 text-sm"
                  size="sm"
                >
                  TXT 📄
                </Button>
                <Button
                  onClick={handleCopyCV}
                  variant="outline"
                  className="border-gray-600 text-gray-300 text-sm"
                  size="sm"
                >
                  {copyFeedback.cv ? '✓ Copied!' : 'Copy 📋'}
                </Button>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                {generation.result.optimizedCV}
              </pre>
            </div>
          </div>

          {/* Cover Letter Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 mb-8 border border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl font-bold">Cover Letter</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleCoverLetterDownload('pdf')}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-sm"
                  size="sm"
                >
                  PDF 📄
                </Button>
                <Button
                  onClick={() => handleCoverLetterDownload('docx')}
                  className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-sm"
                  size="sm"
                >
                  DOCX 📝
                </Button>
                <Button
                  onClick={() => handleCoverLetterDownload('txt')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 text-sm"
                  size="sm"
                >
                  TXT 📄
                </Button>
                <Button
                  onClick={handleCopyCoverLetter}
                  variant="outline"
                  className="border-gray-600 text-gray-300 text-sm"
                  size="sm"
                >
                  {copyFeedback.letter ? '✓ Copied!' : 'Copy 📋'}
                </Button>
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                {generation.result.coverLetter}
              </pre>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Start Over 🔄
            </Button>
            <Button
              onClick={async () => {
                await handleCVDownload('pdf');
                await handleCoverLetterDownload('pdf');
              }}
              className="bg-gradient-to-r from-[#B91C1C] to-[#1E40AF] hover:opacity-90"
            >
              Download Both as PDF 📦
            </Button>
          </div>

          {/* Fun footer */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm italic">
              Good luck with your application! You&apos;ve got this! 💪
              <br />
              (And if you get the job, remember who helped you get there 😉)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
