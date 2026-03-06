# MAIT MVP - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Get API Key (2 min)
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 2: Configure Backend (1 min)
```bash
cd backend
echo "GEMINI_API_KEY=paste_your_key_here" > .env
```

### Step 3: Test Integration (1 min)
```bash
# Activate virtual environment
source venv/bin/activate

# Run test
python test_gemini.py
```

Expected output:
```
✅ API Key found: AIzaSyB...xyz
✅ Response received!
✅ All tests passed!
```

### Step 4: Start the App (1 min)
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Try It! 🎓
1. Open http://localhost:5173
2. Ask: "What is the derivative of x²?"
3. Watch the fatigue meter increase with each question
4. Notice responses get shorter when WEARY

---

## 🔥 Key Features to Test

### Fatigue-Aware Responses
- **0-59% (FRESH)**: Long, detailed explanations
- **60-89% (WEARY)**: Concise <50 word responses
- **90%+ (LOCKOUT)**: System blocks interaction

### Socratic Method
- Mate guides, doesn't just give answers
- Uses guiding questions and hints
- Encourages active learning

### LaTeX Math Support
- Equations render properly: $f(x) = x^2$
- Fractions, limits, derivatives all supported

---

## 🐛 Troubleshooting

**Problem**: "Import google-generativeai could not be resolved"
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Problem**: "API key not found" error
```bash
# Check .env exists
ls backend/.env

# Check contents (should show your key)
cat backend/.env
```

**Problem**: "Connection refused" on http://localhost:8000
```bash
# Backend not running - start it:
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

---

## 📝 Example Questions

Try these to see Mate in action:

1. **Basic**: "What is the derivative of x²?"
2. **Conceptual**: "Explain what a limit means"
3. **Applied**: "How do I find the rate of change?"
4. **Complex**: "What's the relationship between velocity and acceleration?"

---

## 🎯 What to Look For

✅ **Response Structure**:
- Core Truth (key concept)
- Explanation (how it applies)
- Hints (guiding questions)

✅ **Fatigue Adaptation**:
- Fresh: ~100-200 words
- Weary: ~30-50 words
- Lockout: "Take a break" message

✅ **Australian Persona**:
- "No wukkas"
- "Mate"
- Professional but friendly

---

## 📚 Full Documentation

- **[SETUP.md](SETUP.md)**: Complete setup guide
- **[GEMINI_INTEGRATION.md](GEMINI_INTEGRATION.md)**: Technical implementation details
- **[CHANGES.txt](CHANGES.txt)**: Summary of what was added/changed

---

## 🚀 Ready to Code?

The integration is complete! You can now:
- Build on the Gemini client for RAG integration
- Add ChromaDB for syllabus document retrieval
- Enhance prompts for better Socratic questioning
- Add persistent storage for student progress

Happy coding! 🎉
