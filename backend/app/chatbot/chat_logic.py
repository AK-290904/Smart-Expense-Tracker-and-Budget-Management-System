"""Enhanced AI-powered chatbot with forecasting, prediction, context understanding, and NLP to SQL."""
import json
import requests
import os
from datetime import datetime
from sqlalchemy import func, extract

# Import enhanced modules
from .forecasting import (
    forecast_next_month,
    forecast_category_spending,
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
    build_context_aware_prompt,
    detect_intent_with_context
)


# API Configuration
API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = "mistralai/mixtral-8x7b-instruct"

session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
})


def load_categories(user_id):
    """Load all categories for a user."""
    from app.models import Category
    categories = Category.query.filter_by(user_id=user_id).all()
    return [{"name": c.name, "type": c.type} for c in categories]


def match_category(name, tx_type, categories):
    """Match category name (case-insensitive)."""
    name = name.strip().lower()
    for c in categories:
        if c['type'] == tx_type and c['name'].strip().lower() == name:
            return c['name']
    return None


def update_transaction(old_amount, new_amount, category_name, user_id):
    """Update an existing transaction."""
    from app import db
    from app.models import Transaction, Category
    from datetime import datetime, timedelta
    
    try:
        # Find the category
        category = None
        if category_name:
            category = Category.query.filter_by(
                user_id=user_id,
                name=category_name
            ).first()
        
        # Build query to find the transaction
        query = Transaction.query.filter_by(user_id=user_id)
        
        if category:
            query = query.filter_by(category_id=category.id)
        
        if old_amount:
            query = query.filter_by(amount=old_amount)
        
        # Get most recent transaction matching criteria (within last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        transaction = query.filter(Transaction.date >= thirty_days_ago).order_by(Transaction.date.desc()).first()
        
        if not transaction:
            return f" Could not find a recent transaction matching your criteria.\n\nTry: 'Show my recent {category_name if category_name else 'transactions'}' first."
        
        # Update the transaction
        old_amt = float(transaction.amount)
        transaction.amount = new_amount
        transaction.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        cat_name = Category.query.get(transaction.category_id).name
        return f" Updated transaction in '{cat_name}' from ₹{old_amt:.2f} to ₹{new_amount:.2f}"
        
    except Exception as e:
        db.session.rollback()
        return f" Failed to update transaction: {str(e)}"


def delete_transaction(amount, category_name, user_id):
    """Delete an existing transaction."""
    from app import db
    from app.models import Transaction, Category
    from datetime import datetime, timedelta
    
    try:
        # Find the category
        category = None
        if category_name:
            category = Category.query.filter_by(
                user_id=user_id,
                name=category_name
            ).first()
        
        # Build query to find the transaction
        query = Transaction.query.filter_by(user_id=user_id)
        
        if category:
            query = query.filter_by(category_id=category.id)
        
        if amount:
            query = query.filter_by(amount=amount)
        
        # Get most recent transaction matching criteria (within last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        transaction = query.filter(Transaction.date >= thirty_days_ago).order_by(Transaction.date.desc()).first()
        
        if not transaction:
            return f" Could not find a recent transaction matching your criteria.\n\nTry: 'Show my recent {category_name if category_name else 'transactions'}' first."
        
        # Get details before deleting
        cat_name = Category.query.get(transaction.category_id).name
        amt = float(transaction.amount)
        desc = transaction.description
        
        # Delete the transaction
        db.session.delete(transaction)
        db.session.commit()
        
        return f" Deleted transaction: ₹{amt:.2f} for '{desc}' from '{cat_name}'"
        
    except Exception as e:
        db.session.rollback()
        return f" Failed to delete transaction: {str(e)}"


