"""Application entry point."""
import os
from app import create_app, db
from app.models import User, Category, Transaction, Budget, SavingsGoal, Group, GroupMember

# Get environment from environment variable
env = os.getenv('FLASK_ENV', 'development')
app = create_app(env)


@app.shell_context_processor
def make_shell_context():
    """Make database models available in Flask shell."""
    return {
        'db': db,
        'User': User,
        'Category': Category,
        'Transaction': Transaction,
        'Budget': Budget,
        'SavingsGoal': SavingsGoal,
        'Group': Group,
        'GroupMember': GroupMember
    }


@app.cli.command()
def init_db():
    """Initialize the database with default categories."""
    db.create_all()
    print("Database tables created!")
    
    # You can add default categories here if needed
    print("Database initialized successfully!")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
