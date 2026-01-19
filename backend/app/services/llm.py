"""OCR processing service using LLM (e.g., Google Gemini or Gemma)."""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

from PIL import Image
from google import genai
from google.genai import types

from ..config import get_settings
from .categorizer import VALID_CATEGORIES

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize LLM Client
client = None
if settings.google_api_key:
    client = genai.Client(api_key=settings.google_api_key)
else:
    logger.warning("GOOGLE_API_KEY not found in settings. Gemini features will be disabled.")

def extract_json_from_response(text: str) -> Optional[Dict[str, Any]]:
    """Clean markdown code blocks and parse JSON."""
    try:
        # Remove markdown code formatting if present
        text = text.strip()
        
        # Try to find the first '{' and last '}' to isolate JSON
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]
        
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse JSON from LLM response: {text}")
        return None

async def process_receipt_image(image_path: str) -> dict:
    """
    Process a receipt image using Google Gemini API.
    """
    if not client:
        return {
            "vendor": None,
            "amount": None,
            "date": None,
            "currency": "USD",
            "raw_text": "Error: Gemini client not initialized (missing API key)",
            "confidence": 0.0,
        }

    if not Path(image_path).exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        # Load image for Gemini
        img = Image.open(image_path)
        
        categories_str = ", ".join(VALID_CATEGORIES)
        
        prompt = f"""
Act as an advanced OCR and data extraction assistant. Analyze the provided receipt image and extract specific data points into a structured JSON format.

### Extraction Instructions:
1. **Vendor**: Identify the official name of the store or service provider.
2. **Date**: Extract the transaction date. Normalize to "YYYY-MM-DD".
3. **Amount**: Locate the final "Total" or "Amount Due". Exclude sub-totals.
4. **Currency**: Extract the 3-letter ISO 4217 currency code (e.g., USD, EUR, GBP, INR). Convert symbols if necessary (e.g., "$" -> "USD", "€" -> "EUR", "₹" -> "INR").
5. **Category**: Assign the most relevant category from this list: [{categories_str}].

### Output Schema (Strict JSON):
{{
    "vendor": "string or null",
    "date": "string or null",
    "amount": number or null,
    "currency": "string or null",
    "category": "string or null"
}}

Respond ONLY with valid JSON matching this schema. Do not include any other text.
"""        
        
        logger.info(f"Calling LLM API with model {settings.llm_model}")
        
        # Call Gemini using google-genai SDK
        # We use a synchronous call in an executor or just run it since it's likely blocking if not using async client
        # google-genai client.models.generate_content is synchronous by default.
        # However, we are in an async function.
        
        response = client.models.generate_content(
            model=settings.llm_model,
            contents=[prompt, img],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1024, # Increased for potentially longer reasoning
            )
        )
        
        content = response.text
        logger.info(f"LLM Response: {content}")
        
        parsed_data = extract_json_from_response(content) or {}
        
        # Convert date string to object
        date_obj = None
        if parsed_data.get("date"):
            try:
                date_obj = datetime.strptime(parsed_data["date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        return {
            "vendor": parsed_data.get("vendor"),
            "amount": parsed_data.get("amount"),
            "date": date_obj,
            "currency": parsed_data.get("currency", "USD"),
            "category": parsed_data.get("category"),
            "raw_text": content, # Store full LLM response as raw text
            "confidence": 1.0 
        }

    except Exception as e:
        logger.error(f"Gemini processing failed: {e}")
        return {
            "confidence": 0.0,
        }

async def process_receipt_audio(audio_path: str) -> dict:
    """
    Process a receipt audio recording using Google GenAI (brand: Gemini/Gemma).
    """
    if not client:
        return {
            "vendor": None,
            "amount": None,
            "date": None,
            "currency": "USD",
            "raw_text": "Error: GenAI client not initialized (missing API key)",
            "confidence": 0.0,
        }

    if not Path(audio_path).exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        # Load audio file
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        # Determine mime type based on extension
        ext = Path(audio_path).suffix.lower()
        mime_type = "audio/wav" if ext == ".wav" else "audio/webm"
        
        categories_str = ", ".join(VALID_CATEGORIES)
        
        prompt = f"""
Act as an advanced receipt data extraction assistant. Listen to the audio recording where a user describes a purchase and extract specific data points into a structured JSON format.

### Extraction Instructions:
1. **Vendor**: Identify the store or service provider mentioned.
2. **Date**: Extract the transaction date if mentioned (e.g., "yesterday", "last friday", "on January 12th"). Convert relative dates to absolute YYYY-MM-DD based on today's date: {datetime.now().strftime("%Y-%m-%d")}.
3. **Amount**: Extract the total amount spent.
4. **Currency**: Extract the currency if mentioned, otherwise default to USD.
5. **Category**: Assign the most relevant category from this list: [{categories_str}].

### Output Schema (Strict JSON):
{{
    "vendor": "string or null",
    "date": "string or null",
    "amount": number or null,
    "currency": "string or null",
    "category": "string or null"
}}

Respond ONLY with valid JSON matching this schema. Do not include any other text.
"""        
        
        # Use Gemini Flash Latest as stable fallback
        audio_model = "models/gemini-flash-latest"
        logger.info(f"Calling LLM API with model {audio_model} for audio processing")
        
        response = client.models.generate_content(
            model=audio_model,
            contents=[
                prompt,
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1024,
            )
        )
        
        content = response.text
        logger.info(f"LLM Audio Response: {content}")
        
        parsed_data = extract_json_from_response(content) or {}
        
        # Convert date string to object
        date_obj = None
        if parsed_data.get("date"):
            try:
                date_obj = datetime.strptime(parsed_data["date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        return {
            "vendor": parsed_data.get("vendor"),
            "amount": parsed_data.get("amount"),
            "date": date_obj,
            "currency": parsed_data.get("currency", "USD"),
            "category": parsed_data.get("category"),
            "raw_text": content,
            "confidence": 1.0 
        }

    except Exception as e:
        logger.error(f"GenAI audio processing failed: {e}")
        return {
            "vendor": None,
            "amount": None,
            "date": None,
            "currency": "USD",
            "raw_text": f"Error: {str(e)}",
            "confidence": 0.0,
        }
