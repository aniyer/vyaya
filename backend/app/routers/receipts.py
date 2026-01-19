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
from sqlalchemy import func, case

from ..database import get_db, SessionLocal
from ..config import get_settings
from ..models import Receipt, Category, get_eastern_date
from ..schemas import (
    ReceiptResponse,
    ReceiptUpdate,
    ReceiptCreate,
    ReceiptListResponse,
    UploadResponse,
    CategoryResponse,
)
from ..services.worker import receipt_queue

router = APIRouter(prefix="/api/receipts", tags=["receipts"])
settings = get_settings()


def ensure_receipts_dir():
    """Ensure receipts directory exists."""
    settings.receipts_dir.mkdir(parents=True, exist_ok=True)


@router.post("", response_model=ReceiptResponse)
async def create_receipt_manual(
    receipt_data: ReceiptCreate,
    db: Session = Depends(get_db),
):
    """
    Create a receipt manually without an image.
    """
    from ..services.currency import convert_to_usd
    
    # Calculate USD amount if currency is provided
    amount_usd = None
    if receipt_data.amount:
        amount_usd = await convert_to_usd(
            receipt_data.amount,
            receipt_data.currency or "USD",
            receipt_data.transaction_date or get_eastern_date()
        )
    
    # Create receipt record
    receipt = Receipt(
        image_path="manual_entry",
        status="completed",
        vendor=receipt_data.vendor,
        amount=receipt_data.amount,
        amount_usd=amount_usd,
        currency=receipt_data.currency,
        transaction_date=receipt_data.transaction_date or get_eastern_date(),
        category_id=receipt_data.category_id
    )
    
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    return receipt


@router.post("/upload", response_model=UploadResponse)
async def upload_receipt(
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
    today = get_eastern_date()
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
    receipt_queue.put((receipt.id, str(file_path)))
    
    return UploadResponse(
        receipt=receipt,
        extraction_confidence=0.0,
        message="Receipt uploaded and queued for processing",
    )


@router.post("/upload-audio", response_model=UploadResponse)
async def upload_audio_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a receipt audio note and start background processing.
    """
    # Validate file type
    allowed_types = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )
    
    ensure_receipts_dir()
    
    # Generate path based on YYYY/MM/DD
    today = get_eastern_date()
    date_path = settings.receipts_dir / f"{today.year}/{today.month:02d}/{today.day:02d}"
    date_path.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    # Identify extension from content type if filename doesn't have it or as fallback
    ext_map = {
        "audio/webm": ".webm",
        "audio/wav": ".wav", 
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a"
    }
    ext = Path(file.filename).suffix or ext_map.get(file.content_type, ".webm")
    
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = date_path / unique_name
    
    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create initial receipt record
    # We use a special image_path prefix or indicator? 
    # Actually, we can just store the audio path. The frontend might need to know if it's audio to display a player or icon.
    # But for now, let's store it. The UI currently assumes image. 
    # We might need to handle this in GET /image/{id} or similar.
    
    receipt = Receipt(
        image_path=str(file_path), # We store audio path here for now
        status="processing",
        vendor="Processing Audio...",
        amount=0.0
    )
    
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    # Queue background task
    receipt_queue.put((receipt.id, str(file_path)))
    
    return UploadResponse(
        receipt=receipt,
        extraction_confidence=0.0,
        message="Audio note uploaded and queued for processing",
    )


@router.get("", response_model=ReceiptListResponse)
async def list_receipts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    q: Optional[str] = Query(None, description="Search query for vendor or OCR text"),
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
    
    # Apply search query
    if q:
        search_filter = (
            Receipt.vendor.ilike(f"%{q}%") | 
            Receipt.raw_ocr_text.ilike(f"%{q}%")
        )
        query = query.filter(search_filter)
    
    # Get total count
    total = query.count()
    
    # Apply pagination with custom sorting
    # Sort processing receipts first, then by date and creation time
    receipts = (
        query.order_by(
            # Processing receipts first (0), then others (1)
            case((Receipt.status == "processing", 0), else_=1),
            Receipt.transaction_date.desc(),
            Receipt.created_at.desc()
        )
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
async def get_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """
    Get a single receipt by ID.
    """
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.put("/{receipt_id}", response_model=ReceiptResponse)
async def update_receipt(
    receipt_id: str,
    update_data: ReceiptUpdate,
    db: Session = Depends(get_db),
):
    """
    Update receipt data (manual override).
    """
    from ..services.currency import convert_to_usd
    
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(receipt, field, value)
    
    # Recalculate USD amount if amount or currency changed
    if 'amount' in update_dict or 'currency' in update_dict:
        if receipt.amount:
            receipt.amount_usd = await convert_to_usd(
                receipt.amount,
                receipt.currency or "USD",
                receipt.transaction_date
            )
    
    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}")
async def delete_receipt(receipt_id: str, db: Session = Depends(get_db)):
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
async def get_receipt_image(receipt_id: str, db: Session = Depends(get_db)):
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
