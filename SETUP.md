# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   HUGGINGFACE_API_TOKEN=your_token_here
   ```
   
   You can get your token from:
   - https://huggingface.co/settings/tokens
   - Or use the token from your watchnode project

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `HUGGINGFACE_API_TOKEN` | Your Hugging Face API token | Yes |

## Troubleshooting

### "HUGGINGFACE_API_TOKEN is not set"
- Make sure you've created a `.env.local` file
- Verify the token is correct
- Restart the development server after adding the token

### Generation fails
- Check your Hugging Face token has the correct permissions
- Verify you have API access to the model
- Check the browser console for detailed error messages

### Type errors
- Run `npm install` to ensure all dependencies are installed
- Run `npx tsc --noEmit` to check for TypeScript errors

## Next Steps

1. Test the application with a sample job description
2. Try both CV upload and Q&A flow
3. Review the generated CV and cover letter
4. Customize the prompts in `src/infrastructure/services/huggingface.service.ts` if needed
