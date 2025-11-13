"""Enhanced chatbot routes with forecasting, prediction, context, and NLP to SQL."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .chat_logic import process_chat_message
from .context_manager import get_user_context, clear_user_context, get_all_contexts
from .nlp_to_sql import get_suggested_queries, execute_nlp_query, format_query_results
from .forecasting import forecast_next_month, predict_budget_risk, get_spending_insights

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/chat", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
def chat():
    """Process chat message with enhanced AI features."""
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        # Get current user from JWT token
        current_user_id = get_jwt_identity()
        
        if not current_user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        # Get message from request
        data = request.get_json()
        user_input = data.get("message", "").strip()
        
        if not user_input:
            return jsonify({"error": "Message cannot be empty"}), 400
        
        # Process message with enhanced AI
        reply = process_chat_message(user_input, current_user_id)
        
        # Get conversation context summary
        context = get_user_context(current_user_id)
        context_summary = context.get_context_summary()
        
        return jsonify({
            "reply": reply,
            "context": {
                "message_count": context_summary['message_count'],
                "last_intent": context_summary['last_intent']
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to process message", "details": str(e)}), 500


@chatbot_bp.route("/context", methods=["GET"])
@jwt_required()
def get_context():
    """Get current conversation context."""
    try:
        current_user_id = get_jwt_identity()
        context = get_user_context(current_user_id)
        
        return jsonify({
            "context": context.get_context_summary(),
            "history": context.get_history(limit=10)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get context", "details": str(e)}), 500


@chatbot_bp.route("/context", methods=["DELETE"])
@jwt_required()
def clear_context():
    """Clear conversation context."""
    try:
        current_user_id = get_jwt_identity()
        clear_user_context(current_user_id)
        
        return jsonify({"message": "Context cleared successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to clear context", "details": str(e)}), 500


@chatbot_bp.route("/forecast", methods=["POST"])
@jwt_required()
def forecast():
    """Get financial forecast."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        
        tx_type = data.get("type", "expense")  # 'income' or 'expense'
        method = data.get("method", "auto")  # 'auto', 'sma', 'ema', 'linear', 'seasonal'
        
        result = forecast_next_month(current_user_id, tx_type=tx_type, method=method)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to generate forecast", "details": str(e)}), 500


@chatbot_bp.route("/risk-analysis", methods=["GET"])
@jwt_required()
def risk_analysis():
    """Get budget risk analysis."""
    try:
        current_user_id = get_jwt_identity()
        risk_data = predict_budget_risk(current_user_id)
        
        return jsonify(risk_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to analyze risk", "details": str(e)}), 500


@chatbot_bp.route("/insights", methods=["GET"])
@jwt_required()
def insights():
    """Get spending insights."""
    try:
        current_user_id = get_jwt_identity()
        insights_data = get_spending_insights(current_user_id)
        
        return jsonify({"insights": insights_data}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get insights", "details": str(e)}), 500


@chatbot_bp.route("/nlp-query", methods=["POST"])
@jwt_required()
def nlp_query():
    """Execute natural language to SQL query."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        query = data.get("query", "").strip()
        
        if not query:
            return jsonify({"error": "Query cannot be empty"}), 400
        
        result = execute_nlp_query(query, current_user_id)
        formatted = format_query_results(result)
        
        return jsonify({
            "result": result,
            "formatted": formatted
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to execute query", "details": str(e)}), 500


@chatbot_bp.route("/suggested-queries", methods=["GET"])
@jwt_required()
def suggested_queries():
    """Get suggested natural language queries."""
    try:
        suggestions = get_suggested_queries()
        return jsonify({"suggestions": suggestions}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get suggestions", "details": str(e)}), 500
