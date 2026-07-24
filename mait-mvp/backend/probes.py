import asyncio
from google.genai import types, Client
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://neondb_owner:npg_8hrXToGv7UDE@ep-tiny-leaf-anwdaa2q-pooler.c-6.us-east-1.aws.neon.tech/neondb"
engine = create_async_engine(DB_URL, connect_args={"ssl": True})

api_key = "AIzaSyDMMLsWvz8eNNibFdXOxQjGvW7RY7l8h68"

def _embed_query_sync(query: str) -> list[float]:
    client = Client(api_key=api_key)
    response = client.models.embed_content(
        model="models/gemini-embedding-2",
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values

probes = [
    ('Mathematics Standard 2', 'Critical path analysis', 'What is critical path analysis?'),
    ('Stage 5 Mathematics', 'Indices A', 'How do you multiply indices?'),
    ('Mathematics Standard 1', 'Depreciation and loans', 'What is the depreciation formula?'),
    ('Mathematics Advanced', 'Probability and data', 'How to calculate conditional probability?'),
    ('Stage 4 Mathematics', 'Area', 'How to calculate the area of a circle?')
]

async def run_probes():
    async with engine.begin() as conn:
        print("--- NEGATIVE PROBE ---")
        res = await conn.execute(text("SELECT count(*) FROM vector_chunks WHERE subject = 'Mathematics Extension 1';"))
        print("Extension 1 count:", res.fetchone()[0])
        
        print("\n--- RETRIEVAL PROBES ---")
        for subject, topic, query in probes:
            try:
                emb = _embed_query_sync(query)
                emb_str = "[" + ",".join(str(f) for f in emb) + "]"
                
                retrieval_stmt = text("""
                    SELECT
                        metadata_json->>'topic' as topic,
                        embedding <=> CAST(:emb AS vector) AS distance
                    FROM vector_chunks
                    WHERE subject = :s
                      AND metadata_json->>'topic' = :t
                    ORDER BY embedding <=> CAST(:emb AS vector)
                    LIMIT 1
                """)
                
                probe_res = await conn.execute(retrieval_stmt, {"emb": emb_str, "s": subject, "t": topic})
                top = probe_res.fetchone()
                print(f"Subject: {subject}, Query: '{query}', Expected Topic: {topic}")
                print(f"  Result: Topic = {top[0] if top else 'None'}, Score (distance) = {top[1] if top else 'None'}\n")
            except Exception as e:
                print(f"Subject: {subject}, Error: {e}")

asyncio.run(run_probes())
