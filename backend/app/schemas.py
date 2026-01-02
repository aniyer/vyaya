"""Pydantic schemas for request/response validation."""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Category Schemas ============

class CategoryBase(BaseModel):
    """Base category schema."""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str = Field(default="📁", max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""
    pass


class CategoryResponse(CategoryBase):
    """Schema for category response."""
    id: int
    
    class Config:
        from_attributes = True


# ============ Receipt Schemas ============

class ReceiptBase(BaseModel):
    """Base receipt schema."""
    vendor: Optional[str] = Field(None, max_length=255)
    amount: Optional[float] = Field(None, ge=0)
    currency: str = Field(default="USD", max_length=3)
    transaction_date: Optional[date] = None
    category_id: Optional[int] = None


class ReceiptCreate(ReceiptBase):
    """Schema for creating a receipt (manual entry)."""
    image_path: Optional[str] = None


class ReceiptUpdate(BaseModel):
    """Schema for updating a receipt (manual override)."""
    vendor: Optional[str] = Field(None, max_length=255)
    amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    transaction_date: Optional[date] = None
    category_id: Optional[int] = None


class ReceiptResponse(ReceiptBase):
    """Schema for receipt response."""
    id: int
    image_path: str
    raw_ocr_text: Optional[str] = None
    status: str = "processing"
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True


class ReceiptListResponse(BaseModel):
    """Schema for paginated receipt list."""
    items: List[ReceiptResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ============ Upload Response ============

class UploadResponse(BaseModel):
    """Schema for upload and OCR processing response."""
    receipt: ReceiptResponse
    extraction_confidence: float = Field(ge=0, le=1)
    message: str


# ============ Dashboard Schemas ============

class CategorySpending(BaseModel):
    """Spending for a single category."""
    category_id: int
    category_name: str
    icon: str
    color: str
    total: float
    count: int


class MonthlySpending(BaseModel):
    """Monthly spending summary."""
    year: int
    month: int
    total: float
    count: int


class DashboardSummary(BaseModel):
    """Dashboard overview data."""
    current_month_total: float
    current_month_count: int
    previous_month_total: float
    month_over_month_change: float  # Percentage change
    category_breakdown: List[CategorySpending]


class SpendingTrends(BaseModel):
    """Historical spending trends."""
    monthly_data: List[MonthlySpending]