def add_transaction(description, amount, category_name, tx_type, categories, user_id):
    """Add a transaction to the database."""
    from app import db
    from app.models import Category, Transaction
    
    # Validate inputs
    if not amount or amount <= 0:
        return " Invalid amount. Please specify a valid amount greater than 0.\n\nExample: 'Add 500 for food'"
    
    if not category_name or not category_name.strip():
        category_names = ", ".join([c['name'] for c in categories])
        return f" Category not specified.\n\nAvailable categories: {category_names}"
    
    matched = match_category(category_name, tx_type, categories)
    if not matched:
        return f" Category '{category_name}' of type '{tx_type}' not found. Transaction not recorded."

    # Find category in database
    category = Category.query.filter_by(
        name=matched, 
        user_id=user_id, 
        type=tx_type
    ).first()
    
    if not category:
        return f" Category '{matched}' not found in database."

    # Create transaction
    transaction = Transaction(
        amount=amount,
        category_id=category.id,
        description=description,
        date=datetime.utcnow(),
        user_id=user_id,
        type=tx_type
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return f" Recorded ₹{amount:.2f} as {tx_type} for '{description}' under '{matched}'."


def fetch_summary(user_id):
    """Fetch spending summary grouped by category."""
    from app import db
    from app.models import Category, Transaction
    
    results = db.session.query(
        Transaction.type,
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(Category).filter(
        Transaction.user_id == user_id
    ).group_by(Transaction.type, Category.name).order_by(
        func.sum(Transaction.amount).desc()
    ).all()
    
    return [{"type": r.type, "category": r.name, "total": float(r.total)} for r in results]


def fetch_monthly_totals(user_id):
    """Fetch monthly totals by type (income/expense)."""
    from app import db
    from app.models import Transaction
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    results = db.session.query(
        Transaction.type,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        extract('month', Transaction.date) == current_month,
        extract('year', Transaction.date) == current_year
    ).group_by(Transaction.type).all()
    
    return {r.type: float(r.total) for r in results}


def fetch_monthly_total_by_type(tx_type, user_id):
    """Fetch monthly total for a specific transaction type."""
    from app import db
    from app.models import Transaction
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    result = db.session.query(
        func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == tx_type,
        extract('month', Transaction.date) == current_month,
        extract('year', Transaction.date) == current_year
    ).scalar()
    
    return float(result) if result else 0


def predict_monthly_expense(user_id):
    """Predict monthly expense based on last 6 months average."""
    from app import db
    from app.models import Transaction
    
    results = db.session.query(
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense'
    ).group_by(
        extract('year', Transaction.date),
        extract('month', Transaction.date)
    ).order_by(
        extract('year', Transaction.date).desc(),
        extract('month', Transaction.date).desc()
    ).limit(6).all()
    
    if not results:
        return 0
    
    return sum(float(r.total) for r in results) / len(results)


def check_budget_status(user_id):
    """Check all budgets and return exceeded budgets."""
    from app import db
    from app.models import Budget, Category, Transaction
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    # Get all budgets for user
    budgets = Budget.query.filter_by(user_id=user_id).all()
    
    exceeded_budgets = []
    budget_status = []
    
    for budget in budgets:
        # Calculate spent for this category this month
        spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == current_month,
            extract('year', Transaction.date) == current_year
        ).scalar() or 0
        
        spent = float(spent)
        budget_amount = float(budget.amount)
        percentage = (spent / budget_amount * 100) if budget_amount > 0 else 0
        over_amount = spent - budget_amount
        
        category_name = budget.category.name
        
        status = {
            'category': category_name,
            'spent': spent,
            'budget': budget_amount,
            'percentage': percentage,
            'exceeded': spent > budget_amount,
            'over_amount': over_amount if spent > budget_amount else 0
        }
        
        budget_status.append(status)
        
        if spent > budget_amount:
            exceeded_budgets.append(status)
    
    return {
        'all_budgets': budget_status,
        'exceeded': exceeded_budgets,
        'has_exceeded': len(exceeded_budgets) > 0
    }


def get_budget_summary(user_id):
    """Get a summary of all budgets."""
    budget_data = check_budget_status(user_id)
    
    if not budget_data['all_budgets']:
        return "You don't have any budgets set up yet. Create budgets to track your spending!"
    
    summary_lines = []
    
    if budget_data['has_exceeded']:
        summary_lines.append("**Budget Alerts:**\n")
        for b in budget_data['exceeded']:
            summary_lines.append(
                f"{b['category']}: Spent ₹{b['spent']:.2f} / Budget ₹{b['budget']:.2f} "
                f"(Over by ₹{b['over_amount']:.2f}, {b['percentage']:.1f}%)"
            )
        summary_lines.append("")
    
    summary_lines.append("**All Budgets:**\n")
    for b in budget_data['all_budgets']:
        status = "On track" if not b['exceeded'] else "Exceeded"
        summary_lines.append(
            f"{b['category']}: ₹{b['spent']:.2f} / ₹{b['budget']:.2f} ({b['percentage']:.1f}%) - {status}"
        )
    
    return "\n".join(summary_lines)


def predict_budget_status(user_id):
    """Predict if user will exceed budget based on current spending rate."""
    from app import db
    from app.models import Budget, Transaction
    from datetime import datetime
    import calendar
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    current_day = datetime.utcnow().day
    
    # Get total days in current month
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    days_remaining = days_in_month - current_day
    
    budgets = Budget.query.filter_by(user_id=user_id).all()
    
    if not budgets:
        return "You don't have any budgets set up yet. Create budgets to track your spending!"
    
    predictions = []
    will_exceed = []
    
    for budget in budgets:
        # Calculate spent so far this month
        spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == current_month,
            extract('year', Transaction.date) == current_year
        ).scalar() or 0
        
        spent = float(spent)
        budget_amount = float(budget.amount)
        
        # Calculate daily average spending
        daily_avg = spent / current_day if current_day > 0 else 0
        
        # Predict end-of-month spending
        predicted_total = spent + (daily_avg * days_remaining)
        
        # Check if will exceed
        will_exceed_budget = predicted_total > budget_amount
        over_amount = predicted_total - budget_amount
        
        category_name = budget.category.name
        
        prediction = {
            'category': category_name,
            'spent_so_far': spent,
            'budget': budget_amount,
            'daily_avg': daily_avg,
            'predicted_total': predicted_total,
            'will_exceed': will_exceed_budget,
            'over_amount': over_amount if will_exceed_budget else 0,
            'days_remaining': days_remaining
        }
        
        predictions.append(prediction)
        
        if will_exceed_budget:
            will_exceed.append(prediction)
    
    # Format response
    response_lines = []
    
    response_lines.append(f"**Budget Prediction** (Day {current_day}/{days_in_month}, {days_remaining} days left):\n")
    
    if will_exceed:
        response_lines.append("**Warning - Likely to Exceed:**\n")
        for p in will_exceed:
            response_lines.append(
                f"{p['category']}: Spent ₹{p['spent_so_far']:.2f} → Predicted ₹{p['predicted_total']:.2f} / Budget ₹{p['budget']:.2f}\n"
                f"   (Will exceed by ₹{p['over_amount']:.2f} if current rate continues)"
            )
        response_lines.append("")
    
    response_lines.append("**All Predictions:**\n")
    for p in predictions:
        status = "On track" if not p['will_exceed'] else "Will exceed"
        response_lines.append(
            f"{p['category']}: ₹{p['spent_so_far']:.2f} → ₹{p['predicted_total']:.2f} / ₹{p['budget']:.2f} ({status})\n"
            f"   Daily avg: ₹{p['daily_avg']:.2f}"
        )
    
    return "\n".join(response_lines)


