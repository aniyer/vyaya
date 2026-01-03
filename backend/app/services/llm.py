"""OCR processing service using Gemma 3 (via llama.cpp)."""

import json
import logging
import base64
from datetime import date, datetime
from typing import Optional, Dict, Any
from pathlib import Path

# llama-cpp-python
from llama_cpp import Llama, LlamaGrammar
from llama_cpp.llama_chat_format import Llava15ChatHandler

from ..config import get_settings
from .categorizer import VALID_CATEGORIES

settings = get_settings()
logger = logging.getLogger(__name__)

# Global model instance
_llm_engine = None

# Schema for strict JSON output
RECEIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "vendor": {"type": ["string", "null"]},
        "date": {"type": ["string", "null"]},
        "amount": {"type": ["number", "null"]},
        "currency": {"type": ["string", "null"]},
        "category": {"type": ["string", "null"]}
    },
    "required": ["vendor", "date", "amount", "currency", "category"]
}

def get_llm_engine():
    global _llm_engine
    if _llm_engine is None:
        logger.info("Initializing Gemma 3 4B QAT engine...")
        
        # Paths to local GGUF models
        model_path = "/app/models/google_gemma-3-4b-it-qat-Q4_0.gguf"
        mmproj_path = "/app/models/mmproj-google_gemma-3-4b-it-f16.gguf"
        
        if not Path(model_path).exists() or not Path(mmproj_path).exists():
            raise FileNotFoundError("Gemma 3 model files not found in /app/models")

        # Set up Chat Handler for Multimodal (assuming LLaVA-style projector)
        # using Llava15ChatHandler as a generic handler for mmproj-based models in simple setups.
        # If Gemma 3 has specific needs, this might need adjustment, but this is standard for mmproj.
        chat_handler = Llava15ChatHandler(clip_model_path=mmproj_path)
        
        # Initialize Llama
        # n_ctx=4096 or higher for image+text
        # n_gpu_layers=0 for CPU
        # threads=4 to prevent starvation
        _llm_engine = Llama(
            model_path=model_path,
            chat_handler=chat_handler,
            n_ctx=4096, 
            n_gpu_layers=0,
            n_threads=4,
            n_threads_batch=4,
            verbose=False,
            device="cpu" # Explicitly CPU
        )
        
    return _llm_engine

def image_to_base64_data_uri(file_path: str) -> str:
    with open(file_path, "rb") as img_file:
        base64_data = base64.b64encode(img_file.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_data}"

def extract_json_from_response(text: str) -> Optional[Dict[str, Any]]:
    """Clean markdown code blocks and parse JSON."""
    try:
        # Remove markdown code formatting if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        return json.loads(text.strip())
    except json.JSONDecodeError:
        logger.error(f"Failed to parse JSON from LLM response: {text}")
        return None

def process_receipt_image(image_path: str) -> dict:
    """
    Process a receipt image using Gemma 3.
    """
    if not Path(image_path).exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        llm = get_llm_engine()
        data_uri = image_to_base64_data_uri(image_path)
        
        categories_str = ", ".join(VALID_CATEGORIES)
        
        prompt = f"""
Act as an advanced OCR and data extraction assistant. Analyze the provided receipt image and extract specific data points into a structured JSON format.

### Extraction Instructions:
1. **Vendor**: Identify the official name of the store or service provider.
2. **Date**: Extract the transaction date. Normalize to "YYYY-MM-DD".
3. **Amount**: Locate the final "Total" or "Amount Due". Exclude sub-totals.
4. **Currency**: Identify the currency symbol or code (e.g., USD, EUR, GBP).
5. **Category**: Assign the most relevant category from this list: [{categories_str}].

### Output Schema (Strict JSON):
{{
    "vendor": "string or null",
    "date": "string or null",
    "amount": number or null,
    "currency": "string or null",
    "category": "string or null"
}}
"""        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }
        ]
        
        # Prepare Grammar from Schema
        grammar = LlamaGrammar.from_json_schema(json.dumps(RECEIPT_SCHEMA))

        # Run Inference
        response = llm.create_chat_completion(
            messages=messages,
            temperature=0.1, # Low temperature for factual extraction
            max_tokens=256,
            grammar=grammar # Enforce GBNF
        )
        
        content = response["choices"][0]["message"]["content"]
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
        logger.error(f"LLM processing failed: {e}")
        return {
            "vendor": None,
            "amount": None,
            "date": None,
            "currency": "USD",
            "raw_text": f"Error: {str(e)}",
            "confidence": 0.0,
        }
