"""
Comprehensive script to initialize default categories for all users
This ensures all users have the necessary categories to use the app
Run this with: python init_user_categories.py
"""

import sys

from app import create_app, db
from app.models import Category, User


def init_categories():
    """Initialize categories for all users who don't have them."""
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("INITIALIZING USER CATEGORIES")
        print("=" * 60)

        # Default categories to add
        default_categories = [
            # Income Categories
            {
                "name": "Salary",
                "type": "income",
                "icon": "briefcase",
                "color": "#10b981",
            },
            {
                "name": "Freelance",
                "type": "income",
                "icon": "laptop",
                "color": "#059669",
            },
            {
                "name": "Investments",
                "type": "income",
                "icon": "trending-up",
                "color": "#34d399",
            },
            {
                "name": "Business",
                "type": "income",
                "icon": "building",
                "color": "#6ee7b7",
            },
            {
                "name": "Other Income",
                "type": "income",
                "icon": "plus-circle",
                "color": "#a7f3d0",
            },
            # Expense Categories
            {
                "name": "Food & Dining",
                "type": "expense",
                "icon": "utensils",
                "color": "#ef4444",
            },
            {
                "name": "Transportation",
                "type": "expense",
                "icon": "car",
                "color": "#f97316",
            },
            {
                "name": "Shopping",
                "type": "expense",
                "icon": "shopping-bag",
                "color": "#f59e0b",
            },
            {
                "name": "Entertainment",
                "type": "expense",
                "icon": "film",
                "color": "#eab308",
            },
            {
                "name": "Bills & Utilities",
                "type": "expense",
                "icon": "file-text",
                "color": "#84cc16",
            },
            {
                "name": "Healthcare",
                "type": "expense",
                "icon": "heart",
                "color": "#22c55e",
            },
            {
                "name": "Education",
                "type": "expense",
                "icon": "book",
                "color": "#06b6d4",
            },
            {"name": "Travel", "type": "expense", "icon": "plane", "color": "#0ea5e9"},
            {"name": "Housing", "type": "expense", "icon": "home", "color": "#3b82f6"},
            {
                "name": "Personal Care",
                "type": "expense",
                "icon": "user",
                "color": "#6366f1",
            },
            {
                "name": "Gifts & Donations",
                "type": "expense",
                "icon": "gift",
                "color": "#8b5cf6",
            },
            {
                "name": "Insurance",
                "type": "expense",
                "icon": "shield",
                "color": "#a855f7",
            },
            {
                "name": "Other Expenses",
                "type": "expense",
                "icon": "more-horizontal",
                "color": "#d946ef",
            },
        ]

        try:
            # Get all users
            users = User.query.all()

            if not users:
                print("\n⚠️  No users found in the database!")
                print("Please register a user first through the application.")
                return False

            print(f"\n📊 Found {len(users)} user(s) in the database\n")

            users_updated = 0
            users_skipped = 0

            for user in users:
                # Check if user already has categories
                existing_categories = Category.query.filter_by(user_id=user.id).count()

                if existing_categories > 0:
                    print(
                        f"⏭️  User '{user.email}' already has {existing_categories} categories - skipping"
                    )
                    users_skipped += 1
                    continue

                print(f"\n🔧 Adding categories for user: {user.email}")

                # Add all default categories
                categories_added = 0
                for cat_data in default_categories:
                    try:
                        category = Category(
                            user_id=user.id,
                            name=cat_data["name"],
                            type=cat_data["type"],
                            icon=cat_data["icon"],
                            color=cat_data["color"],
                        )
                        db.session.add(category)
                        categories_added += 1
                    except Exception as e:
                        print(
                            f"   ❌ Error adding category '{cat_data['name']}': {str(e)}"
                        )
                        continue

                # Commit changes for this user
                try:
                    db.session.commit()
                    print(
                        f"   ✅ Successfully added {categories_added} categories for {user.email}"
                    )
                    users_updated += 1
                except Exception as e:
                    db.session.rollback()
                    print(
                        f"   ❌ Failed to commit categories for {user.email}: {str(e)}"
                    )
                    continue

            # Summary
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print(f"✅ Users updated: {users_updated}")
            print(f"⏭️  Users skipped: {users_skipped}")
            print(f"📊 Total users: {len(users)}")

            if users_updated > 0:
                print(
                    f"\n🎉 Successfully initialized categories for {users_updated} user(s)!"
                )
                print("\nYour users can now:")
                print("  • Create transactions")
                print("  • Set budgets")
                print("  • View analytics")
                print("  • Track expenses and income")
            else:
                print("\n✅ All users already have categories configured!")

            print("\n" + "=" * 60)
            return True

        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            db.session.rollback()
            return False


if __name__ == "__main__":
    try:
        success = init_categories()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
