/**
 * Redux slice for managing Q&A session state
 * Handles chat messages and question flow
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, QASession, QuestionType } from '@/src/shared/types';

interface QASessionState {
  session: QASession | null;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
}

const initialState: QASessionState = {
  session: null,
  isLoading: false,
  isTyping: false,
  error: null,
};

const qaSessionSlice = createSlice({
  name: 'qaSession',
  initialState,
  reducers: {
    /**
     * Initialize a new Q&A session
     */
    initializeSession: (state, action: PayloadAction<{ jobDescriptionId: string; pendingQuestions: QuestionType[] }>) => {
      state.session = {
        id: `qa-${Date.now()}`,
        jobDescriptionId: action.payload.jobDescriptionId,
        messages: [],
        pendingQuestions: action.payload.pendingQuestions,
        isComplete: false,
        createdAt: new Date(),
      };
      state.error = null;
    },
    
    /**
     * Add a message to the session
     */
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      if (state.session) {
        state.session.messages.push(action.payload);
      }
    },
    
    /**
     * Add multiple messages at once
     */
    addMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      if (state.session) {
        state.session.messages.push(...action.payload);
      }
    },
    
    /**
     * Mark a question type as answered
     */
    markQuestionAnswered: (state, action: PayloadAction<QuestionType>) => {
      if (state.session) {
        state.session.pendingQuestions = state.session.pendingQuestions.filter(
          (q) => q !== action.payload
        );
      }
    },
    
    /**
     * Complete the Q&A session
     */
    completeSession: (state) => {
      if (state.session) {
        state.session.isComplete = true;
      }
    },
    
    /**
     * Set typing indicator
     */
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    /**
     * Clear Q&A session
     */
    clearSession: (state) => {
      state.session = null;
      state.error = null;
      state.isLoading = false;
      state.isTyping = false;
    },
  },
});

export const {
  initializeSession,
  addMessage,
  addMessages,
  markQuestionAnswered,
  completeSession,
  setTyping,
  setLoading,
  setError,
  clearSession,
} = qaSessionSlice.actions;

export default qaSessionSlice.reducer;
