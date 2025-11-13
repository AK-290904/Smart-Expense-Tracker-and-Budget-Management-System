"""Savings goals routes."""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from decimal import Decimal

from app import db
from app.goals import goals_bp
from app.models import SavingsGoal
from app.schemas import SavingsGoalSchema


goal_schema = SavingsGoalSchema()
goals_schema = SavingsGoalSchema(many=True)


@goals_bp.route('', methods=['GET'])
@jwt_required()
def get_goals():
    """Get all savings goals for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Filter by status if provided
        status = request.args.get('status')
        
        query = SavingsGoal.query.filter_by(user_id=current_user_id)
        
        if status in ['active', 'completed', 'cancelled']:
            query = query.filter_by(status=status)
        
        goals = query.order_by(SavingsGoal.created_at.desc()).all()
        
        # Add computed fields
        goals_data = []
        for goal in goals:
            goal_dict = goal_schema.dump(goal)
            goal_dict['progress_percentage'] = round(
                (goal.current_amount / goal.target_amount * 100), 2
            ) if goal.target_amount > 0 else 0
            goal_dict['remaining_amount'] = str(goal.target_amount - goal.current_amount)
            goals_data.append(goal_dict)
        
        return jsonify({
            'goals': goals_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch goals', 'message': str(e)}), 500


@goals_bp.route('/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_goal(goal_id):
    """Get a specific savings goal."""
    try:
        current_user_id = get_jwt_identity()
        
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user_id
        ).first_or_404()
        
        goal_dict = goal_schema.dump(goal)
        goal_dict['progress_percentage'] = round(
            (goal.current_amount / goal.target_amount * 100), 2
        ) if goal.target_amount > 0 else 0
        goal_dict['remaining_amount'] = str(goal.target_amount - goal.current_amount)
        
        return jsonify({
            'goal': goal_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch goal', 'message': str(e)}), 500


@goals_bp.route('', methods=['POST'])
@jwt_required()
def create_goal():
    """Create a new savings goal."""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate input
        data = goal_schema.load(request.json)
        
        # Create goal
        goal = SavingsGoal(
            user_id=current_user_id,
            name=data['name'],
            target_amount=data['target_amount'],
            current_amount=data.get('current_amount', Decimal('0')),
            target_date=data.get('target_date'),
            icon=data.get('icon', 'target'),
            color=data.get('color', '#10b981'),
            status='active'
        )
        
        db.session.add(goal)
        db.session.commit()
        
        return jsonify({
            'message': 'Savings goal created successfully',
            'goal': goal_schema.dump(goal)
        }), 201
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create goal', 'message': str(e)}), 500


@goals_bp.route('/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    """Update a savings goal."""
    try:
        current_user_id = get_jwt_identity()
        
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user_id
        ).first_or_404()
        
        # Validate input
        data = goal_schema.load(request.json, partial=True)
        
        # Update fields
        if 'name' in data:
            goal.name = data['name']
        if 'target_amount' in data:
            goal.target_amount = data['target_amount']
        if 'current_amount' in data:
            goal.current_amount = data['current_amount']
            # Auto-complete if target reached
            if goal.current_amount >= goal.target_amount:
                goal.status = 'completed'
        if 'target_date' in data:
            goal.target_date = data['target_date']
        if 'icon' in data:
            goal.icon = data['icon']
        if 'color' in data:
            goal.color = data['color']
        if 'status' in data:
            goal.status = data['status']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Savings goal updated successfully',
            'goal': goal_schema.dump(goal)
        }), 200
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update goal', 'message': str(e)}), 500


@goals_bp.route('/<int:goal_id>/contribute', methods=['POST'])
@jwt_required()
def contribute_to_goal(goal_id):
    """Add contribution to a savings goal."""
    try:
        current_user_id = get_jwt_identity()
        
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user_id
        ).first_or_404()
        
        data = request.json
        amount = Decimal(str(data.get('amount', 0)))
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        goal.current_amount += amount
        
        # Auto-complete if target reached
        if goal.current_amount >= goal.target_amount:
            goal.status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Contribution added successfully',
            'goal': goal_schema.dump(goal)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add contribution', 'message': str(e)}), 500


@goals_bp.route('/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    """Delete a savings goal."""
    try:
        current_user_id = get_jwt_identity()
        
        goal = SavingsGoal.query.filter_by(
            id=goal_id,
            user_id=current_user_id
        ).first_or_404()
        
        db.session.delete(goal)
        db.session.commit()
        
        return jsonify({
            'message': 'Savings goal deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete goal', 'message': str(e)}), 500
