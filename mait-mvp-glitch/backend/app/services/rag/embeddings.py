"""
Embedding model wrapper using sentence-transformers.
Uses ChromaDB's built-in embedding function for compatibility.
"""
from typing import List

from .config import EMBEDDING_MODEL


class EmbeddingService:
    """Wrapper for sentence-transformers embedding model via ChromaDB."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _initialize(self):
        """Initialize the embedding function (lazy loading)."""
        if self._initialized:
            return
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        try:
             from chromadb.utils import embedding_functions
        except ImportError:
             print("Warning: chromadb not available for embeddings")
             return

        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
        self._initialized = True
        print(f"Embedding model loaded successfully")

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        self._initialize()
        return self.embedding_fn(texts)

    def get_chromadb_function(self):
        """Return the embedding function for ChromaDB."""
        self._initialize()
        return self.embedding_fn


# Singleton instance (lazy initialization)
embedding_service = EmbeddingService()
