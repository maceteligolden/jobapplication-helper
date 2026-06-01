'use client';

/**
 * CV Input Page
 * Allows users to either upload a CV or start a Q&A session
 * Includes CV analysis and automatic routing to chat if match score < 80%
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { setCVData, setRawCVContent } from '@/src/domain/slices/cvDataSlice';
import { initializeSession } from '@/src/domain/slices/qaSessionSlice';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import { MAX_FILE_SIZE } from '@/src/shared/constants';
// File parsing is now done via API route
import type { CVData } from '@/src/shared/types';
import { cvStorage } from '@/src/shared/utils/storage';
import type { AnalyzeResponse } from '@/app/api/cv/analyze/route';
import type { ApiResponse } from '@/src/shared/types';
import {
  ensureServerSession,
  prepareInterviewSession,
  runSessionAnalyze,
  shouldRouteToInterview,
} from '@/src/shared/utils/sessionClient';
import { MATCH_THRESHOLDS } from '@/src/shared/constants';

export default function CVInputPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const cvData = useAppSelector((state) => state.cvData.cvData);
  const [selectedOption, setSelectedOption] = useState<'upload' | 'qa' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isNavigatingToInterview, setIsNavigatingToInterview] = useState(false);

  // Redirect if no job description
  useEffect(() => {
    if (!jobDescription) {
      router.push('/');
    }
  }, [jobDescription, router]);

  /**
   * Handle file selection
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadError(null);
    setAnalysisResult(null);
    setShowAnalysis(false);

    // Validate file type (now includes PDF and DOCX)
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];

    const isValidType = validTypes.includes(selectedFile.type);
    const isValidExtension = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !isValidExtension) {
      setUploadError(
        `Sorry, but I can only read PDF, Word docs (.docx), or text files. Got ${selectedFile.name} instead. 🤷`
      );
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setUploadError(
        `Whoa there! That file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB. 
        I can only handle files up to 5MB. Try a smaller one? 📦`
      );
      return;
    }

    setFile(selectedFile);
  };

  /**
   * Handle file upload and analysis
   */
  const handleFileUpload = async () => {
    if (!file || !jobDescription) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Parse file content via API route
      const formData = new FormData();
      formData.append('file', file);

      const parseResponse = await fetch('/api/cv/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Failed to parse file');
      }

      const parseResult: ApiResponse<string> = await parseResponse.json();
      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || 'File parsing failed');
      }

      const text = parseResult.data;

      // Create CV data structure
      const cvData: CVData = {
        id: `cv-${Date.now()}`,
        personalInfo: {
          fullName: '',
          email: '',
        },
        experience: [],
        education: [],
        skills: [],
        rawContent: text,
        createdAt: new Date().toISOString(),
      };

      // Save to Redux and local storage
      dispatch(setCVData(cvData));
      dispatch(setRawCVContent(text));
      cvStorage.set(cvData);

      setIsUploading(false);
      setIsAnalyzing(true);

      const sessionId = await ensureServerSession(jobDescription.content);

      try {
        const workflowState = await runSessionAnalyze(sessionId, text, jobDescription.content);
        if (workflowState?.matchReport && workflowState?.roleProfile) {
          const legacyMatch = {
            matchScore: workflowState.matchReport.overallFit,
            matchedSkills: workflowState.matchReport.strengths.map((s: { text: string }) => s.text),
            missingSkills: workflowState.matchReport.gaps.map((g: { requirement: string }) => g.requirement),
            matchedRequirements: [] as string[],
            missingRequirements: workflowState.matchReport.gaps.map((g: { requirement: string }) => g.requirement),
            semanticGaps: workflowState.matchReport.gaps
              .filter((g: { severity: string }) => g.severity === 'critical')
              .map((g: { requirement: string }) => g.requirement),
            recommendations: workflowState.matchReport.improvementActions.map(
              (a: { action: string }) => a.action
            ),
            routingRecommendation: workflowState.matchReport.routingRecommendation,
          };
          setAnalysisResult({
            jobAnalysis: {
              industry: workflowState.roleProfile.industry,
              businessType:
                workflowState.jobTypeProfile?.jobType?.replace(/_/g, ' ') ??
                workflowState.roleProfile.industry,
              idealCandidate: {
                experienceLevel: workflowState.roleProfile.seniority,
                keySkills: workflowState.roleProfile.keySkills,
                personalityTraits: [],
                education: '',
              },
              keyRequirements: workflowState.roleProfile.hardRequirements,
              cvOptimization: {
                writingStyle: workflowState.roleProfile.writingTone,
                domainStandards: workflowState.roleProfile.archetype,
                focusAreas: workflowState.roleProfile.sectionPriority,
                keywords: workflowState.roleProfile.keywords ?? workflowState.roleProfile.keySkills,
              },
              missingInfo: [],
            },
            cvMatch: legacyMatch,
          });
          setShowAnalysis(true);
          setIsAnalyzing(false);
          return;
        }
      } catch (workflowErr) {
        console.warn('Workflow analyze fallback:', workflowErr);
      }

      // Fallback: legacy analyze endpoint
      const analyzeResponse = await fetch('/api/cv/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.content,
          cvContent: text,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze CV');
      }

      const analyzeResult: ApiResponse<AnalyzeResponse> = await analyzeResponse.json();
      
      if (!analyzeResult.success || !analyzeResult.data) {
        throw new Error(analyzeResult.error || 'Analysis failed');
      }

      setAnalysisResult(analyzeResult.data);
      setShowAnalysis(true);
      setIsAnalyzing(false);
    } catch (err) {
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadError(
        err instanceof Error
          ? err.message
          : "Oops! Couldn't read that file. Mind trying again? 😅"
      );
    }
  };

  const goToInterviewChat = async () => {
    if (!jobDescription) return;
    setIsNavigatingToInterview(true);
    try {
      await prepareInterviewSession(jobDescription.content);
      dispatch(
        initializeSession({
          jobDescriptionId: jobDescription.id,
          pendingQuestions: [],
        })
      );
      router.push('/qa');
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not start interview. Please try again.'
      );
    } finally {
      setIsNavigatingToInterview(false);
    }
  };

  /**
   * Handle proceed after analysis — interview or generate
   */
  const handleProceedAfterAnalysis = async () => {
    if (!analysisResult || !jobDescription) return;

    const matchScore = analysisResult.cvMatch.matchScore;
    const routing = (analysisResult.cvMatch as { routingRecommendation?: string }).routingRecommendation;

    if (shouldRouteToInterview(matchScore, routing)) {
      await goToInterviewChat();
    } else {
      router.push('/generate');
    }
  };

  /** Start AI interview without uploading a CV */
  const handleStartQA = async () => {
    await goToInterviewChat();
  };

  if (!jobDescription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Alright, let's get your CV! 📄
            </h1>
            <p className="text-lg text-gray-400">
              You've got two options. Pick your poison. 😎
            </p>
          </div>

          {/* Analysis Results */}
          {showAnalysis && analysisResult && (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 mb-8 border-2 border-[#B91C1C]">
              <h2 className="text-2xl font-bold mb-4">CV Analysis Results 📊</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Match Score</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all ${
                          analysisResult.cvMatch.matchScore >= 80
                            ? 'bg-green-500'
                            : analysisResult.cvMatch.matchScore >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${analysisResult.cvMatch.matchScore}%` }}
                      />
                    </div>
                    <span className="text-2xl font-bold">
                      {analysisResult.cvMatch.matchScore}%
                    </span>
                  </div>
                </div>

                {shouldRouteToInterview(
                  analysisResult.cvMatch.matchScore,
                  (analysisResult.cvMatch as { routingRecommendation?: string }).routingRecommendation
                ) && (
                  <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                    <p className="text-yellow-300 mb-2">
                      ⚠️ Your CV match score is below {MATCH_THRESHOLDS.GENERATE_DIRECT}%. I recommend going through a quick Q&A
                      session to fill in the gaps and boost your match score to at least 95%!
                    </p>
                    <ul className="text-sm text-yellow-200 list-disc list-inside space-y-1">
                      {analysisResult.cvMatch.missingSkills.slice(0, 3).map((skill, idx) => (
                        <li key={idx}>Missing: {skill}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!shouldRouteToInterview(
                  analysisResult.cvMatch.matchScore,
                  (analysisResult.cvMatch as { routingRecommendation?: string }).routingRecommendation
                ) && (
                  <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
                    <p className="text-green-300">
                      ✅ Great match! Your CV looks good. Ready to generate the optimized version?
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex gap-4">
                  <Button
                    onClick={handleProceedAfterAnalysis}
                    disabled={isNavigatingToInterview}
                    className="flex-1 bg-[#B91C1C] hover:bg-[#991B1B]"
                  >
                    {isNavigatingToInterview ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" className="text-white" />
                        Starting interview...
                      </span>
                    ) : shouldRouteToInterview(
                      analysisResult.cvMatch.matchScore,
                      (analysisResult.cvMatch as { routingRecommendation?: string }).routingRecommendation
                    )
                      ? 'Fill Gaps via Interview 💬'
                      : 'Generate Optimized CV 🚀'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAnalysis(false);
                      setAnalysisResult(null);
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Back
                  </Button>
                </div>
                {shouldRouteToInterview(
                  analysisResult.cvMatch.matchScore,
                  (analysisResult.cvMatch as { routingRecommendation?: string }).routingRecommendation
                ) && (
                  <Button
                    onClick={() => router.push('/generate')}
                    variant="outline"
                    className="w-full border-[#1E40AF] text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white"
                  >
                    Generate Optimized CV Anyway 🚀
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Option cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Upload option */}
            <div
              className={`bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 border-2 cursor-pointer transition-all duration-300 ${
                selectedOption === 'upload'
                  ? 'border-[#B91C1C] shadow-lg shadow-[#B91C1C]/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedOption('upload')}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">📎</div>
                <h2 className="text-2xl font-bold mb-2">Upload Your CV</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Got an existing CV? Drop it here (PDF, DOCX, or TXT) and I'll analyze it.
                </p>
                {selectedOption === 'upload' && (
                  <div className="mt-4 space-y-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload"
                      disabled={isUploading || isAnalyzing}
                    />
                    <label
                      htmlFor="cv-upload"
                      className="block bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-4 py-2 rounded-lg cursor-pointer text-center transition-colors"
                    >
                      {file ? `Selected: ${file.name}` : 'Choose File'}
                    </label>
                    {file && !showAnalysis && (
                      <Button
                        onClick={handleFileUpload}
                        disabled={isUploading || isAnalyzing}
                        className="w-full bg-[#B91C1C] hover:bg-[#991B1B]"
                      >
                        {isUploading || isAnalyzing ? (
                          <LoadingSpinner size="sm" text={isAnalyzing ? 'Analyzing...' : 'Uploading...'} />
                        ) : (
                          'Upload & Analyze 📊'
                        )}
                      </Button>
                    )}
                    {uploadError && (
                      <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Q&A option */}
            <div
              className={`bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 border-2 cursor-pointer transition-all duration-300 ${
                selectedOption === 'qa'
                  ? 'border-[#1E40AF] shadow-lg shadow-[#1E40AF]/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedOption('qa')}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-2xl font-bold mb-2">Chat with Me</h2>
                <p className="text-gray-400 text-sm mb-4">
                  No CV? No problem! I'll ask you 10-15 questions and build it together.
                </p>
                {selectedOption === 'qa' && (
                  <Button
                    onClick={handleStartQA}
                    disabled={isNavigatingToInterview}
                    className="w-full mt-4 bg-[#1E40AF] hover:bg-[#1E3A8A]"
                  >
                    {isNavigatingToInterview ? (
                      <LoadingSpinner size="sm" text="Starting..." />
                    ) : (
                      'Start Chatting! 🚀'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              ← Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
