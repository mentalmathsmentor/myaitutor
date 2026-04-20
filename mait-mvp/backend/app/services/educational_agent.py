"""
Educational agent with RAG-based context retrieval and Bloom's Taxonomy progression.
"""

import json
import logging
import asyncio
from pydantic import BaseModel, Field
from typing import Optional

from app.models import StudentContext, FatigueStatus, BloomsLevel
from .gemini_client import get_client, MODEL_ID
from .syllabus_service import syllabus_service
from . import storage

logger = logging.getLogger(__name__)

# 1. Define the strict schema the AI must output
class TutorResponse(BaseModel):
    student_message: str = Field(description="The response text to show the student")
    new_fatigue_level: str = Field(description="Assess fatigue: FRESH, ENGAGED, WEARY, or EXHAUSTED")
    new_blooms_level: str = Field(description="Current cognitive level, e.g., REMEMBER, APPLY, EVALUATE")
    trigger_lockout: bool = Field(default=False, description="Only set to True if strictly EXHAUSTED and failing basic prompts")

async def generate_tutor_response(llm_client, user_prompt: str, current_state: dict) -> dict:
    # 2. Force the LLM to output pure JSON
    system_instruction = f"""
    You are MAIT, a supportive NSW HSC Maths Tutor. 
    Current Student State: Fatigue={current_state.get('fatigue')}, Blooms={current_state.get('blooms')}
    
    You MUST respond with a raw JSON object matching this schema:
    {{
        "student_message": "string",
        "new_fatigue_level": "string",
        "new_blooms_level": "string",
        "trigger_lockout": boolean
    }}
    Do not include markdown blocks like ```json.
    """
    
    try:
        # Assuming llm_client is your Gemini/WebLLM wrapper
        raw_text = await llm_client.generate(prompt=user_prompt, system_prompt=system_instruction)
        
        # Clean potential markdown wrapping
        clean_text = raw_text.strip().removeprefix('```json').removesuffix('```').strip()
        
        # 3. Safely parse and validate
        parsed_data = json.loads(clean_text)
        validated_response = TutorResponse(**parsed_data)
        
        # 4. Return safe, structured data to the router
        return validated_response.model_dump()
        
    except json.JSONDecodeError as e:
        logger.error(f"LLM failed to output valid JSON: {e}")
        # Fallback safe state
        return {
            "student_message": "Mate, my brain just short-circuited for a second. Can you rephrase that?",
            "new_fatigue_level": current_state.get('fatigue', 'FRESH'),
            "new_blooms_level": current_state.get('blooms', 'REMEMBER'),
            "trigger_lockout": False
        }
    except Exception as e:
        logger.error(f"Validation error in Pedagogy Engine: {e}")
        raise

class EducationalLLMClient:
    def __init__(self, syllabus_context: str, history_text: str):
        self.syllabus_context = syllabus_context
        self.history_text = history_text
        
    async def generate(self, prompt: str, system_prompt: str) -> str:
        client = get_client()
        from google.genai import types
        
        # Inject RAG and history into the system prompt safely
        full_system_instruction = f"{system_prompt}\n\n**RAG Syllabus Context:**\n{self.syllabus_context}\n\n**Conversation History:**\n{self.history_text}"
        
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1500,
            system_instruction=full_system_instruction
        )
        
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_ID,
                contents=prompt,
                config=config
            ),
            timeout=30.0
        )
        return response.text.strip()


async def generate_response_async(query: str, context: StudentContext) -> str:
    """
    Generate response using Gemini with JSON-structured pedagogy tracking.
    """
    topic = context.pedagogical_state.current_topic or "Mathematics"
    fatigue = context.fatigue_metric.status.value if hasattr(context.fatigue_metric.status, 'value') else "FRESH"
    blooms = context.pedagogical_state.blooms_level.value if hasattr(context.pedagogical_state.blooms_level, 'value') else "REMEMBER"
    
    current_state = {
        "fatigue": fatigue,
        "blooms": blooms
    }

    # 1. RAG Retrieval
    try:
        syllabus_context = syllabus_service.get_relevant_context(
            query=query,
            fatigue_status=fatigue,
            year=None
        )
    except Exception as e:
        logger.warning(f"RAG retrieval failed (non-fatal): {e}")
        syllabus_context = ""

    # 2. Fetch History
    conversation_history = await storage.get_history(context.student_id, limit=6)
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history]) if conversation_history else "No previous history."

    # 3. Create simple LLM client wrapper
    llm_client = EducationalLLMClient(syllabus_context, history_text)

    # 4. Generate Structured Response
    response_data = await generate_tutor_response(llm_client, query, current_state)

    # 5. Extract state updates and persist
    student_message = response_data["student_message"]
    new_fatigue = response_data["new_fatigue_level"]
    new_blooms = response_data["new_blooms_level"]
    
    # Save student message
    await storage.save_message(
        context.student_id, "user", query,
        fatigue_state=fatigue,
        blooms_level=blooms,
        topic=topic
    )
    
    # Save assistant message with new states
    await storage.save_message(
        context.student_id, "assistant", student_message,
        fatigue_state=new_fatigue,
        blooms_level=new_blooms,
        topic=topic
    )
    
    # In a broader flow, the router would update the StudentContext object using trigger_lockout etc.
    # We return the raw string to the router to keep the API contract consistent
    return student_message

def generate_response(query: str, context: StudentContext) -> str:
    """Synchronous wrapper for backward compatibility."""
    return asyncio.run(generate_response_async(query, context))
