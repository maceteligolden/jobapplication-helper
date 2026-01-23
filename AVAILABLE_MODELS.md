# Available Hugging Face Models

## Currently Configured Models

The application uses these models in order of preference:

### Primary Models
- **CV Generation**: `meta-llama/Meta-Llama-3.1-8B-Instruct`
- **Cover Letter**: `meta-llama/Meta-Llama-3.1-8B-Instruct`

### Fallback Models (if primary fails)
1. `mistralai/Mistral-7B-Instruct-v0.2`
2. `mistralai/Mistral-7B-Instruct-v0.1`
3. `microsoft/Phi-3-mini-4k-instruct`

## Model Requirements

All these models require:
- ✅ Hugging Face API token with read access
- ✅ Inference providers enabled in your HF account
- ✅ Conversational API support (chatCompletion) for Llama/Mistral models

## Alternative Models You Can Use

If the current models don't work, you can modify `src/shared/constants/index.ts` to use these alternatives:

### Models That Work Well for Text Generation

1. **Llama Models** (require conversational API):
   - `meta-llama/Meta-Llama-3.1-8B-Instruct` (current)
   - `meta-llama/Llama-3-8B-Instruct`
   - `meta-llama/Llama-2-7b-chat-hf`

2. **Mistral Models** (require conversational API):
   - `mistralai/Mistral-7B-Instruct-v0.2` (current fallback)
   - `mistralai/Mistral-7B-Instruct-v0.1` (current fallback)
   - `mistralai/Mistral-7B-Instruct-v0.3`

3. **Microsoft Models**:
   - `microsoft/Phi-3-mini-4k-instruct` (current last resort)
   - `microsoft/Phi-3-medium-4k-instruct`
   - `microsoft/DialoGPT-medium`

4. **Google Models** (use text-generation API):
   - `google/flan-t5-large`
   - `google/flan-t5-xl`
   - `google/gemma-2b-it`

5. **Other Options**:
   - `HuggingFaceH4/zephyr-7b-beta`
   - `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`
   - `Qwen/Qwen2-7B-Instruct`

## How to Change Models

Edit `src/shared/constants/index.ts`:

```typescript
export const HUGGINGFACE_MODELS = {
  CV_GENERATION: 'your-model-id-here',
  COVER_LETTER: 'your-model-id-here',
  FALLBACK: 'fallback-model-id',
  ALTERNATIVE_FALLBACK: 'another-fallback',
  LAST_RESORT: 'last-resort-model',
} as const;
```

## Model Compatibility

### Models Using Conversational API (chatCompletion):
- All Llama models
- All Mistral models
- Microsoft Phi-3 models
- Most instruction-tuned models

### Models Using Text Generation API (textGeneration):
- Google Flan models
- Some older models
- Base language models without instruction tuning

## Checking Model Availability

1. Visit the model page on Hugging Face (e.g., https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct)
2. Check if it shows "Uses Inference API" or similar
3. Verify if you need to accept terms of use
4. Check which providers support the model

## Recommended Setup

For best results, use models that:
- ✅ Are actively maintained
- ✅ Have good instruction-following capabilities
- ✅ Are available through multiple providers
- ✅ Support conversational API (better for structured outputs)

Current recommendation: Stick with Llama 3.1 8B or Mistral 7B as they provide the best quality for CV/cover letter generation.
