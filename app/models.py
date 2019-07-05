from app import db
from select import select
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.ext.hybrid import hybrid_property

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, nullable=False)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    cash = db.Column(db.Float, nullable=False, default=10000)
    get_transactions = db.relationship('Transaction', backref='user', lazy=True)

    def __repr__(self):
        return '<User {}>'.format(self.username)


class Symbol(db.Model):
    __tablename__ = 'symbols'
    id = db.Column(db.Integer, primary_key=True, nullable=False)
    symbol = db.Column(db.String(20), index=True, unique=True, nullable=False)

    def __repr__(self):
        return '<Symbol {}>'.format(self.id)


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    symbol_id = db.Column(db.Integer, db.ForeignKey('symbols.id'), nullable=False)
    shares = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    get_symbol = db.relationship('Symbol', backref='transactions', lazy=True)

    def __repr__(self):
        return '<Transaction {}>'.format(self.id)
