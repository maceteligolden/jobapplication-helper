'use client';

/**
 * Q&A Session Page
 * Enhanced interactive chat interface with question retry logic and progress tracking
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import {
  addMessage,
  markQuestionAnswered,
  completeSession,
  setTyping,
} from '@/src/domain/slices/qaSessionSlice';
import {
  updatePersonalInfo,
  addExperience,
  addEducation,
  updateSkills,
  setCVData,
} from '@/src/domain/slices/cvDataSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/src/presentation/components/ui/Input';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import type { ChatMessage, QuestionType, CVData } from '@/src/shared/types';
import { QUESTION_TEMPLATES } from '@/src/shared/constants';
import { cvStorage } from '@/src/shared/utils/storage';

interface QuestionState {
  questionId: string;
  type: QuestionType;
  question: string;
  attempts: number;
  maxAttempts: number;
  isAnswered: boolean;
}

export default function QAPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.qaSession.session);
  const isTyping = useAppSelector((state) => state.qaSession.isTyping);
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const cvData = useAppSelector((state) => state.cvData.cvData);
  const [inputValue, setInputValue] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isTyping]);

  // Initialize questions from job description analysis
  useEffect(() => {
    if (session && session.messages.length === 0 && jobDescription) {
      initializeQuestions();
    }
  }, [session, jobDescription]);

  /**
   * Initialize questions from API
   */
  const initializeQuestions = async () => {
    if (!jobDescription) return;

    try {
      // Use CV content if available (from upload)
      const cvContent = cvData?.rawContent || '';

      // First analyze job description
      const analyzeResponse = await fetch('/api/cv/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.content,
          cvContent: cvContent,
        }),
      });

      if (analyzeResponse.ok) {
        const analyzeResult = await analyzeResponse.json();
        
        if (analyzeResult.success) {
          // Generate questions - pass CV content if available
          const questionsResponse = await fetch('/api/qa/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobAnalysis: analyzeResult.data.jobAnalysis,
              cvMatch: analyzeResult.data.cvMatch,
              cvContent: cvContent, // Pass CV content for extraction
            }),
          });

          if (questionsResponse.ok) {
            const questionsResult = await questionsResponse.json();
            
            if (questionsResult.success && questionsResult.data) {
              const generatedQuestions = questionsResult.data.questions.map(
                (q: { id: string; type: string; question: string }, index: number) => ({
                  questionId: q.id,
                  type: q.type as QuestionType,
                  question: q.question,
                  attempts: 0,
                  maxAttempts: 2,
                  isAnswered: false,
                })
              );

              setQuestions(generatedQuestions);
              setTotalQuestions(generatedQuestions.length);
              
              // Start with first question
              if (generatedQuestions.length > 0) {
                askQuestion(generatedQuestions[0]);
              }
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error initializing questions:', error);
    }

    // Fallback: use default questions
    const defaultQuestions: QuestionState[] = [
      {
        questionId: 'q-1',
        type: 'personal_info',
        question: "Let's start with the basics. What's your full name, email, and location?",
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      },
      {
        questionId: 'q-2',
        type: 'experience',
        question: 'Tell me about your most relevant work experience. What was your position and what did you accomplish?',
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      },
      {
        questionId: 'q-3',
        type: 'skills',
        question: 'What are your key skills? Can you give examples?',
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      },
      {
        questionId: 'q-4',
        type: 'education',
        question: "What's your educational background?",
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      },
      {
        questionId: 'q-5',
        type: 'summary',
        question: 'Give me a brief professional summary.',
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      },
    ];

    // Ensure we have at least 10 questions
    while (defaultQuestions.length < 10) {
      defaultQuestions.push({
        questionId: `q-${defaultQuestions.length + 1}`,
        type: 'experience',
        question: `Tell me about another relevant experience or project (Question ${defaultQuestions.length + 1}/10+).`,
        attempts: 0,
        maxAttempts: 2,
        isAnswered: false,
      });
    }

    setQuestions(defaultQuestions);
    setTotalQuestions(defaultQuestions.length);
    askQuestion(defaultQuestions[0]);
  };

  /**
   * Ask a question
   */
  const askQuestion = (question: QuestionState) => {
    setCurrentQuestion(question);
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: question.question,
      timestamp: new Date().toISOString(),
      questionType: question.type,
    };
    
    dispatch(addMessage(message));
  };

  /**
   * Handle user message submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !session || !currentQuestion) return;

    const answer = inputValue.trim();
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: answer,
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(userMessage));
    setInputValue('');

    // Check if answer is clear enough
    const isAnswerClear = validateAnswer(answer, currentQuestion.type);
    
    if (!isAnswerClear && currentQuestion.attempts < currentQuestion.maxAttempts - 1) {
      // Answer not clear, ask for clarification
      currentQuestion.attempts++;
      setCurrentQuestion({ ...currentQuestion });
      
      dispatch(setTyping(true));
      setTimeout(() => {
        dispatch(setTyping(false));
        
        const clarificationMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: getClarificationPrompt(currentQuestion.type, currentQuestion.attempts),
          timestamp: new Date().toISOString(),
          questionType: currentQuestion.type,
        };
        dispatch(addMessage(clarificationMessage));
      }, 1000);
      return;
    }

    // Process answer
    processAnswer(currentQuestion.type, answer);
    currentQuestion.isAnswered = true;
    currentQuestion.attempts++;
    
    // Update questions state
    const updatedQuestions = questions.map((q) =>
      q.questionId === currentQuestion.questionId ? currentQuestion : q
    );
    setQuestions(updatedQuestions);
    setAnsweredCount(answeredCount + 1);
    
    dispatch(markQuestionAnswered(currentQuestion.type));
    dispatch(setTyping(true));

    // Move to next question or complete
    setTimeout(() => {
      dispatch(setTyping(false));
      moveToNextQuestion();
    }, 1500);
  };

  /**
   * Validate if answer is clear enough
   */
  const validateAnswer = (answer: string, type: QuestionType): boolean => {
    const lowerAnswer = answer.toLowerCase();
    
    // Basic validation - check if answer has sufficient content
    if (answer.length < 10) return false;
    
    // Type-specific validation
    switch (type) {
      case 'personal_info':
        return /@/.test(answer) || answer.split(' ').length >= 2;
      case 'experience':
        return answer.length > 30;
      case 'skills':
        return answer.split(/[,\n]/).length >= 2 || answer.length > 20;
      case 'education':
        return answer.length > 15;
      default:
        return answer.length > 15;
    }
  };

  /**
   * Get clarification prompt
   */
  const getClarificationPrompt = (type: QuestionType, attempt: number): string => {
    const prompts: Record<QuestionType, string[]> = {
      personal_info: [
        "I need a bit more detail. Can you provide your full name, email address, and location?",
        "Let me rephrase: Please share your name, email, and where you're based.",
      ],
      experience: [
        "Can you be more specific? What was your job title, company name, and what did you achieve?",
        "I'd love more details. Tell me about your role, the company, and your key accomplishments with numbers if possible.",
      ],
      skills: [
        "Could you list specific skills? For example: 'JavaScript, React, Node.js' or describe your technical abilities.",
        "Let me clarify: What specific technical or professional skills do you have? List them or describe them.",
      ],
      education: [
        "Can you provide more details? What degree did you earn, from which institution, and when?",
        "I need specifics: What's your degree, university name, and graduation year?",
      ],
      certifications: [
        "Can you list your certifications with the issuing organization?",
        "Please provide certification names and who issued them.",
      ],
      languages: [
        "What languages do you speak and at what level (native, fluent, professional, basic)?",
        "List the languages you know and your proficiency level for each.",
      ],
      summary: [
        "Can you provide a more detailed professional summary? What makes you unique?",
        "Tell me more about yourself professionally. What are your key strengths and career highlights?",
      ],
    };

    const typePrompts = prompts[type] || prompts.summary;
    return typePrompts[Math.min(attempt, typePrompts.length - 1)];
  };

  /**
   * Process answer and update CV data
   */
  const processAnswer = (questionType: QuestionType, answer: string) => {
    switch (questionType) {
      case 'personal_info':
        const nameMatch = answer.match(/(?:my name is|i'm|i am|name:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        const emailMatch = answer.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const locationMatch = answer.match(/(?:location|based|live|from)[:\s]+([^,\n]+)/i);
        
        dispatch(
          updatePersonalInfo({
            fullName: nameMatch ? nameMatch[1] : answer.split(' ').slice(0, 2).join(' ') || '',
            email: emailMatch ? emailMatch[1] : '',
            location: locationMatch ? locationMatch[1].trim() : undefined,
          })
        );
        break;
      case 'skills':
        const skills = answer.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
        dispatch(updateSkills(skills));
        break;
      case 'experience':
        // Store experience in a simple format for now
        // In production, use NLP to extract structured data
        break;
      // Add more cases as needed
    }
  };

  /**
   * Move to next question or complete session
   */
  const moveToNextQuestion = () => {
    const nextQuestion = questions.find((q) => !q.isAnswered);
    
    if (!nextQuestion) {
      // All questions answered
      const completionMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Perfect! I've gathered all the information I need (${answeredCount}/${totalQuestions} questions answered). Let's generate your optimized CV! 🚀`,
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(completionMessage));
      dispatch(completeSession());

      // Create CV data from collected information
      const cvData: CVData = {
        id: `cv-${Date.now()}`,
        personalInfo: {
          fullName: '',
          email: '',
        },
        experience: [],
        education: [],
        skills: [],
        createdAt: new Date().toISOString(),
      };
      dispatch(setCVData(cvData));
      cvStorage.set(cvData);

      // Navigate to generation page
      setTimeout(() => {
        router.push('/generate');
      }, 2000);
    } else {
      // Ask next question
      askQuestion(nextQuestion);
    }
  };

  /**
   * Handle generating CV from currently available data
   */
  const handleGenerateFromCurrentData = () => {
    // Check if we have CV data available
    const hasCVData = cvData && (
      cvData.rawContent || 
      cvData.personalInfo?.fullName || 
      cvData.experience.length > 0 || 
      cvData.education.length > 0 || 
      cvData.skills.length > 0
    );

    if (!hasCVData) {
      // Show a message that there's no data yet
      const noDataMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I don't have enough information yet to generate your CV. Please answer a few more questions first, or upload your CV if you have one! 📝",
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(noDataMessage));
      return;
    }

    // Mark session as complete (optional, but good for state management)
    dispatch(completeSession());

    // Navigate to generation page
    router.push('/generate');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Setting up chat..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Let's Build Your CV Together! 💬</h1>
            {totalQuestions > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Question {answeredCount + 1} of {totalQuestions}
                {currentQuestion && !currentQuestion.isAnswered && currentQuestion.attempts > 0 && (
                  <span className="text-yellow-400 ml-2">
                    (Attempt {currentQuestion.attempts + 1}/{currentQuestion.maxAttempts})
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateFromCurrentData}
              disabled={session.isComplete}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
              title="Generate CV from currently available data"
            >
              Generate from Current Data 🚀
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/cv-input')}
              className="border-gray-600 text-gray-300"
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          {session.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-[#B91C1C] text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-4">
                <LoadingSpinner size="sm" text="Thinking..." />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-gray-800/50 border-t border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-1 bg-gray-900/50 text-white border-gray-600"
              disabled={isTyping || session.isComplete}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping || session.isComplete}
              className="bg-[#B91C1C] hover:bg-[#991B1B] px-8"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
