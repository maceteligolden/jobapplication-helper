/**
 * Redux slice for managing CV and cover letter generation state
 * Tracks generation progress and results
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GenerationResult, GenerationStatus } from '@/src/shared/types';

interface GenerationState {
  result: GenerationResult | null;
  status: GenerationStatus;
  progress: number;
  error: string | null;
}

const initialState: GenerationState = {
  result: null,
  status: 'idle',
  progress: 0,
  error: null,
};

const generationSlice = createSlice({
  name: 'generation',
  initialState,
  reducers: {
    /**
     * Start generation process
     */
    startGeneration: (state, action: PayloadAction<{ jobDescriptionId: string; cvId?: string }>) => {
      state.status = 'analyzing';
      state.progress = 0;
      state.error = null;
      state.result = {
        id: `gen-${Date.now()}`,
        jobDescriptionId: action.payload.jobDescriptionId,
        cvId: action.payload.cvId,
        status: 'analyzing',
        createdAt: new Date().toISOString(),
      };
    },
    
    /**
     * Update generation status
     */
    updateStatus: (state, action: PayloadAction<GenerationStatus>) => {
      state.status = action.payload;
      if (state.result) {
        state.result.status = action.payload;
      }
    },
    
    /**
     * Update generation progress (0-100)
     */
    updateProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, action.payload));
      if (state.result) {
        state.result.progress = state.progress;
      }
    },
    
    /**
     * Set generated CV content
     */
    setGeneratedCV: (state, action: PayloadAction<string>) => {
      if (state.result) {
        state.result.optimizedCV = action.payload;
      }
    },
    
    /**
     * Set generated cover letter
     */
    setGeneratedCoverLetter: (state, action: PayloadAction<string>) => {
      if (state.result) {
        state.result.coverLetter = action.payload;
      }
    },
    
    /**
     * Complete generation successfully
     */
    completeGeneration: (state) => {
      state.status = 'completed';
      state.progress = 100;
      if (state.result) {
        state.result.status = 'completed';
        state.result.progress = 100;
        state.result.completedAt = new Date().toISOString();
      }
    },
    
    /**
     * Set error and fail generation
     */
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
      if (state.result) {
        state.result.status = 'error';
        state.result.error = action.payload;
      }
    },
    
    /**
     * Reset generation state
     */
    resetGeneration: (state) => {
      state.result = null;
      state.status = 'idle';
      state.progress = 0;
      state.error = null;
    },
  },
});

export const {
  startGeneration,
  updateStatus,
  updateProgress,
  setGeneratedCV,
  setGeneratedCoverLetter,
  completeGeneration,
  setError,
  resetGeneration,
} = generationSlice.actions;

export default generationSlice.reducer;
