'use client';

/**
 * Results Page
 * Displays generated CV and cover letter with download options
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';

export default function ResultsPage() {
  const router = useRouter();
  const generation = useAppSelector((state) => state.generation);

  // Redirect if no results
  useEffect(() => {
    if (generation.status !== 'completed' || !generation.result) {
      router.push('/');
    }
  }, [generation, router]);

  /**
   * Download CV as text file
   */
  const downloadCV = () => {
    if (!generation.result?.optimizedCV) return;

    const blob = new Blob([generation.result.optimizedCV], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-cv.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Download cover letter as text file
   */
  const downloadCoverLetter = () => {
    if (!generation.result?.coverLetter) return;

    const blob = new Blob([generation.result.coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover-letter.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Ready to impress? I think so! 😎
            </p>
          </div>

          {/* CV Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 mb-8 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Optimized CV</h2>
              <Button
                onClick={downloadCV}
                className="bg-[#B91C1C] hover:bg-[#991B1B]"
              >
                Download CV 📥
              </Button>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                {generation.result.optimizedCV}
              </pre>
            </div>
          </div>

          {/* Cover Letter Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 mb-8 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Cover Letter</h2>
              <Button
                onClick={downloadCoverLetter}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A]"
              >
                Download Cover Letter 📥
              </Button>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                {generation.result.coverLetter}
              </pre>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Start Over 🔄
            </Button>
            <Button
              onClick={() => {
                downloadCV();
                downloadCoverLetter();
              }}
              className="bg-gradient-to-r from-[#B91C1C] to-[#1E40AF] hover:opacity-90"
            >
              Download Both 📦
            </Button>
          </div>

          {/* Fun footer */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm italic">
              Good luck with your application! You've got this! 💪
              <br />
              (And if you get the job, remember who helped you get there 😉)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
