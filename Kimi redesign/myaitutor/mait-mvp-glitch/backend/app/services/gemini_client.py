import os
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from app.models import FatigueStatus

if TYPE_CHECKING:
    from google import genai
    from google.genai import types

# Initialize Gemini Client (New SDK) - Lazy Loading
client = None
# Default: Flash-Lite for cost efficiency. Override with gemini-3.1-pro for complex Extension 2 queries.
MODEL_ID = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

def get_client():
    global client
    if client is None:
        from google import genai
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return client 

SYSTEM_PROMPT_BASE = """
You are a RAW DATA PROVIDER for an educational AI system.
You DO NOT speak to the student directly. You DO NOT use a persona.
Your ONLY job is to provide accurate, structured syllabus data, definitions, and formulas that the Local Brain will use to construct a response.

**OUTPUT FORMAT (CRITICAL):**
Return PURE TEXT formatted as structured metadata. Do not use Markdown formatting for the structure itself, just for the content.
Structure your response into these exact sections separated by double newlines:

[CORE_CONCEPT]
A concise definition of the mathematical concept in one sentence.

[SYLLABUS_POINTS]
- Bullet points mapping this to the NSW Mathematics Extension 1 or Advanced syllabus.
- Key learning objectives.

[FORMULAS]
Any relevant mathematical formulas in LaTeX format, wrapped in $$...$$ for block formulas or $...$ for inline.

[KEY_TERMS]
Comma-separated list of important terminology.

[COMMON_PITFALLS]
Brief notes on where students usually make mistakes.

**RULES:**
1. NO GREETINGS: Do not say "Hi", "Hello", or "Here is the data".
2. NO CHATTER: Do not be friendly. Be robotic and factual.
3. ACCURACY: Ensure all formulas are LaTeX compatible.
4. FATIGUE IGNORED: Your output is data, not a chat response, so fatigue levels do not apply to tone, only to complexity (simpler data for weary students).

**FATIGUE CONSTRAINT FOR DATA COMPLEXITY:**
{fatigue_instruction}

**BLOOM'S TAXONOMY PEDAGOGICAL INSTRUCTION:**
{bloom_instruction}

**CONVERSATION HISTORY:**
You have access to the conversation history with this student. Use it to:
- Reference previous questions and answers naturally ("As we discussed earlier...")
- Track multi-step problem solving ("Now for the next step...")
- Avoid repeating explanations already given
- Notice patterns (e.g., student keeps making the same sign error)
Do NOT summarize the entire history in your response. Just use it as context.
"""

FATIGUE_INSTRUCTIONS = {
    FatigueStatus.FRESH: "Provide comprehensive, deep data with advanced extension examples.",
    FatigueStatus.WEARY: "Provide only the most essential formulas and basic definitions. Keep data minimal.",
    FatigueStatus.LOCKOUT: "RETURN_LOCKOUT_SIGNAL"
}


