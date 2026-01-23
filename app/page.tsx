'use client';

/**
 * Landing Page - Job Description Input
 * Personal and silly copy that breaks the fourth wall
 * Netflix-inspired design with brick red, white, and blue
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/hooks';
import { setJobDescription } from '@/src/domain/slices/jobDescriptionSlice';
import { TextArea } from '@/src/presentation/components/ui/TextArea';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import type { JobDescription } from '@/src/shared/types';

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [jobDescription, setJobDescriptionText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle job description submission
   * Validates input and navigates to next step
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    if (!jobDescription.trim()) {
      setError("Hey, I can't work with empty air! Give me something to work with, please? 🎭");
      return;
    }

    if (jobDescription.trim().length < 50) {
      setError("Come on, that's barely a sentence! Give me at least 50 characters. I'm not asking for much here! 😅");
      return;
    }

    setIsLoading(true);

    try {
      // Create job description object
      // Use ISO string for createdAt to ensure Redux serialization compatibility
      const jobDesc: JobDescription = {
        id: `job-${Date.now()}`,
        content: jobDescription.trim(),
        createdAt: new Date().toISOString(),
      };

      // Save to Redux store
      dispatch(setJobDescription(jobDesc));

      // Small delay for UX (makes it feel more polished)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to CV input page
      router.push('/cv-input');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Oops! Something went wrong. But hey, at least I tried! 🤷'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Breaking the fourth wall header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#B91C1C] via-white to-[#1E40AF] bg-clip-text text-transparent">
              CV Optimizer
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4">
              Look, I know you're here because you want that job.
            </p>
            <p className="text-lg md:text-xl text-gray-400 italic">
              And honestly? I'm here to help you get it. No judgment, no BS. Just results.
            </p>
          </div>

          {/* Main form card */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-gray-700 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal message */}
              <div className="bg-[#B91C1C]/10 border-l-4 border-[#B91C1C] p-4 rounded-lg">
                <p className="text-gray-300 leading-relaxed">
                  <span className="font-semibold text-[#B91C1C]">Hey there!</span> 👋
                  <br />
                  I'm your AI assistant (yes, I'm aware I'm an AI - meta, right?). 
                  Paste that job description below, and I'll help you craft a CV that'll make 
                  recruiters do a double-take. No cap. 🚀
                </p>
              </div>

              {/* Job description input */}
              <TextArea
                label="Job Description"
                placeholder="Paste the entire job description here... Don't worry, I can handle it. I've seen worse. 😎"
                value={jobDescription}
                onChange={(e) => {
                  setJobDescriptionText(e.target.value);
                  setError(null);
                }}
                error={error || undefined}
                helperText="The more details, the better I can tailor your CV. Trust me on this one."
                className="bg-gray-900/50 text-white border-gray-600 focus:border-[#B91C1C]"
                rows={12}
                disabled={isLoading}
              />

              {/* Submit button */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
                <p className="text-sm text-gray-400 italic">
                  *By clicking below, you're trusting me with your career. No pressure. 😅
                </p>
                <Button
                  type="submit"
                  disabled={isLoading || !jobDescription.trim()}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-white px-8 py-6 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[200px]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" className="text-white" />
                      Analyzing...
                    </span>
                  ) : (
                    "Let's Do This! 🎯"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Fun footer note */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              P.S. - I don't judge. Whether you're a CEO or just starting out, 
              I've got your back. That's what I'm here for. 💪
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
