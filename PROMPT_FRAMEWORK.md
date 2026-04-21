# Prompt Framework System

## Overview

A structured prompt framework system designed for performance optimization, token estimation, and recruiter-focused analysis. The framework provides:

- **Token Estimation**: Predict token usage before API calls
- **Structured Templates**: Consistent, optimized prompts for different operations
- **Recruiter Perspective**: 20+ years experience analysis approach
- **Performance Optimization**: Direct understanding focus, reduced unnecessary information

## Framework Structure

### Core Components

1. **PromptFramework** (`promptFramework.ts`)
   - Base framework class for managing prompt templates
   - Token estimation utilities
   - Template registration and building

2. **Job Analysis Framework** (`jobAnalysisFramework.ts`)
   - Recruiter-focused job description analysis
   - Analyzes execution profile, ideal candidate, hiring intent
   - Optimized for structured JSON responses

3. **CV Generation Framework** (`cvGenerationFramework.ts`)
   - Optimized CV generation prompts
   - Focuses on direct understanding
   - Performance-optimized token limits

4. **CV Match Framework** (`cvMatchFramework.ts`)
   - CV-to-job matching analysis
   - Gap analysis from ideal candidate profile
   - Presentation quality assessment

## Key Features

### 1. Token Estimation

```typescript
estimateTokens(text: string): number
// Rough approximation: 1 token ≈ 4 characters

estimatePromptTokens(
  systemMessage: string,
  userMessage: string,
  maxResponseTokens: number
): number
```

### 2. Recruiter-Focused Analysis

The job analysis framework acts as a **senior recruiter with 20+ years experience**, analyzing:

- **Execution Profile**: Speed vs. depth priorities
- **Ideal Candidate**: Profile, skills, traits, work style
- **Hiring Intent**: Urgency, role type, values
- **CV Optimization**: Writing style, domain standards, keywords

### 3. Performance Optimization

- **Direct Understanding**: Removes unnecessary information
- **Token Limits**: Optimized response lengths (1500-3000 tokens)
- **Structured Prompts**: Consistent format for faster processing
- **Fallback Support**: Graceful degradation if framework unavailable

## Usage Examples

### Job Analysis

```typescript
import { promptFramework } from '@/src/infrastructure/frameworks';

const { systemMessage, userMessage, estimatedTokens } = promptFramework.build(
  'job-analysis-recruiter',
  { jobDescription: '...' }
);
```

### CV Generation

```typescript
const { systemMessage, userMessage, estimatedTokens } = promptFramework.build(
  'cv-generation-optimized',
  {
    jobDescription: '...',
    cvData: '...',
    jobAnalysis: { ... }
  }
);
```

### CV Match Analysis

```typescript
const { systemMessage, userMessage, estimatedTokens } = promptFramework.build(
  'cv-match-analysis',
  {
    cvContent: '...',
    jobDescription: '...',
    jobAnalysis: { ... }
  }
);
```

## Framework Templates

### 1. Job Analysis Template

**Name**: `job-analysis-recruiter`

**Focus Areas**:
- Execution profile (speed vs. depth)
- Ideal candidate profile
- Hiring intent and urgency
- CV optimization guidelines

**Response Format**: Structured JSON with execution profile, ideal candidate, hiring intent, and CV optimization data

**Token Limit**: 1500 tokens

### 2. CV Generation Template

**Name**: `cv-generation-optimized`

**Focus Areas**:
- Direct job requirement matching
- Keyword optimization
- ATS compatibility
- Impact and achievement focus

**Response Format**: Professional CV text

**Token Limit**: 3000 tokens

### 3. CV Match Template

**Name**: `cv-match-analysis`

**Focus Areas**:
- Skill matching and gaps
- Requirement alignment
- CV presentation quality
- Distance from ideal profile

**Response Format**: Structured JSON with match score, gaps, and recommendations

**Token Limit**: 1500 tokens

## Benefits

1. **Performance**: Optimized prompts reduce generation time
2. **Consistency**: Structured templates ensure consistent quality
3. **Transparency**: Token estimation helps predict costs and timing
4. **Expertise**: Recruiter perspective provides deeper insights
5. **Maintainability**: Centralized prompt management

## Integration

The framework is automatically integrated into:

- `jobAnalyzer.service.ts` - Job description analysis
- `huggingface.service.ts` - CV generation
- `cvAnalyzer.service.ts` - CV matching analysis

All services include fallback support for backward compatibility.

## Token Estimation Guidelines

- **1 token ≈ 4 characters** (English text)
- **1 token ≈ 0.75 words** (average)
- **System messages**: Typically 50-200 tokens
- **User messages**: Variable based on input length
- **Response tokens**: Limited by `maxResponseTokens` parameter

## Performance Metrics

Expected improvements:

- **Job Analysis**: 20-30% faster (optimized prompts)
- **CV Generation**: 15-25% faster (reduced prompt size)
- **CV Matching**: 25-35% faster (structured analysis)

Token usage is logged for monitoring and optimization.
