"""
Script to add default categories to existing users
Run this with: python add_categories.py
"""
from app import create_app, db
from app.models import User, Category

app = create_app()

with app.app_context():
    # Get all users without categories
    users = User.query.all()
    
    default_categories = [
        # Income Categories
        {'name': 'Salary', 'type': 'income', 'icon': 'briefcase', 'color': '#10b981'},
        {'name': 'Freelance', 'type': 'income', 'icon': 'laptop', 'color': '#059669'},
        {'name': 'Investments', 'type': 'income', 'icon': 'trending-up', 'color': '#34d399'},
        {'name': 'Business', 'type': 'income', 'icon': 'building', 'color': '#6ee7b7'},
        {'name': 'Other Income', 'type': 'income', 'icon': 'plus-circle', 'color': '#a7f3d0'},
        
        # Expense Categories
        {'name': 'Food & Dining', 'type': 'expense', 'icon': 'utensils', 'color': '#ef4444'},
        {'name': 'Transportation', 'type': 'expense', 'icon': 'car', 'color': '#f97316'},
        {'name': 'Shopping', 'type': 'expense', 'icon': 'shopping-bag', 'color': '#f59e0b'},
        {'name': 'Entertainment', 'type': 'expense', 'icon': 'film', 'color': '#eab308'},
        {'name': 'Bills & Utilities', 'type': 'expense', 'icon': 'file-text', 'color': '#84cc16'},
        {'name': 'Healthcare', 'type': 'expense', 'icon': 'heart', 'color': '#22c55e'},
        {'name': 'Education', 'type': 'expense', 'icon': 'book', 'color': '#06b6d4'},
        {'name': 'Travel', 'type': 'expense', 'icon': 'plane', 'color': '#0ea5e9'},
        {'name': 'Housing', 'type': 'expense', 'icon': 'home', 'color': '#3b82f6'},
        {'name': 'Personal Care', 'type': 'expense', 'icon': 'user', 'color': '#6366f1'},
        {'name': 'Gifts & Donations', 'type': 'expense', 'icon': 'gift', 'color': '#8b5cf6'},
        {'name': 'Insurance', 'type': 'expense', 'icon': 'shield', 'color': '#a855f7'},
        {'name': 'Other Expenses', 'type': 'expense', 'icon': 'more-horizontal', 'color': '#d946ef'},
    ]
    
    for user in users:
        # Check if user already has categories
        existing_categories = Category.query.filter_by(user_id=user.id).count()
        
        if existing_categories == 0:
            print(f"Adding categories for user: {user.email}")
            for cat_data in default_categories:
                category = Category(
                    user_id=user.id,
                    name=cat_data['name'],
                    type=cat_data['type'],
                    icon=cat_data['icon'],
                    color=cat_data['color']
                )
                db.session.add(category)
            db.session.commit()
            print(f"✓ Added 18 categories for {user.email}")
        else:
            print(f"User {user.email} already has {existing_categories} categories")
    
    print("\n✅ Done!")
