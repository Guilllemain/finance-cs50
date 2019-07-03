import os

from cs50 import SQL
from flask_cors import CORS
from flask import Flask, flash, jsonify, redirect, render_template, request, session
from flask_session import Session
from config import Config
from werkzeug.exceptions import default_exceptions, HTTPException, InternalServerError
from werkzeug.security import check_password_hash, generate_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from helpers import apology, login_required, lookup, usd, fetchNews, fetchDividends

# Configure application
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

# Custom filter
app.jinja_env.filters["usd"] = usd

Session(app)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///finance.db")


@app.route("/")
def index():
    return render_template('home.html')

@app.route("/dashboard")
@login_required
def dashboard():
    """Show portfolio of stocks"""
    stocks = []

    # get the cash left for the user
    cash_left = db.execute(
        'SELECT cash FROM users WHERE id = :id', id=session.get('user_id'))[0]['cash']

    # extract all transactions from the database for this symbol with the average price and the total number of shares
    transactions = db.execute(
        'SELECT *, AVG(price) as avg_price, SUM(shares) as sum FROM transactions JOIN symbols ON symbols.id = transactions.symbol_id WHERE user_id = :user_id GROUP BY symbols.symbol', user_id=session.get('user_id'))
    wallet_value = cash_left
    symbols_list = ','.join([el['symbol'] for el in transactions])
    symbols_details = lookup(symbols_list, True)
    
    if transactions:
        for transaction in transactions:
            if transaction['sum'] > 0:
                symbol = transaction['symbol']
                name = symbols_details[symbol]['quote']['companyName']
                price = symbols_details[symbol]['quote']['latestPrice']
                shares = transaction['sum']
                bought = transaction['avg_price']
                total = float(shares) * symbols_details[symbol]['quote']['latestPrice']
                variation = round(
                    ((total - (float(shares) * bought)) / (float(shares) * bought)) * 100, 2)
                stocks.append({ 'symbol': symbol, 'name': name, 'shares': shares, 'price': price, 'bought': bought, 'total': total, 'variation': variation })
                wallet_value += total

    return render_template("dashboard.html", stocks=stocks, cash=cash_left, wallet_value=wallet_value)


@app.route("/buy", methods=["POST"])
@login_required
def buy():
    """Buy shares of stock"""
    symbol = request.form.get('symbol')
    price = request.form.get('price')
    if not request.form.get("shares"):
        return apology('You must provide a positive number', 403)
    # total cost of the transaction
    total = float(request.form.get("shares")) * float(price)
    
    # get the cash from the user 
    user_cash = db.execute('SELECT cash FROM users WHERE id = :id', id=session.get('user_id'))[0]['cash']

    # check if the user can afford the stock
    cash_left = user_cash - total
    if (cash_left < 0):
        return apology('You cannot afford it')

    # insert the requested symbol into the symbol table if it doesn't exists
    is_symbol_present = db.execute(
        'SELECT symbol FROM symbols WHERE symbol = :symbol', symbol=symbol)
    if not is_symbol_present:
        db.execute('INSERT INTO symbols (symbol) VALUES(:symbol)', symbol=symbol)
    
    # get the id from the requested symbol
    symbol_id = db.execute('SELECT id FROM symbols WHERE symbol = :symbol', symbol=symbol)[0]['id']

    # add the transaction to the table
    db.execute('INSERT INTO transactions (user_id, symbol_id, shares, price) VALUES (:user_id, :symbol_id, :shares, :price)', user_id=session.get('user_id'), symbol_id=symbol_id, shares=int(request.form.get("shares")), price=price)
    
    # update the user's cash
    db.execute('UPDATE users SET cash = :cash WHERE id = :id',
                cash=cash_left, id=session.get('user_id'))
    flash('You successfully bought {} shares of {}'.format(
        request.form.get("shares"), symbol))
    return redirect('/')


@app.route("/check", methods=["GET"])
def check():
    """Return true if username available, else false, in JSON format"""
    username = request.args.get('username')
    is_username_taken = db.execute('SELECT * FROM users WHERE username = :username', username=username)
    if is_username_taken or len(username) < 1:
        return jsonify(False)
    return jsonify(True)


