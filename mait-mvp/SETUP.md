# MAIT MVP Setup Guide

## Gemini LLM Integration Setup

The MAIT MVP now uses **Google Gemini 2.0 Flash** for real AI-powered tutoring responses!

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. Install dependencies (if not already done):
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### 3. Run the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: `http://localhost:8000`

### 4. Run the Frontend

In a new terminal:

```bash
cd frontend
npm install  # if first time
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## How It Works

### Fatigue-Aware Responses

The system adapts responses based on student fatigue:

- **FRESH** (0-59% fatigue): Full detailed explanations with worked examples
- **WEARY** (60-89% fatigue): Concise responses under 50 words
- **LOCKOUT** (90-100% fatigue): System prevents interaction, forces break

### System Prompt Injection

The Gemini client automatically injects fatigue state into the system prompt:

```python
# When FRESH
"Provide detailed explanations with worked examples. Be thorough and comprehensive."

# When WEARY
"Keep responses under 50 words. Be concise but helpful."
```

### Response Structure

Every Gemini response includes:
- **core_truth**: The key mathematical concept
- **explanation**: How it applies to the question
- **hints**: Guiding questions (never full solutions)

## Testing

Try these test questions:

1. **Basic Derivative**: "What is the derivative of x²?"
2. **Applied Question**: "How do I find the rate of change in a function?"
3. **Conceptual**: "Explain what a limit is in calculus"

Watch the fatigue meter - responses will get shorter as fatigue increases!

## Architecture

```
┌─────────────────┐
│   Frontend      │  React + Vite
│   Chat UI       │  Shows fatigue HUD
└────────┬────────┘
         │ HTTP POST /interact
         ▼
┌─────────────────┐
│   FastAPI       │  Wellness Engine
│   Backend       │  checks fatigue →
└────────┬────────┘
         │ calls
         ▼
┌─────────────────┐
│ Gemini Client   │  Async API call
│ (gemini_client) │  with fatigue-aware
└────────┬────────┘  system prompt
         │
         ▼
┌─────────────────┐
│ Gemini 2.0      │  Returns structured
│ Flash API       │  { core_truth,
└─────────────────┘    explanation, hints }
```

## Troubleshooting

### "Import google-generativeai could not be resolved"
- Make sure you've activated the virtual environment
- Run: `pip install google-generativeai`

### "API Key not found" or authentication errors
- Check your `.env` file exists in the `backend/` directory
- Verify `GEMINI_API_KEY` is set correctly (no quotes needed)
- Restart the backend server after adding the key

### Responses are still mocked
- Verify `.env` is in the correct location (`backend/.env`)
- Check terminal output for any Gemini API errors
- Ensure you have internet connection

### Rate limiting errors
- Gemini has free tier limits
- Wait a few seconds between requests
- Consider upgrading to paid tier for production use

## Next Steps

1. **RAG Integration**: Connect ChromaDB for NSW syllabus document retrieval
2. **Persistent Storage**: Add database for student context
3. **Enhanced Prompts**: Fine-tune prompts for better Socratic questioning
4. **Testing Suite**: Add unit tests for Gemini integration
