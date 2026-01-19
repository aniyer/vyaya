import os
from google import genai
from google.genai import types

# Use the API key from the environment (loaded by docker usually, but we need to ensure it's here)
# For this script we'll try to load from .env or just assume it's set if running in the container.
# Since I'm running this via run_command in the user's environment, I need to make sure the env var is set.
# I will use the one from config.py idea, but simpler to just try/except.

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

print("Listing models...")
try:
    # The SDK method might be client.models.list() or similar.
    # checking based on google-genai usage patterns.
    # Using the low-level api if needed, but client.models.list() should work.
    
    print(f"DEBUG: API Key loaded: {bool(api_key)}")
    # Note: The SDK is quite new. Pager object is returned.
    pager = client.models.list()
    print(f"DEBUG: Pager object: {pager}")
    count = 0
    
    for model in pager:
        print(f"Model: {model.name}")
        print(f"  Display Name: {model.display_name}")
        print(f"  Supported Actions: {model.supported_generation_methods}")
        if hasattr(model, 'input_token_limit'):
            print(f"  Input Limit: {model.input_token_limit}")
        print("-" * 20)

except Exception as e:
    print(f"Error listing models: {e}")