def get_savings_goals_status(user_id):
    """Get status of all savings goals."""
    from app.models import SavingsGoal
    from datetime import datetime, date
    
    goals = SavingsGoal.query.filter_by(user_id=user_id).all()
    
    if not goals:
        return "You don't have any savings goals set up yet. Create goals to track your savings progress!"
    
    response_lines = []
    response_lines.append("**Savings Goals Status:**\n")
    
    for goal in goals:
        current = float(goal.current_amount)
        target = float(goal.target_amount)
        percentage = (current / target * 100) if target > 0 else 0
        remaining = target - current
        
        # Check if goal has target date
        if goal.target_date:
            days_left = (goal.target_date - date.today()).days
            if days_left > 0:
                daily_needed = remaining / days_left if days_left > 0 else 0
                date_info = f" | {days_left} days left | Need ₹{daily_needed:.2f}/day"
            else:
                date_info = " | Overdue"
        else:
            date_info = ""
        
        # Status text
        if percentage >= 100:
            status = "Completed!"
        elif percentage >= 75:
            status = "Almost there!"
        elif percentage >= 50:
            status = "Halfway there"
        elif percentage >= 25:
            status = "Making progress"
        else:
            status = "Just started"
        
        response_lines.append(
            f"**{goal.name}**: ₹{current:.2f} / ₹{target:.2f} ({percentage:.1f}%)\n"
            f"   {status} | Remaining: ₹{remaining:.2f}{date_info}"
        )
        response_lines.append("")
    
    return "\n".join(response_lines)


