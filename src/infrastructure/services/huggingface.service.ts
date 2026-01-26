/**
 * Hugging Face Inference Service
 * Uses the official @huggingface/inference library with InferenceClient
 */

import { InferenceClient, InferenceClientProviderApiError } from '@huggingface/inference';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';

/**
 * Provider information
 */
interface ProviderInfo {
  name: string;
  enabled: boolean;
  active: boolean;
  status?: string;
  models?: string[];
}

/**
 * Connection status tracking
 */
let connectionStatus: {
  initialized: boolean;
  lastCheck: Date | null;
  tokenFound: boolean;
  tokenPrefix: string;
  providers?: ProviderInfo[];
} = {
  initialized: false,
  lastCheck: null,
  tokenFound: false,
  tokenPrefix: '',
  providers: undefined,
};

/**
 * Initialize Hugging Face client
 * Reads token from environment variables
 */
function getHfClient(): InferenceClient {
  // Try multiple environment variable names for flexibility
  const token =
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HF_API_TOKEN;

  // Create InferenceClient (newer API)
  const client = new InferenceClient(token);

  
  return client;
}









/**
 * Generate text using Hugging Face model
 * Uses chatCompletion for conversational models, textGeneration for others
 */
export async function generateText(
  prompt: string,
  model: string = HUGGINGFACE_MODELS.CV_GENERATION,
  maxLength: number = 2000
): Promise<string> {
  const client = getHfClient();

  // Determine which API to use based on model type
  // Models that typically use chat completion: Llama, Mistral, GLM, Qwen, etc.
  const requiresConversational = 
    model.includes('mistralai') || 
    model.includes('Mistral') ||
    model.includes('llama') ||
    model.includes('Llama') ||
    model.includes('meta-llama') ||
    model.includes('GLM') ||
    model.includes('glm') ||
    model.includes('Qwen') ||
    model.includes('qwen') ||
    model.includes('chat') ||
    model.includes('instruct') ||
    model.includes('Instruct');

  try {
    if (requiresConversational) {
      // Use chatCompletion for conversational models (like GLM-4.7-Flash)
      // Note: No provider specified - library will automatically select the best available provider
      const completion = await client.chatCompletion({
        model: "zai-org/GLM-4.7-Flash",
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxLength,
        temperature: 0.7,
        top_p: 0.9,
        // No provider specified - InferenceClient will auto-select from enabled providers
      });

      const generatedText = completion.choices[0]?.message?.content;
      if (!generatedText) {
        throw new Error('Model returned empty response');
      }
      
      return generatedText;
    } else {
      // Use textGeneration for other models
      // Note: No provider specified - library will automatically select the best available provider
      const response = await client.textGeneration({
        model: "zai-org/GLM-4.7-Flash",
        inputs: prompt,
        parameters: {
          max_new_tokens: maxLength,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
        },
        // No provider specified - InferenceClient will auto-select from enabled providers
      });

      return response.generated_text || '';
    }
  } catch (error: any) {
    // Enhanced error diagnostics
    console.error('[HF] ❌ Generation error:', {
      model,
      errorType: error?.constructor?.name,
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 500),
    });

    // Check for ProviderApiError specifically (InferenceClientProviderApiError)
    const isProviderError = 
      error instanceof InferenceClientProviderApiError ||
      error?.constructor?.name === 'InferenceClientProviderApiError' ||
      error?.constructor?.name === 'ProviderApiError' ||
      error?.name === 'ProviderApiError' ||
      error?.message?.includes('ProviderApiError') ||
      error?.message?.includes('InferenceClientProviderApiError');
    
    if (isProviderError) {
      console.error('[HF] 🔍 ProviderApiError Diagnostics:');
      console.error('[HF]   - This usually means no inference providers are enabled');
      console.error('[HF]   - Or the model is not available through any provider');
      console.error('[HF]   - Or there was an HTTP error when requesting the provider');
      console.error('[HF]   - Check: https://hf.co/settings/inference-providers');
      
      // Try to extract more details from the error
      // InferenceClientProviderApiError has httpRequest and httpResponse properties
      if (error.httpRequest) {
        console.error('[HF]   HTTP Request Details:', {
          url: error.httpRequest?.url,
          method: error.httpRequest?.method,
          headers: error.httpRequest?.headers ? Object.keys(error.httpRequest.headers) : 'N/A',
        });
      }
      
      if (error.httpResponse) {
        const responseBody = error.httpResponse?.body;
        let parsedBody = responseBody;
        try {
          if (typeof responseBody === 'string') {
            parsedBody = JSON.parse(responseBody);
          }
        } catch {
          // Keep as string if not JSON
        }
        
        console.error('[HF]   HTTP Response Details:', {
          status: error.httpResponse?.status,
          statusText: error.httpResponse?.statusText,
          body: parsedBody,
        });
        
        // Log specific error messages from response
        if (parsedBody && typeof parsedBody === 'object') {
          if (parsedBody.error) {
            console.error('[HF]   Provider Error:', parsedBody.error);
          }
          if (parsedBody.message) {
            console.error('[HF]   Provider Message:', parsedBody.message);
          }
          if (parsedBody.detail) {
            console.error('[HF]   Provider Detail:', parsedBody.detail);
          }
        }
      }
      
      // Log the full error for debugging
      console.error('[HF]   Full Error Object:', {
        name: error.name,
        message: error.message,
        constructor: error.constructor?.name,
      });

      // Try fallback models if primary model fails
      const fallbackModels = [
        HUGGINGFACE_MODELS.GLM_FLASH,
        HUGGINGFACE_MODELS.FALLBACK,
        HUGGINGFACE_MODELS.ALTERNATIVE_FALLBACK,
        HUGGINGFACE_MODELS.LAST_RESORT,
      ];

      if (!fallbackModels.includes(model as any)) {
        console.log(`[HF] 🔄 Primary model (${model}) failed, trying fallback models...`);
        
        for (const fallbackModel of fallbackModels) {
          try {
            console.log(`[HF] 🔄 Trying fallback model: ${fallbackModel}`);
            const fallbackResult = await generateText(prompt, fallbackModel, maxLength);
            console.log(`[HF] ✅ Fallback model ${fallbackModel} succeeded`);
            return fallbackResult;
          } catch (fallbackError) {
            console.error(`[HF] ❌ Fallback model ${fallbackModel} failed:`, fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
            continue;
          }
        }
      }

      // Provide helpful error message
      const diagnosticMessage = `
ProviderApiError: Failed to perform inference

DIAGNOSIS:
1. Check your inference providers: https://hf.co/settings/inference-providers
   - Enable at least ONE provider (Novita, Together, Fireworks, etc.)
   - Make sure the provider shows as "Active" or "Enabled"

2. Verify your API token: https://hf.co/settings/tokens
   - Token must have "Make calls to Inference Providers" permission
   - Token should have "Read" role at minimum

3. Model availability:
   - Model: ${model}
   - This model may not be available through your enabled providers
   - Tried fallback models but all failed

4. Common solutions:
   - Enable Novita or Together provider (most reliable)
   - Check if model requires accepting terms: Visit model page on Hugging Face
   - Restart your dev server after enabling providers

See HUGGINGFACE_SETUP.md for detailed instructions.
      `.trim();

      throw new Error(diagnosticMessage);
    }

    // Re-throw other errors as-is
    throw error;
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
 * COMMENTED OUT - Temporarily disabled
 */
/*
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
*/