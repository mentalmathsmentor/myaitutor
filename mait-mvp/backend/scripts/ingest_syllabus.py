#!/usr/bin/env python3
"""
One-time script to ingest syllabus documents into ChromaDB.
Run from backend directory: python scripts/ingest_syllabus.py
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.rag.document_processor import DocumentProcessor
from app.services.rag.vector_store import vector_store
from app.services.rag.config import SYLLABUS_SOURCES, DATA_DIR


def main():
    print("=" * 50)
    print("MAIT Syllabus Ingestion")
    print("=" * 50)
    print()

    # Show source files
    print("Source files to process:")
    for source in SYLLABUS_SOURCES:
        exists = "OK" if source.exists() else "MISSING"
        print(f"  [{exists}] {source}")
    print()

    # Process documents
    processor = DocumentProcessor()
    print("Processing syllabus documents...")
    print()

    chunks = processor.process_all(SYLLABUS_SOURCES)

    if not chunks:
        print("ERROR: No chunks were created. Check source files.")
        return

    # Display chunk summary
    print()
    print("Chunks by topic:")
    topic_counts = {}
    for chunk in chunks:
        topic = chunk.topic_code
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    for topic, count in sorted(topic_counts.items()):
        print(f"  {topic}: {count} chunks")

    # Add to vector store
    print()
    print("Adding to ChromaDB...")
    added = vector_store.add_chunks(chunks)
    print(f"Added {added} chunks to vector store")

    # Verify
    print(f"Total documents in collection: {vector_store.count()}")

    # Test search
    print()
    print("=" * 50)
    print("Test Searches")
    print("=" * 50)

    test_queries = [
        "How do I differentiate sin(x)?",
        "What is the chain rule?",
        "compound interest formula",
        "probability distribution",
        "logarithm laws",
    ]

    for query in test_queries:
        results = vector_store.search(query, n_results=2)
        print(f"\nQuery: '{query}'")
        if results:
            for r in results:
                rel = r.get('relevance', 0)
                print(f"  -> {r['id']} (relevance: {rel:.2f})")
        else:
            print("  -> No results found")

    print()
    print("=" * 50)
    print("Ingestion Complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
