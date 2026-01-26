'use client';

/**
 * Generation Page
 * Handles CV and cover letter generation with progress tracking
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import {
  startGeneration,
  updateStatus,
  updateProgress,
  setGeneratedCV,
  setGeneratedCoverLetter,
  completeGeneration,
  setError,
} from '@/src/domain/slices/generationSlice';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import { API_ROUTES } from '@/src/shared/constants';
import type { ApiResponse } from '@/src/shared/types';
import type { AnalyzeResponse } from '@/app/api/cv/analyze/route';

export default function GeneratePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const cvData = useAppSelector((state) => state.cvData.cvData);
  const generation = useAppSelector((state) => state.generation);
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  // Start generation on mount
  useEffect(() => {
    if (!jobDescription || !cvData) {
      router.push('/cv-input');
      return;
    }

    if (generation.status === 'idle') {
      startGenerationProcess();
    }
  }, []);

  /**
   * Start the generation process
   */
  const startGenerationProcess = async () => {
    if (!jobDescription || !cvData) return;

    dispatch(startGeneration({
      jobDescriptionId: jobDescription.id,
      cvId: cvData.id,
    }));

    try {
      // Step 1: Analyze (10%)
      dispatch(updateStatus('analyzing'));
      dispatch(updateProgress(10));
      setStatusMessage("Analyzing job description and your CV... 🤔");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 2: Generate CV (30-70%)
      dispatch(updateStatus('generating'));
      dispatch(updateProgress(30));
      setStatusMessage("Crafting your optimized CV... ✨");

      // Get job analysis if available (from previous analysis)
      let jobAnalysis = null;
      try {
        const analyzeResponse = await fetch('/api/cv/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription: jobDescription.content,
            cvContent: cvData.rawContent || JSON.stringify(cvData),
          }),
        });
        if (analyzeResponse.ok) {
          const analyzeResult: ApiResponse<AnalyzeResponse> = await analyzeResponse.json();
          if (analyzeResult.success && analyzeResult.data) {
            jobAnalysis = analyzeResult.data.jobAnalysis;
          }
        }
      } catch (err) {
        console.log('Could not get job analysis, proceeding without it');
      }

      const cvResponse = await fetch(API_ROUTES.GENERATE_CV, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.content,
          cvData: cvData.rawContent || JSON.stringify(cvData),
          jobAnalysis: jobAnalysis,
        }),
      });

      if (!cvResponse.ok) {
        const errorData: ApiResponse<unknown> = await cvResponse.json();
        throw new Error(errorData.error || 'Failed to generate CV');
      }

      const cvResult: ApiResponse<string> = await cvResponse.json();
      if (!cvResult.success || !cvResult.data) {
        throw new Error(cvResult.error || 'CV generation failed');
      }

      dispatch(setGeneratedCV(cvResult.data));
      dispatch(updateProgress(70));
      setStatusMessage("CV generated successfully! ✨");

      // Cover letter generation is temporarily disabled
      // Step 3: Generate Cover Letter (COMMENTED OUT)
      /*
      dispatch(updateProgress(70));
      setStatusMessage("CV generated! Now working on your cover letter... 📝");

      const coverLetterResponse = await fetch(API_ROUTES.GENERATE_COVER_LETTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.content,
          cvData: cvData.rawContent || JSON.stringify(cvData),
          personalInfo: cvData.personalInfo,
        }),
      });

      if (!coverLetterResponse.ok) {
        const errorData: ApiResponse<unknown> = await coverLetterResponse.json();
        throw new Error(errorData.error || 'Failed to generate cover letter');
      }

      const coverLetterResult: ApiResponse<string> = await coverLetterResponse.json();
      if (!coverLetterResult.success || !coverLetterResult.data) {
        throw new Error(coverLetterResult.error || 'Cover letter generation failed');
      }

      dispatch(setGeneratedCoverLetter(coverLetterResult.data));
      dispatch(updateProgress(90));
      */

      // Step 4: Complete (100%)
      await new Promise((resolve) => setTimeout(resolve, 500));
      dispatch(updateProgress(100));
      dispatch(completeGeneration());
      setStatusMessage("All done! Your optimized CV is ready! 🎉");

      // Navigate to results page
      setTimeout(() => {
        router.push('/results');
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Something went wrong during generation. But hey, we tried! 😅';
      
      dispatch(setError(errorMessage));
      setStatusMessage(`Oops! ${errorMessage}`);
    }
  };

  if (!jobDescription || !cvData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-12 border border-gray-700">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-[#B91C1C] to-[#1E40AF] h-4 rounded-full transition-all duration-500"
                style={{ width: `${generation.progress}%` }}
              />
            </div>
            <p className="text-2xl font-bold mb-2">{generation.progress}%</p>
          </div>

          {/* Status message */}
          <div className="mb-8">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-xl text-gray-300">{statusMessage}</p>
          </div>

          {/* Error display */}
          {generation.error && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-300">{generation.error}</p>
              <button
                onClick={startGenerationProcess}
                className="mt-4 bg-[#B91C1C] hover:bg-[#991B1B] px-6 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Fun message */}
          <p className="text-sm text-gray-500 italic">
            {generation.status === 'analyzing' && "I'm reading through everything carefully..."}
            {generation.status === 'generating' && "This might take a moment. Grab a coffee? ☕"}
            {generation.status === 'completed' && "You're all set! Time to land that job! 🚀"}
          </p>
        </div>
      </div>
    </div>
  );
}
