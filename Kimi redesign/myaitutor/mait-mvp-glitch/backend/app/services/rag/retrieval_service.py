"""
High-level retrieval service for MAIT RAG system.
Uses FAISS vector store for semantic search.
Integrates with fatigue system for context-aware retrieval.
"""
import re
from typing import List, Dict, Optional
from enum import Enum

from .vector_store import vector_store
from .config import (
    FRESH_TOP_K,
    WEARY_TOP_K,
    SIMILARITY_THRESHOLD,
    TOPIC_CODE_PATTERN
)


class FatigueLevel(str, Enum):
    """Mirror of app.models.FatigueStatus for type safety."""
    FRESH = "FRESH"
    WEARY = "WEARY"
    LOCKOUT = "LOCKOUT"


class RetrievalService:
    """
    Main retrieval service for MAIT.
    Provides fatigue-aware context retrieval from the syllabus vector store.
    """

    # Common math term to topic code mapping for query expansion
    TOPIC_HINTS = {
        "derivative": ["MA-C1", "MA-C2", "MA-C3"],
        "differentiate": ["MA-C1", "MA-C2", "MA-C3"],
        "differentiation": ["MA-C1", "MA-C2", "MA-C3"],
        "integral": ["MA-C4"],
        "integrate": ["MA-C4"],
        "integration": ["MA-C4"],
        "antiderivative": ["MA-C4"],
        "trigonometry": ["MA-T1", "MA-T2", "MA-T3"],
        "trig": ["MA-T1", "MA-T2", "MA-T3"],
        "sin": ["MA-T1", "MA-T2", "MA-T3", "MA-C2"],
        "cos": ["MA-T1", "MA-T2", "MA-T3", "MA-C2"],
        "tan": ["MA-T1", "MA-T2", "MA-T3"],
        "function": ["MA-F1", "MA-F2"],
        "graph": ["MA-F2", "MA-T3"],
        "logarithm": ["MA-E1"],
        "log": ["MA-E1"],
        "exponential": ["MA-E1", "MA-C2"],
        "probability": ["MA-S1"],
        "statistics": ["MA-S1", "MA-S2", "MA-S3"],
        "compound interest": ["MA-M1"],
        "annuity": ["MA-M1"],
        "financial": ["MA-M1"],
        "chain rule": ["MA-C2"],
        "product rule": ["MA-C2"],
        "quotient rule": ["MA-C2"],
    }

    def __init__(self):
        self.vector_store = vector_store

    def _extract_topic_code(self, query: str) -> Optional[str]:
        """Extract topic code if explicitly mentioned in query."""
        match = re.search(TOPIC_CODE_PATTERN, query.upper())
        return match.group(0) if match else None

    def _get_topic_hints(self, query: str) -> List[str]:
        """Get topic code hints based on keywords in query."""
        query_lower = query.lower()
        hints = set()
        for keyword, codes in self.TOPIC_HINTS.items():
            if keyword in query_lower:
                hints.update(codes)
        return list(hints)

    def _get_top_k(self, fatigue_level: FatigueLevel) -> int:
        """Determine number of results based on fatigue level."""
        if fatigue_level == FatigueLevel.WEARY:
            return WEARY_TOP_K
        return FRESH_TOP_K

    def retrieve(
        self,
        query: str,
        fatigue_level: FatigueLevel = FatigueLevel.FRESH,
        year_filter: Optional[str] = None
    ) -> Dict:
        """
        Retrieve relevant syllabus context for a query.

        Args:
            query: Student's question
            fatigue_level: Current fatigue state (affects context size)
            year_filter: Optional filter for Year 11 or Year 12 content

        Returns:
            Dict with:
                - context: Formatted syllabus context string
                - chunks: List of retrieved chunks with metadata
                - topic_codes: List of relevant topic codes found
        """
        # Check for explicit topic code in query
        explicit_topic = self._extract_topic_code(query)

        # Build filter
        filter_dict = None
        if year_filter:
            filter_dict = {"year": year_filter}

        # Determine retrieval count
        top_k = self._get_top_k(fatigue_level)

        # Search vector store
        results = self.vector_store.search(
            query=query,
            n_results=top_k,
            filter_dict=filter_dict
        )

        # If explicit topic code mentioned, also fetch that topic's content
        if explicit_topic:
            topic_results = self.vector_store.get_by_topic_code(explicit_topic)
            # Merge, prioritizing explicit topic
            existing_ids = {r["id"] for r in results}
            for tr in topic_results[:2]:  # Limit to 2 from explicit topic
                if tr["id"] not in existing_ids:
                    tr["relevance"] = 0.95  # High relevance for explicit mention
                    results.append(tr)

        # Get additional context from topic hints
        topic_hints = self._get_topic_hints(query)
        if topic_hints and len(results) < top_k:
            for hint_topic in topic_hints[:1]:  # Just the first hint
                hint_results = self.vector_store.get_by_topic_code(hint_topic)
                existing_ids = {r["id"] for r in results}
                for hr in hint_results[:1]:
                    if hr["id"] not in existing_ids:
                        hr["relevance"] = 0.7
                        results.append(hr)

        # Filter by similarity threshold
        filtered_results = [
            r for r in results
            if r.get("relevance", 1.0) >= SIMILARITY_THRESHOLD
        ]

        # Sort by relevance
        filtered_results.sort(key=lambda x: x.get("relevance", 0), reverse=True)

        # Format context string
        context_parts = []
        topic_codes = set()

        for result in filtered_results:
            metadata = result.get("metadata", {})
            topic_code = metadata.get("topic_code", "")
            topic_name = metadata.get("topic_name", "")
            content_code = metadata.get("content_code", "")
            year = metadata.get("year", "")

            topic_codes.add(topic_code)

            header = f"[{topic_code} - {topic_name} (Year {year})]"
            if content_code:
                header = f"[{topic_code}.{content_code} - {topic_name} (Year {year})]"

            context_parts.append(f"{header}\n{result['text']}")

        # Truncate for WEARY state
        context = "\n\n---\n\n".join(context_parts)
        if fatigue_level == FatigueLevel.WEARY:
            # Limit to ~1500 chars for weary students
            if len(context) > 1500:
                context = context[:1500] + "\n\n[Content truncated for brevity]"

        return {
            "context": context,
            "chunks": filtered_results,
            "topic_codes": list(topic_codes)
        }

    def get_topic_summary(self, topic_code: str) -> str:
        """Get a summary of a specific topic for quick reference."""
        results = self.vector_store.get_by_topic_code(topic_code)

        if not results:
            return f"No content found for topic code: {topic_code}"

        # Combine first chunk of each content code
        summary_parts = []
        for result in results[:3]:  # Limit to first 3 for brevity
            text = result["text"][:500]  # First 500 chars
            summary_parts.append(text)

        return "\n---\n".join(summary_parts)

    def is_ready(self) -> bool:
        """Check if the vector store has been populated."""
        try:
            return self.vector_store.count() > 0
        except Exception:
            return False


# Singleton instance
retrieval_service = RetrievalService()
