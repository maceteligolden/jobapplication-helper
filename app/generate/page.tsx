'use client';

/**
 * Generation Page — OpenAI / LangGraph workflow
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import {
  startGeneration,
  updateStatus,
  updateProgress,
  setGeneratedCV,
  completeGeneration,
  setError,
  resetGeneration,
} from '@/src/domain/slices/generationSlice';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import { API_ROUTES } from '@/src/shared/constants';
import type { ApiResponse } from '@/src/shared/types';
import {
  getStoredSessionId,
  runSessionGenerate,
} from '@/src/shared/utils/sessionClient';

export default function GeneratePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const cvData = useAppSelector((state) => state.cvData.cvData);
  const generation = useAppSelector((state) => state.generation);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const generationStartedRef = useRef(false);

  useEffect(() => {
    if (!jobDescription || !cvData) {
      router.push('/cv-input');
      return;
    }

    if (generationStartedRef.current) return;
    generationStartedRef.current = true;

    if (generation.status === 'completed' && generation.result?.optimizedCV) {
      router.push('/results');
      return;
    }

    dispatch(resetGeneration());
    startGenerationProcess();
  }, []);

  const startGenerationProcess = async () => {
    if (!jobDescription || !cvData) return;

    dispatch(
      startGeneration({
        jobDescriptionId: jobDescription.id,
        cvId: cvData.id,
      })
    );

    try {
      dispatch(updateStatus('analyzing'));
      dispatch(updateProgress(10));
      setStatusMessage('Running AI optimization pipeline...');

      const cvContent = cvData.rawContent || JSON.stringify(cvData);
      const sessionId = getStoredSessionId();

      let optimizedCV: string | undefined;

      if (sessionId) {
        dispatch(updateStatus('generating'));
        dispatch(updateProgress(40));
        setStatusMessage('Generating tailored CV via LangGraph...');

        try {
          const state = await runSessionGenerate(sessionId, cvContent);
          optimizedCV = state?.artifacts?.atsCv ?? state?.artifacts?.humanCv;
        } catch (workflowErr) {
          console.warn('Session generate fallback:', workflowErr);
        }
      }

      if (!optimizedCV) {
        dispatch(updateProgress(30));
        setStatusMessage('Crafting your optimized CV...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const cvResponse = await fetch(API_ROUTES.GENERATE_CV, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription: jobDescription.content,
            cvContent,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!cvResponse.ok) {
          const errorData: ApiResponse<unknown> = await cvResponse.json();
          throw new Error(errorData.error || 'Failed to generate CV');
        }

        const cvResult: ApiResponse<string> = await cvResponse.json();
        if (!cvResult.success || !cvResult.data) {
          throw new Error(cvResult.error || 'CV generation failed');
        }
        optimizedCV = typeof cvResult.data === 'string' ? cvResult.data : (cvResult.data as { optimizedCV?: string }).optimizedCV;
      }

      if (!optimizedCV) {
        throw new Error('No CV content generated');
      }

      dispatch(setGeneratedCV(optimizedCV));
      dispatch(updateProgress(100));
      dispatch(completeGeneration());
      setStatusMessage('Your optimized CV is ready!');
      router.push('/results');
    } catch (err) {
      let errorMessage = 'Something went wrong during generation.';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Generation timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
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
          <div className="mb-8">
            <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-[#B91C1C] to-[#1E40AF] h-4 rounded-full transition-all duration-500"
                style={{ width: `${generation.progress}%` }}
              />
            </div>
            <p className="text-2xl font-bold mb-2">{generation.progress}%</p>
          </div>

          <div className="mb-8">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-xl text-gray-300">{statusMessage}</p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
