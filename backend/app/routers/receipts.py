"""Receipt CRUD API endpoints."""

import os
import uuid
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from PIL import Image, ExifTags
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db, SessionLocal
from ..config import get_settings
from ..models import Receipt, Category
from ..schemas import (
    ReceiptResponse,
    ReceiptUpdate,
    ReceiptCreate,
    ReceiptListResponse,
    UploadResponse,
    CategoryResponse,
)
from ..services.llm import process_receipt_image
from ..services.categorizer import auto_categorize

router = APIRouter(prefix="/api/receipts", tags=["receipts"])
settings = get_settings()


def ensure_receipts_dir():
    """Ensure receipts directory exists."""
    settings.receipts_dir.mkdir(parents=True, exist_ok=True)


def process_receipt_background(receipt_id: int, file_path: str):
    """
    Background task to process receipt OCR and extraction.
    """
    db = SessionLocal()
    try:
        # Get receipt record
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return

        # Extract date from metadata or fallback to EST
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
            print(f"Error extracting metadata: {e}")

        if not extracted_date:
            # Fallback to current time in EST
            est = ZoneInfo("US/Eastern")
            extracted_date = datetime.now(est).date()

        # LLM extraction might override if it's confident, but requirements say 
        # "use timestamp of image meta data" so we set it here.
        # We can let LLM refine it if we trust LLM more for the *printed* date, 
        # but user request specifically asked for metadata timestamp.
        # Let's set it as default and allow LLM to override ONLY if metadata was missing?
        # actually user said: "when determining ... use timestamp of image meta data"
        # and "if time is not available ... use current time in EST"
        # This implies Metadata > EST. 
        # What about the printed date on receipt? Usually that's what people want.
        # But strictly following "use timestamp of image meta data":
        
        receipt.transaction_date = extracted_date
        
        # Note: We are ignoring LLM extracted date for now based on strict reading of request.
        # If we wanted to support LLM date, we would check if extracted_date came from Exif or EST.
            
        try:
            ocr_result = process_receipt_image(file_path)
            
            # Update receipt with extracted data
            receipt.vendor = ocr_result.get("vendor")
            receipt.amount = ocr_result.get("amount")
            receipt.currency = ocr_result.get("currency", "USD")
            
            # If we want to prefer the Printed Date over the Metadata Date (which is common),
            # we would use ocr_result.get("date") here. 
            # However, the user request was specific about metadata.
            # often image metadata is capture time, transaction time is printed.
            # I will stick to metadata as requested, but if LLM finds a date, maybe we should use it?
            # Re-reading: "when determining date/time for a receipt, use the timestamp of image meta data"
            # This sounds like a rule to define the *transaction* time.
            # I will use the metadata date.
            
            receipt.raw_ocr_text = ocr_result.get("raw_text")
            
            # Auto-categorize
            if ocr_result.get("category"):
                # Try to find category by name returned by LLM
                category = db.query(Category).filter(
                    func.lower(Category.name) == func.lower(ocr_result["category"])
                ).first()
                if category:
                    receipt.category_id = category.id
            
            # Fallback to keyword categorization if LLM failed or returned null
            if not receipt.category_id and receipt.vendor:
                category = auto_categorize(receipt.vendor, db)
                if category:
                    receipt.category_id = category.id

            receipt.status = "review"
            
        except Exception as e:
            receipt.status = "failed"
            receipt.raw_ocr_text = f"Processing failed: {str(e)}"
            
        db.commit()
        
    except Exception as e:
        print(f"Background task failed: {e}")
    finally:
        db.close()


@router.post("", response_model=ReceiptResponse)
async def create_receipt_manual(
    receipt_data: ReceiptCreate,
    db: Session = Depends(get_db),
):
    """
    Create a receipt manually without an image.
    """
    # Create receipt record
    receipt = Receipt(
        image_path="manual_entry",
        status="completed",
        vendor=receipt_data.vendor,
        amount=receipt_data.amount,
        currency=receipt_data.currency,
        transaction_date=receipt_data.transaction_date or date.today(),
        category_id=receipt_data.category_id
    )
    
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    return receipt


@router.post("/upload", response_model=UploadResponse)
async def upload_receipt(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a receipt image and start background processing.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )
    
    ensure_receipts_dir()
    
    # Generate path based on YYYY/MM/DD
    today = date.today()
    date_path = settings.receipts_dir / f"{today.year}/{today.month:02d}/{today.day:02d}"
    date_path.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    ext = Path(file.filename).suffix or ".jpg"
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = date_path / unique_name
    
    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create initial receipt record
    receipt = Receipt(
        image_path=str(file_path),
        status="processing",
        vendor="Processing...",
        amount=0.0
    )
    
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    # Queue background task
    background_tasks.add_task(process_receipt_background, receipt.id, str(file_path))
    
    return UploadResponse(
        receipt=receipt,
        extraction_confidence=0.0,
        message="Receipt uploaded and processing started",
    )


@router.get("", response_model=ReceiptListResponse)
async def list_receipts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    List all receipts with pagination and filtering.
    """
    query = db.query(Receipt)
    
    # Apply filters
    if category_id:
        query = query.filter(Receipt.category_id == category_id)
    if start_date:
        query = query.filter(Receipt.transaction_date >= start_date)
    if end_date:
        query = query.filter(Receipt.transaction_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    receipts = (
        query.order_by(Receipt.transaction_date.desc(), Receipt.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    
    pages = (total + per_page - 1) // per_page  # Ceiling division
    
    return ReceiptListResponse(
        items=receipts,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    """
    Get a single receipt by ID.
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.put("/{receipt_id}", response_model=ReceiptResponse)
async def update_receipt(
    receipt_id: int,
    update_data: ReceiptUpdate,
    db: Session = Depends(get_db),
):
    """
    Update receipt data (manual override).
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(receipt, field, value)
    
    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}")
async def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    """
    Delete a receipt and its associated image.
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Delete image file
    if receipt.image_path:
        image_path = Path(receipt.image_path)
        image_path.unlink(missing_ok=True)
    
    db.delete(receipt)
    db.commit()
    
    return {"message": "Receipt deleted successfully"}


@router.get("/image/{receipt_id}")
async def get_receipt_image(receipt_id: int, db: Session = Depends(get_db)):
    """
    Get receipt image file.
    """
    from fastapi.responses import FileResponse
    
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    image_path = Path(receipt.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    
    return FileResponse(image_path)
