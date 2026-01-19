"""Dashboard analytics API endpoints."""

from datetime import date, datetime
from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from ..database import get_db
from ..models import Receipt, Category, get_eastern_date
from ..schemas import (
    DashboardSummary,
    SpendingTrends,
    CategorySpending,
    MonthlySpending,
    CategoryResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Get dashboard summary with current month spending and category breakdown.
    """
    today = get_eastern_date()
    current_month_start = today.replace(day=1)
    previous_month_start = (current_month_start - relativedelta(months=1))
    previous_month_end = current_month_start - relativedelta(days=1)
    
    # Current month totals
    current_month_result = db.query(
        func.coalesce(func.sum(Receipt.amount_usd), 0).label("total"),
        func.count(Receipt.id).label("count"),
    ).filter(
        Receipt.transaction_date >= current_month_start,
        Receipt.transaction_date <= today,
    ).first()
    
    current_month_total = float(current_month_result.total or 0)
    current_month_count = current_month_result.count or 0
    
    # Previous month totals
    previous_month_result = db.query(
        func.coalesce(func.sum(Receipt.amount_usd), 0).label("total"),
    ).filter(
        Receipt.transaction_date >= previous_month_start,
        Receipt.transaction_date <= previous_month_end,
    ).first()
    
    previous_month_total = float(previous_month_result.total or 0)
    
    # Month-over-month change
    if previous_month_total > 0:
        mom_change = ((current_month_total - previous_month_total) / previous_month_total) * 100
    else:
        mom_change = 100.0 if current_month_total > 0 else 0.0
    
    # Category breakdown for current month
    category_data = db.query(
        Category.id,
        Category.name,
        Category.icon,
        Category.color,
        func.coalesce(func.sum(Receipt.amount_usd), 0).label("total"),
        func.count(Receipt.id).label("count"),
    ).outerjoin(
        Receipt,
        (Receipt.category_id == Category.id) &
        (Receipt.transaction_date >= current_month_start) &
        (Receipt.transaction_date <= today),
    ).group_by(Category.id).all()
    
    category_breakdown = [
        CategorySpending(
            category_id=cat.id,
            category_name=cat.name,
            icon=cat.icon,
            color=cat.color,
            total=float(cat.total or 0),
            count=cat.count or 0,
        )
        for cat in category_data
        if cat.total > 0  # Only include categories with spending
    ]
    
    return DashboardSummary(
        current_month_total=current_month_total,
        current_month_count=current_month_count,
        previous_month_total=previous_month_total,
        month_over_month_change=round(mom_change, 1),
        category_breakdown=category_breakdown,
    )


@router.get("/trends", response_model=SpendingTrends)
async def get_spending_trends(
    months: int = 12,
    db: Session = Depends(get_db),
):
    """
    Get spending trends for the last N months.
    """
    today = get_eastern_date()
    start_date = (today.replace(day=1) - relativedelta(months=months - 1))
    
    # Query monthly spending
    monthly_data = db.query(
        extract("year", Receipt.transaction_date).label("year"),
        extract("month", Receipt.transaction_date).label("month"),
        func.coalesce(func.sum(Receipt.amount_usd), 0).label("total"),
        func.count(Receipt.id).label("count"),
    ).filter(
        Receipt.transaction_date >= start_date,
        Receipt.transaction_date <= today,
    ).group_by(
        extract("year", Receipt.transaction_date),
        extract("month", Receipt.transaction_date),
    ).order_by(
        extract("year", Receipt.transaction_date),
        extract("month", Receipt.transaction_date),
    ).all()
    
    # Build complete month list (including months with no spending)
    result = []
    current = start_date
    end = today.replace(day=1)
    
    monthly_dict = {
        (int(m.year), int(m.month)): (float(m.total), m.count)
        for m in monthly_data
    }
    
    while current <= end:
        year, month = current.year, current.month
        total, count = monthly_dict.get((year, month), (0.0, 0))
        result.append(MonthlySpending(
            year=year,
            month=month,
            total=total,
            count=count,
        ))
        current = current + relativedelta(months=1)
    
    return SpendingTrends(monthly_data=result)


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """
    Get all categories.
    """
    categories = db.query(Category).order_by(Category.name).all()
    return categories
