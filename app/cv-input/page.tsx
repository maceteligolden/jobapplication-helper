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
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/src/shared/constants';
// File parsing is now done via API route
import type { CVData, QuestionType } from '@/src/shared/types';
import { cvStorage } from '@/src/shared/utils/storage';
import type { AnalyzeResponse } from '@/app/api/cv/analyze/route';
import type { ApiResponse } from '@/src/shared/types';

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

      // Analyze CV match with job description
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

  /**
   * Handle proceed after analysis
   * Routes to chat if score < 80%, otherwise to generation
   */
  const handleProceedAfterAnalysis = async () => {
    if (!analysisResult || !jobDescription) return;

    const matchScore = analysisResult.cvMatch.matchScore;

    if (matchScore < 80) {
      // Score too low - route to Q&A to fill gaps
      // Get CV content from Redux state (already available at component level)
      const cvContent = cvData?.rawContent || '';
      
      // Generate questions based on analysis
      const questionsResponse = await fetch('/api/qa/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobAnalysis: analysisResult.jobAnalysis,
          cvMatch: analysisResult.cvMatch,
          cvContent: cvContent, // Pass full CV content for extraction
        }),
      });

      if (questionsResponse.ok) {
        const questionsResult: ApiResponse<{ questions: Array<{ type: string; question: string }> }> =
          await questionsResponse.json();

        if (questionsResult.success && questionsResult.data) {
          // Initialize Q&A session with generated questions
          dispatch(
            initializeSession({
              jobDescriptionId: jobDescription.id,
              pendingQuestions: questionsResult.data.questions.map(
                (q) => q.type as QuestionType
              ),
            })
          );

          // Store questions in session or state for Q&A page
          router.push('/qa');
          return;
        }
      }

      // Fallback: use default questions
      dispatch(
        initializeSession({
          jobDescriptionId: jobDescription.id,
          pendingQuestions: [
            'personal_info',
            'experience',
            'education',
            'skills',
            'summary',
          ],
        })
      );
      router.push('/qa');
    } else {
      // Score is good - proceed to generation
      router.push('/generate');
    }
  };

  /**
   * Start Q&A session directly
   */
  const handleStartQA = async () => {
    if (!jobDescription) return;

    // Analyze job description first to generate better questions
    try {
      const analyzeResponse = await fetch('/api/cv/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.content,
          cvContent: '', // No CV content for Q&A flow
        }),
      });

      if (analyzeResponse.ok) {
        const analyzeResult: ApiResponse<AnalyzeResponse> = await analyzeResponse.json();
        
        if (analyzeResult.success && analyzeResult.data) {
          // Generate questions from job analysis
          const questionsResponse = await fetch('/api/qa/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobAnalysis: analyzeResult.data.jobAnalysis,
            }),
          });

          if (questionsResponse.ok) {
            const questionsResult: ApiResponse<{ questions: Array<{ type: string }> }> =
              await questionsResponse.json();

            if (questionsResult.success && questionsResult.data) {
              dispatch(
                initializeSession({
                  jobDescriptionId: jobDescription.id,
                  pendingQuestions: questionsResult.data.questions.map(
                    (q) => q.type as any
                  ),
                })
              );
              router.push('/qa');
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error setting up Q&A:', error);
    }

    // Fallback: use default questions
    const defaultQuestions: QuestionType[] = [
      'personal_info',
      'experience',
      'education',
      'skills',
      'certifications',
      'languages',
      'summary',
    ];

    dispatch(
      initializeSession({
        jobDescriptionId: jobDescription.id,
        pendingQuestions: defaultQuestions,
      })
    );

    router.push('/qa');
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

                {analysisResult.cvMatch.matchScore < 80 && (
                  <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                    <p className="text-yellow-300 mb-2">
                      ⚠️ Your CV match score is below 80%. I recommend going through a quick Q&A
                      session to fill in the gaps and boost your match score to at least 95%!
                    </p>
                    <ul className="text-sm text-yellow-200 list-disc list-inside space-y-1">
                      {analysisResult.cvMatch.missingSkills.slice(0, 3).map((skill, idx) => (
                        <li key={idx}>Missing: {skill}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.cvMatch.matchScore >= 80 && (
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
                    className="flex-1 bg-[#B91C1C] hover:bg-[#991B1B]"
                  >
                    {analysisResult.cvMatch.matchScore < 80
                      ? 'Fill Gaps via Q&A 💬'
                      : 'Generate CV & Cover Letter 🚀'}
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
                {analysisResult.cvMatch.matchScore < 80 && (
                  <Button
                    onClick={() => router.push('/generate')}
                    variant="outline"
                    className="w-full border-[#1E40AF] text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white"
                  >
                    Generate CV & Cover Letter Anyway 🚀
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
                    className="w-full mt-4 bg-[#1E40AF] hover:bg-[#1E3A8A]"
                  >
                    Start Chatting! 🚀
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
