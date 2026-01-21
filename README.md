# CV Optimizer 🚀

A Next.js application that takes a job description and generates an optimized CV and cover letter using AI. Built with TypeScript, Redux Toolkit, and Hugging Face.

## Features

- 📝 **Job Description Analysis** - Paste any job description and let the AI analyze it
- 📄 **CV Upload** - Upload your existing CV or build one through a Q&A session
- 💬 **Interactive Q&A** - Chat with the AI to build your CV from scratch
- ✨ **AI-Powered Generation** - Uses Hugging Face models to generate optimized CVs and cover letters
- 🎨 **Netflix-Inspired Design** - Beautiful UI with brick red, white, and blue color scheme
- 💾 **Local Storage** - Your data is saved locally for convenience
- 📥 **Download Results** - Download your optimized CV and cover letter

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **UI Components**: Custom components with shadcn/ui
- **AI**: Hugging Face Inference API
- **Styling**: Tailwind CSS

## Architecture

The project follows clean architecture principles with clear separation of concerns:

```
src/
├── domain/          # Business logic and Redux slices
├── application/     # Application services
├── infrastructure/  # External services (Hugging Face)
├── presentation/    # UI components
└── shared/          # Shared types, constants, utilities
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
HUGGINGFACE_API_TOKEN=your_huggingface_token_here
```

**Getting your Hugging Face token:**
1. Go to https://huggingface.co/settings/tokens
2. Create a new token (read access is sufficient)
3. Copy the token to your `.env.local` file

**Note**: If you have a token from the watchnode project, you can use that same token.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Flow

1. **Landing Page** - Enter the job description
2. **CV Input** - Choose to upload a CV or start a Q&A session
3. **Q&A Session** (if chosen) - Answer questions to build your CV
4. **Generation** - Watch as the AI generates your optimized CV and cover letter
5. **Results** - Review and download your documents

## Project Structure

```
app/
├── page.tsx              # Landing page (job description input)
├── cv-input/             # CV upload/Q&A selection page
├── qa/                   # Q&A chat interface
├── generate/             # Generation progress page
├── results/              # Results display page
└── api/
    ├── cv/generate/      # CV generation API
    └── cover-letter/     # Cover letter generation API

src/
├── domain/slices/        # Redux slices
├── infrastructure/       # External service integrations
├── presentation/         # UI components
└── shared/               # Shared utilities and types
```

## Design System

The application uses a Netflix-inspired design with:
- **Primary Color**: Brick Red (#B91C1C)
- **Accent Color**: Blue (#1E40AF)
- **Background**: Dark gradient (gray-900 to black)
- **Typography**: Clean, modern sans-serif fonts

## Key Features Implementation

### State Management
- Redux Toolkit for centralized state
- Separate slices for job description, CV data, Q&A session, and generation status
- Local storage persistence for user data

### Error Handling
- Comprehensive error handling throughout
- User-friendly error messages
- Fallback mechanisms for API failures

### Loading States
- Interactive loading indicators
- Progress tracking during generation
- Clear status messages

## Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## Notes

- The application uses Hugging Face's Meta Llama 3.1 8B Instruct model by default
- PDF and Word document parsing is planned for future updates (currently supports .txt files)
- All user data is stored locally in the browser
- The AI generation process may take 30-60 seconds depending on the model

## License

MIT

---

**Built with ❤️ and a touch of humor** 😎
