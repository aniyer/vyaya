"""Auto-categorization service based on vendor names."""

from typing import Optional
from sqlalchemy.orm import Session

from ..models import Category


# Keyword mappings for auto-categorization
CATEGORY_KEYWORDS = {
    "Groceries": [
        "walmart", "kroger", "safeway", "trader joe", "whole foods", "aldi",
        "publix", "costco", "sam's club", "target", "grocery", "market",
        "food lion", "wegmans", "heb", "meijer", "sprouts", "fresh",
    ],
    "Dining": [
        "restaurant", "cafe", "coffee", "mcdonald", "starbucks", "chipotle",
        "subway", "pizza", "burger", "taco", "wendy", "chick-fil-a",
        "dunkin", "panera", "deli", "bakery", "grill", "kitchen",
        "diner", "bistro", "eatery", "bar & grill",
    ],
    "Fuel": [
        "shell", "exxon", "chevron", "bp", "gas station", "mobil",
        "speedway", "circle k", "wawa", "pilot", "loves", "fuel",
        "petroleum", "texaco", "phillips 66", "marathon", "valero",
    ],
    "Utilities": [
        "electric", "water", "gas", "internet", "comcast", "at&t",
        "verizon", "t-mobile", "sprint", "utility", "power", "energy",
        "cable", "phone", "wireless", "spectrum", "xfinity",
    ],
    "Shopping": [
        "amazon", "best buy", "apple store", "nordstrom", "macy",
        "kohls", "jcpenney", "ross", "tj maxx", "marshalls", "home depot",
        "lowes", "ikea", "bed bath", "williams sonoma", "pottery barn",
    ],
    "Healthcare": [
        "pharmacy", "cvs", "walgreens", "hospital", "clinic", "doctor",
        "medical", "dental", "optometry", "vision", "health", "rx",
        "prescription", "urgent care", "lab", "diagnostic",
    ],
    "Transportation": [
        "uber", "lyft", "taxi", "metro", "transit", "parking", "toll",
        "dmv", "auto", "car wash", "oil change", "tire", "mechanic",
        "rental car", "hertz", "enterprise", "avis",
    ],
    "Entertainment": [
        "netflix", "spotify", "hulu", "disney", "movie", "theater",
        "cinema", "concert", "ticket", "amc", "regal", "game",
        "playstation", "xbox", "steam", "arcade",
    ],
}

# List of valid categories for external use (e.g., LLM prompting)
VALID_CATEGORIES = list(CATEGORY_KEYWORDS.keys())


def auto_categorize(vendor_name: str, db: Session) -> Optional[Category]:
    """
    Automatically categorize a receipt based on vendor name.
    
    Args:
        vendor_name: The vendor/store name from the receipt
        db: Database session
        
    Returns:
        Category object if matched, None otherwise
    """
    if not vendor_name:
        return None
    
    vendor_lower = vendor_name.lower()
    
    # Find matching category
    matched_category_name = None
    for category_name, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in vendor_lower:
                matched_category_name = category_name
                break
        if matched_category_name:
            break
    
    if matched_category_name:
        category = db.query(Category).filter(
            Category.name == matched_category_name
        ).first()
        return category
    
    return None
