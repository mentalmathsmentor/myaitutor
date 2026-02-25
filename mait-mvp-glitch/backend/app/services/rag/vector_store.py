# FAISS vector store management for syllabus chunks.
import json
import os
from typing import List, Dict, Optional

import numpy as np
import faiss

from .config import FAISS_INDEX_DIR, FAISS_INDEX_FILE, FAISS_METADATA_FILE, EMBEDDING_DIMENSIONS
from .embeddings import embedding_service
from .document_processor import SyllabusChunk


class VectorStore:
    """FAISS vector store for syllabus chunks."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _initialize(self):
        """Initialize FAISS index (lazy loading). Loads from disk if available."""
        if self._initialized:
            return

        print("Initializing FAISS vector store...")

        # Create persist directory if needed
        os.makedirs(FAISS_INDEX_DIR, exist_ok=True)

        index_path = os.path.join(FAISS_INDEX_DIR, FAISS_INDEX_FILE)
        metadata_path = os.path.join(FAISS_INDEX_DIR, FAISS_METADATA_FILE)

        # Try to load existing index from disk
        if os.path.exists(index_path) and os.path.exists(metadata_path):
            try:
                self.index = faiss.read_index(str(index_path))
                with open(metadata_path, "r") as f:
                    self._metadata = json.load(f)
                # Rebuild lookup maps
                self._ids = self._metadata.get("ids", [])
                self._documents = self._metadata.get("documents", [])
                self._metadatas = self._metadata.get("metadatas", [])
                self._initialized = True
                print(f"FAISS index loaded from disk with {self.index.ntotal} vectors")
                return
            except Exception as e:
                print(f"Warning: Failed to load FAISS index from disk: {e}")

        # Create a new empty index (Inner Product for cosine similarity on normalized vectors)
        self.index = faiss.IndexFlatIP(EMBEDDING_DIMENSIONS)
        self._ids: List[str] = []
        self._documents: List[str] = []
        self._metadatas: List[Dict] = []
        self._initialized = True
        print("FAISS vector store initialized (empty)")

    def _save_to_disk(self):
        """Persist the FAISS index and metadata to disk."""
        index_path = os.path.join(FAISS_INDEX_DIR, FAISS_INDEX_FILE)
        metadata_path = os.path.join(FAISS_INDEX_DIR, FAISS_METADATA_FILE)

        faiss.write_index(self.index, str(index_path))
        with open(metadata_path, "w") as f:
            json.dump({
                "ids": self._ids,
                "documents": self._documents,
                "metadatas": self._metadatas,
            }, f)
        print(f"FAISS index saved to disk ({self.index.ntotal} vectors)")

    def add_chunks(self, chunks: List[SyllabusChunk]) -> int:
        """Add syllabus chunks to the vector store (upsert behavior)."""
        self._initialize()

        if not chunks:
            return 0

        # Build sets for deduplication (upsert)
        existing_id_set = set(self._ids)
        new_chunks = []
        update_chunks = []

        for chunk in chunks:
            if chunk.id in existing_id_set:
                update_chunks.append(chunk)
            else:
                new_chunks.append(chunk)

        # For updates, we need to rebuild the index (FAISS doesn't support in-place update
        # for IndexFlatIP). For simplicity, if there are updates we rebuild entirely.
        if update_chunks:
            # Merge: replace old entries with updated ones
            update_id_set = {c.id for c in update_chunks}
            # Keep entries not being updated
            keep_indices = [i for i, eid in enumerate(self._ids) if eid not in update_id_set]
            kept_ids = [self._ids[i] for i in keep_indices]
            kept_docs = [self._documents[i] for i in keep_indices]
            kept_metas = [self._metadatas[i] for i in keep_indices]

            # Combine kept + updated + new
            all_chunks_to_add = update_chunks + new_chunks
            all_texts = kept_docs + [c.text for c in all_chunks_to_add]
            all_ids = kept_ids + [c.id for c in all_chunks_to_add]
            all_metas = kept_metas + [c.to_dict()["metadata"] for c in all_chunks_to_add]

            # Re-embed everything that was kept (we need their vectors)
            if kept_docs:
                kept_embeddings = embedding_service.embed(kept_docs)
            else:
                kept_embeddings = np.empty((0, EMBEDDING_DIMENSIONS), dtype=np.float32)

            new_texts = [c.text for c in all_chunks_to_add]
            if new_texts:
                new_embeddings = embedding_service.embed(new_texts)
            else:
                new_embeddings = np.empty((0, EMBEDDING_DIMENSIONS), dtype=np.float32)

            all_embeddings = np.vstack([kept_embeddings, new_embeddings]) if kept_embeddings.shape[0] > 0 or new_embeddings.shape[0] > 0 else np.empty((0, EMBEDDING_DIMENSIONS), dtype=np.float32)

            # Rebuild index
            self.index = faiss.IndexFlatIP(EMBEDDING_DIMENSIONS)
            if all_embeddings.shape[0] > 0:
                self.index.add(all_embeddings)
            self._ids = all_ids
            self._documents = all_texts
            self._metadatas = all_metas
        else:
            # Only new chunks - just append
            if new_chunks:
                texts = [c.text for c in new_chunks]
                embeddings = embedding_service.embed(texts)
                self.index.add(embeddings)
                self._ids.extend([c.id for c in new_chunks])
                self._documents.extend(texts)
                self._metadatas.extend([c.to_dict()["metadata"] for c in new_chunks])

        # Persist to disk
        self._save_to_disk()

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

        if self.index.ntotal == 0:
            return []

        # Embed the query
        query_embedding = embedding_service.embed_query(query)  # shape (1, dim)

        # If filtering, we need to search more candidates then post-filter
        search_k = min(n_results * 5, self.index.ntotal) if filter_dict else min(n_results, self.index.ntotal)

        # Search FAISS index (Inner Product = cosine similarity for normalized vectors)
        scores, indices = self.index.search(query_embedding, search_k)

        # Format results
        formatted = []
        for i in range(len(indices[0])):
            idx = indices[0][i]
            if idx == -1:
                continue  # FAISS returns -1 for not enough results

            score = float(scores[0][i])
            metadata = self._metadatas[idx]

            # Apply metadata filter
            if filter_dict:
                match = all(metadata.get(k) == v for k, v in filter_dict.items())
                if not match:
                    continue

            formatted.append({
                "id": self._ids[idx],
                "text": self._documents[idx],
                "metadata": metadata,
                "distance": 1.0 - score,  # Convert similarity to distance
                "relevance": max(0.0, score),  # Cosine similarity is already 0-1 for normalized
            })

            if len(formatted) >= n_results:
                break

        return formatted

    def get_by_topic_code(self, topic_code: str) -> List[Dict]:
        """Get all chunks for a specific topic code (e.g., 'MA-C2')."""
        self._initialize()

        formatted = []
        for i, meta in enumerate(self._metadatas):
            if meta.get("topic_code") == topic_code:
                formatted.append({
                    "id": self._ids[i],
                    "text": self._documents[i],
                    "metadata": meta
                })

        return formatted

    def count(self) -> int:
        """Return number of documents in the index."""
        self._initialize()
        return self.index.ntotal

    def clear(self):
        """Clear all documents from the index."""
        self._initialize()
        self.index = faiss.IndexFlatIP(EMBEDDING_DIMENSIONS)
        self._ids = []
        self._documents = []
        self._metadatas = []
        self._save_to_disk()


# Singleton instance (lazy initialization)
vector_store = VectorStore()
