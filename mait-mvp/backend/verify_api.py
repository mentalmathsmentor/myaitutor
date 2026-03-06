import requests
import json

API_URL = "http://localhost:8000"

def test_root():
    try:
        res = requests.get(f"{API_URL}/")
        print(f"Root endpoint: {res.status_code} - {res.json()}")
    except Exception as e:
        print(f"Root endpoint failed: {e}")

def test_interact():
    payload = {
        "student_id": "test_user_123",
        "query": "What is the derivative of x^2?",
        "complexity": 5
    }
    try:
        res = requests.post(f"{API_URL}/interact", json=payload)
        if res.status_code == 200:
            print("Interact endpoint: Success")
            print(f"Response: {res.json()['response'][:100]}...")
        else:
            print(f"Interact endpoint failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Interact endpoint failed: {e}")

if __name__ == "__main__":
    test_root()
    test_interact()
