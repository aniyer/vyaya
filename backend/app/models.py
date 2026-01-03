"""SQLAlchemy ORM models for receipt management."""

import uuid
from datetime import datetime, date
from zoneinfo import ZoneInfo
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base



def get_eastern_time():
    """Get current time in Eastern Timezone as naive datetime."""
    return datetime.now(ZoneInfo("US/Eastern")).replace(tzinfo=None)


def get_eastern_date():
    """Get current date in Eastern Timezone."""
    return datetime.now(ZoneInfo("US/Eastern")).date()


class Category(Base):
    """Category for organizing receipts."""
    
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    icon = Column(String(50), default="📁")
    color = Column(String(7), default="#6366f1")  # Hex color
    
    # Relationship
    receipts = relationship("Receipt", back_populates="category")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"


class Receipt(Base):
    """Receipt record with extracted data."""
    
    __tablename__ = "receipts"
    
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    vendor = Column(String(255), index=True)
    amount = Column(Float, nullable=True)
    currency = Column(String(3), default="USD")
    transaction_date = Column(Date, nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    image_path = Column(String(500), nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    status = Column(String(20), default="processing", index=True)  # processing, review, completed, failed
    created_at = Column(DateTime, default=get_eastern_time)
    updated_at = Column(DateTime, default=get_eastern_time, onupdate=get_eastern_time)
    
    # Relationship
    category = relationship("Category", back_populates="receipts")
    
    def __repr__(self):
        return f"<Receipt(id={self.id}, vendor='{self.vendor}', status='{self.status}')>"


# Default categories to seed
DEFAULT_CATEGORIES = [
    {"name": "Groceries", "icon": "🛒", "color": "#22c55e"},
    {"name": "Dining", "icon": "🍽️", "color": "#f97316"},
    {"name": "Fuel", "icon": "⛽", "color": "#eab308"},
    {"name": "Utilities", "icon": "💡", "color": "#3b82f6"},
    {"name": "Shopping", "icon": "🛍️", "color": "#8b5cf6"},
    {"name": "Healthcare", "icon": "🏥", "color": "#ef4444"},
    {"name": "Transportation", "icon": "🚗", "color": "#06b6d4"},
    {"name": "Entertainment", "icon": "🎬", "color": "#ec4899"},
    {"name": "Other", "icon": "📄", "color": "#64748b"},
]
