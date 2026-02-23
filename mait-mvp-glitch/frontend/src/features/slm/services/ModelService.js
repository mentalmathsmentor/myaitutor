import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Fallback model if window.ai is not available
// Using Llama 3.2 3B Instruct (Optimized for WebLLM)
const FALLBACK_MODEL = "Llama-3.2-3B-Instruct-q4f32_1-MLC";

const SYSTEM_INSTRUCTION = `You are "Mate" - a friendly Australian AI tutor for NSW HSC Mathematics.

PERSONALITY:
- Warm, encouraging, approachable. Use Australian expressions: "No worries", "G'day", "Legend!", "Too easy".
- Be patient and supportive, never condescending.

**OUTPUT FORMAT (CRITICAL):**
- Keep each response to **1-2 sentences MAX**
- Use **bold** for key terms and emphasis
- Put ALL formulas on their own line, wrapped in $$ like: $$f(x) = x^2$$
- Separate distinct thoughts with double newlines
- Never output long paragraphs - break everything into bite-sized chunks

CONVERSATION RULES:
1. GREETINGS: Respond naturally and briefly
2. MATH PROBLEMS: Use GUESS FIRST - ask student to try before helping
3. CONCEPTS: Explain in short chunks, one idea at a time

**ANTI-HALLUCINATION:**
- Never confidently state answers unless certain
- Say "double-check that yourself" for calculations
- Guide students to work it out rather than giving answers

**MATH FORMATTING:**
- Use $$ for block formulas (standalone lines)
- ALWAYS use \\frac{a}{b} for fractions, never a/b. This gives the big vinculum.
- Example: First Principles uses: $$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

Use LaTeX: $$block formulas$$ and $inline math$
`;

class ModelService {
    constructor() {
        this.engine = null;
        this.type = 'NONE'; // 'WINDOW_AI' | 'WEB_LLM' | 'NONE' | 'ERROR'
        this.status = 'IDLE'; // 'IDLE' | 'INITIALIZING' | 'READY' | 'ERROR'
        this.session = null; // for window.ai
        this.initPromise = null; // Singleton promise for in-flight init
    }

    async initialize(onProgress) {
        // If already ready, just return
        if (this.status === 'READY') {
            onProgress("Model already loaded.");
            return this.type === 'WINDOW_AI' ? "Gemini Nano" : "Gemma 2 2B";
        }

        // If initialization is in progress, latch onto it
        if (this.initPromise) {
            onProgress("Joining existing download...");
            return this.initPromise;
        }

        this.status = 'INITIALIZING';

        // Wrap the actual work in a promise to store it
        this.initPromise = this._doInitialize(onProgress);
        return this.initPromise;
    }

    async _doInitialize(onProgress) {
        onProgress("Checking local capabilities...");

        // 1. Try window.ai (Gemini Nano)
        // DISABLE FOR NOW to force Phi-3.5 as per user request
        /*
        if (window.ai && window.ai.languageModel) {
            try {
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available !== 'no') {
                    onProgress("Optimizing local chrome model...");
                    this.session = await window.ai.languageModel.create({
                        systemPrompt: SYSTEM_INSTRUCTION
                    });
                    this.type = 'WINDOW_AI';
                    onProgress("Ready (Gemini Nano)");
                    this.status = 'READY';
                    return "Gemini Nano";
                }
            } catch (e) {
                console.warn("window.ai failed to initialize, falling back...", e);
            }
        }
        */

        // 2. Fallback to WebLLM
        onProgress("Initializing WebLLM...");
        try {
            this.engine = await CreateMLCEngine(
                FALLBACK_MODEL,
                {
                    initProgressCallback: (report) => {
                        onProgress(report.text);
                    }
                }
            );
            this.type = 'WEB_LLM';

            // Set system prompt for WebLLM (usually done via first message or config, 
            // but for chat flow we'll prepend it to messages)
            onProgress("Ready (Gemma 2 2B)");
            this.status = 'READY';
            return "Gemma 2 2B";
        } catch (err) {
            console.error("Critical: Failed to load any local model.", err);
            this.type = 'ERROR';
            this.status = 'ERROR';
            throw err;
        }
    }

    /**
     * Get current status of the model service
     */
    getStatus() {
        return {
            type: this.type,
            status: this.status || 'IDLE',
            session: !!this.session,
            engine: !!this.engine
        };
    }

    /**
     * Stream a chat response
     * @param {Array} history - Array of {role, content} objects
     * @param {Function} onChunk - Callback for streaming text chunks
     */
    async streamChat(history, onChunk, systemInstruction = SYSTEM_INSTRUCTION) {
        if (this.type === 'WINDOW_AI') {
            // ... (window.ai logic remains) ...
            try {
                // ...
                const lastMsg = history[history.length - 1];
                if (lastMsg.role !== 'user') return;

                const stream = this.session.promptStreaming(lastMsg.content);
                for await (const chunk of stream) {
                    onChunk(chunk);
                }
            } catch (e) {
                console.error("Window.ai prompt error", e);
                onChunk("\n[System Error: Local driver failed]");
            }

        } else if (this.type === 'WEB_LLM') {
            console.log("StreamChat: Starting WebLLM generation...");
            try {
                // WebLLM follows OpenAI compatibility
                const messages = [
                    { role: "system", content: systemInstruction },
                    ...history
                ];

                console.log("StreamChat: Sending messages", messages);
                const chunks = await this.engine.chat.completions.create({
                    messages,
                    stream: true,
                    temperature: 0.7,
                });

                console.log("StreamChat: Stream started");
                let fullText = "";
                for await (const chunk of chunks) {
                    const delta = chunk.choices[0]?.delta?.content || "";
                    fullText += delta;
                    onChunk(fullText);
                }
                console.log("StreamChat: Stream finished. Length:", fullText.length);
            } catch (e) {
                console.error("StreamChat Loop Error:", e);
                onChunk("Error generating response: " + e.message);
            }
        }
    }
}

export const modelService = new ModelService();
