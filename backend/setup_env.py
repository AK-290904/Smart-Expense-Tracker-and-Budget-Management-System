"""Script to create .env file with secure keys."""
import secrets
import os

def generate_env_file():
    """Generate .env file with secure secret keys."""
    
    # Generate secure keys
    secret_key = secrets.token_hex(32)
    jwt_secret_key = secrets.token_hex(32)
    
    env_content = f"""# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY={secret_key}

# JWT Configuration
JWT_SECRET_KEY={jwt_secret_key}
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Database Configuration
# Replace with your MySQL credentials
DATABASE_URL=mysql+pymysql://expense_user:your_password@localhost/expense_tracker

# CORS Configuration
CORS_ORIGINS=http://localhost:3000

# Application Settings
CURRENCY=INR
CURRENCY_SYMBOL=₹
TIMEZONE=Asia/Kolkata
"""
    
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if os.path.exists(env_path):
        print("⚠️  .env file already exists!")
        response = input("Do you want to overwrite it? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Setup cancelled.")
            return
    
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("✅ .env file created successfully!")
    print("\n📝 IMPORTANT: Edit the .env file and update the DATABASE_URL with your MySQL credentials:")
    print("   DATABASE_URL=mysql+pymysql://your_username:your_password@localhost/expense_tracker")
    print("\n🔐 Secure keys have been generated automatically.")

if __name__ == '__main__':
    generate_env_file()
