"""
Syllabus service - now using RAG-based semantic retrieval.
Maintains backward compatibility with existing API.
"""
from typing import Optional
from .rag import retrieval_service, FatigueLevel


class SyllabusService:
    """
    Syllabus service using semantic search via ChromaDB.
    Replaces the old in-memory text loading approach.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SyllabusService, cls).__new__(cls)
        return cls._instance

    def get_relevant_context(
        self,
        query: str,
        fatigue_status: str = "FRESH",
        year: Optional[str] = None
    ) -> str:
        """
        Get relevant syllabus context for a query using semantic search.

        Args:
            query: Student's question
            fatigue_status: "FRESH", "WEARY", or "LOCKOUT"
            year: Optional year filter ("11" or "12")

        Returns:
            Formatted syllabus context string
        """
        # Convert string to enum
        try:
            fatigue_level = FatigueLevel(fatigue_status)
        except ValueError:
            fatigue_level = FatigueLevel.FRESH

        # Use RAG retrieval
        result = retrieval_service.retrieve(
            query=query,
            fatigue_level=fatigue_level,
            year_filter=year
        )

        return result["context"]

    def is_ready(self) -> bool:
        """Check if the RAG system has been initialized with syllabus data."""
        return retrieval_service.is_ready()

    # Backward compatibility methods
    def get_all_syllabus_text(self) -> str:
        """Deprecated: Returns general context instead of all text."""
        return self.get_relevant_context(
            query="NSW HSC Mathematics Advanced syllabus overview",
            fatigue_status="FRESH"
        )

    def get_syllabus_by_name_search(self, query: str) -> Optional[str]:
        """Deprecated: Use get_relevant_context instead."""
        context = self.get_relevant_context(query)
        return context if context else None


# Global instance
syllabus_service = SyllabusService()
