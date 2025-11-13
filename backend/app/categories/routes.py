"""Category routes."""

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app import db
from app.categories import categories_bp
from app.models import Category, Transaction
from app.schemas import CategorySchema
from app.utils import get_user_id_from_jwt

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)


@categories_bp.route("", methods=["GET"])
@jwt_required()
def get_categories():
    """Get all categories for the current user."""
    try:
        current_user_id = get_user_id_from_jwt(get_jwt_identity())

        # Filter by type if provided
        category_type = request.args.get("type")

        query = Category.query.filter_by(user_id=current_user_id)

        if category_type in ["income", "expense"]:
            query = query.filter_by(type=category_type)

        categories = query.order_by(Category.name).all()

        return jsonify({"categories": categories_schema.dump(categories)}), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch categories", "message": str(e)}), 500


@categories_bp.route("/<int:category_id>", methods=["GET"])
@jwt_required()
def get_category(category_id):
    """Get a specific category."""
    try:
        current_user_id = get_user_id_from_jwt(get_jwt_identity())

        category = Category.query.filter_by(
            id=category_id, user_id=current_user_id
        ).first_or_404()

        return jsonify({"category": category_schema.dump(category)}), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch category", "message": str(e)}), 500


@categories_bp.route("", methods=["POST"])
@jwt_required()
def create_category():
    """Create a new category."""
    try:
        current_user_id = get_user_id_from_jwt(get_jwt_identity())

        # Validate input
        data = category_schema.load(request.json)

        # Check for duplicate category name
        existing = Category.query.filter_by(
            user_id=current_user_id, name=data["name"], type=data["type"]
        ).first()

        if existing:
            return jsonify({"error": "Category with this name already exists"}), 400

        # Create category
        category = Category(
            user_id=current_user_id,
            name=data["name"],
            type=data["type"],
            icon=data.get("icon", "circle"),
            color=data.get("color", "#6366f1"),
        )

        db.session.add(category)
        db.session.commit()

        return jsonify(
            {
                "message": "Category created successfully",
                "category": category_schema.dump(category),
            }
        ), 201

    except ValidationError as err:
        return jsonify({"error": "Validation error", "messages": err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create category", "message": str(e)}), 500


@categories_bp.route("/<int:category_id>", methods=["PUT"])
@jwt_required()
def update_category(category_id):
    """Update a category."""
    try:
        current_user_id = get_user_id_from_jwt(get_jwt_identity())

        category = Category.query.filter_by(
            id=category_id, user_id=current_user_id
        ).first_or_404()

        # Validate input
        data = category_schema.load(request.json, partial=True)

        # Check for duplicate name if name is being changed
        if "name" in data and data["name"] != category.name:
            existing = Category.query.filter_by(
                user_id=current_user_id, name=data["name"], type=category.type
            ).first()

            if existing:
                return jsonify({"error": "Category with this name already exists"}), 400

        # Update fields
        if "name" in data:
            category.name = data["name"]
        if "icon" in data:
            category.icon = data["icon"]
        if "color" in data:
            category.color = data["color"]

        db.session.commit()

        return jsonify(
            {
                "message": "Category updated successfully",
                "category": category_schema.dump(category),
            }
        ), 200

    except ValidationError as err:
        return jsonify({"error": "Validation error", "messages": err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update category", "message": str(e)}), 500


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@jwt_required()
def delete_category(category_id):
    """Delete a category."""
    try:
        current_user_id = get_user_id_from_jwt(get_jwt_identity())

        category = Category.query.filter_by(
            id=category_id, user_id=current_user_id
        ).first_or_404()

        # Check if category has transactions
        transaction_count = Transaction.query.filter_by(category_id=category_id).count()

        if transaction_count > 0:
            return jsonify(
                {
                    "error": "Cannot delete category with existing transactions",
                    "transaction_count": transaction_count,
                }
            ), 400

        db.session.delete(category)
        db.session.commit()

        return jsonify({"message": "Category deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete category", "message": str(e)}), 500
