/**
 * Hugging Face Inference Service
 * Handles communication with Hugging Face API for text generation
 */

import { HfInference } from '@huggingface/inference';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';

/**
 * Initialize Hugging Face client
 */
function getHfClient(): HfInference {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  
  if (!token) {
    throw new Error(
      'HUGGINGFACE_API_TOKEN is not set. Please configure your environment variables.'
    );
  }

  return new HfInference(token);
}

/**
 * Generate text using Hugging Face model
 */
export async function generateText(
  prompt: string,
  model: string = HUGGINGFACE_MODELS.CV_GENERATION,
  maxLength: number = 2000
): Promise<string> {
  try {
    const hf = getHfClient();

    // Use text generation endpoint
    const response = await hf.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_new_tokens: maxLength,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      },
    });

    return response.generated_text || '';
  } catch (error) {
    console.error('Hugging Face API error:', error);
    
    // Try fallback model if primary fails
    if (model !== HUGGINGFACE_MODELS.FALLBACK) {
      console.log('Trying fallback model...');
      return generateText(prompt, HUGGINGFACE_MODELS.FALLBACK, maxLength);
    }

    throw new Error(
      error instanceof Error
        ? `Failed to generate text: ${error.message}`
        : 'Failed to generate text. Please try again.'
    );
  }
}

/**
 * Generate CV content
 */
export async function generateCV(
  jobDescription: string,
  cvData: string
): Promise<string> {
  const prompt = `You are a professional CV optimizer. Your task is to create an optimized CV that matches the job description.

Job Description:
${jobDescription}

Original CV/Information:
${cvData}

Instructions:
1. Analyze the job description to identify key requirements, skills, and qualifications
2. Tailor the CV to highlight relevant experience and skills
3. Use professional language and formatting
4. Ensure all sections are well-structured
5. Match keywords from the job description naturally
6. Keep the CV concise but comprehensive

Generate the optimized CV:`;

  return generateText(prompt, HUGGINGFACE_MODELS.CV_GENERATION, 3000);
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(
  jobDescription: string,
  cvData: string,
  personalInfo: { fullName: string; email: string }
): Promise<string> {
  const prompt = `You are a professional cover letter writer. Create a compelling cover letter for the job application.

Job Description:
${jobDescription}

Applicant Information:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}

CV Summary:
${cvData}

Instructions:
1. Write a professional, engaging cover letter
2. Address how the candidate's experience matches the job requirements
3. Show enthusiasm for the role and company
4. Keep it concise (3-4 paragraphs)
5. Use a professional but personable tone
6. Include a strong opening and closing

Generate the cover letter:`;

  return generateText(prompt, HUGGINGFACE_MODELS.COVER_LETTER, 2000);
}
