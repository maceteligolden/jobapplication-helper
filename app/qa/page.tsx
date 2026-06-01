'use client';

/**
 * Q&A Session Page — AI interviewer via LangGraph session API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import {
  addMessage,
  addMessages,
  completeSession,
  setTyping,
  initializeSession,
} from '@/src/domain/slices/qaSessionSlice';
import { setCVData } from '@/src/domain/slices/cvDataSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/src/presentation/components/ui/Input';
import { LoadingSpinner } from '@/src/presentation/components/ui/LoadingSpinner';
import type { ChatMessage, CVData } from '@/src/shared/types';
import { cvStorage } from '@/src/shared/utils/storage';
import {
  ensureServerSession,
  sendInterviewMessage,
} from '@/src/shared/utils/sessionClient';

export default function QAPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.qaSession.session);
  const isTyping = useAppSelector((state) => state.qaSession.isTyping);
  const jobDescription = useAppSelector((state) => state.jobDescription.jobDescription);
  const cvData = useAppSelector((state) => state.cvData.cvData);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [probeProgress, setProbeProgress] = useState<string | null>(null);
  const [limitationsSummary, setLimitationsSummary] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const interviewInitRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isTyping]);

  useEffect(() => {
    if (!jobDescription) {
      router.push('/');
      return;
    }

    if (!session) {
      dispatch(
        initializeSession({
          jobDescriptionId: jobDescription.id,
          pendingQuestions: [],
        })
      );
    }
  }, [jobDescription, session, dispatch, router]);

  const initInterview = useCallback(async () => {
    if (interviewInitRef.current) return;
    interviewInitRef.current = true;

    try {
      const sid = await ensureServerSession(jobDescription!.content);
      setSessionId(sid);

      const result = await sendInterviewMessage(sid, '', true);
      const serverMessages = (result.interview?.messages ?? []) as Array<{
        id: string;
        role: string;
        content: string;
        timestamp: string;
      }>;

      if (serverMessages.length > 0) {
        dispatch(
          addMessages(
            serverMessages.map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            }))
          )
        );
      } else if (result.assistantMessage) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: result.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        dispatch(addMessage(assistantMsg));
      }

      if (result.probeProgress) {
        setProbeProgress(result.probeProgress);
      }
      if (result.limitationsSummary) {
        setLimitationsSummary(result.limitationsSummary);
      }

      if (result.isComplete) {
        dispatch(completeSession());
      }
    } catch (e) {
      interviewInitRef.current = false;
      setInitError(e instanceof Error ? e.message : 'Failed to start interview');
    }
  }, [dispatch, jobDescription]);

  useEffect(() => {
    if (session && session.messages.length === 0 && jobDescription) {
      initInterview();
    }
  }, [session, jobDescription, initInterview]);

  useEffect(() => {
    return () => {
      interviewInitRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !session || !sessionId) return;

    const answer = inputValue.trim();
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: answer,
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(userMessage));
    setInputValue('');
    dispatch(setTyping(true));

    try {
      const result = await sendInterviewMessage(sessionId, answer);
      dispatch(setTyping(false));

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}_a`,
        role: 'assistant',
        content: result.assistantMessage,
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(assistantMsg));

      if (result.probeProgress) {
        setProbeProgress(result.probeProgress);
      }
      if (result.limitationsSummary) {
        setLimitationsSummary(result.limitationsSummary);
      }

      if (result.state?.resumeStructured && cvData) {
        const updated: CVData = {
          ...cvData,
          rawContent:
            cvData.rawContent +
            '\n\nInterview facts:\n' +
            result.state.resumeStructured.achievements.map((a: { text: string }) => a.text).join('\n'),
        };
        dispatch(setCVData(updated));
        cvStorage.set(updated);
      }

      if (result.isComplete) {
        dispatch(completeSession());
      }
    } catch (err) {
      dispatch(setTyping(false));
      const errMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage(errMsg));
    }
  };

  const handleGenerateFromCurrentData = () => {
    dispatch(completeSession());
    router.push('/generate');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Setting up interview..." />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{initError}</p>
          <Button onClick={() => router.push('/cv-input')}>← Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col">
      <div className="bg-gray-800/50 border-b border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Interview — Build Your CV 💬</h1>
            <p className="text-sm text-gray-400 mt-1">
              Adaptive recruiter-style questions powered by OpenAI
            </p>
            {probeProgress && (
              <p className="text-xs text-[#93C5FD] mt-2">{probeProgress}</p>
            )}
            {limitationsSummary && (
              <p className="text-xs text-amber-300/90 mt-1">{limitationsSummary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateFromCurrentData}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
            >
              {limitationsSummary ? 'Generate with current info 🚀' : 'Generate CV 🚀'}
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

      <div className="bg-gray-800/50 border-t border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 bg-gray-900/50 text-white border-gray-600"
              disabled={isTyping}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping || !sessionId}
              className="bg-[#B91C1C] hover:bg-[#991B1B] px-8"
            >
              Send
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Can&apos;t answer? Say &quot;skip&quot; or &quot;I don&apos;t know&quot; — we&apos;ll note the impact and continue.
          </p>
        </div>
      </div>
    </div>
  );
}
