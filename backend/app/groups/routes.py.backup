"""Groups routes for shared expenses."""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app import db
from app.groups import groups_bp
from app.models import Group, GroupMember, User
from app.schemas import GroupSchema, GroupMemberSchema


group_schema = GroupSchema()
groups_schema = GroupSchema(many=True)
member_schema = GroupMemberSchema()
members_schema = GroupMemberSchema(many=True)


@groups_bp.route('', methods=['GET'])
@jwt_required()
def get_groups():
    """Get all groups for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get groups where user is owner or member
        owned_groups = Group.query.filter_by(owner_id=current_user_id).all()
        
        member_groups = db.session.query(Group).join(
            GroupMember, GroupMember.group_id == Group.id
        ).filter(GroupMember.user_id == current_user_id).all()
        
        # Combine and remove duplicates
        all_groups = list(set(owned_groups + member_groups))
        
        # Add member count
        groups_data = []
        for group in all_groups:
            group_dict = group_schema.dump(group)
            group_dict['member_count'] = GroupMember.query.filter_by(group_id=group.id).count()
            groups_data.append(group_dict)
        
        return jsonify({
            'groups': groups_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch groups', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group(group_id):
    """Get a specific group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Check if user has access
        is_owner = group.owner_id == current_user_id
        is_member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=current_user_id
        ).first() is not None
        
        if not (is_owner or is_member):
            return jsonify({'error': 'Access denied'}), 403
        
        group_dict = group_schema.dump(group)
        group_dict['member_count'] = GroupMember.query.filter_by(group_id=group.id).count()
        
        return jsonify({
            'group': group_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch group', 'message': str(e)}), 500


@groups_bp.route('', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new group."""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate input
        data = group_schema.load(request.json)
        
        # Create group
        group = Group(
            name=data['name'],
            owner_id=current_user_id,
            description=data.get('description')
        )
        
        db.session.add(group)
        db.session.flush()  # Get the group ID
        
        # Add owner as admin member
        owner_member = GroupMember(
            group_id=group.id,
            user_id=current_user_id,
            role='admin'
        )
        
        db.session.add(owner_member)
        db.session.commit()
        
        return jsonify({
            'message': 'Group created successfully',
            'group': group_schema.dump(group)
        }), 201
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create group', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>', methods=['PUT'])
@jwt_required()
def update_group(group_id):
    """Update a group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Only owner can update
        if group.owner_id != current_user_id:
            return jsonify({'error': 'Only group owner can update'}), 403
        
        # Validate input
        data = group_schema.load(request.json, partial=True)
        
        # Update fields
        if 'name' in data:
            group.name = data['name']
        if 'description' in data:
            group.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Group updated successfully',
            'group': group_schema.dump(group)
        }), 200
        
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'messages': err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update group', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """Delete a group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Only owner can delete
        if group.owner_id != current_user_id:
            return jsonify({'error': 'Only group owner can delete'}), 403
        
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({
            'message': 'Group deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete group', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    """Get all members of a group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Check access
        is_owner = group.owner_id == current_user_id
        is_member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=current_user_id
        ).first() is not None
        
        if not (is_owner or is_member):
            return jsonify({'error': 'Access denied'}), 403
        
        members = GroupMember.query.filter_by(group_id=group_id).all()
        
        return jsonify({
            'members': members_schema.dump(members)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch members', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>/members', methods=['POST'])
@jwt_required()
def add_group_member(group_id):
    """Add a member to a group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Only owner or admin can add members
        if group.owner_id != current_user_id:
            member = GroupMember.query.filter_by(
                group_id=group_id,
                user_id=current_user_id
            ).first()
            
            if not member or member.role != 'admin':
                return jsonify({'error': 'Only admins can add members'}), 403
        
        data = request.json
        user_email = data.get('email')
        
        if not user_email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=user_email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if already a member
        existing = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=user.id
        ).first()
        
        if existing:
            return jsonify({'error': 'User is already a member'}), 400
        
        # Add member
        new_member = GroupMember(
            group_id=group_id,
            user_id=user.id,
            role=data.get('role', 'member')
        )
        
        db.session.add(new_member)
        db.session.commit()
        
        return jsonify({
            'message': 'Member added successfully',
            'member': member_schema.dump(new_member)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add member', 'message': str(e)}), 500


@groups_bp.route('/<int:group_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
def remove_group_member(group_id, member_id):
    """Remove a member from a group."""
    try:
        current_user_id = get_jwt_identity()
        
        group = Group.query.get_or_404(group_id)
        
        # Only owner or admin can remove members
        if group.owner_id != current_user_id:
            member = GroupMember.query.filter_by(
                group_id=group_id,
                user_id=current_user_id
            ).first()
            
            if not member or member.role != 'admin':
                return jsonify({'error': 'Only admins can remove members'}), 403
        
        member_to_remove = GroupMember.query.get_or_404(member_id)
        
        # Cannot remove owner
        if member_to_remove.user_id == group.owner_id:
            return jsonify({'error': 'Cannot remove group owner'}), 400
        
        db.session.delete(member_to_remove)
        db.session.commit()
        
        return jsonify({
            'message': 'Member removed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to remove member', 'message': str(e)}), 500
