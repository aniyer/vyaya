"""
Background worker for sequential receipt processing.
"""
import logging
import queue
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
from typing import Optional

from PIL import Image, ExifTags
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import SessionLocal
from ..models import Receipt, Category, get_eastern_date
from ..services.llm import process_receipt_image
from ..services.categorizer import auto_categorize

logger = logging.getLogger(__name__)

# Global processing queue
# Tuples of (receipt_id, image_path_str)
receipt_queue = queue.Queue()

def process_receipt_task(receipt_id: str, file_path: str):
    """
    Process a single receipt. This runs inside the worker thread.
    """
    logger.info(f"Starting processing for receipt {receipt_id}")
    db = SessionLocal()
    try:
        # Get receipt record
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            logger.error(f"Receipt {receipt_id} not found immediately during processing")
            return

        # Broad try/except to ensure we catch *anything* and update status
        try:
            # 1. Metadata Extraction
            extracted_date = None
            try:
                with Image.open(file_path) as img:
                    exif = img._getexif()
                    if exif:
                        for tag, value in exif.items():
                            if tag in ExifTags.TAGS and ExifTags.TAGS[tag] == 'DateTimeOriginal':
                                # Format: YYYY:MM:DD HH:MM:SS
                                extracted_date = datetime.strptime(value, '%Y:%m:%d %H:%M:%S').date()
                                break
            except Exception as e:
                logger.warning(f"Error extracting metadata for receipt {receipt_id}: {e}")

            if not extracted_date:
                # Fallback to current time in EST
                extracted_date = get_eastern_date()

            receipt.transaction_date = extracted_date

            # 2. LLM Extraction
            ocr_result = process_receipt_image(file_path)
            
            # Check for explicit failure returned by LLM service
            if ocr_result.get("confidence") == 0.0 and "Error" in ocr_result.get("raw_text", ""):
                 raise Exception(ocr_result.get("raw_text"))

            # Update receipt with extracted data
            receipt.vendor = ocr_result.get("vendor")
            receipt.amount = ocr_result.get("amount")
            receipt.currency = ocr_result.get("currency", "USD")
            receipt.raw_ocr_text = ocr_result.get("raw_text")
            
            # 3. Categorization
            if ocr_result.get("category"):
                # Try to find category by name returned by LLM
                category = db.query(Category).filter(
                    func.lower(Category.name) == func.lower(ocr_result["category"])
                ).first()
                if category:
                    receipt.category_id = category.id
            
            # Fallback to keyword categorization
            if not receipt.category_id and receipt.vendor:
                category = auto_categorize(receipt.vendor, db)
                if category:
                    receipt.category_id = category.id

            receipt.status = "review"
            logger.info(f"Receipt {receipt_id} processed successfully")

        except Exception as e:
            logger.error(f"Processing failed for receipt {receipt_id}: {e}", exc_info=True)
            receipt.status = "failed"
            receipt.raw_ocr_text = f"Processing failed: {str(e)}"
            
        db.commit()
        
    except Exception as e:
        logger.critical(f"Critical error in worker for receipt {receipt_id}: {e}", exc_info=True)
    finally:
        db.close()


def worker_loop():
    """
    Main loop for the background worker thread.
    """
    logger.info("Receipt processing worker started")
    while True:
        try:
            # Blocking get
            receipt_id, file_path = receipt_queue.get()
            if receipt_id is None: # poison pill
                break
            
            process_receipt_task(receipt_id, file_path)
            
            receipt_queue.task_done()
        except Exception as e:
            logger.error(f"Error in worker loop: {e}", exc_info=True)


def start_worker():
    """Start the background worker thread."""
    thread = threading.Thread(target=worker_loop, daemon=True)
    thread.start()
    return thread
