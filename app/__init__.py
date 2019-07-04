import os

from cs50 import SQL
from flask_cors import CORS
from flask import Flask
from flask_session import Session
from config import Config
from werkzeug.exceptions import default_exceptions, HTTPException, InternalServerError
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from helpers import apology, usd

# Configure application
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config.from_object(Config)
# db = SQLAlchemy(app)
# migrate = Migrate(app, db)
Session(app)

# Custom filter
app.jinja_env.filters["usd"] = usd

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///finance.db")

from app import routes


# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


def errorhandler(e):
    """Handle error"""
    if not isinstance(e, HTTPException):
        e = InternalServerError()
    return apology(e.name, e.code)


# Listen for errors
for code in default_exceptions:
    app.errorhandler(code)(errorhandler)