def ask_ai_for_intent(user_input, summary_data, monthly_data, available_categories, context=None):
    """Ask AI to determine user intent and extract transaction details with context awareness."""
    category_list = "\n".join([f"{c['name']} ({c['type']})" for c in available_categories])
    summary = "\n".join([f"{s['type']} - {s['category']}: ₹{s['total']:.2f}" for s in summary_data])
    monthly = "\n".join([f"{k}: ₹{v:.2f}" for k, v in monthly_data.items()])

    # Build context-aware prompt if context is provided
    context_info = ""
    if context:
        context_summary = context.get_context_summary()
        if context_summary['last_intent']:
            context_info = f"\nPrevious Intent: {context_summary['last_intent']}"
        if context_summary['last_entities']:
            context_info += f"\nPrevious Entities: {json.dumps(context_summary['last_entities'])}"

    prompt = f"""
You are an advanced financial assistant with context awareness. Analyze the user's message and determine their intent.

User message: "{user_input}"
{context_info}

Available Categories:
{category_list}

Spending Summary:
{summary}

Monthly Totals:
{monthly}

Return a JSON object with:
- intent: one of ["add_transaction", "update_transaction", "delete_transaction", "get_summary", "get_monthly_total_income", "get_monthly_total_expense", 
  "forecast_expense", "forecast_income", "predict_expense", "check_budget", "budget_status", "predict_budget", 
  "budget_risk", "savings_goals", "spending_insights", "nlp_query", "advice", "chat"]
- transaction: true/false

DATABASE MANAGEMENT INTENTS:
- Use "update_transaction" when user wants to modify/update/change an existing transaction (e.g., "update my food expense from 1200 to 500", "change the amount to 300")
- Use "delete_transaction" when user wants to remove/delete a transaction (e.g., "delete my last food expense", "remove the 500 transaction")
- For update_transaction, include: old_amount, new_amount, category (optional)
- For delete_transaction, include: amount (optional), category (optional), description (optional)

IMPORTANT FOR TRANSACTIONS:
- ONLY set transaction=true if BOTH amount AND category are clearly specified in the user's message
- If amount is missing, use intent="chat" and ask for the amount in "message" field
- If category is missing, use intent="chat" and ask for the category in "message" field
- If transaction is true, you MUST include:
    - amount (numeric, greater than 0)
    - category (must match one of the available categories exactly)
    - description (string)
    - type ("income" or "expense")
- If no category matches, return: {{"transaction": false, "intent": "invalid_category"}}
- If intent is "advice", "chat", "get_summary", include a "message" field with your reply
- Use "forecast_expense" or "forecast_income" for future predictions
- Use "budget_risk" for risk analysis
- Use "spending_insights" for AI-powered insights
- Use "nlp_query" when user asks specific database questions (e.g., "show transactions over 1000", "what did I spend on food")
- Use "predict_budget" when user asks about FUTURE budget (e.g., "will I exceed", "if I keep spending", "by end of month")
- Use "savings_goals" when user asks about savings goals, goal progress, or savings targets
"""

    try:
        response = session.post(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps({
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5
            }),
            timeout=30
        )

        if response.status_code != 200:
            print(f"API Error: Status {response.status_code}, Response: {response.text}")
            return None

        content = response.json()["choices"][0]["message"]["content"]
        
        # Try to extract JSON from markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        result = json.loads(content)
        return result
        
    except requests.exceptions.Timeout:
        print("API request timed out")
        return None
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {str(e)}")
        return None
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Failed to parse AI response: {str(e)}")
        print(f"Raw content: {content if 'content' in locals() else 'N/A'}")
        return None
    except Exception as e:
        print(f"Unexpected error in ask_ai_for_intent: {str(e)}")
        return None


