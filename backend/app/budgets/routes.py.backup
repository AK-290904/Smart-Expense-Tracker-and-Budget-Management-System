"""Budget routes."""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy import func, extract
from decimal import Decimal

from app import db
from app.budgets import budgets_bp
from app.models import Budget, Category, Transaction
from app.schemas import BudgetSchema


budget_schema = BudgetSchema()
budgets_schema = BudgetSchema(many=True)


@budgets_bp.route('', methods=['GET'])
@jwt_required()
def get_budgets():
    """Get all budgets for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get filters
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        query = Budget.query.filter_by(user_id=current_user_id)
        
        if month and year:
            query = query.filter_by(month=month, year=year)
        
        budgets = query.all()
        
        # Calculate spent amount for each budget
        budget_data = []
        for budget in budgets:
            spent = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == current_user_id,
                Transaction.category_id == budget.category_id,
                Transaction.type == 'expense',
                extract('month', Transaction.date) == budget.month,
                extract('year', Transaction.date) == budget.year
            ).scalar() or Decimal('0')
            
            budget_dict = budget_schema.dump(budget)
            budget_dict['spent'] = str(spent)
            budget_dict['remaining'] = str(budget.amount - spent)
            budget_dict['percentage'] = round((spent / budget.amount * 100), 2) if budget.amount > 0 else 0
            
            budget_data.append(budget_dict)
        
        return jsonify({
            'budgets': budget_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch budgets', 'message': str(e)}), 500


@budgets_bp.route('/<int:budget_id>', methods=['GET'])
@jwt_required()
def get_budget(budget_id):
    """Get a specific budget."""
    try:
        current_user_id = get_jwt_identity()
        
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user_id
        ).first_or_404()
        
        # Calculate spent
        spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == budget.month,
            extract('year', Transaction.date) == budget.year
        ).scalar() or Decimal('0')
        
        budget_dict = budget_schema.dump(budget)
        budget_dict['spent'] = str(spent)
        budget_dict['remaining'] = str(budget.amount - spent)
        budget_dict['percentage'] = round((spent / budget.amount * 100), 2) if budget.amount > 0 else 0
        
        return jsonify({
            'budget': budget_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch budget', 'message': str(e)}), 500


@budgets_bp.route('', methods=['POST'])
@jwt_required()
def create_budget():
    """Create a new budget."""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate input
        data = budget_schema.load(request.json)
        
        # Verify category exists and belongs to user
        category = Category.query.filter_by(
            id=data['category_id'],
            user_id=current_user_id
        ).first()
        
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        # Check for existing budget
        existing = Budget.query.filter_by(
            user_id=current_user_id,
            category_id=data['category_id'],
            month=data.get('month'),
            year=data.get('year')
        ).first()
        
        if existing:
            return jsonify({'error': 'Budget already exists for this category and period'}), 400
        
        # Create budget
        budget = Budget(
            user_id=current_user_id,
            category_id=data['category_id'],
            amount=data['amount'],
            period=data.get('period', 'monthly'),
            month=data.get('month'),
            year=data.get('year')
        )
        
        db.session.add(budget)
        db.session.commit()
        
        return jsonify({
            'message': 'Budget created successfully',
            'budget': budget_schema.dump(budget)
        }), 201
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create budget', 'message': str(e)}), 500


@budgets_bp.route('/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    """Update a budget."""
    try:
        current_user_id = get_jwt_identity()
        
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user_id
        ).first_or_404()
        
        # Validate input
        data = budget_schema.load(request.json, partial=True)
        
        # Update fields
        if 'amount' in data:
            budget.amount = data['amount']
        if 'period' in data:
            budget.period = data['period']
        if 'month' in data:
            budget.month = data['month']
        if 'year' in data:
            budget.year = data['year']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Budget updated successfully',
            'budget': budget_schema.dump(budget)
        }), 200
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update budget', 'message': str(e)}), 500


@budgets_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    """Delete a budget."""
    try:
        current_user_id = get_jwt_identity()
        
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user_id
        ).first_or_404()
        
        db.session.delete(budget)
        db.session.commit()
        
        return jsonify({
            'message': 'Budget deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete budget', 'message': str(e)}), 500
