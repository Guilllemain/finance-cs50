import requests
import urllib.parse
import os

from flask import redirect, render_template, request, session, url_for
from functools import wraps


ALPHAVANTAGE_API_KEY = os.getenv('ALPHAVANTAGE_API_KEY')
IEXCLOUD_TOKEN = os.getenv('IEXCLOUD_TOKEN')


def apology(message, code=400):
    """Render message as an apology to user."""
    def escape(s):
        """
        Escape special characters.

        https://github.com/jacebrowning/memegen#special-characters
        """
        for old, new in [("-", "--"), (" ", "-"), ("_", "__"), ("?", "~q"),
                         ("%", "~p"), ("#", "~h"), ("/", "~s"), ("\"", "''")]:
            s = s.replace(old, new)
        return s
    return render_template("apology.html", top=code, bottom=escape(message)), code


def login_required(f):
    """
    Decorate routes to require login.

    http://flask.pocoo.org/docs/1.0/patterns/viewdecorators/
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function


def lookup(symbol, multiple = False):
    """Look up quote for symbol."""

    # Contact API
    try:
        if not multiple:
            response = requests.get(
                f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/quote?token={IEXCLOUD_TOKEN}")
            response.raise_for_status()
        else:
            response = requests.get(
                f"https://cloud.iexapis.com/stable/stock/market/batch?symbols={symbol}&types=quote&token={IEXCLOUD_TOKEN}")
            response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def fetch_news(symbol, number = 10):
    """Fetch up latest news."""

    # Contact API
    try:
        response = requests.get(
            f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/news/last/{number}?token={IEXCLOUD_TOKEN}")
        response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def fetch_dividends(symbol, timeframe='2y'):
    """Fetch up latest news."""

    # Contact API
    try:
        response = requests.get(
            f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/dividends/{timeframe}?token={IEXCLOUD_TOKEN}")
        response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def symbol_price_timeserie(symbol, timeframe, now):
    """Fetch up graph data"""
    if now:
        try:
            response = requests.get(
                f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=1min&outputsize=full&apikey={ALPHAVANTAGE_API_KEY}")
            response.raise_for_status()
        except requests.RequestException:
            return None

        # Parse response
        try:
            return response.json()
        except (KeyError, TypeError, ValueError):
            return None
    else:
        try:
            response = requests.get(
                f"https://www.alphavantage.co/query?function=MIDPRICE&symbol={symbol}&interval={timeframe}&time_period=10&apikey={ALPHAVANTAGE_API_KEY}")
            response.raise_for_status()
        except requests.RequestException:
            return None

        # Parse response
        try:
            return response.json()
        except (KeyError, TypeError, ValueError):
            return None

def usd(value):
    """Format value as USD."""
    return f"${value:,.2f}"
