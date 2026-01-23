/**
 * Redux slice for managing CV data state
 * Handles storing CV information from upload or Q&A session
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CVData, PersonalInfo, Experience, Education } from '@/src/shared/types';

interface CVDataState {
  cvData: CVData | null;
  isLoading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: CVDataState = {
  cvData: null,
  isLoading: false,
  error: null,
  uploadProgress: 0,
};

const cvDataSlice = createSlice({
  name: 'cvData',
  initialState,
  reducers: {
    /**
     * Set complete CV data
     */
    setCVData: (state, action: PayloadAction<CVData>) => {
      // createdAt is already a string (ISO format) from the component
      // This ensures Redux serialization compatibility
      state.cvData = action.payload;
      state.error = null;
    },
    
    /**
     * Update personal information
     */
    updatePersonalInfo: (state, action: PayloadAction<PersonalInfo>) => {
      if (state.cvData) {
        state.cvData.personalInfo = action.payload;
      } else {
        // Initialize CV data if it doesn't exist
        state.cvData = {
          id: `cv-${Date.now()}`,
          personalInfo: action.payload,
          experience: [],
          education: [],
          skills: [],
          createdAt: new Date().toISOString(),
        };
      }
    },
    
    /**
     * Add or update experience
     */
    addExperience: (state, action: PayloadAction<Experience>) => {
      if (!state.cvData) {
        state.cvData = {
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
      }
      
      const existingIndex = state.cvData.experience.findIndex(
        (exp) => exp.id === action.payload.id
      );
      
      if (existingIndex >= 0) {
        state.cvData.experience[existingIndex] = action.payload;
      } else {
        state.cvData.experience.push(action.payload);
      }
    },
    
    /**
     * Remove experience entry
     */
    removeExperience: (state, action: PayloadAction<string>) => {
      if (state.cvData) {
        state.cvData.experience = state.cvData.experience.filter(
          (exp) => exp.id !== action.payload
        );
      }
    },
    
    /**
     * Add or update education
     */
    addEducation: (state, action: PayloadAction<Education>) => {
      if (!state.cvData) {
        state.cvData = {
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
      }
      
      const existingIndex = state.cvData.education.findIndex(
        (edu) => edu.id === action.payload.id
      );
      
      if (existingIndex >= 0) {
        state.cvData.education[existingIndex] = action.payload;
      } else {
        state.cvData.education.push(action.payload);
      }
    },
    
    /**
     * Update skills
     */
    updateSkills: (state, action: PayloadAction<string[]>) => {
      if (!state.cvData) {
        state.cvData = {
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
      }
      state.cvData.skills = action.payload;
    },
    
    /**
     * Set raw CV content from file upload
     */
    setRawCVContent: (state, action: PayloadAction<string>) => {
      if (!state.cvData) {
        state.cvData = {
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
      }
      state.cvData.rawContent = action.payload;
    },
    
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    /**
     * Set upload progress
     */
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    
    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    /**
     * Clear CV data
     */
    clearCVData: (state) => {
      state.cvData = null;
      state.error = null;
      state.isLoading = false;
      state.uploadProgress = 0;
    },
  },
});

export const {
  setCVData,
  updatePersonalInfo,
  addExperience,
  removeExperience,
  addEducation,
  updateSkills,
  setRawCVContent,
  setLoading,
  setUploadProgress,
  setError,
  clearCVData,
} = cvDataSlice.actions;

export default cvDataSlice.reducer;
