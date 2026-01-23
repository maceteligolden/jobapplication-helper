# Environment Variable Setup

## Issue: HUGGINGFACE_API_TOKEN not being read

If you're getting the error "HUGGINGFACE_API_TOKEN is not set", follow these steps:

### 1. Create `.env.local` file

In the root directory of the project, create a file named `.env.local`:

```bash
# In the project root
touch .env.local
```

### 2. Add your Hugging Face token

Open `.env.local` and add:

```env
HUGGINGFACE_API_TOKEN=your_actual_token_here
```

**Important Notes:**
- The file must be named `.env.local` (not `.env`)
- No quotes around the token value
- No spaces around the `=` sign
- The file should be in the root directory (same level as `package.json`)

### 3. Get your token

You can get your Hugging Face token from:
- https://huggingface.co/settings/tokens
- Or use the token from your watchnode/bigeye_server project

### 4. Restart the development server

After adding the token, **restart your Next.js server**:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 5. Verify it's working

The token should now be accessible in API routes. The service will try multiple environment variable names:
- `HUGGINGFACE_API_TOKEN` (primary)
- `NEXT_PUBLIC_HUGGINGFACE_API_TOKEN`
- `HF_TOKEN`
- `HF_API_TOKEN`

### Troubleshooting

**Still not working?**

1. Check the file location - it must be in the project root
2. Check the file name - must be exactly `.env.local`
3. Restart the dev server after changes
4. Check for typos in the variable name
5. Make sure there are no extra spaces or quotes

**For production:**
- Set the environment variable in your hosting platform (Vercel, Netlify, etc.)
- Never commit `.env.local` to git (it's already in `.gitignore`)
