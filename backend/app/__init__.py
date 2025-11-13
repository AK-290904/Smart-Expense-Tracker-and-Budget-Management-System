"""Flask application factory."""
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_marshmallow import Marshmallow

from app.chatbot.routes import chatbot_bp  
from app.config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
ma = Marshmallow()


def create_app(config_name='default'):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)
    
    # Configure CORS to allow all necessary methods
    CORS(app, 
         origins=app.config['CORS_ORIGINS'], 
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'message': 'Please login again'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'message': 'Please login again'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Missing token', 'message': 'Authorization token required'}), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked', 'message': 'Please login again'}), 401
    
    # Register blueprints
    from app.auth import auth_bp
    from app.transactions import transactions_bp
    from app.categories import categories_bp
    from app.budgets import budgets_bp
    from app.analytics import analytics_bp
    from app.goals import goals_bp
    from app.groups import groups_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(transactions_bp, url_prefix='/api/v1/transactions')
    app.register_blueprint(categories_bp, url_prefix='/api/v1/categories')
    app.register_blueprint(budgets_bp, url_prefix='/api/v1/budgets')
    app.register_blueprint(analytics_bp, url_prefix='/api/v1/analytics')
    app.register_blueprint(goals_bp, url_prefix='/api/v1/goals')
    app.register_blueprint(groups_bp, url_prefix='/api/v1/groups')

    # ✅ Register Chatbot Blueprint (NEW)
    app.register_blueprint(chatbot_bp, url_prefix='/api/v1/chatbot')
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'You do not have permission'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'message': 'Something went wrong'}), 500
    
    # Health check endpoint
    @app.route('/api/v1/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'currency': app.config['CURRENCY'],
            'currency_symbol': app.config['CURRENCY_SYMBOL']
        })
    
    return app
