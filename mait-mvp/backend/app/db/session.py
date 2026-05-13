import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# asyncpg compatibility: replace sslmode=require with ssl=require
if "sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")
    DATABASE_URL = DATABASE_URL.replace("sslmode=disable", "ssl=disable")
    DATABASE_URL = DATABASE_URL.replace("sslmode=verify-full", "ssl=verify-full")
    DATABASE_URL = DATABASE_URL.replace("sslmode=verify-ca", "ssl=verify-ca")

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=3,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with async_session_maker() as session:
        yield session