def simple_intent_fallback(user_input, categories):
    """Simple pattern matching fallback when AI fails."""
    user_input_lower = user_input.lower()
    import re
    
    # Check for update patterns
    if any(word in user_input_lower for word in ['update', 'change', 'modify', 'edit']):
        # Try to extract old and new amounts
        amounts = re.findall(r'(\d+(?:\.\d+)?)', user_input)
        
        # Try to match category
        matched_category = None
        for cat in categories:
            if cat['name'].lower() in user_input_lower:
                matched_category = cat
                break
        
        if len(amounts) >= 2:
            return {
                'intent': 'update_transaction',
                'old_amount': float(amounts[0]),
                'new_amount': float(amounts[1]),
                'category': matched_category['name'] if matched_category else None
            }
        elif len(amounts) == 1:
            return {
                'intent': 'chat',
                'message': f"To update a transaction, please specify both the old and new amounts.\n\nExample: 'Update my food expense from 1200 to 500'"
            }
    
    # Check for delete patterns
    if any(word in user_input_lower for word in ['delete', 'remove', 'cancel']):
        # Try to extract amount
        amount_match = re.search(r'(\d+(?:\.\d+)?)', user_input)
        
        # Try to match category
        matched_category = None
        for cat in categories:
            if cat['name'].lower() in user_input_lower:
                matched_category = cat
                break
        
        return {
            'intent': 'delete_transaction',
            'amount': float(amount_match.group(1)) if amount_match else None,
            'category': matched_category['name'] if matched_category else None
        }
    
    # Check for add patterns
    if any(word in user_input_lower for word in ['add', 'spent', 'paid', 'bought', 'transaction']):
        # Try to extract amount
        import re
        amount_match = re.search(r'(\d+(?:\.\d+)?)', user_input)
        
        # Try to match category first
        matched_category = None
        for cat in categories:
            if cat['name'].lower() in user_input_lower:
                matched_category = cat
                break
        
        # If we have both amount and category
        if amount_match and matched_category:
            amount = float(amount_match.group(1))
            return {
                'intent': 'add_transaction',
                'transaction': True,
                'amount': amount,
                'category': matched_category['name'],
                'description': user_input,
                'type': matched_category['type']
            }
        
        # If only category mentioned (no amount)
        elif matched_category:
            return {
                'intent': 'chat',
                'message': f"I see you want to add a transaction for '{matched_category['name']}' category. Please specify the amount.\n\nExample: 'Add 500 for {matched_category['name']}'"
            }
        
        # If only amount mentioned (no category)
        elif amount_match:
            category_names = ", ".join([c['name'] for c in categories])
            return {
                'intent': 'chat',
                'message': f"I see you want to add ₹{amount_match.group(1)}. Please specify the category.\n\nAvailable categories: {category_names}"
            }
    
    # Check for summary requests
    if any(word in user_input_lower for word in ['summary', 'total', 'spent', 'expenses']):
        if 'income' in user_input_lower:
            return {'intent': 'get_monthly_total_income'}
        elif 'expense' in user_input_lower or 'spent' in user_input_lower:
            return {'intent': 'get_monthly_total_expense'}
        else:
            return {'intent': 'get_summary', 'message': 'Here is your financial summary.'}
    
    # Check for budget requests
    if 'budget' in user_input_lower:
        if any(word in user_input_lower for word in ['will', 'exceed', 'predict', 'future']):
            return {'intent': 'predict_budget'}
        else:
            return {'intent': 'check_budget'}
    
    # Check for forecast requests
    if any(word in user_input_lower for word in ['forecast', 'predict', 'next month']):
        if 'income' in user_input_lower:
            return {'intent': 'forecast_income'}
        else:
            return {'intent': 'forecast_expense'}
    
    return None


