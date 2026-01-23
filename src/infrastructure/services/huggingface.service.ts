/**
 * Hugging Face Inference Service
 * Handles communication with Hugging Face API for text generation
 */

import { HfInference } from '@huggingface/inference';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';

/**
 * Direct API call to Hugging Face Inference API using the new router endpoint
 * This uses the router.huggingface.co endpoint which is the current standard
 */
async function callInferenceAPIDirect(
  model: string,
  prompt: string,
  maxLength: number,
  token: string
): Promise<string> {
  // Use the new router endpoint
  const url = `https://router.huggingface.co/models/${model}`;
  
  console.log(`Attempting direct API call to router endpoint for ${model}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxLength,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Direct API call failed: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage += ` - ${errorJson.error || errorText}`;
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      const result = data[0];
      return result?.generated_text || result?.text || '';
    }
    
    // Handle object response
    if (data.generated_text) {
      return data.generated_text;
    }
    
    if (data.text) {
      return data.text;
    }
    
    // Handle chat completion format
    if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    throw new Error('Unexpected response format from API');
  } catch (error) {
    console.error('Direct API call error:', error);
    throw error;
  }
}

/**
 * Initialize Hugging Face client
 * Reads token from environment variables
 */
function getHfClient(): HfInference {
  // Try multiple environment variable names for flexibility
  const token =
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HF_API_TOKEN;
  
  if (!token || token.trim() === '') {
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('HUGGING') || k.includes('HF')));
    throw new Error(
      'HUGGINGFACE_API_TOKEN is not set. Please configure your environment variables in .env.local file.'
    );
  }

  // Create client with explicit endpoint configuration
  // The HfInference client should handle routing automatically, but we'll ensure it's configured
  const client = new HfInference(token);
  
  // Log token status (first 10 chars only for security)
  console.log('Hugging Face client initialized with token:', token.substring(0, 10) + '...');
  
  return client;
}

/**
 * Generate text using Hugging Face model
 * Handles different model types (text-generation vs conversational)
 */
export async function generateText(
  prompt: string,
  model: string = HUGGINGFACE_MODELS.CV_GENERATION,
  maxLength: number = 2000
): Promise<string> {
  try {
    const hf = getHfClient();

    // Check if model requires conversational API (Mistral, Llama, etc.)
    const requiresConversational = 
      model.includes('mistralai') || 
      model.includes('Mistral') ||
      model.includes('llama') ||
      model.includes('Llama') ||
      model.includes('meta-llama');
    
    console.log(`Attempting to generate text with model: ${model} (conversational: ${requiresConversational})`);
    
    if (requiresConversational) {
      // Use conversational API for models that require it (Llama, Mistral, etc.)
      try {
        const response = await hf.chatCompletion({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxLength,
          temperature: 0.7,
          top_p: 0.9,
        });

        // Extract text from conversational response
        const generatedText = response.choices?.[0]?.message?.content || '';
        if (!generatedText) {
          throw new Error('Model returned empty response');
        }
        console.log(`Successfully generated text with ${model} (length: ${generatedText.length})`);
        return generatedText;
      } catch (chatError) {
        console.error(`chatCompletion failed for ${model}:`, chatError);
        throw chatError;
      }
    } else {
      // Use text generation endpoint for other models
      try {
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

        const generatedText = response.generated_text || '';
        console.log(`Successfully generated text with ${model} (length: ${generatedText.length})`);
        return generatedText;
      } catch (textGenError) {
        console.error(`textGeneration failed for ${model}:`, textGenError);
        throw textGenError;
      }
    }
  } catch (error) {
    console.error('Hugging Face API error:', error);
    
    // Extract more detailed error information
    let errorMessage = 'Failed to generate text. Please try again.';
    let errorDetails = '';
    let shouldTryDirectAPI = false;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Check for specific error types
      if (error.message.includes('HTTP error') || error.message.includes('ProviderApiError')) {
        errorMessage = `Hugging Face API error: The model may be unavailable or rate-limited. ${error.message}`;
        shouldTryDirectAPI = true; // Try direct API if provider fails
        console.error('Provider error details:', {
          model,
          error: error.message,
          stack: errorDetails,
        });
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Hugging Face API authentication failed. Please check your API token in .env.local';
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'Hugging Face API rate limit exceeded. Please try again in a moment.';
      } else if (error.message.includes('No Inference Provider')) {
        errorMessage = `Model ${model} is not available through any inference provider. Trying direct API...`;
        shouldTryDirectAPI = true;
      } else if (error.message.includes('not supported for task')) {
        errorMessage = `Model ${model} does not support the required task. This may be a provider compatibility issue.`;
        shouldTryDirectAPI = true;
      }
    }
    
    console.error('Hugging Face generation error:', {
      model,
      errorMessage,
      errorDetails: errorDetails.substring(0, 500), // Limit log size
    });

    // Try direct API call if provider-based API failed
    if (shouldTryDirectAPI) {
      try {
        const token =
          process.env.HUGGINGFACE_API_TOKEN ||
          process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN ||
          process.env.HF_TOKEN ||
          process.env.HF_API_TOKEN;
        
        if (token) {
          console.log(`Attempting direct API call for ${model}...`);
          return await callInferenceAPIDirect(model, prompt, maxLength, token);
        }
      } catch (directAPIError) {
        console.error('Direct API call also failed:', directAPIError);
        // Continue to fallback models
      }
    }
    
    // Try fallback models if primary fails
    const fallbackModels = [
      HUGGINGFACE_MODELS.FALLBACK,
      HUGGINGFACE_MODELS.ALTERNATIVE_FALLBACK,
      HUGGINGFACE_MODELS.LAST_RESORT,
    ];
    
    if (!fallbackModels.includes(model as any)) {
      console.log(`Primary model (${model}) failed, trying fallback models...`);
      
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          return await generateText(prompt, fallbackModel, maxLength);
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} failed:`, fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
          // Continue to next fallback
          continue;
        }
      }
      
      // If all models failed, provide detailed error message
      console.error('All models (including fallbacks) failed');
      throw new Error(
        `${errorMessage}\n\n` +
        `Troubleshooting steps:\n` +
        `1. Check your Hugging Face inference providers: https://hf.co/settings/inference-providers\n` +
        `2. Enable at least one provider (Novita, Together, etc.)\n` +
        `3. Verify your API token at: https://hf.co/settings/tokens\n` +
        `4. Check if models require accepting terms: Visit model pages and accept if needed\n` +
        `5. See HUGGINGFACE_SETUP.md for detailed instructions`
      );
    }

    throw new Error(errorMessage);
  }
}

