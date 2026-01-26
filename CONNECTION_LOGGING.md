# Hugging Face Connection Logging & Verification

## Overview

The application now includes comprehensive logging and connection verification for Hugging Face API integration.

## Features Added

### 1. **Enhanced Logging**
- All Hugging Face API calls are now logged with request IDs
- Request/response timing is tracked
- Error details are logged with context
- Connection status is tracked and logged

### 2. **Connection Verification**
- New API endpoint: `GET /api/hf/verify` - Tests the connection
- Verification script: `npm run verify-hf` - Command-line verification
- Connection status tracking in the service

### 3. **Request Logging**
All API requests now include:
- Request ID for tracking
- Request timing (start, API call time, total time)
- Request parameters (model, prompt length, etc.)
- Response details (success/failure, response length)
- Error details with context

## Log Format

All logs are prefixed with `[HF]` for Hugging Face operations and `[API]` for API routes:

```
[HF] 📤 [req-1234567890-abc] Starting text generation
[HF] [req-1234567890-abc] Model: meta-llama/Meta-Llama-3.1-8B-Instruct
[HF] [req-1234567890-abc] Prompt length: 1234 characters
[HF] [req-1234567890-abc] ✅ API call completed in 2345ms
[HF] [req-1234567890-abc] ✅ Successfully generated text
[HF] [req-1234567890-abc] Generated length: 567 characters
[HF] [req-1234567890-abc] Total time: 2456ms
```

## Verification Methods

### Method 1: Command Line Script

```bash
npm run verify-hf
```

This script will:
1. Check for API token in `.env.local`
2. Validate token format
3. Test API connection
4. Display connection status

### Method 2: API Endpoint

```bash
curl http://localhost:3000/api/hf/verify
```

Returns JSON with connection status:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "tokenFound": true,
    "tokenPrefix": "hf_VwFTYfa...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "status": {
      "initialized": true,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Logging Levels

### Info Logs (`[HF] ✅`, `[HF] 📤`)
- Successful operations
- Request start/completion
- Connection status

### Warning Logs (`[HF] ⚠️`)
- Rate limits
- Fallback model usage
- Token format warnings

### Error Logs (`[HF] ❌`, `[API] ❌`)
- Failed API calls
- Authentication errors
- Validation failures
- Network errors

## Connection Status

The service tracks connection status:
- `initialized`: Whether the client has been initialized
- `lastCheck`: Last connection check timestamp
- `tokenFound`: Whether a token was found
- `tokenPrefix`: First 10 characters of token (for verification)

## Troubleshooting

### Token Not Found
```
[HF] ❌ Token not found in environment variables
```
**Solution**: Add `HUGGINGFACE_API_TOKEN` to `.env.local`

### Authentication Failed
```
[HF] ❌ Authentication failed - check token
```
**Solution**: 
1. Verify token at https://hf.co/settings/tokens
2. Ensure token has "Make calls to Inference Providers" permission
3. Regenerate token if needed

### Rate Limit Exceeded
```
[HF] ⚠️ Rate limit exceeded
```
**Solution**: Wait a few moments and try again

### No Inference Provider
```
[HF] ⚠️ No inference provider available
```
**Solution**: 
1. Go to https://hf.co/settings/inference-providers
2. Enable at least one provider (Novita, Together, etc.)

## Best Practices

1. **Check connection before starting**: Run `npm run verify-hf` before starting the dev server
2. **Monitor logs**: Watch console output for `[HF]` and `[API]` prefixes
3. **Verify token permissions**: Ensure token has required permissions
4. **Check response times**: Monitor API call times in logs
5. **Use request IDs**: Use request IDs to track specific operations

## Example Log Output

```
[HF] ✅ Hugging Face client initialized
[HF] Token prefix: hf_VwFTYfa...
[HF] Token length: 37 characters
[HF] Token format valid: true
[HF] 📤 [req-1234567890-abc] Starting text generation
[HF] [req-1234567890-abc] Model: meta-llama/Meta-Llama-3.1-8B-Instruct
[HF] [req-1234567890-abc] Prompt length: 1234 characters
[HF] [req-1234567890-abc] Using conversational API
[HF] [req-1234567890-abc] Calling chatCompletion API...
[HF] [req-1234567890-abc] ✅ API call completed in 2345ms
[HF] [req-1234567890-abc] ✅ Successfully generated text
[HF] [req-1234567890-abc] Generated length: 567 characters
[HF] [req-1234567890-abc] Total time: 2456ms
```

## Next Steps

1. Run `npm run verify-hf` to test your connection
2. If connection fails, check token permissions
3. Monitor logs during development
4. Use `/api/hf/verify` endpoint for runtime verification
