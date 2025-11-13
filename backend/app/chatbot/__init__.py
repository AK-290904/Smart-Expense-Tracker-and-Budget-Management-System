"""Enhanced chatbot package with forecasting, prediction, context, and NLP to SQL."""

from .routes import chatbot_bp
from .chat_logic import process_chat_message
from .forecasting import (
    forecast_next_month,
    predict_budget_risk,
    get_spending_insights
)
from .nlp_to_sql import (
    execute_nlp_query,
    format_query_results,
    get_suggested_queries
)
from .context_manager import (
    get_user_context,
    clear_user_context
)

__all__ = [
    'chatbot_bp',
    'process_chat_message',
    'forecast_next_month',
    'predict_budget_risk',
    'get_spending_insights',
    'execute_nlp_query',
    'format_query_results',
    'get_suggested_queries',
    'get_user_context',
    'clear_user_context'
]