/**
 * Generate CV content with job analysis
 */
export async function generateCV(
  jobDescription: string,
  cvData: string,
  jobAnalysis?: {
    businessType: string;
    industry: string;
    candidateProfile: {
      experienceLevel: string;
      keySkills: string[];
    };
    writingStyle: string;
    domainStandards: string;
  }
): Promise<string> {
  const analysisContext = jobAnalysis
    ? `
Business Context:
- Business Type: ${jobAnalysis.businessType}
- Industry: ${jobAnalysis.industry}
- Target Experience Level: ${jobAnalysis.candidateProfile.experienceLevel}
- Key Skills to Highlight: ${jobAnalysis.candidateProfile.keySkills.join(', ')}
- Writing Style: ${jobAnalysis.writingStyle}
- Domain Standards: ${jobAnalysis.domainStandards}
`
    : '';

  const prompt = `You are a professional CV optimizer. Your task is to create an optimized CV that matches the job description.

Job Description:
${jobDescription}
${analysisContext}
Original CV/Information:
${cvData}

Instructions:
1. Analyze the job description to identify key requirements, skills, and qualifications
2. Tailor the CV to highlight relevant experience and skills that match the job
3. Use ${jobAnalysis?.writingStyle || 'professional'} language and formatting
4. Follow ${jobAnalysis?.domainStandards || 'standard professional CV format'} for this domain
5. Ensure all sections are well-structured and easy to read
6. Match keywords from the job description naturally
7. Focus on achievements and impact, especially for ${jobAnalysis?.candidateProfile.experienceLevel || 'professional'} level roles
8. Keep the CV concise but comprehensive
9. Highlight skills: ${jobAnalysis?.candidateProfile.keySkills.join(', ') || 'all relevant skills'}

Generate the optimized CV in a professional format:`;

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
