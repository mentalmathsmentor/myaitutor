import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Listing available models:")
for model in client.models.list(config={"page_size": 100}):
    print(f"- {model.name}")
