import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Model options - small for demo (fast download), large for full quality
const MODELS = {
    small: {
        id: "gemma-2-2b-it-q4f16_1-MLC",
        name: "Gemma 2 2B",
        displayName: "Fast (Gemma 2 2B)",
        estimatedSizeMB: 1400,
    },
    large: {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
        name: "Phi 3.5 Mini",
        displayName: "Quality (Phi 3.5 Mini)",
        estimatedSizeMB: 2200,
    }
};

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
        this.currentModelSize = null; // 'small' | 'large'
        this.currentModelInfo = null; // { id, name, displayName, estimatedSizeMB }
        this.downloadStartTime = null;
        this.lastProgressBytes = 0;
        this.lastProgressTime = null;
        this.downloadSpeedMBps = null;
    }

    /**
     * Check if WebGPU is available in this browser
     * @returns {{ available: boolean, reason: string|null }}
     */
    static checkWebGPU() {
        if (typeof navigator === 'undefined') {
            return { available: false, reason: "Not running in a browser environment." };
        }
        if (!navigator.gpu) {
            return {
                available: false,
                reason: "Your browser doesn't support WebGPU. Try Chrome 113+ or Edge 113+."
            };
        }
        return { available: true, reason: null };
    }

    /**
     * Get info about available models
     */
    static getAvailableModels() {
        return MODELS;
    }

    /**
     * Get current model info
     * @returns {{ name: string, size: string, status: string, estimatedSizeMB: number, displayName: string }}
     */
    getModelInfo() {
        if (!this.currentModelInfo) {
            return {
                name: 'None',
                size: 'none',
                status: this.status,
                estimatedSizeMB: 0,
                displayName: 'No model loaded',
            };
        }
        return {
            name: this.currentModelInfo.name,
            size: this.currentModelSize,
            status: this.status,
            estimatedSizeMB: this.currentModelInfo.estimatedSizeMB,
            displayName: this.currentModelInfo.displayName,
        };
    }

    /**
     * Initialize the model engine
     * @param {Function} onProgress - Callback for progress updates: (report: { text, progress, fetchedMB, totalMB, speedMBps }) => void
     * @param {string} modelSize - 'small' or 'large' (default: 'small')
     */
    async initialize(onProgress, modelSize = 'small') {
        // If already ready with the SAME model, just return
        if (this.status === 'READY' && this.currentModelSize === modelSize) {
            onProgress({ text: "Model already loaded.", progress: 100 });
            return this.currentModelInfo.name;
        }

        // If switching models, reset first
        if (this.status === 'READY' && this.currentModelSize !== modelSize) {
            await this.reset();
        }

        // If initialization is in progress for the same model, latch onto it
        if (this.initPromise && this.currentModelSize === modelSize) {
            onProgress({ text: "Joining existing download..." });
            return this.initPromise;
        }

        // If in progress for a different model, reset and start fresh
        if (this.initPromise && this.currentModelSize !== modelSize) {
            await this.reset();
        }

        // Check WebGPU before attempting
        const gpuCheck = ModelService.checkWebGPU();
        if (!gpuCheck.available) {
            this.type = 'ERROR';
            this.status = 'ERROR';
            throw new Error(gpuCheck.reason);
        }

        this.status = 'INITIALIZING';
        this.currentModelSize = modelSize;
        this.currentModelInfo = MODELS[modelSize] || MODELS.small;
        this.downloadStartTime = Date.now();
        this.lastProgressTime = Date.now();
        this.lastProgressBytes = 0;
        this.downloadSpeedMBps = null;

        // Wrap the actual work in a promise to store it
        this.initPromise = this._doInitialize(onProgress);
        return this.initPromise;
    }

    /**
     * Reset the engine so a new model can be loaded
     */
    async reset() {
        if (this.engine) {
            try {
                await this.engine.unload();
            } catch (e) {
                console.warn("Engine unload error (non-fatal):", e);
            }
            this.engine = null;
        }
        this.session = null;
        this.type = 'NONE';
        this.status = 'IDLE';
        this.initPromise = null;
        this.currentModelSize = null;
        this.currentModelInfo = null;
        this.downloadStartTime = null;
        this.downloadSpeedMBps = null;
    }

    async _doInitialize(onProgress) {
        const modelConfig = this.currentModelInfo;
        const estimatedMB = modelConfig.estimatedSizeMB;

        const wrapProgress = (text, progress = null, extraFields = {}) => {
            onProgress({
                text,
                progress,
                estimatedMB,
                speedMBps: this.downloadSpeedMBps,
                ...extraFields,
            });
        };

        wrapProgress("Checking local capabilities...");

        // WebLLM initialization
        wrapProgress(`Initializing WebLLM (${modelConfig.name})...`);
        try {
            this.engine = await CreateMLCEngine(
                modelConfig.id,
                {
                    initProgressCallback: (report) => {
                        // Parse progress percentage from report
                        const percentMatch = report.text.match(/(\d+(?:\.\d+)?)\s*%/);
                        let progressNum = null;
                        if (percentMatch) {
                            progressNum = parseFloat(percentMatch[1]);
                        }

                        // Estimate download speed from progress
                        if (progressNum !== null && progressNum > 0) {
                            const now = Date.now();
                            const fetchedMB = (progressNum / 100) * estimatedMB;
                            const elapsed = (now - this.downloadStartTime) / 1000; // seconds
                            if (elapsed > 1) {
                                this.downloadSpeedMBps = fetchedMB / elapsed;
                            }
                        }

                        // Build user-friendly text
                        let friendlyText = report.text;
                        if (progressNum !== null) {
                            const fetchedMB_display = ((progressNum / 100) * estimatedMB).toFixed(0);
                            friendlyText = `Downloading model weights (${fetchedMB_display} MB / ${estimatedMB} MB)`;
                        }

                        wrapProgress(friendlyText, progressNum, {
                            fetchedMB: progressNum !== null ? ((progressNum / 100) * estimatedMB) : null,
                        });
                    }
                }
            );
            this.type = 'WEB_LLM';
            wrapProgress(`Ready (${modelConfig.name})`, 100);
            this.status = 'READY';
            this.initPromise = null; // Clear so future calls can re-init if needed
            return modelConfig.name;
        } catch (err) {
            console.error("Critical: Failed to load local model.", err);
            this.type = 'ERROR';
            this.status = 'ERROR';
            this.initPromise = null;
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
            engine: !!this.engine,
            modelSize: this.currentModelSize,
            modelName: this.currentModelInfo?.name || null,
        };
    }

    /**
     * Stream a chat response
     * @param {Array} history - Array of {role, content} objects
     * @param {Function} onChunk - Callback for streaming text chunks
     */
    async streamChat(history, onChunk, systemInstruction = SYSTEM_INSTRUCTION) {
        if (this.type === 'WINDOW_AI') {
            try {
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
