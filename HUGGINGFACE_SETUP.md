# Hugging Face API Setup Guide

## Common Issues and Solutions

### Error: "HTTP error occurred when requesting the provider"

This error typically means:
1. **No inference provider configured** - You need to set up inference providers in your Hugging Face account
2. **Model not available** - The model may not be available through your selected provider
3. **Rate limiting** - You may have hit rate limits

### Solution Steps:

1. **Check your Hugging Face Inference Providers:**
   - Go to: https://hf.co/settings/inference-providers
   - Make sure you have at least one provider enabled (e.g., Novita, Together, etc.)
   - Reorder providers if needed (the first available one will be used)

2. **Verify your API token:**
   - Make sure `HUGGINGFACE_API_TOKEN` is set in your `.env.local` file
   - Get your token from: https://hf.co/settings/tokens
   - **CRITICAL**: Token must have **"Make calls to Inference Providers"** permission checked
   - Token should have "Read" role at minimum
   - See `TOKEN_PERMISSIONS.md` for detailed permission requirements

3. **Check model availability:**
   - The models we use:
     - Primary: `meta-llama/Meta-Llama-3.1-8B-Instruct`
     - Fallback: `mistralai/Mistral-7B-Instruct-v0.2`
   - These models require inference providers to be enabled
   - Some providers may not support all models

4. **Alternative: Use a different model**
   - If models are unavailable, you can modify `src/shared/constants/index.ts`
   - Use models that are available through your provider
   - Check provider documentation for supported models

### Environment Variable Setup

Create or update `.env.local` in the project root:

```bash
HUGGINGFACE_API_TOKEN=your_token_here
```

Or use any of these variable names (the app checks all):
- `HUGGINGFACE_API_TOKEN`
- `NEXT_PUBLIC_HUGGINGFACE_API_TOKEN`
- `HF_TOKEN`
- `HF_API_TOKEN`

### Testing Your Setup

1. Check if your token works:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct
   ```

2. Check available providers:
   - Visit https://hf.co/settings/inference-providers
   - Enable at least one provider

3. Check model access:
   - Some models require you to accept their terms of use
   - Visit the model page and accept if prompted

### Troubleshooting

- **All models failing**: Check your inference provider settings
- **Rate limit errors**: Wait a few minutes and try again, or upgrade your plan
- **Authentication errors**: Verify your token is correct and has proper permissions
- **Provider errors**: Try enabling a different provider or check provider status

### Getting Help

- Hugging Face Docs: https://huggingface.co/docs/api-inference
- Community Forum: https://discuss.huggingface.co
- Check provider status pages for outages