@app.route("/history")
@login_required
def history():
    """Show history of transactions"""
    stocks = []
    transactions = db.execute(
        'SELECT * FROM transactions JOIN symbols ON symbols.id = transactions.symbol_id WHERE user_id = :user_id', user_id=session.get('user_id'))
    if transactions:
        for transaction in transactions:
            symbol = transaction['symbol']
            price = transaction['price']
            shares = transaction['shares']
            date = transaction['date']
            total = float(abs(shares)) * transaction['price']
            stocks.append({'symbol': symbol, 'shares': shares, 'price': price, 'date': date, 'total': total})

    return render_template("history.html", stocks=stocks)


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":

        # Ensure username was submitted
        if not request.form.get("username"):
            return apology("must provide username", 403)

        # Ensure password was submitted
        elif not request.form.get("password"):
            return apology("must provide password", 403)

        next_url = request.form.get('next_url')

        # Query database for username
        rows = db.execute("SELECT * FROM users WHERE username = :username",
                          username=request.form.get("username"))

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(rows[0]["hash"], request.form.get("password")):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]

        # Redirect user to home page
        flash('You successfully logged in')
        return redirect(next_url)

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.route("/quote", methods=["POST"])
def quote():
    """Get stock quote."""
    quote = lookup(request.form.get('symbol'))
    if not quote:
        return apology('Symbol does not exists', 403)

    variation = {'value': round(quote['latestPrice'] - quote['close'], 2), 'perc': round(((quote['latestPrice'] - quote['close']) / quote['close']) * 100, 2)}
    dividends = fetchDividends(quote['symbol'])
    
    # get all the news for this symbol
    news = fetchNews(quote['symbol'], 5)
    
    qtyInStock = 0
    # if the user is logged, check if there is any shares of this symbol in stock and save it in a variable
    if session.get("user_id") is not None:
        stock = db.execute(
            'SELECT SUM(shares) as sum FROM transactions JOIN symbols ON symbols.id = transactions.symbol_id WHERE user_id = :user_id AND symbols.symbol = :symbol GROUP BY symbols.symbol', user_id=session.get('user_id'), symbol=quote['symbol'])
        if stock and stock[0]['sum'] > 0:
            qtyInStock = stock[0]['sum']
    
    return render_template('quoted.html', quote=quote, news=news, variation=variation, dividends=dividends, qtyInStock=qtyInStock)


@app.route("/register", methods=["GET"])
def register():
    # User reached route via GET (as by clicking a link or via redirect)
    return render_template("register.html")


@app.route("/register", methods=["POST"])
def register_user():
    # Ensure username was submitted
    if not request.form.get("username"):
        return apology("must provide username", 403)

    # Ensure password was submitted
    elif not request.form.get("password"):
        return apology("must provide password", 403)

    username = request.form.get('username')
    # Ensure username does not exists
    is_username_taken = db.execute('SELECT username FROM users WHERE username = :username', username=username)
    if (is_username_taken):
        return apology("username already taken", 403)

    # Insert new user in the database
    hash_password = generate_password_hash(request.form.get('password'))
    db.execute("INSERT INTO users (username, hash) VALUES(:username, :hash) ", username=username, hash=hash_password)

    # Redirect user to home page
    flash('You successfully registered')
    return redirect("/")


@app.route("/sell", methods=["POST"])
@login_required
def sell():
    """Sell shares of stock"""
    symbol = request.form.get('symbol')
    price = request.form.get('price')
    shares = int(request.form.get('shares'))

    # get the number of shares associated with this symbol
    stock = db.execute(
            'SELECT *, SUM(shares) as sum FROM transactions JOIN symbols ON symbols.id = transactions.symbol_id WHERE user_id = :user_id AND symbols.symbol = :symbol GROUP BY symbols.symbol', user_id=session.get('user_id'), symbol=symbol)[0]
        
    # return an error if the user doesn't have enough shares or the input is not a positive integer
    if stock['sum'] < shares or shares < 0:
        return apology('NOT ENOUGH SHARES', 403)
        
    # update the number of shares in the transactions table                        
    else:
        db.execute('INSERT INTO transactions (user_id, symbol_id, shares, price) VALUES (:user_id, :symbol_id, :shares, :price)',
                       user_id=session.get('user_id'), symbol_id=stock['symbol_id'], shares=-shares, price=price)
        
    # update user's cash
    transaction_value = price * shares
    db.execute('UPDATE users SET cash = cash + :cash WHERE id = :id',
                   cash=transaction_value, id=session.get('user_id'))

    flash('You successfully sold {} shares of {}'.format(
            shares, symbol))
    return redirect('/')


def errorhandler(e):
    """Handle error"""
    if not isinstance(e, HTTPException):
        e = InternalServerError()
    return apology(e.name, e.code)


# Listen for errors
for code in default_exceptions:
    app.errorhandler(code)(errorhandler)
