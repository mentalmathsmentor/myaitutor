import sys
import time
import signal

def handler(signum, frame):
    raise TimeoutError("Import timed out")

signal.signal(signal.SIGALRM, handler)
signal.alarm(10)  # 10 second timeout

print("Starting chromadb import investigation...", flush=True)
try:
    start = time.time()
    import chromadb
    end = time.time()
    print(f"chromadb imported successfully in {end - start:.2f}s", flush=True)
except TimeoutError:
    print("CRITICAL: chromadb import TIMED OUT after 10s!", flush=True)
except Exception as e:
    print(f"CRITICAL: chromadb import generated error: {e}", flush=True)
finally:
    signal.alarm(0)
