import os
import sys
import asyncio
from pathlib import Path
from sqlalchemy import select, func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import async_session_maker
from app.db.models import VectorChunk

# Initialize Gemini Client
from google import genai
from google.genai import types

def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)

async def search_vector_chunks(client, session, query_text: str, limit: int = 3):
    print(f"\nQuery: '{query_text}'")
    
    # Generate query embedding
    response = client.models.embed_content(
        model="models/gemini-embedding-2",
        contents=query_text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    query_emb = response.embeddings[0].values
    
    # Run search query on Postgres using pgvector cosine distance
    stmt = select(
        VectorChunk,
        (1.0 - VectorChunk.embedding.cosine_distance(query_emb)).label("relevance")
    ).order_by(
        VectorChunk.embedding.cosine_distance(query_emb)
    ).limit(limit)
    
    results = await session.execute(stmt)
    rows = results.all()
    
    if not rows:
        print("  -> No results found")
        return
        
    for chunk, relevance in rows:
        print(f"  [{chunk.content_code}] relevance: {relevance:.4f} | Subject: {chunk.subject} | Stage: {chunk.year_level}")
        snippet = chunk.content.replace("\n", " | ")[:120]
        print(f"    Text: {snippet}...")

async def main():
    client = get_client()
    
    async with async_session_maker() as session:
        # Check total chunk counts
        print("=" * 60)
        print("pgvector Corpus Stats")
        print("=" * 60)
        
        stmt = select(
            VectorChunk.subject,
            func.count(VectorChunk.id)
        ).group_by(VectorChunk.subject)
        
        results = await session.execute(stmt)
        stats = results.all()
        
        total_chunks = 0
        for subject, count in stats:
            print(f"  {subject}: {count} chunks")
            total_chunks += count
            
        print(f"  Total pgvector Corpus Size: {total_chunks} chunks")
        print()
        
        # Check distinct topics in JSONB for each subject
        print("=" * 60)
        print("Distinct Topics in metadata_json per Subject")
        print("=" * 60)
        for subject, count in stats:
            stmt_topics = select(
                VectorChunk.metadata_json["topic"].label("topic")
            ).where(VectorChunk.subject == subject).distinct()
            res_topics = await session.execute(stmt_topics)
            topics = [row[0] for row in res_topics.all() if row[0]]
            print(f"  {subject} ({len(topics)} topics):")
            print(f"    {', '.join(sorted(topics))}")
        print()
        
        print("=" * 60)
        print("Test Retrieval Queries")
        print("=" * 60)
        
        test_queries = [
            "introduction to differentiation",
            "compound interest formula",
            "properties of quadrilaterals or triangles in bearings",
            "algebraic fractions and expanding brackets"
        ]
        
        for q in test_queries:
            await search_vector_chunks(client, session, q)

if __name__ == "__main__":
    asyncio.run(main())
