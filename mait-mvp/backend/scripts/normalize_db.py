import os
import sys
import asyncio
from pathlib import Path
from sqlalchemy import select, update

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load environment variables before importing DB session
from dotenv import load_dotenv
load_dotenv()

from app.db.session import async_session_maker
from app.db.models import VectorChunk

async def normalize():
    print("Connecting to Neon Postgres database...")
    async with async_session_maker() as session:
        # 1. Update subject column
        print("Normalising subject strings...")
        
        # Stage 4 update
        res_s4 = await session.execute(
            update(VectorChunk)
            .where(VectorChunk.subject == "Stage 4")
            .values(subject="Stage 4 Mathematics")
        )
        print(f"Updated {res_s4.rowcount} rows for Stage 4 -> Stage 4 Mathematics.")
        
        # Stage 5 update
        res_s5 = await session.execute(
            update(VectorChunk)
            .where(VectorChunk.subject == "Stage 5")
            .values(subject="Stage 5 Mathematics")
        )
        print(f"Updated {res_s5.rowcount} rows for Stage 5 -> Stage 5 Mathematics.")
        
        # Commit these changes first
        await session.commit()
        
        # 2. Normalise metadata_json contents for all rows
        print("Syncing subject inside metadata_json and cleaning topics...")
        
        stmt = select(VectorChunk)
        results = await session.execute(stmt)
        chunks = results.scalars().all()
        
        updated_meta_count = 0
        for chunk in chunks:
            modified = False
            meta = dict(chunk.metadata_json) if chunk.metadata_json else {}
            
            # Sync subject in metadata
            if meta.get("subject") != chunk.subject:
                meta["subject"] = chunk.subject
                modified = True
                
            # Clean topic string if present
            if "topic" in meta and isinstance(meta["topic"], str):
                cleaned_topic = meta["topic"].strip()
                if cleaned_topic != meta["topic"]:
                    meta["topic"] = cleaned_topic
                    modified = True
                    
            if modified:
                chunk.metadata_json = meta
                session.add(chunk)
                updated_meta_count += 1
                
        if updated_meta_count > 0:
            await session.commit()
            print(f"Updated metadata_json for {updated_meta_count} rows.")
        else:
            print("No metadata_json changes were required.")
            
    print("Normalisation pass completed successfully!")

if __name__ == "__main__":
    asyncio.run(normalize())
