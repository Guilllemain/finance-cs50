from app import app, db
from app.models import User, Transaction, Symbol
from flask import flash, jsonify, redirect, render_template, request, session
from werkzeug.security import check_password_hash, generate_password_hash
from helpers import apology, login_required, lookup, fetch_news, fetch_dividends, symbol_price_timeserie
from sqlalchemy import func


@app.route("/")
def index():
    return render_template('home.html')


@app.route("/dashboard")
@login_required
def dashboard():
    """Show portfolio of stocks"""
    stocks = []

    # get the cash left for the user
    cash_left = User.query.filter_by(id=session.get('user_id')).first().cash

    # extract all transactions from the database for this symbol with the average price and the total number of shares
    transactions = db.session.query(Symbol.symbol.label('symbol'), func.sum(
        Transaction.shares).label("shares"), func.avg(
        Transaction.price).label("avg_price")).join(Symbol, Symbol.id == Transaction.symbol_id).filter(Transaction.user_id == session.get('user_id')).group_by(Symbol.symbol).all()
    wallet_value = cash_left

    if transactions is not None:
        symbols_list = ','.join([el.symbol for el in transactions])
        symbols_details = lookup(symbols_list, True)
        for transaction in transactions:
            if transaction.shares > 0:
                symbol = transaction.symbol
                name = symbols_details[symbol]['quote']['companyName']
                price = symbols_details[symbol]['quote']['latestPrice']
                shares = transaction.shares
                bought = transaction.avg_price
                total = float(shares) * \
                    symbols_details[symbol]['quote']['latestPrice']
                variation = round(
                    ((total - (float(shares) * bought)) / (float(shares) * bought)) * 100, 2)
                stocks.append({'symbol': symbol, 'name': name, 'shares': shares,
                               'price': price, 'bought': bought, 'total': total, 'variation': variation})
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
    user_cash = User.query.filter_by(id=session.get('user_id')).first().cash

    # check if the user can afford the stock
    cash_left = user_cash - total
    if (cash_left < 0):
        return apology('You cannot afford it')

    # insert the requested symbol into the symbol table if it doesn't exists
    symbol_db = Symbol.query.filter_by(symbol=symbol).first()
    if symbol_db is None:
        symbol_db = Symbol(symbol=symbol)
        db.session.add(symbol_db)
        db.session.commit()

    # add the transaction to the table
    transaction = Transaction(user_id=session.get('user_id'), symbol_id=symbol_db.id, shares=int(request.form.get("shares")), price=price)
    db.session.add(transaction)

    # update the user's cash
    user = User.query.filter_by(id=session.get('user_id')).first()
    user.cash = cash_left
    
    db.session.commit()
    
    flash('You successfully bought {} shares of {}'.format(
        request.form.get("shares"), symbol))
    return redirect('/')


@app.route("/check", methods=["GET"])
def check():
    """Return true if username available, else false, in JSON format"""
    username = request.args.get('username')
    is_username_taken = User.query.filter_by(username=username).first()
    if is_username_taken is not None:
        return jsonify(False)
    return jsonify(True)


@app.route("/history")
@login_required
def history():
    """Show history of transactions"""
    transactions = Transaction.query.filter(Transaction.user_id == session.get('user_id')).all()

    return render_template("history.html", transactions=transactions)


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
        user = User.query.filter_by(username=request.form.get("username")).first()

        # Ensure username exists and password is correct
        if not user or not check_password_hash(user.password_hash, request.form.get("password")):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = user.id

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
    variation_value = quote['latestPrice']
    variation_perc = 0
    if quote['close'] is not None:
        variation_value = round(quote['latestPrice'] - quote['close'], 2)
        variation_perc = round(((quote['latestPrice'] - quote['close']) / quote['close']) * 100, 2)
    variation = {'value': variation_value, 'perc': variation_perc}
    dividends = fetch_dividends(quote['symbol'])

    # get all the news for this symbol
    news = fetch_news(quote['symbol'], 5)

    qtyInStock = 0
    # if the user is logged, check if there is any shares of this symbol in stock and save it in a variable
    if session.get("user_id") is not None:
        stock = db.session.query(Symbol.symbol, func.sum(
            Transaction.shares).label("sum")).join(Symbol, Symbol.id == Transaction.symbol_id).filter(Transaction.user_id == session.get('user_id'), Symbol.symbol == quote['symbol']).first()
        if stock[0] and stock.sum > 0:
            qtyInStock = stock.sum

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
    is_username_taken = User.query.filter_by(username=username).first()
    if (is_username_taken):
        return apology("username already taken", 403)

    # Insert new user in the database
    password_hash = generate_password_hash(request.form.get('password'))
    user = User(username=username, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

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
    stock = db.session.query(Transaction.symbol_id, func.sum(
        Transaction.shares).label("sum")).join(Symbol, Symbol.id == Transaction.symbol_id).filter(Transaction.user_id == session.get('user_id'), Symbol.symbol == symbol).first()
    # return an error if the user doesn't have enough shares or the input is not a positive integer
    if stock.sum < shares or shares < 0:
        return apology('NOT ENOUGH SHARES', 403)

    # update the number of shares in the transactions table
    else:
        transaction = Transaction(user_id=session.get('user_id'), symbol_id=stock.symbol_id, shares=-shares, price=price)
        db.session.add(transaction)

    # update user's cash
    transaction_value = float(price) * float(shares)
    user = User.query.filter_by(id=session.get('user_id')).first()
    user.cash += transaction_value

    db.session.commit()

    flash('You successfully sold {} shares of {}'.format(
        shares, symbol))
    return redirect('/')

@app.route('/graph', methods=['GET'])
def graph():
    symbol = request.args.get('symbol')
    timeframe = request.args.get('timeframe')
    now = request.args.get('now')
    data = symbol_price_timeserie(symbol, timeframe, now)
    return jsonify(data)
