"""
Educational agent with RAG-based context retrieval.
"""
from app.models import StudentContext
from .gemini_client import get_gemini_response, format_response_as_text
# NOTE: syllabus_service import DISABLED - ChromaDB hangs
# from .syllabus_service import syllabus_service
import asyncio


async def generate_response_async(query: str, context: StudentContext) -> str:
    """
    Generate response using Gemini with RAG-retrieved context.
    Context size is automatically adjusted based on fatigue state.
    """
    # 1. Get current state
    topic = context.pedagogical_state.current_topic or "Mathematics"
    fatigue = context.fatigue_metric.status

    # 2. RAG Retrieval DISABLED - ChromaDB hangs
    # syllabus_context = syllabus_service.get_relevant_context(...)
    syllabus_context = ""  # Empty - Gemini answers without RAG

    # 3. Call Gemini API with retrieved context
    gemini_response = await get_gemini_response(
        question=query,
        syllabus_context=syllabus_context,
        fatigue_state=fatigue,
        current_topic=topic
    )
    
    # 4. Process Code Verification (Execute Python blocks)
    response_text = gemini_response.get("text", "")
    processed_text = await execute_verification_code(response_text)
    
    # Update the response text with executed outputs
    gemini_response["text"] = processed_text

    # 5. Format and return
    return format_response_as_text(gemini_response)


async def execute_verification_code(response_text: str) -> str:
    """
    Parses response for ```python ... ``` blocks, executes them,
    and injects the stdout immediately after the block.
    """
    import re
    import io
    import sys
    from contextlib import redirect_stdout
    
    # Regex to find python blocks
    pattern = r"```python(.*?)```"
    matches = list(re.finditer(pattern, response_text, re.DOTALL))
    
    if not matches:
        return response_text
        
    # Process from last to first to maintain indices
    for match in reversed(matches):
        code_block = match.group(1)
        start, end = match.span()
        
        # Execute Code
        output_buffer = io.StringIO()
        try:
            with redirect_stdout(output_buffer):
                # Using specific globals/locals to be safe(r)
                exec_globals = {"__builtins__": __builtins__, "math": __import__("math")}
                exec(code_block.strip(), exec_globals)
            execution_output = output_buffer.getvalue().strip()
        except Exception as e:
            execution_output = f"Error: {str(e)}"
            
        # Format output block
        output_block = f"\n\n```output\n{execution_output}\n```"
        
        # Insert output after the code block
        response_text = response_text[:end] + output_block + response_text[end:]
        
    return response_text


def generate_response(query: str, context: StudentContext) -> str:
    """Synchronous wrapper for backward compatibility."""
    return asyncio.run(generate_response_async(query, context))
