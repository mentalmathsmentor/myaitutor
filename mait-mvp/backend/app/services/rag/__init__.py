"""RAG module for MAIT - Semantic search over NSW HSC Mathematics syllabus using FAISS."""
from .retrieval_service import retrieval_service, RetrievalService, FatigueLevel
from .vector_store import vector_store, VectorStore
from .document_processor import DocumentProcessor, SyllabusChunk
from .embeddings import embedding_service

__all__ = [
    "retrieval_service",
    "RetrievalService",
    "FatigueLevel",
    "vector_store",
    "VectorStore",
    "DocumentProcessor",
    "SyllabusChunk",
    "embedding_service",
]
