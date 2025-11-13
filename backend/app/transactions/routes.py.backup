"""Transaction routes."""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from datetime import datetime
from sqlalchemy import and_, or_, extract

from app import db
from app.transactions import transactions_bp
from app.models import Transaction, Category
from app.schemas import TransactionSchema


transaction_schema = TransactionSchema()
transactions_schema = TransactionSchema(many=True)


@transactions_bp.route('', methods=['GET'])
@jwt_required()
def get_transactions():
    """Get all transactions for the current user with filtering."""
    try:
        current_user_id = get_jwt_identity()
        
        # Build query
        query = Transaction.query.filter_by(user_id=current_user_id)
        
        # Apply filters
        transaction_type = request.args.get('type')
        if transaction_type in ['income', 'expense']:
            query = query.filter_by(type=transaction_type)
        
        category_id = request.args.get('category_id')
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        # Date range filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.date >= start)
        
        if end_date:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Transaction.date <= end)
        
        # Month/Year filters
        month = request.args.get('month')
        year = request.args.get('year')
        
        if month and year:
            query = query.filter(
                extract('month', Transaction.date) == int(month),
                extract('year', Transaction.date) == int(year)
            )
        
        # Search
        search = request.args.get('search')
        if search:
            query = query.filter(Transaction.description.ilike(f'%{search}%'))
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        per_page = min(per_page, 100)  # Max 100 items per page
        
        # Sort
        sort_by = request.args.get('sort_by', 'date')
        sort_order = request.args.get('sort_order', 'desc')
        
        if sort_by == 'amount':
            query = query.order_by(Transaction.amount.desc() if sort_order == 'desc' else Transaction.amount.asc())
        else:  # default to date
            query = query.order_by(Transaction.date.desc() if sort_order == 'desc' else Transaction.date.asc())
        
        # Execute query with pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'transactions': transactions_schema.dump(pagination.items),
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch transactions', 'message': str(e)}), 500


@transactions_bp.route('/<int:transaction_id>', methods=['GET'])
@jwt_required()
def get_transaction(transaction_id):
    """Get a specific transaction."""
    try:
        current_user_id = get_jwt_identity()
        
        transaction = Transaction.query.filter_by(
            id=transaction_id,
            user_id=current_user_id
        ).first_or_404()
        
        return jsonify({
            'transaction': transaction_schema.dump(transaction)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch transaction', 'message': str(e)}), 500


@transactions_bp.route('', methods=['POST'])
@jwt_required()
def create_transaction():
    """Create a new transaction."""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate input
        data = transaction_schema.load(request.json)
        
        # Verify category belongs to user
        category = Category.query.filter_by(
            id=data['category_id'],
            user_id=current_user_id
        ).first()
        
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        # Verify category type matches transaction type
        if category.type != data['type']:
            return jsonify({'error': f'Category type must be {data["type"]}'}), 400
        
        # Create transaction
        transaction = Transaction(
            user_id=current_user_id,
            category_id=data['category_id'],
            amount=data['amount'],
            type=data['type'],
            description=data.get('description'),
            date=data['date'],
            is_recurring=data.get('is_recurring', False),
            recurring_frequency=data.get('recurring_frequency'),
            recurring_end_date=data.get('recurring_end_date'),
            group_id=data.get('group_id')
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction created successfully',
            'transaction': transaction_schema.dump(transaction)
        }), 201
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create transaction', 'message': str(e)}), 500


@transactions_bp.route('/<int:transaction_id>', methods=['PUT'])
@jwt_required()
def update_transaction(transaction_id):
    """Update a transaction."""
    try:
        current_user_id = get_jwt_identity()
        
        transaction = Transaction.query.filter_by(
            id=transaction_id,
            user_id=current_user_id
        ).first_or_404()
        
        # Validate input
        data = transaction_schema.load(request.json, partial=True)
        
        # Update fields
        if 'category_id' in data:
            category = Category.query.filter_by(
                id=data['category_id'],
                user_id=current_user_id
            ).first()
            
            if not category:
                return jsonify({'error': 'Category not found'}), 404
            
            transaction.category_id = data['category_id']
        
        if 'amount' in data:
            transaction.amount = data['amount']
        
        if 'type' in data:
            transaction.type = data['type']
        
        if 'description' in data:
            transaction.description = data['description']
        
        if 'date' in data:
            transaction.date = data['date']
        
        if 'is_recurring' in data:
            transaction.is_recurring = data['is_recurring']
        
        if 'recurring_frequency' in data:
            transaction.recurring_frequency = data['recurring_frequency']
        
        if 'recurring_end_date' in data:
            transaction.recurring_end_date = data['recurring_end_date']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction updated successfully',
            'transaction': transaction_schema.dump(transaction)
        }), 200
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update transaction', 'message': str(e)}), 500


@transactions_bp.route('/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_transaction(transaction_id):
    """Delete a transaction."""
    try:
        current_user_id = get_jwt_identity()
        
        transaction = Transaction.query.filter_by(
            id=transaction_id,
            user_id=current_user_id
        ).first_or_404()
        
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete transaction', 'message': str(e)}), 500


@transactions_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_calendar_transactions():
    """Get transactions grouped by date for calendar view."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get month and year from query params
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        if not month or not year:
            return jsonify({'error': 'Month and year are required'}), 400
        
        # Query transactions for the specified month
        transactions = Transaction.query.filter(
            Transaction.user_id == current_user_id,
            extract('month', Transaction.date) == month,
            extract('year', Transaction.date) == year
        ).order_by(Transaction.date.asc()).all()
        
        # Group by date
        calendar_data = {}
        for transaction in transactions:
            date_key = transaction.date.strftime('%Y-%m-%d')
            if date_key not in calendar_data:
                calendar_data[date_key] = []
            calendar_data[date_key].append(transaction_schema.dump(transaction))
        
        return jsonify({
            'calendar': calendar_data,
            'month': month,
            'year': year
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch calendar data', 'message': str(e)}), 500
