"""Analytics routes."""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, extract, and_
from datetime import datetime, timedelta
from decimal import Decimal

from app import db
from app.analytics import analytics_bp
from app.models import Transaction, Category, Budget
from app.schemas import (
    AnalyticsSummarySchema, CategorySpendingSchema,
    TrendDataSchema, InsightSchema
)


summary_schema = AnalyticsSummarySchema()
category_spending_schema = CategorySpendingSchema(many=True)
trend_schema = TrendDataSchema(many=True)
insight_schema = InsightSchema(many=True)


@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    """Get financial summary for a period."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get date range from query params
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        query = Transaction.query.filter_by(user_id=current_user_id)
        
        if month and year:
            query = query.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
            period = f"{year}-{month:02d}"
        else:
            period = "all_time"
        
        # Calculate totals
        income_total = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == 'income'
        )
        
        expense_total = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == 'expense'
        )
        
        if month and year:
            income_total = income_total.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
            expense_total = expense_total.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
        
        total_income = income_total.scalar() or Decimal('0')
        total_expense = expense_total.scalar() or Decimal('0')
        
        # Transaction counts
        income_count = Transaction.query.filter_by(
            user_id=current_user_id,
            type='income'
        )
        expense_count = Transaction.query.filter_by(
            user_id=current_user_id,
            type='expense'
        )
        
        if month and year:
            income_count = income_count.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
            expense_count = expense_count.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
        
        summary = {
            'total_income': str(total_income),
            'total_expense': str(total_expense),
            'net_balance': str(total_income - total_expense),
            'transaction_count': income_count.count() + expense_count.count(),
            'income_count': income_count.count(),
            'expense_count': expense_count.count(),
            'period': period
        }
        
        return jsonify(summary_schema.dump(summary)), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch summary', 'message': str(e)}), 500


@analytics_bp.route('/spending-by-category', methods=['GET'])
@jwt_required()
def get_spending_by_category():
    """Get spending breakdown by category."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get filters
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        transaction_type = request.args.get('type', 'expense')
        
        # Build query
        query = db.session.query(
            Category.id.label('category_id'),
            Category.name.label('category_name'),
            Category.icon.label('category_icon'),
            Category.color.label('category_color'),
            func.sum(Transaction.amount).label('total_amount'),
            func.count(Transaction.id).label('transaction_count')
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == transaction_type
        ).group_by(Category.id)
        
        if month and year:
            query = query.filter(
                extract('month', Transaction.date) == month,
                extract('year', Transaction.date) == year
            )
        
        results = query.all()
        
        # Calculate total for percentage
        total = sum(float(r.total_amount) for r in results)
        
        # Format results
        spending_data = []
        for result in results:
            spending_data.append({
                'category_id': result.category_id,
                'category_name': result.category_name,
                'category_icon': result.category_icon,
                'category_color': result.category_color,
                'total_amount': str(result.total_amount),
                'transaction_count': result.transaction_count,
                'percentage': round((float(result.total_amount) / total * 100), 2) if total > 0 else 0
            })
        
        # Sort by amount descending
        spending_data.sort(key=lambda x: float(x['total_amount']), reverse=True)
        
        return jsonify({
            'spending': category_spending_schema.dump(spending_data),
            'total': str(total),
            'type': transaction_type
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch spending data', 'message': str(e)}), 500


@analytics_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_trends():
    """Get income/expense trends over time."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get parameters
        period = request.args.get('period', 'monthly')  # daily, weekly, monthly
        months = request.args.get('months', 6, type=int)  # Last N months
        
        trends = []
        
        if period == 'monthly':
            # Get last N months
            for i in range(months - 1, -1, -1):
                date = datetime.now() - timedelta(days=30 * i)
                month = date.month
                year = date.year
                
                income = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.user_id == current_user_id,
                    Transaction.type == 'income',
                    extract('month', Transaction.date) == month,
                    extract('year', Transaction.date) == year
                ).scalar() or Decimal('0')
                
                expense = db.session.query(func.sum(Transaction.amount)).filter(
                    Transaction.user_id == current_user_id,
                    Transaction.type == 'expense',
                    extract('month', Transaction.date) == month,
                    extract('year', Transaction.date) == year
                ).scalar() or Decimal('0')
                
                trends.append({
                    'date': f"{year}-{month:02d}",
                    'income': str(income),
                    'expense': str(expense),
                    'net': str(income - expense)
                })
        
        return jsonify({
            'trends': trend_schema.dump(trends),
            'period': period
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch trends', 'message': str(e)}), 500


@analytics_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    """Get smart insights about spending patterns."""
    try:
        current_user_id = get_jwt_identity()
        insights = []
        
        # Get current and previous month data
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        prev_month = current_month - 1 if current_month > 1 else 12
        prev_year = current_year if current_month > 1 else current_year - 1
        
        # Current month expense
        current_expense = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == current_month,
            extract('year', Transaction.date) == current_year
        ).scalar() or Decimal('0')
        
        # Previous month expense
        prev_expense = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == prev_month,
            extract('year', Transaction.date) == prev_year
        ).scalar() or Decimal('0')
        
        # Compare spending
        if prev_expense > 0:
            change = ((current_expense - prev_expense) / prev_expense) * 100
            
            if abs(change) > 10:
                insights.append({
                    'type': 'spending_change',
                    'title': 'Spending Pattern Change',
                    'message': f"You've spent {abs(change):.1f}% {'more' if change > 0 else 'less'} this month compared to last month",
                    'severity': 'warning' if change > 0 else 'success',
                    'data': {
                        'current': str(current_expense),
                        'previous': str(prev_expense),
                        'change_percent': round(change, 2)
                    }
                })
        
        # Check budget status
        budgets = Budget.query.filter_by(
            user_id=current_user_id,
            month=current_month,
            year=current_year
        ).all()
        
        for budget in budgets:
            spent = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == current_user_id,
                Transaction.category_id == budget.category_id,
                Transaction.type == 'expense',
                extract('month', Transaction.date) == current_month,
                extract('year', Transaction.date) == current_year
            ).scalar() or Decimal('0')
            
            percentage = (spent / budget.amount) * 100 if budget.amount > 0 else 0
            
            if percentage >= 90:
                insights.append({
                    'type': 'budget_alert',
                    'title': 'Budget Alert',
                    'message': f"You've used {percentage:.0f}% of your {budget.category.name} budget",
                    'severity': 'error' if percentage >= 100 else 'warning',
                    'data': {
                        'category': budget.category.name,
                        'spent': str(spent),
                        'budget': str(budget.amount),
                        'percentage': round(percentage, 2)
                    }
                })
        
        # Top spending category
        top_category = db.session.query(
            Category.name,
            func.sum(Transaction.amount).label('total')
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == current_user_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == current_month,
            extract('year', Transaction.date) == current_year
        ).group_by(Category.id).order_by(func.sum(Transaction.amount).desc()).first()
        
        if top_category:
            insights.append({
                'type': 'top_category',
                'title': 'Top Spending Category',
                'message': f"Your highest spending this month is in {top_category.name}",
                'severity': 'info',
                'data': {
                    'category': top_category.name,
                    'amount': str(top_category.total)
                }
            })
        
        return jsonify({
            'insights': insight_schema.dump(insights)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch insights', 'message': str(e)}), 500
