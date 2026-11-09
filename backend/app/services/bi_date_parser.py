import re
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, Dict, Any

# Indian Standard Time (UTC + 5:30)
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_current_ist_datetime() -> datetime:
    """Returns the current naive datetime in Indian Standard Time (Asia/Kolkata)."""
    now_utc_aware = datetime.now(timezone.utc)
    ist_aware = now_utc_aware + IST_OFFSET
    return ist_aware.replace(tzinfo=None)

def ist_to_utc(dt: datetime) -> datetime:
    """Converts an IST naive datetime to a UTC naive datetime for DB querying."""
    res = dt - IST_OFFSET
    if res.tzinfo is not None:
        res = res.replace(tzinfo=None)
    return res

class BIDateParser:
    """
    Intelligent date and timeframe parser for business queries.
    Supports English, Telugu, and Tenglish time phrases.
    Uses Asia/Kolkata timezone boundaries.
    """

    @classmethod
    def parse_timeframe(cls, text: str) -> Dict[str, Any]:
        """
        Parses text for date ranges.
        Returns:
            {
                "timeframe": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "all_time",
                "label": "Today" | "Yesterday" | "This Month" | ...,
                "label_te": "ఈరోజు" | "నిన్న" | "ఈ నెల" | ...,
                "start_utc": datetime | None,
                "end_utc": datetime,
                "is_comparison": bool,
                "comparison_timeframe": str | None
            }
        """
        lower = text.lower().strip()
        now_ist = get_current_ist_datetime()
        
        # Comparison patterns
        is_comparison = False
        comp_tf = None
        if any(w in lower for w in [
            "compare", "comparison", "versus", "vs", "difference",
            "పోల్చండి", "తేడా", "polchandi", "compare chey", "compare cheyi", "both"
        ]):
            is_comparison = True
            if "yesterday" in lower or "నిన్న" in lower or "ninna" in lower:
                comp_tf = "yesterday"
            elif "last month" in lower or "పోయిన నెల" in lower or "poyina nela" in lower or "gatha nela" in lower:
                comp_tf = "last_month"
            elif "last week" in lower or "పోయిన వారం" in lower or "poyina week" in lower:
                comp_tf = "last_week"
            elif "last year" in lower or "పోయిన సంవత్సరం" in lower:
                comp_tf = "last_year"

        # 1. Yesterday (నిన్న / ninna)
        if re.search(r"\b(?:yesterday|ninna|ninnatidi)\b", lower) or "నిన్న" in text:
            start_ist = datetime(now_ist.year, now_ist.month, now_ist.day) - timedelta(days=1)
            end_ist = start_ist + timedelta(hours=23, minutes=59, seconds=59)
            return {
                "timeframe": "yesterday",
                "label": "Yesterday",
                "label_te": "నిన్న",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf
            }

        # 2. Today (ఈరోజు / eeroju / today)
        if re.search(r"\b(?:today|eeroju|ee\s*roju)\b", lower) or "ఈరోజు" in text or "నేడు" in text:
            start_ist = datetime(now_ist.year, now_ist.month, now_ist.day)
            end_ist = now_ist
            return {
                "timeframe": "today",
                "label": "Today",
                "label_te": "ఈరోజు",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf or ("yesterday" if is_comparison else None)
            }

        # 3. Last Week (పోయిన వారం / last week)
        if re.search(r"\b(?:last\s+week|poyina\s+vaaram|poyina\s+week|gatha\s+vaaram)\b", lower) or "పోయిన వారం" in text or "గత వారం" in text:
            # Monday of last week to Sunday of last week
            current_weekday = now_ist.weekday()  # 0 is Monday
            last_sunday = datetime(now_ist.year, now_ist.month, now_ist.day) - timedelta(days=current_weekday + 1)
            last_monday = last_sunday - timedelta(days=6)
            end_ist = last_sunday + timedelta(hours=23, minutes=59, seconds=59)
            return {
                "timeframe": "last_week",
                "label": "Last Week",
                "label_te": "పోయిన వారం",
                "start_utc": ist_to_utc(last_monday),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf
            }

        # 4. This Week (ఈ వారం / this week)
        if re.search(r"\b(?:this\s+week|ee\s+week|ee\s+vaaram|current\s+week)\b", lower) or "ఈ వారం" in text or "ఈవారం" in text:
            current_weekday = now_ist.weekday()
            start_ist = datetime(now_ist.year, now_ist.month, now_ist.day) - timedelta(days=current_weekday)
            end_ist = now_ist
            return {
                "timeframe": "this_week",
                "label": "This Week",
                "label_te": "ఈ వారం",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf or ("last_week" if is_comparison else None)
            }

        # 5. Last Month (పోయిన నెల / last month)
        if re.search(r"\b(?:last\s+month|poyina\s+nela|poyina\s+month|gatha\s+nela|previous\s+month)\b", lower) or "పోయిన నెల" in text or "గత నెల" in text:
            first_of_this_month = datetime(now_ist.year, now_ist.month, 1)
            last_day_of_last_month = first_of_this_month - timedelta(days=1)
            first_of_last_month = datetime(last_day_of_last_month.year, last_day_of_last_month.month, 1)
            end_ist = last_day_of_last_month + timedelta(hours=23, minutes=59, seconds=59)
            return {
                "timeframe": "last_month",
                "label": "Last Month",
                "label_te": "పోయిన నెల",
                "start_utc": ist_to_utc(first_of_last_month),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf
            }

        # 6. This Month (ఈ నెల / this month)
        if re.search(r"\b(?:this\s+month|ee\s+month|ee\s+nela|current\s+month|\bmonth\b)\b", lower) or "ఈ నెల" in text or "ఈనెల" in text:
            start_ist = datetime(now_ist.year, now_ist.month, 1)
            end_ist = now_ist
            return {
                "timeframe": "this_month",
                "label": "This Month",
                "label_te": "ఈ నెల",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf or ("last_month" if is_comparison else None)
            }

        # 7. Last Year (పోయిన సంవత్సరం / last year)
        if re.search(r"\b(?:last\s+year|poyina\s+year|poyina\s+samvatsaram)\b", lower) or "పోయిన సంవత్సరం" in text:
            start_ist = datetime(now_ist.year - 1, 1, 1)
            end_ist = datetime(now_ist.year - 1, 12, 31, 23, 59, 59)
            return {
                "timeframe": "last_year",
                "label": "Last Year",
                "label_te": "పోయిన సంవత్సరం",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf
            }

        # 8. This Year (ఈ సంవత్సరం / this year)
        if re.search(r"\b(?:this\s+year|ee\s+year|ee\s+samvatsaram)\b", lower) or "ఈ సంవత్సరం" in text:
            start_ist = datetime(now_ist.year, 1, 1)
            end_ist = now_ist
            return {
                "timeframe": "this_year",
                "label": "This Year",
                "label_te": "ఈ సంవత్సరం",
                "start_utc": ist_to_utc(start_ist),
                "end_utc": ist_to_utc(end_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf or ("last_year" if is_comparison else None)
            }

        # 9. All time (మొత్తం / all time / total / overall)
        if re.search(r"\b(?:all\s+time|overall|lifetime|mottam|total)\b", lower) or "మొత్తం" in text:
            return {
                "timeframe": "all_time",
                "label": "Overall",
                "label_te": "మొత్తం",
                "start_utc": None,
                "end_utc": ist_to_utc(now_ist),
                "is_comparison": is_comparison,
                "comparison_timeframe": comp_tf
            }

        # Default fallback: If today or current status is implied
        start_ist = datetime(now_ist.year, now_ist.month, now_ist.day)
        return {
            "timeframe": "today",
            "label": "Today",
            "label_te": "ఈరోజు",
            "start_utc": ist_to_utc(start_ist),
            "end_utc": ist_to_utc(now_ist),
            "is_comparison": is_comparison,
            "comparison_timeframe": comp_tf
        }