async def get_gemini_response(
    question: str,
    syllabus_context: str = "",
    fatigue_state: FatigueStatus = FatigueStatus.FRESH,
    current_topic: str = "Mathematics Advanced",
    bloom_instruction: str = "",
    conversation_history: Optional[List[dict]] = None
) -> Dict[str, Any]:
    """
    Async client for Gemini 2.0 Flash (Preview) integration.

    Args:
        question: The student's question
        syllabus_context: Relevant NSW syllabus content (from RAG)
        fatigue_state: Current fatigue status (FRESH, WEARY, LOCKOUT)
        current_topic: The current topic being studied
        bloom_instruction: Bloom's Taxonomy teaching strategy instruction

    Returns:
        Dict with keys: core_truth, explanation, hints
    """
    import asyncio

    # Handle LOCKOUT state immediately
    if fatigue_state == FatigueStatus.LOCKOUT:
        return {
            "core_truth": "Rest Required",
            "explanation": "System Lockout Active. I can't help until you rest, mate.",
            "hints": "Take a 15-minute break and come back refreshed!"
        }

    # Build the system prompt with fatigue instruction and bloom instruction
    fatigue_instruction = FATIGUE_INSTRUCTIONS.get(fatigue_state, FATIGUE_INSTRUCTIONS[FatigueStatus.FRESH])

    # Add override for simple greetings
    greeting_override = "However, if the student input is a simple greeting (e.g. 'hi', 'hello'), IGNORE the fatigue constraint and just reply naturally and briefly."

    # Use provided bloom instruction or a sensible default
    effective_bloom = bloom_instruction if bloom_instruction else "No specific Bloom's level instruction. Respond at a general level."

    system_prompt = SYSTEM_PROMPT_BASE.format(
        fatigue_instruction=fatigue_instruction + "\n" + greeting_override,
        bloom_instruction=effective_bloom
    )

    # Build the user prompt with context
    user_prompt = f"""
**Current Topic:** {current_topic}

**NSW Syllabus Context:**
{syllabus_context if syllabus_context else "General Mathematics Advanced content"}

**Student Question:**
{question}

**Instructions:**
Respond naturally as Mate. Structure your response with CLEAR PARAGRAPH BREAKS (double newlines) between distinct thoughts/sections. Do NOT use JSON format. Just write naturally with clear section separation.
"""

    # Build multi-turn contents with conversation history
    from google.genai import types as genai_types
    contents = []
    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(genai_types.Content(
                role=role,
                parts=[genai_types.Part(text=msg["content"])]
            ))
    # Add the current query as the final user message
    contents.append(genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=user_prompt)]
    ))

    # Config for generation
    from google.genai import types
    config = types.GenerateContentConfig(
        temperature=0.7,
        max_output_tokens=500 if fatigue_state == FatigueStatus.WEARY else 1500,
        system_instruction=system_prompt # New SDK supports system_instruction directly
    )

    max_retries = 3
    base_delay = 2

    for attempt in range(max_retries):
        try:
            # Generate response using Gemini Async (New SDK)
            client_instance = get_client()
            response = await asyncio.wait_for(
                client_instance.aio.models.generate_content(
                    model=MODEL_ID,
                    contents=contents,
                    config=config
                ),
                timeout=30.0
            )

            # Get the response text
            response_text = response.text.strip()
            print(f"DEBUG: Gemini Raw Response: {response_text[:200]}...")

            # Split into sections by double newline for chunking
            sections = [s.strip() for s in response_text.split('\n\n') if s.strip()]
            
            return {
                "text": response_text,
                "sections": sections,
                "source": "api"
            }

        except asyncio.TimeoutError:
            print(f"Gemini API Timeout (Attempt {attempt + 1}/{max_retries})")
            if attempt == max_retries - 1:
                return {"text": "Server timeout. Please try again.", "sections": ["Server timeout. Please try again."], "source": "api"}

        except Exception as e:
            print(f"Gemini API Error (Attempt {attempt + 1}): {e}")
            if "429" in str(e) or "ResourceExhausted" in str(e):
                 await asyncio.sleep(base_delay * (2 ** attempt))
            else:
                 if attempt == max_retries - 1:
                     return {"text": f"Error: {str(e)}", "sections": [f"Error: {str(e)}"], "source": "api"}
                 await asyncio.sleep(1)

    return {"text": "Failed to get response.", "sections": ["Failed to get response."], "source": "api"}

def format_response_as_text(gemini_response: Dict[str, Any]) -> str:
    """
    Convert the Gemini response into text format for the chat UI.
    Now handles both old JSON format and new plain text format.
    """
    # New format: just return the text directly
    if "text" in gemini_response:
        return gemini_response["text"]
    
    # Legacy format fallback
    core = gemini_response.get("core_truth", "")
    explanation = gemini_response.get("explanation", "")
    hints = gemini_response.get("hints", "")

    response_parts = []
    if core: response_parts.append(f"**{core}**")
    if explanation: response_parts.append(explanation)
    if hints: response_parts.append(f"\n💡 *{hints}*")

    return "\n\n".join(response_parts)
