import requests
import urllib.parse

from flask import redirect, render_template, request, session
from functools import wraps


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
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated_function


def lookup(symbol):
    """Look up quote for symbol."""

    # Contact API
    try:
        response = requests.get(
            f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/quote?token=pk_5090c32b331348cf8e034e7fa7a140fd")
        response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def fetchNews(symbol, number = 10):
    """Fetch up latest news."""

    # Contact API
    try:
        response = requests.get(
            f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/news/last/{number}?token=pk_5090c32b331348cf8e034e7fa7a140fd")
        response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def fetchDividends(symbol, timeframe='2y'):
    """Fetch up latest news."""

    # Contact API
    try:
        response = requests.get(
            f"https://cloud.iexapis.com/stable/stock/{urllib.parse.quote_plus(symbol)}/dividends/{timeframe}?token=pk_5090c32b331348cf8e034e7fa7a140fd")
        response.raise_for_status()
    except requests.RequestException:
        return None

    # Parse response
    try:
        print('HHHHHHH4', response.json())
        return response.json()
    except (KeyError, TypeError, ValueError):
        return None


def usd(value):
    """Format value as USD."""
    return f"${value:,.2f}"
