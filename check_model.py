import os
from google import genai

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    # Try to load from .env file
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("GOOGLE_API_KEY="):
                    api_key = line.strip().split("=", 1)[1]
                    break
    except Exception:
        pass

if not api_key:
    print("Error: GOOGLE_API_KEY not found.")
    exit(1)

client = genai.Client(api_key=api_key)

model_name = "models/gemma-2-9b-it"
print(f"Checking model: {model_name}")

try:
    # Try to get model info
    model = client.models.get(model=model_name)
    print(f"Model found: {model.name}")
    print(f"Supported methods: {model.supported_generation_methods}")
except Exception as e:
    print(f"Error checking model: {e}")
