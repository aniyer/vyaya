"""OCR processing service using MiniCPM-V (via llama.cpp)."""

import json
import logging
import base64
from datetime import date, datetime
from typing import Optional, Dict, Any
from pathlib import Path

# llama-cpp-python
from llama_cpp import Llama
from llama_cpp.llama_chat_format import MiniCPMv26ChatHandler

from ..config import get_settings
from .categorizer import VALID_CATEGORIES

settings = get_settings()
logger = logging.getLogger(__name__)

# Global model instance
_llm_engine = None

def get_llm_engine():
    global _llm_engine
    if _llm_engine is None:
        logger.info("Initializing MiniCPM-V engine...")
        
        # Paths to local GGUF models
        model_path = "/app/models/MiniCPM-V-2_6-Q4_K_M.gguf"
        mmproj_path = "/app/models/mmproj-model-f16.gguf"
        
        if not Path(model_path).exists() or not Path(mmproj_path).exists():
            raise FileNotFoundError("MiniCPM-V model files not found in /app/models")

        # Set up Chat Handler for MiniCPM-V 2.6
        chat_handler = MiniCPMv26ChatHandler(clip_model_path=mmproj_path)
        
        # Initialize Llama
        # n_ctx=4096 or higher for image+text
        # n_gpu_layers=0 for CPU
        _llm_engine = Llama(
            model_path=model_path,
            chat_handler=chat_handler,
            n_ctx=4096, 
            n_gpu_layers=0,
            verbose=False
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
    Process a receipt image using MiniCPM-V.
    """
    if not Path(image_path).exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        llm = get_llm_engine()
        data_uri = image_to_base64_data_uri(image_path)
        
        categories_str = ", ".join(VALID_CATEGORIES)
        
        prompt = f"""
        Analyze this receipt image and extract the following information in JSON format:
        {{
            "vendor": "Store Name",
            "date": "YYYY-MM-DD",
            "amount": 0.00,
            "currency": "USD" (or EUR, GBP, CAD),
            "category": "One of: {categories_str}"
        }}
        Amount is typically in the format Total: $123.45 or Total: 123.45 USD.
        Select the most appropriate category based on the items and vendor.
        Only return the JSON object. If a field is not found, use null.
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
        
        # Run Inference
        response = llm.create_chat_completion(
            messages=messages,
            temperature=0.1, # Low temperature for factual extraction
            max_tokens=256
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
            "confidence": 1.0 # LLM doesn't give confidence score easily
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
