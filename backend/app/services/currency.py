"""
Currency conversion service using Frankfurter API.
"""
import logging
from datetime import date
from typing import Optional, Dict

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

FRANKFURTER_API_URL = "https://api.frankfurter.app"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def get_exchange_rate(from_currency: str, to_currency: str = "USD", date_obj: Optional[date] = None) -> Optional[float]:
    """
    Get exchange rate for a specific date or latest.
    """
    try:
        # If date is in the future or today, use latest.
        # Frankfurter allows historical dates.
        if date_obj and date_obj > date.today():
             date_str = "latest"
        elif date_obj:
            date_str = date_obj.isoformat()
        else:
             date_str = "latest"

        url = f"{FRANKFURTER_API_URL}/{date_str}"
        params = {"from": from_currency, "to": to_currency}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if "rates" in data and to_currency in data["rates"]:
                return float(data["rates"][to_currency])
            
            logger.error(f"Rate for {to_currency} not found in response: {data}")
            return None

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
             logger.warning(f"Currency {from_currency} or date {date_str} not supported by Frankfurter API.")
             return None
        logger.error(f"HTTP error fetching exchange rate: {e}")
        raise
    except Exception as e:
        logger.error(f"Error converting currency {from_currency} to {to_currency}: {e}")
        raise

async def convert_to_usd(amount: float, currency: str, date_obj: Optional[date] = None) -> Optional[float]:
    """
    Convert amount to USD.
    Returns None if conversion fails.
    """
    if currency == "USD":
        return amount
        
    if not amount:
        return 0.0

    try:
        rate = await get_exchange_rate(currency, "USD", date_obj)
        if rate:
            return amount * rate
        return None
    except Exception as e:
        logger.error(f"Failed to convert {amount} {currency} to USD: {e}")
        return None
