import sys
import time
print("Starting debug...", flush=True)
time.sleep(1)

print("Importing os...", flush=True)
import os
print("Importing dotenv...", flush=True)
from dotenv import load_dotenv
load_dotenv()

print("Importing chromadb...", flush=True)
import chromadb
print("Chromadb imported.", flush=True)

print("Importing sentence_transformers...", flush=True)
try:
    from sentence_transformers import SentenceTransformer
    print("SentenceTransformer imported.", flush=True)
except ImportError:
    print("sentence_transformers NOT INSTALLED", flush=True)
    sys.exit(1)

print("Trying to load model all-MiniLM-L6-v2 ...", flush=True)
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Model loaded.", flush=True)
except Exception as e:
    print(f"FAILED to load model: {e}", flush=True)
