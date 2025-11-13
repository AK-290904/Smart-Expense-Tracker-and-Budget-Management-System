"""NLP to SQL query converter for natural language database queries."""
import json
import requests
import os
from datetime import datetime, timedelta
from sqlalchemy import text


# API Configuration
API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
MODEL = "mistralai/mixtral-8x7b-instruct"

session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
})


# Database schema information
SCHEMA_INFO = """
Database Schema:

1. transactions table:
   - id (INTEGER, PRIMARY KEY)
   - user_id (INTEGER, FOREIGN KEY)
   - category_id (INTEGER, FOREIGN KEY)
   - amount (NUMERIC)
   - type (ENUM: 'income', 'expense')
   - description (TEXT)
   - date (DATETIME)
   - created_at (DATETIME)

2. categories table:
   - id (INTEGER, PRIMARY KEY)
   - user_id (INTEGER, FOREIGN KEY)
   - name (VARCHAR)
   - type (ENUM: 'income', 'expense')
   - color (VARCHAR)
   - icon (VARCHAR)

3. budgets table:
   - id (INTEGER, PRIMARY KEY)
   - user_id (INTEGER, FOREIGN KEY)
   - category_id (INTEGER, FOREIGN KEY)
   - amount (NUMERIC)
   - period (ENUM: 'weekly', 'monthly')
   - month (INTEGER)
   - year (INTEGER)

4. savings_goals table:
   - id (INTEGER, PRIMARY KEY)
   - user_id (INTEGER, FOREIGN KEY)
   - name (VARCHAR)
   - target_amount (NUMERIC)
   - current_amount (NUMERIC)
   - target_date (DATE)
   - status (ENUM: 'active', 'completed', 'cancelled')
"""


def generate_sql_query(natural_language_query, user_id):
    """
    Convert natural language query to SQL.
    
    Args:
        natural_language_query: User's question in natural language
        user_id: Current user ID for filtering
    
    Returns:
        dict with SQL query and explanation
    """
    prompt = f"""
You are a SQL expert. Convert the following natural language query into a safe SQL SELECT query.

{SCHEMA_INFO}

Important rules:
1. ALWAYS include WHERE user_id = {user_id} to filter by current user
2. Only generate SELECT queries (no INSERT, UPDATE, DELETE, DROP)
3. Use proper JOINs when querying multiple tables
4. Use aggregate functions (SUM, AVG, COUNT) when appropriate
5. Format dates properly using EXTRACT or DATE functions
6. Return results in a user-friendly order (ORDER BY)
7. Limit results to reasonable amounts (LIMIT 100)

User query: "{natural_language_query}"

Return a JSON object with:
{{
    "sql": "the SQL query",
    "explanation": "brief explanation of what the query does",
    "columns": ["list", "of", "column", "names"],
    "safe": true/false (whether query is safe to execute)
}}

If the query cannot be safely converted or is ambiguous, set "safe" to false and explain why in "explanation".
"""

    try:
        response = session.post(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps({
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }),
            timeout=30
        )

        if response.status_code != 200:
            return {
                "safe": False,
                "explanation": f"API error: {response.status_code}"
            }

        content = response.json()["choices"][0]["message"]["content"]
        
        # Extract JSON from response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        result = json.loads(content)
        
        # Additional safety checks
        sql_upper = result.get("sql", "").upper()
        dangerous_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC"]
        
        if any(keyword in sql_upper for keyword in dangerous_keywords):
            result["safe"] = False
            result["explanation"] = "Query contains potentially dangerous operations"
        
        return result
        
    except Exception as e:
        return {
            "safe": False,
            "explanation": f"Error generating query: {str(e)}"
        }


def execute_nlp_query(natural_language_query, user_id):
    """
    Execute a natural language query against the database.
    
    Args:
        natural_language_query: User's question
        user_id: Current user ID
    
    Returns:
        dict with results and metadata
    """
    from app import db
    
    # Generate SQL from natural language
    query_result = generate_sql_query(natural_language_query, user_id)
    
    if not query_result.get("safe", False):
        return {
            "success": False,
            "error": query_result.get("explanation", "Query could not be generated safely"),
            "query": None
        }
    
    sql_query = query_result.get("sql")
    
    try:
        # Execute the query
        result = db.session.execute(text(sql_query))
        
        # Fetch results
        rows = result.fetchall()
        
        # Convert to list of dicts
        columns = query_result.get("columns", [])
        if not columns and result.keys():
            columns = list(result.keys())
        
        data = []
        for row in rows:
            row_dict = {}
            for idx, col in enumerate(columns):
                try:
                    value = row[idx]
                    # Convert decimal/date types to strings for JSON serialization
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    elif hasattr(value, '__float__'):
                        value = float(value)
                    row_dict[col] = value
                except (IndexError, KeyError):
                    row_dict[col] = None
            data.append(row_dict)
        
        return {
            "success": True,
            "data": data,
            "query": sql_query,
            "explanation": query_result.get("explanation"),
            "row_count": len(data)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Query execution error: {str(e)}",
            "query": sql_query
        }


def format_query_results(results):
    """Format query results into a human-readable response."""
    if not results.get("success"):
        return f"❌ Query failed: {results.get('error', 'Unknown error')}"
    
    data = results.get("data", [])
    row_count = results.get("row_count", 0)
    explanation = results.get("explanation", "")
    
    if row_count == 0:
        return f"No results found. {explanation}"
    
    response_lines = [f"**Query Results** ({row_count} rows):", ""]
    
    if explanation:
        response_lines.append(f"*{explanation}*")
        response_lines.append("")
    
    # Format results as a table
    if data:
        # Limit display to first 10 rows
        display_data = data[:10]
        
        for idx, row in enumerate(display_data, 1):
            response_lines.append(f"**Row {idx}:**")
            for key, value in row.items():
                # Format currency values
                if key in ['amount', 'total', 'spent', 'budget', 'target_amount', 'current_amount']:
                    if isinstance(value, (int, float)):
                        value = f"₹{value:,.2f}"
                response_lines.append(f"  • {key}: {value}")
            response_lines.append("")
        
        if row_count > 10:
            response_lines.append(f"*... and {row_count - 10} more rows*")
    
    return "\n".join(response_lines)


# Common query templates for quick access
QUERY_TEMPLATES = {
    "total_spending": "What is my total spending this month?",
    "top_categories": "What are my top 5 spending categories?",
    "recent_transactions": "Show my last 10 transactions",
    "budget_status": "How much have I spent in each budget category?",
    "income_vs_expense": "Compare my income and expenses this month",
    "category_trend": "Show spending trend for {category} over last 6 months",
    "daily_average": "What is my average daily spending?",
    "savings_progress": "Show my savings goals progress"
}


def get_suggested_queries():
    """Return a list of suggested queries users can ask."""
    return [
        "Show my total spending this month",
        "What are my top 5 expense categories?",
        "List all transactions over ₹1000",
        "How much did I spend on Food last month?",
        "Show my income vs expenses for this year",
        "What's my average transaction amount?",
        "List all my active budgets",
        "Show transactions from last week",
        "What's my highest expense this month?",
        "Compare my spending this month vs last month"
    ]
