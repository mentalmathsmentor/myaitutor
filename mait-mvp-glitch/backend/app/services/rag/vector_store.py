# ChromaDB vector store management for syllabus chunks.
from typing import List, Dict, Optional
import os

from .config import CHROMA_PERSIST_DIR, COLLECTION_NAME
from .embeddings import embedding_service
from .document_processor import SyllabusChunk


class VectorStore:
    """ChromaDB vector store for syllabus chunks."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _initialize(self):
        """Initialize ChromaDB client and collection (lazy loading)."""
        if self._initialized:
            return

        try:
            print(f"Initializing ChromaDB connection...")
            import chromadb
            from chromadb.config import Settings
            print(f"ChromaDB imported successfully")
        except Exception as e:
            print(f"FAILED to import chromadb: {e}")
            self._initialized = False # keep as false
            return

        # Create persist directory if needed
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

        print(f"Initializing ChromaDB at: {CHROMA_PERSIST_DIR}")

        # Create persistent client
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_PERSIST_DIR)
        )

        # Get or create collection with embedding function
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_service.get_chromadb_function(),
            metadata={"description": "MAIT NSW HSC Mathematics Advanced Syllabus"}
        )

        self._initialized = True
        print(f"ChromaDB collection '{COLLECTION_NAME}' ready with {self.collection.count()} documents")

    def add_chunks(self, chunks: List[SyllabusChunk]) -> int:
        """Add syllabus chunks to the vector store."""
        self._initialize()

        if not chunks:
            return 0

        ids = [chunk.id for chunk in chunks]
        documents = [chunk.text for chunk in chunks]
        metadatas = [chunk.to_dict()["metadata"] for chunk in chunks]

        # Upsert (add or update)
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        return len(chunks)

    def search(
        self,
        query: str,
        n_results: int = 5,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Semantic search for relevant syllabus chunks.

        Args:
            query: Search query text
            n_results: Number of results to return
            filter_dict: Optional metadata filter (e.g., {"year": "12"})

        Returns:
            List of results with text, metadata, and similarity score
        """
        self._initialize()

        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filter_dict if filter_dict else None,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        formatted = []
        if results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                distance = results["distances"][0][i] if results["distances"] else 0
                formatted.append({
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": distance,
                    "relevance": max(0, 1 - distance)  # Convert distance to similarity
                })

        return formatted

    def get_by_topic_code(self, topic_code: str) -> List[Dict]:
        """Get all chunks for a specific topic code (e.g., 'MA-C2')."""
        self._initialize()

        results = self.collection.get(
            where={"topic_code": topic_code},
            include=["documents", "metadatas"]
        )

        formatted = []
        if results["ids"]:
            for i in range(len(results["ids"])):
                formatted.append({
                    "id": results["ids"][i],
                    "text": results["documents"][i] if results["documents"] else "",
                    "metadata": results["metadatas"][i] if results["metadatas"] else {}
                })

        return formatted

    def count(self) -> int:
        """Return number of documents in collection."""
        self._initialize()
        return self.collection.count()

    def clear(self):
        """Clear all documents from the collection."""
        self._initialize()
        self.client.delete_collection(COLLECTION_NAME)
        self._initialized = False
        self._initialize()


# Singleton instance (lazy initialization)
vector_store = VectorStore()