def process_chat_message(user_input, user_id):
    """Process a chat message with enhanced features: forecasting, prediction, context, and NLP to SQL."""
    # Get or create conversation context
    context = get_user_context(user_id)
    
    # Detect context-aware intent
    context_data = detect_intent_with_context(user_input, context)
    
    # Load user data
    categories = load_categories(user_id)
    summary = fetch_summary(user_id)
    monthly = fetch_monthly_totals(user_id)
    
    # Get AI intent with context
    ai_data = ask_ai_for_intent(user_input, summary, monthly, categories, context)
    
    # Fallback to simple pattern matching if AI fails
    if not ai_data:
        ai_data = simple_intent_fallback(user_input, categories)
    
    if not ai_data:
        response = "Sorry, I couldn't understand that. Try asking about your spending, budgets, or use natural language queries!\n\n"
        response += "**Examples:**\n"
        response += "• Add 500 for food\n"
        response += "• Show my budget status\n"
        response += "• Forecast next month expenses\n"
        response += "• Show transactions over 1000"
        context.add_message('user', user_input)
        context.add_message('assistant', response)
        return response
    
    intent = ai_data.get("intent")
    entities = {}
    
    # Process based on intent
    if intent == "invalid_category":
        category_names = ", ".join([c['name'] for c in categories])
        response = f"I couldn't match your input to any known category. Please use one of these: {category_names}"
    
    elif intent == "add_transaction" and ai_data.get("transaction"):
        amount = ai_data.get("amount")
        category = ai_data.get("category")
        description = ai_data.get("description", user_input)
        tx_type = ai_data.get("type", "expense")
        
        # Validate amount and category before processing
        if not amount or amount <= 0:
            response = "Please specify a valid amount for the transaction.\n\nExample: 'Add 500 for food'"
        elif not category:
            category_names = ", ".join([c['name'] for c in categories])
            response = f"Please specify a category.\n\nAvailable categories: {category_names}"
        else:
            entities = {'amount': amount, 'category': category, 'type': tx_type}
            response = add_transaction(description, amount, category, tx_type, categories, user_id)
    
    elif intent == "update_transaction":
        old_amount = ai_data.get("old_amount")
        new_amount = ai_data.get("new_amount")
        category = ai_data.get("category")
        
        if not new_amount or new_amount <= 0:
            response = "Please specify the new amount.\n\nExample: 'Update my food expense from 1200 to 500'"
        else:
            entities = {'old_amount': old_amount, 'new_amount': new_amount, 'category': category}
            response = update_transaction(old_amount, new_amount, category, user_id)
    
    elif intent == "delete_transaction":
        amount = ai_data.get("amount")
        category = ai_data.get("category")
        
        entities = {'amount': amount, 'category': category}
        response = delete_transaction(amount, category, user_id)
    
    elif intent == "get_monthly_total_income":
        total = fetch_monthly_total_by_type("income", user_id)
        response = f"Your total income this month is ₹{total:.2f}."
    
    elif intent == "get_monthly_total_expense":
        total = fetch_monthly_total_by_type("expense", user_id)
        response = f"Your total expenditure this month is ₹{total:.2f}."
    
    elif intent == "predict_expense":
        predicted = predict_monthly_expense(user_id)
        response = f"Based on recent trends, your expected monthly spending is around ₹{predicted:.2f}."
    
    elif intent == "forecast_expense":
        forecast_result = forecast_next_month(user_id, tx_type='expense', method='auto')
        forecast_val = forecast_result['forecast']
        confidence = forecast_result['confidence']
        response = f"**Expense Forecast (Next Month):**\n\n"
        response += f"Predicted: ₹{forecast_val:,.2f}\n"
        response += f"Confidence: {confidence.upper()}"
    
    elif intent == "forecast_income":
        forecast_result = forecast_next_month(user_id, tx_type='income', method='auto')
        forecast_val = forecast_result['forecast']
        confidence = forecast_result['confidence']
        response = f"**Income Forecast (Next Month):**\n\n"
        response += f"Predicted: ₹{forecast_val:,.2f}\n"
        response += f"Confidence: {confidence.upper()}"
    
    elif intent == "budget_risk":
        risk_data = predict_budget_risk(user_id)
        risk_score = risk_data['risk_score']
        risk_level = risk_data['risk_level']
        high_risk = risk_data['high_risk_categories']
        
        response = f"**Budget Risk Analysis:**\n\n"
        response += f"Overall Risk Score: {risk_score:.1f}/100 ({risk_level.upper()})\n\n"
        
        if high_risk:
            response += "**High Risk Categories:**\n"
            for cat in high_risk:
                response += f"• {cat['category']}: ₹{cat['spent']:.2f} → ₹{cat['projected']:.2f} / ₹{cat['budget']:.2f}\n"
        else:
            response += " All budgets are on track!"
    
    elif intent == "spending_insights":
        insights = get_spending_insights(user_id)
        response = "**Spending Insights:**\n\n"
        
        if insights:
            for insight in insights:
                trend_emoji = "" if insight['trend'] == 'up' else ""
                response += f"{trend_emoji} **{insight['category']}**: "
                response += f"₹{insight['current']:.2f} (avg: ₹{insight['average']:.2f}, "
                response += f"{insight['change_pct']:+.1f}%)\n"
        else:
            response = "No significant spending changes detected this month."
    
    elif intent == "nlp_query":
        # Execute natural language to SQL query
        query_results = execute_nlp_query(user_input, user_id)
        response = format_query_results(query_results)
        
        if not query_results.get('success'):
            response += "\n\n**Suggested queries:**\n"
            for suggestion in get_suggested_queries()[:5]:
                response += f"• {suggestion}\n"
    
    elif intent == "check_budget" or intent == "budget_status":
        response = get_budget_summary(user_id)
    
    elif intent == "predict_budget":
        response = predict_budget_status(user_id)
    
    elif intent == "savings_goals":
        response = get_savings_goals_status(user_id)
    
    elif intent == "get_summary":
        response = ai_data.get("message", "Here's your summary.")
    
    elif intent == "advice":
        response = ai_data.get("message", "Here's some advice.")
    
    else:
        response = ai_data.get("message", "I'm here to help! Ask me about spending, budgets, forecasts, or use natural language to query your data.")
    
    # Add to conversation context
    context.add_message('user', user_input, intent=intent, entities=entities)
    context.add_message('assistant', response)
    
    return response


