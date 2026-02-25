"""RAG Configuration Constants"""
from pathlib import Path

# Paths
BACKEND_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = BACKEND_ROOT / "data"
FAISS_INDEX_DIR = DATA_DIR / "faiss_index"

# Syllabus source files
SYLLABUS_SOURCES = [
    DATA_DIR / "Maths Advanced Syllabus.pdf",
    Path("/Users/darayeet/Documents/!Tutoring/Syllabi/MADV - Y11-12 2024 Syllabus/NESA - Y11-12 MADV 2024 Syllabus.pdf"),
    Path("/Users/darayeet/Documents/!Tutoring/Syllabi/MADV - Y11-12 2024 Syllabus/NESA - Y11-12 MADV 2024 Syllabus.docx"),
    Path("/Users/darayeet/Documents/!Tutoring/Syllabi/MADV - Y11-12 2024 Syllabus/NESA - Y11-12 MADV 2024 Syllabus Support.docx.docx"),
]

# Embedding Model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

# FAISS
FAISS_INDEX_FILE = "index.faiss"
FAISS_METADATA_FILE = "metadata.json"

# Chunking
MAX_CHUNK_SIZE = 1000  # tokens
CHUNK_OVERLAP = 100    # tokens

# Retrieval
DEFAULT_TOP_K = 5
FRESH_TOP_K = 5        # More context when FRESH
WEARY_TOP_K = 2        # Less context when WEARY
SIMILARITY_THRESHOLD = 0.3  # Minimum relevance score

# Topic Code Patterns
TOPIC_CODE_PATTERN = r'MA-[A-Z][0-9]'
CONTENT_CODE_PATTERN = r'[A-Z][0-9]\.[0-9]'
