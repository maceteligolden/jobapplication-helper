'use client';

/**
 * Q&A Session Page
 * Interactive chat interface for collecting CV information
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
import { updatePersonalInfo, addExperience, addEducation, updateSkills } from '@/src/domain/slices/cvDataSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/src/presentation/components/ui/Input';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import type { ChatMessage, QuestionType } from '@/src/shared/types';
import { QUESTION_TEMPLATES } from '@/src/shared/constants';

export default function QAPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.qaSession.session);
  const isTyping = useAppSelector((state) => state.qaSession.isTyping);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isTyping]);

  // Initialize with first question if session exists
  useEffect(() => {
    if (session && session.messages.length === 0 && session.pendingQuestions.length > 0) {
      const firstQuestion = session.pendingQuestions[0];
      const welcomeMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Hey! 👋 ${QUESTION_TEMPLATES[firstQuestion]}`,
        timestamp: new Date(),
        questionType: firstQuestion,
      };
      dispatch(addMessage(welcomeMessage));
    }
  }, [session, dispatch]);

  /**
   * Handle user message submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !session) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    dispatch(addMessage(userMessage));
    setInputValue('');

    // Process answer and update CV data
    const currentQuestion = session.messages[session.messages.length - 1]?.questionType;
    if (currentQuestion) {
      processAnswer(currentQuestion, inputValue.trim());
    }

    // Show typing indicator
    dispatch(setTyping(true));

    // Simulate AI processing (in real app, this would call an API)
    setTimeout(() => {
      dispatch(setTyping(false));
      askNextQuestion();
    }, 1500);
  };

  /**
   * Process answer and update CV data
   */
  const processAnswer = (questionType: QuestionType, answer: string) => {
    switch (questionType) {
      case 'personal_info':
        // Simple parsing - in production, use NLP
        const nameMatch = answer.match(/(?:my name is|i'm|i am|name:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        const emailMatch = answer.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        dispatch(
          updatePersonalInfo({
            fullName: nameMatch ? nameMatch[1] : answer.split(' ').slice(0, 2).join(' ') || '',
            email: emailMatch ? emailMatch[1] : '',
          })
        );
        break;
      case 'skills':
        const skills = answer.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
        dispatch(updateSkills(skills));
        break;
      // Add more cases as needed
    }

    dispatch(markQuestionAnswered(questionType));
  };

  /**
   * Ask next question or complete session
   */
  const askNextQuestion = () => {
    if (!session) return;

    const remainingQuestions = session.pendingQuestions.filter(
      (q) => !session.messages.some((m) => m.questionType === q)
    );

    if (remainingQuestions.length === 0) {
      // All questions answered
      const completionMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content:
          "Perfect! I've got everything I need. Let's generate your optimized CV! 🚀",
        timestamp: new Date(),
      };
      dispatch(addMessage(completionMessage));
      dispatch(completeSession());

      // Navigate to generation page after a short delay
      setTimeout(() => {
        router.push('/generate');
      }, 2000);
    } else {
      // Ask next question
      const nextQuestion = remainingQuestions[0];
      const nextMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: QUESTION_TEMPLATES[nextQuestion],
        timestamp: new Date(),
        questionType: nextQuestion,
      };
      dispatch(addMessage(nextMessage));
    }
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
          <h1 className="text-2xl font-bold">Let's Build Your CV Together! 💬</h1>
          <Button
            variant="outline"
            onClick={() => router.push('/cv-input')}
            className="border-gray-600 text-gray-300"
          >
            ← Back
          </Button>
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
                  {message.timestamp.toLocaleTimeString()}
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
