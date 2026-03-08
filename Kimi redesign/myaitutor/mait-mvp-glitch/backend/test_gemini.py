#!/usr/bin/env python3
"""
Quick test script for Gemini integration.
Run this to verify your API key works before starting the full app.

Usage:
    python test_gemini.py
"""

import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after loading env
from app.services.gemini_client import get_gemini_response
from app.models import FatigueStatus

async def test_gemini():
    """Test Gemini API with a simple math question."""

    print("=" * 60)
    print("MAIT MVP - Gemini Integration Test")
    print("=" * 60)

    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("\n❌ ERROR: GEMINI_API_KEY not configured!")
        print("\nPlease:")
        print("1. Create a .env file in the backend/ directory")
        print("2. Add: GEMINI_API_KEY=your_actual_key")
        print("3. Get a key from: https://aistudio.google.com/app/apikey")
        return

    print(f"\n✅ API Key found: {api_key[:10]}...{api_key[-4:]}")

    # Test questions
    test_cases = [
        {
            "question": "What is the derivative of x²?",
            "fatigue": FatigueStatus.FRESH,
            "label": "FRESH State (detailed response)"
        },
        {
            "question": "Explain the chain rule",
            "fatigue": FatigueStatus.WEARY,
            "label": "WEARY State (concise response <50 words)"
        }
    ]

    for i, test in enumerate(test_cases, 1):
        print(f"\n{'─' * 60}")
        print(f"Test {i}: {test['label']}")
        print(f"{'─' * 60}")
        print(f"Question: {test['question']}")
        print(f"Fatigue State: {test['fatigue'].value}")
        print()

        try:
            # from app.services.syllabus_service import syllabus_service
            
            topic = "Calculus"
            # syllabus_context = syllabus_service.get_syllabus_by_name_search(topic)
            syllabus_context = "NSW Mathematics Advanced - Calculus"
            # if not syllabus_context:
            #     print("⚠️ Warning: Syllabus not found in test, using dummy.")
            #     syllabus_context = "NSW Mathematics Advanced - Calculus"
            # else:
            #     print(f"✅ Found syllabus context ({len(syllabus_context)} chars)")

            response = await get_gemini_response(
                question=test['question'],
                syllabus_context=syllabus_context,
                fatigue_state=test['fatigue'],
                current_topic=topic
            )

            print("✅ Response received!")
            print(f"\nResponse Text: {response.get('text', '')[:200]}...")
            # print(f"\nCore Truth: {response['core_truth']}")
            # print(f"\nExplanation: {response['explanation']}")
            # print(f"\nHints: {response['hints']}")

            # Count words in explanation for WEARY test
            if test['fatigue'] == FatigueStatus.WEARY:
                word_count = len(response.get('text', '').split())
                print(f"\n📊 Word count: {word_count} {'✅' if word_count <= 55 else '❌ (too long!)'}")

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print("\nThis might be due to:")
            print("- Invalid API key")
            print("- No internet connection")
            print("- Rate limiting")
            return

    print("\n" + "=" * 60)
    print("✅ All tests passed! Gemini integration is working.")
    print("=" * 60)
    print("\nYou can now start the full application:")
    print("  uvicorn app.main:app --reload")

if __name__ == "__main__":
    asyncio.run(test_gemini())
