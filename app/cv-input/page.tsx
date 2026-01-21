'use client';

/**
 * CV Input Page
 * Allows users to either upload a CV or start a Q&A session
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { setCVData, setRawCVContent } from '@/src/domain/slices/cvDataSlice';
import { initializeSession } from '@/src/domain/slices/qaSessionSlice';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/src/shared/constants';
import type { CVData, QuestionType } from '@/src/shared/types';
import { cvStorage } from '@/src/shared/utils/storage';

export default function CVInputPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const [selectedOption, setSelectedOption] = useState<'upload' | 'qa' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

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

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type as typeof ALLOWED_FILE_TYPES[number])) {
      setUploadError(
        `Sorry, but I can only read PDF, Word docs, or text files. Got a ${selectedFile.type} instead. 🤷`
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
   * Handle file upload and extraction
   */
  const handleFileUpload = async () => {
    if (!file || !jobDescription) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Read file content
      const text = await readFileContent(file);

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
        createdAt: new Date(),
      };

      // Save to Redux and local storage
      dispatch(setCVData(cvData));
      dispatch(setRawCVContent(text));
      cvStorage.set(cvData);

      // Navigate to generation page
      router.push('/generate');
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Oops! Couldn't read that file. Mind trying again? 😅"
      );
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Start Q&A session
   */
  const handleStartQA = () => {
    if (!jobDescription) return;

    // Determine what questions we need to ask
    const pendingQuestions: QuestionType[] = [
      'personal_info',
      'experience',
      'education',
      'skills',
      'summary',
    ];

    // Initialize Q&A session
    dispatch(
      initializeSession({
        jobDescriptionId: jobDescription.id,
        pendingQuestions,
      })
    );

    // Navigate to Q&A page
    router.push('/qa');
  };

  /**
   * Read file content based on type
   */
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Could not read file as text'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      if (file.type === 'text/plain' || file.type.includes('text')) {
        reader.readAsText(file);
      } else {
        // For PDF and Word docs, we'll need a library or API
        // For now, show a message
        reject(
          new Error(
            'PDF and Word document parsing coming soon! For now, try a .txt file or use the Q&A option. 🚧'
          )
        );
      }
    });
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
                  Got an existing CV? Drop it here and I'll work my magic.
                </p>
                {selectedOption === 'upload' && (
                  <div className="mt-4 space-y-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="cv-upload"
                      className="block bg-[#1E40AF] hover:bg-[#1E3A8A] text-white px-4 py-2 rounded-lg cursor-pointer text-center transition-colors"
                    >
                      {file ? `Selected: ${file.name}` : 'Choose File'}
                    </label>
                    {file && (
                      <Button
                        onClick={handleFileUpload}
                        disabled={isUploading}
                        className="w-full bg-[#B91C1C] hover:bg-[#991B1B]"
                      >
                        {isUploading ? (
                          <LoadingSpinner size="sm" text="Reading..." />
                        ) : (
                          'Upload & Continue'
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
                  No CV? No problem! I'll ask you some questions and build it together.
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
