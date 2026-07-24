import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://neondb_owner:npg_8hrXToGv7UDE@ep-tiny-leaf-anwdaa2q-pooler.c-6.us-east-1.aws.neon.tech/neondb"
engine = create_async_engine(DB_URL, connect_args={"ssl": True})

async def run():
    async with engine.begin() as conn:
        from sqlalchemy import text
        
        print("--- TABLES ---")
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        tables = [r[0] for r in res.fetchall()]
        print(tables)
        
        print("\n--- ALEMBIC HEAD ---")
        try:
            res = await conn.execute(text("SELECT version_num FROM alembic_version;"))
            print([r[0] for r in res.fetchall()])
        except Exception as e:
            print("No alembic_version table or error:", e)
        
        print("\n--- CORPUS COUNTS ---")
        res = await conn.execute(text("SELECT count(*) FROM vector_chunks;"))
        print("Total:", res.fetchone()[0])
        
        res = await conn.execute(text("SELECT subject, count(*) FROM vector_chunks GROUP BY subject;"))
        for row in res.fetchall():
            print(f"{row[0]}: {row[1]}")
            
        print("\n--- DISTINCT SUBJECTS ---")
        res = await conn.execute(text("SELECT DISTINCT subject FROM vector_chunks;"))
        subjects = [r[0] for r in res.fetchall()]
        print(subjects)
        
        print("\n--- 5 SAMPLE TOPICS PER SUBJECT ---")
        for subj in subjects:
            if subj is None: continue
            res = await conn.execute(text("SELECT DISTINCT metadata_json->>'topic' FROM vector_chunks WHERE subject = :subj AND metadata_json->>'topic' IS NOT NULL LIMIT 5;"), {"subj": subj})
            print(f"{subj}: {[r[0] for r in res.fetchall()]}")

        print("\n--- COLUMNS ---")
        for table in ['tutors', 'tutor_classes', 'chat_threads', 'messages', 'documents', 'vector_chunks']:
            if table in tables:
                res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t;"), {"t": table})
                print(f"{table}: {[r[0] for r in res.fetchall()]}")

        print("\n--- MOCK TUTOR ---")
        try:
            res = await conn.execute(text("SELECT id FROM tutors WHERE id = '00000000-0000-0000-0000-000000000000';"))
            print("Exists:", res.fetchone() is not None)
        except Exception:
            print("Exists: Error querying mock tutor")

asyncio.run(run())
