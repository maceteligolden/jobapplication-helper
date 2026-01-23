# Hugging Face Token Permissions Guide

## Required Permissions for Inference API

To use the Hugging Face Inference API (which this application requires), your token needs the following permissions:

### ✅ Essential Permissions

1. **Role**: 
   - **"Read"** (minimum) - Allows reading models and making inference calls
   - **"Write"** (optional) - Includes read + ability to push changes (not needed for this app)
   - **"Fine-grained"** (optional) - Custom permissions for specific resources

2. **Inference Permission** (CRITICAL):
   - ✅ **"Make calls to Inference Providers"** - This is REQUIRED
   - Without this, you cannot use the inference API even if providers are enabled
   - This permission allows your token to authenticate and route requests through HF's inference API

3. **Read Access**:
   - Required for accessing models (even public ones)
   - If using private models, token needs explicit read access to those repositories

## How to Create/Update Your Token

### Step 1: Go to Token Settings
Visit: https://hf.co/settings/tokens

### Step 2: Create a New Token
1. Click **"New token"** button
2. Give it a name (e.g., "Job Application Helper")
3. Select **Role**: Choose **"Read"** (sufficient for this app)
4. **IMPORTANT**: Check the box for **"Make calls to Inference Providers"**
5. Click **"Generate token"**

### Step 3: Copy the Token
- Copy the token immediately (you won't see it again!)
- It should start with `hf_` and be about 37+ characters long

### Step 4: Update Your `.env.local`
```bash
HUGGINGFACE_API_TOKEN=your_new_token_here
```

**Important**: 
- Do NOT use `NEXT_PUBLIC_HUGGINGFACE_API_TOKEN` - API tokens should never be exposed to the client
- Use `HUGGINGFACE_API_TOKEN` instead (server-side only)

### Step 5: Restart Your Dev Server
After updating the token, restart your Next.js dev server:
```bash
npm run dev
```

## Verifying Your Token Has Correct Permissions

Run this command to verify:
```bash
node verify-token.js
```

Or test manually:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://huggingface.co/api/whoami
```

If successful, you'll see your user info. If you get 401, the token is invalid.

## Common Issues

### Issue: "Invalid username or password" (401)
**Cause**: Token is invalid, expired, or doesn't exist
**Solution**: Create a new token with the correct permissions

### Issue: "No Inference Provider available"
**Cause**: Token doesn't have "Make calls to Inference Providers" permission
**Solution**: 
1. Go to https://hf.co/settings/tokens
2. Edit your token or create a new one
3. Make sure "Make calls to Inference Providers" is checked

### Issue: "HTTP error occurred when requesting the provider"
**Cause**: 
- Token has correct permissions BUT no providers are enabled
- OR providers are enabled but not active
**Solution**: 
1. Verify token has inference permission (above)
2. Enable providers: https://hf.co/settings/inference-providers
3. Make sure at least one provider is active/enabled

## Token Security Best Practices

1. ✅ **Never commit tokens to git** - `.env.local` is already in `.gitignore`
2. ✅ **Use server-side only** - Don't use `NEXT_PUBLIC_` prefix for API tokens
3. ✅ **Rotate tokens regularly** - Create new tokens periodically
4. ✅ **Use fine-grained tokens** - If you only need specific models, create tokens with limited scope
5. ✅ **Revoke old tokens** - Delete tokens you're no longer using

## Summary Checklist

- [ ] Token created at https://hf.co/settings/tokens
- [ ] Token has "Read" role (or "Write" if needed)
- [ ] ✅ **"Make calls to Inference Providers" permission is checked**
- [ ] Token copied and added to `.env.local` as `HUGGINGFACE_API_TOKEN`
- [ ] Dev server restarted after adding token
- [ ] Token verified with `node verify-token.js`
- [ ] Inference providers enabled at https://hf.co/settings/inference-providers

## Additional Resources

- Token Settings: https://hf.co/settings/tokens
- Inference Providers: https://hf.co/settings/inference-providers
- Token Documentation: https://huggingface.co/docs/hub/security-tokens
- Inference API Docs: https://huggingface.co/docs/api-inference
