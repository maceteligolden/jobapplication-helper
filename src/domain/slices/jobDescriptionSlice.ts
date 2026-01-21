/**
 * Redux slice for managing job description state
 * Handles storing and updating the job description input
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { JobDescription } from '@/src/shared/types';

interface JobDescriptionState {
  jobDescription: JobDescription | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: JobDescriptionState = {
  jobDescription: null,
  isLoading: false,
  error: null,
};

const jobDescriptionSlice = createSlice({
  name: 'jobDescription',
  initialState,
  reducers: {
    /**
     * Set the job description
     */
    setJobDescription: (state, action: PayloadAction<JobDescription>) => {
      state.jobDescription = action.payload;
      state.error = null;
    },
    
    /**
     * Update job description content
     */
    updateJobDescription: (state, action: PayloadAction<string>) => {
      if (state.jobDescription) {
        state.jobDescription.content = action.payload;
      } else {
        // Create new job description if none exists
        state.jobDescription = {
          id: `job-${Date.now()}`,
          content: action.payload,
          createdAt: new Date(),
        };
      }
      state.error = null;
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
     * Clear job description
     */
    clearJobDescription: (state) => {
      state.jobDescription = null;
      state.error = null;
      state.isLoading = false;
    },
  },
});

export const {
  setJobDescription,
  updateJobDescription,
  setLoading,
  setError,
  clearJobDescription,
} = jobDescriptionSlice.actions;

export default jobDescriptionSlice.reducer;
