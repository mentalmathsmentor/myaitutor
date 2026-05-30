import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import async_session_maker
from app.db.models import VectorChunk
from sqlalchemy import delete

# Initialize Gemini Client
from google import genai
from google.genai import types

def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)

# Map subjects to source document names
SUBJECT_SOURCES = {
    "Mathematics Advanced": "NESA - Y11-12 MADV 2024 Syllabus.docx",
    "Mathematics Standard 1": "NESA - mathematics_standard_11_12_2024 (S6).docx",
    "Mathematics Standard 2": "NESA - mathematics_standard_11_12_2024 (S6).docx",
    "Stage 5 Mathematics": "NESA - mathematics_k_10_2022 (S5).docx",
    "Stage 4 Mathematics": "NESA - mathematics (Stage4) Year 7 syllabus.docx"
}

# Mapping subject names to year levels
SUBJECT_YEAR_LEVELS = {
    "Mathematics Advanced": ["11", "12"],
    "Mathematics Standard 1": ["12"],
    "Mathematics Standard 2": ["11", "12"],
    "Stage 5 Mathematics": ["9", "10"],
    "Stage 4 Mathematics": ["7", "8"]
}

async def embed_batch(client, texts: List[str]) -> List[List[float]]:
    """Generate embeddings in batch using gemini-embedding-2 at 768 dimensions with backoff/retries."""
    max_retries = 8
    base_delay = 15  # seconds
    
    for attempt in range(max_retries):
        try:
            response = client.models.embed_content(
                model="models/gemini-embedding-2",
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            # Add a small polite sleep to avoid hitting immediate limits on subsequent requests
            await asyncio.sleep(1.5)
            return [emb.values for emb in response.embeddings]
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower() or "limit" in str(e).lower():
                delay = base_delay * (2 ** attempt)
                print(f"Rate limit hit. Retrying in {delay} seconds... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                print(f"Error generating embeddings for batch: {e}")
                raise e
    raise RuntimeError("Failed to generate embeddings after maximum retries due to rate limits.")

async def ingest_subject(client, session, subject_data: Dict[str, Any], limit: int = None) -> int:
    json_subject = subject_data["Subject"]
    # Normalise subject name to match front-end
    subject = json_subject
    if json_subject == "Stage 4":
        subject = "Stage 4 Mathematics"
    elif json_subject == "Stage 5":
        subject = "Stage 5 Mathematics"
        
    source_doc = SUBJECT_SOURCES.get(subject, "Unknown Source")
    print(f"\nProcessing subject: {subject} (source: {source_doc})")
    
    chunks_to_create = []
    
    for module_data in subject_data.get("Modules", []):
        module_name = module_data["Module"] # e.g. "Year 11", "Stage 5"
        
        # Try to infer year level from module name (7, 8, 9, 10, 11, 12)
        year_level = "Unknown"
        for yl in ["7", "8", "9", "10", "11", "12"]:
            if yl in module_name:
                year_level = yl
                break
        if year_level == "Unknown":
            if "Stage 4" in module_name:
                year_level = "7-8"
            elif "Stage 5" in module_name:
                year_level = "9-10"
        
        for topic_data in module_data.get("Topics", []):
            topic_name = topic_data["Topic"].strip()
            
            # Format outcomes list
            outcome_codes = []
            for outcome in topic_data.get("Outcomes", []):
                outcome_codes.extend(outcome.get("codes", []))
            outcomes_str = ", ".join(outcome_codes)
            
            for subtopic_data in topic_data.get("Subtopics", []):
                subtopic_name = subtopic_data["SubtopicName"]
                content_pts = subtopic_data.get("ContentPoints", [])
                if not content_pts:
                    continue
                
                # Aggregate content points text and codes
                points_text = ""
                content_codes = []
                for pt in content_pts:
                    content_codes.append(pt["content_code"])
                    points_text += f"- [{pt['content_code']}] {pt['text']}\n"
                
                primary_content_code = content_codes[0] if content_codes else "Unknown"
                all_content_codes_str = ", ".join(content_codes)
                
                # Construct rich chunk text
                chunk_text = (
                    f"Subject: {subject}\n"
                    f"Stage: {module_name}\n"
                    f"Topic: {topic_name}\n"
                    f"Subtopic: {subtopic_name}\n"
                    f"Outcomes: {outcomes_str}\n"
                    f"Content Points:\n{points_text.strip()}"
                )
                
                # Estimate token count (1 word ≈ 1.3 tokens)
                token_count = int(len(chunk_text.split()) * 1.3)
                
                metadata = {
                    "subject": subject,
                    "module": module_name,
                    "topic": topic_name,
                    "subtopic": subtopic_name,
                    "outcomes": outcome_codes,
                    "content_codes": content_codes,
                    "primary_content_code": primary_content_code
                }
                
                chunks_to_create.append({
                    "syllabus_node_id": primary_content_code,
                    "content": chunk_text,
                    "content_code": all_content_codes_str,
                    "year_level": year_level,
                    "subject": subject,
                    "chunk_type": "syllabus_subtopic",
                    "token_count": token_count,
                    "metadata_json": metadata,
                    "source_document": source_doc,
                    "syllabus_json_version": "2026.05"
                })

    if limit:
        chunks_to_create = chunks_to_create[:limit]
        print(f"Limiting ingestion to first {limit} chunks for testing.")
        
    print(f"Total chunks prepared for {subject}: {len(chunks_to_create)}")
    if not chunks_to_create:
        return 0

    # Generate embeddings and insert in batches
    batch_size = 8
    inserted_count = 0
    
    for i in range(0, len(chunks_to_create), batch_size):
        batch = chunks_to_create[i:i+batch_size]
        batch_texts = [c["content"] for c in batch]
        
        print(f"Embedding and inserting batch {i // batch_size + 1}/{(len(chunks_to_create) + batch_size - 1) // batch_size} ({len(batch)} chunks)...")
        
        embeddings = await embed_batch(client, batch_texts)
        
        for idx, chunk_data in enumerate(batch):
            chunk_data["embedding"] = embeddings[idx]
            db_chunk = VectorChunk(**chunk_data)
            session.add(db_chunk)
            
        await session.commit()
        inserted_count += len(batch)
        # Add a throttling sleep to stay safely under 100 requests per minute limit
        await asyncio.sleep(5.0)
        
    print(f"Successfully ingested {inserted_count} chunks for {subject}.")
    return inserted_count

async def main():
    parser = argparse.ArgumentParser(description="Ingest NESA Maths syllabus from JSON into pgvector.")
    parser.add_argument(
        "--syllabus-json",
        default=str(ROOT.parent.parent / "corpus" / "syllabus.json"),
        help="Path to the syllabus.json hierarchy file"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of chunks to ingest per subject (for testing)"
    )
    parser.add_argument(
        "--clear-all",
        action="store_true",
        help="Clear existing vector_chunks table before ingestion"
    )
    args = parser.parse_args()
    
    json_path = Path(args.syllabus_json)
    if not json_path.exists():
        print(f"Error: syllabus hierarchy file not found at {json_path}")
        return
        
    with open(json_path, "r") as f:
        syllabus_data = json.load(f)
        
    client = get_client()
    
    # Priority order requested: Math Advanced Stage 6 -> Standard 2 Stage 6 -> Stage 5 -> Stage 4
    subjects_in_order = [
        "Mathematics Advanced",
        "Mathematics Standard 1",
        "Mathematics Standard 2",
        "Stage 5",
        "Stage 4"
    ]
    
    async with async_session_maker() as session:
        # If --clear-all is passed, clear everything at the start
        if args.clear_all:
            print("Clearing existing vector_chunks table (--clear-all passed)...")
            await session.execute(delete(VectorChunk))
            await session.commit()
            print("vector_chunks table cleared.")
            
        total_ingested = 0
        for json_subject in subjects_in_order:
            if json_subject in syllabus_data:
                # Normalise subject name to match front-end
                subject = json_subject
                if json_subject == "Stage 4":
                    subject = "Stage 4 Mathematics"
                elif json_subject == "Stage 5":
                    subject = "Stage 5 Mathematics"
                
                # To support incremental resume and avoid duplicates, clear current subject first
                if not args.clear_all:
                    print(f"Clearing existing vector_chunks for subject: '{subject}'...")
                    await session.execute(delete(VectorChunk).where(VectorChunk.subject == subject))
                    await session.commit()
                    print(f"vector_chunks for '{subject}' cleared.")
                
                subject_ingested = await ingest_subject(
                    client=client,
                    session=session,
                    subject_data=syllabus_data[json_subject],
                    limit=args.limit
                )
                total_ingested += subject_ingested
            else:
                print(f"Warning: Subject '{subject}' not found in syllabus.json")
                
        print(f"\nIngestion Complete! Total ingested chunks: {total_ingested}")

if __name__ == "__main__":
    # Ensure correct event loop policy on Windows/Mac if needed
    asyncio.run(main())
