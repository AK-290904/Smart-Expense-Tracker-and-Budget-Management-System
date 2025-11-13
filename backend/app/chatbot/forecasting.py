"""Advanced forecasting and prediction module for financial data."""
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func, extract
from collections import defaultdict


def get_historical_data(user_id, tx_type='expense', months=12):
    """Get historical transaction data for forecasting."""
    from app import db
    from app.models import Transaction
    
    # Get data for the last N months
    results = db.session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == tx_type
    ).group_by(
        extract('year', Transaction.date),
        extract('month', Transaction.date)
    ).order_by(
        extract('year', Transaction.date).desc(),
        extract('month', Transaction.date).desc()
    ).limit(months).all()
    
    # Convert to list of values
    data = [float(r.total) for r in reversed(results)]
    return data


def simple_moving_average(data, window=3):
    """Calculate simple moving average."""
    if len(data) < window:
        return sum(data) / len(data) if data else 0
    
    return sum(data[-window:]) / window


def exponential_smoothing(data, alpha=0.3):
    """Calculate exponential smoothing forecast."""
    if not data:
        return 0
    
    if len(data) == 1:
        return data[0]
    
    # Initialize with first value
    forecast = data[0]
    
    # Apply exponential smoothing
    for value in data[1:]:
        forecast = alpha * value + (1 - alpha) * forecast
    
    return forecast


def linear_trend_forecast(data, periods_ahead=1):
    """Calculate linear trend forecast using least squares."""
    if len(data) < 2:
        return data[0] if data else 0
    
    n = len(data)
    x = np.arange(n)
    y = np.array(data)
    
    # Calculate slope and intercept
    x_mean = np.mean(x)
    y_mean = np.mean(y)
    
    numerator = np.sum((x - x_mean) * (y - y_mean))
    denominator = np.sum((x - x_mean) ** 2)
    
    if denominator == 0:
        return y_mean
    
    slope = numerator / denominator
    intercept = y_mean - slope * x_mean
    
    # Forecast for next period(s)
    forecast = intercept + slope * (n + periods_ahead - 1)
    
    return max(0, forecast)  # Ensure non-negative


def seasonal_decomposition(data, period=12):
    """Simple seasonal decomposition."""
    if len(data) < period * 2:
        return {
            'trend': simple_moving_average(data),
            'seasonal': 0,
            'forecast': simple_moving_average(data)
        }
    
    # Calculate trend using moving average
    trend = simple_moving_average(data, window=period)
    
    # Calculate seasonal component
    detrended = [data[i] - trend for i in range(len(data))]
    seasonal = sum(detrended[-period:]) / period if len(detrended) >= period else 0
    
    # Forecast = trend + seasonal
    forecast = trend + seasonal
    
    return {
        'trend': trend,
        'seasonal': seasonal,
        'forecast': max(0, forecast)
    }


def forecast_next_month(user_id, tx_type='expense', method='auto'):
    """
    Forecast next month's transactions using multiple methods.
    
    Args:
        user_id: User ID
        tx_type: 'income' or 'expense'
        method: 'auto', 'sma', 'ema', 'linear', 'seasonal'
    
    Returns:
        dict with forecast value and confidence
    """
    data = get_historical_data(user_id, tx_type, months=12)
    
    if not data:
        return {
            'forecast': 0,
            'method': 'no_data',
            'confidence': 'low',
            'message': f'No historical {tx_type} data available.'
        }
    
    if len(data) < 3:
        avg = sum(data) / len(data)
        return {
            'forecast': avg,
            'method': 'average',
            'confidence': 'low',
            'message': f'Limited data. Using average: ₹{avg:.2f}'
        }
    
    # Calculate using different methods
    forecasts = {}
    
    if method in ['auto', 'sma']:
        forecasts['sma'] = simple_moving_average(data, window=3)
    
    if method in ['auto', 'ema']:
        forecasts['ema'] = exponential_smoothing(data, alpha=0.3)
    
    if method in ['auto', 'linear']:
        forecasts['linear'] = linear_trend_forecast(data, periods_ahead=1)
    
    if method in ['auto', 'seasonal'] and len(data) >= 6:
        seasonal_result = seasonal_decomposition(data, period=min(12, len(data)))
        forecasts['seasonal'] = seasonal_result['forecast']
    
    # Choose best method (auto mode)
    if method == 'auto':
        # Use ensemble average for better accuracy
        forecast_value = sum(forecasts.values()) / len(forecasts)
        used_method = 'ensemble'
    else:
        forecast_value = forecasts.get(method, forecasts.get('sma', 0))
        used_method = method
    
    # Determine confidence based on data variance
    variance = np.var(data)
    mean = np.mean(data)
    cv = (np.sqrt(variance) / mean) if mean > 0 else 0
    
    if cv < 0.2:
        confidence = 'high'
    elif cv < 0.5:
        confidence = 'medium'
    else:
        confidence = 'low'
    
    return {
        'forecast': forecast_value,
        'method': used_method,
        'confidence': confidence,
        'historical_data': data,
        'variance': variance,
        'mean': mean
    }


def forecast_category_spending(user_id, category_id, months_ahead=1):
    """Forecast spending for a specific category."""
    from app import db
    from app.models import Transaction
    
    # Get historical data for this category
    results = db.session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.category_id == category_id,
        Transaction.type == 'expense'
    ).group_by(
        extract('year', Transaction.date),
        extract('month', Transaction.date)
    ).order_by(
        extract('year', Transaction.date).desc(),
        extract('month', Transaction.date).desc()
    ).limit(12).all()
    
    data = [float(r.total) for r in reversed(results)]
    
    if not data:
        return 0
    
    # Use exponential smoothing for category-level forecast
    return exponential_smoothing(data, alpha=0.3)


def predict_budget_risk(user_id):
    """
    Predict budget risk using advanced analytics.
    
    Returns risk score and recommendations.
    """
    from app import db
    from app.models import Budget, Transaction, Category
    from datetime import datetime
    import calendar
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    current_day = datetime.utcnow().day
    
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    days_remaining = days_in_month - current_day
    
    budgets = Budget.query.filter_by(user_id=user_id).all()
    
    if not budgets:
        return {
            'risk_score': 0,
            'risk_level': 'none',
            'message': 'No budgets set up.'
        }
    
    risk_scores = []
    high_risk_categories = []
    
    for budget in budgets:
        # Get spending so far
        spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == 'expense',
            extract('month', Transaction.date) == current_month,
            extract('year', Transaction.date) == current_year
        ).scalar() or 0
        
        spent = float(spent)
        budget_amount = float(budget.amount)
        
        # Calculate risk score (0-100)
        if budget_amount == 0:
            continue
        
        # Current utilization
        utilization = (spent / budget_amount) * 100
        
        # Projected utilization
        daily_avg = spent / current_day if current_day > 0 else 0
        projected_total = spent + (daily_avg * days_remaining)
        projected_utilization = (projected_total / budget_amount) * 100
        
        # Risk score based on projected utilization
        if projected_utilization > 120:
            risk = 100
        elif projected_utilization > 100:
            risk = 80
        elif projected_utilization > 90:
            risk = 60
        elif projected_utilization > 80:
            risk = 40
        else:
            risk = 20
        
        risk_scores.append(risk)
        
        if risk >= 60:
            high_risk_categories.append({
                'category': budget.category.name,
                'risk': risk,
                'spent': spent,
                'budget': budget_amount,
                'projected': projected_total
            })
    
    # Overall risk score
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    
    if avg_risk >= 80:
        risk_level = 'critical'
    elif avg_risk >= 60:
        risk_level = 'high'
    elif avg_risk >= 40:
        risk_level = 'medium'
    else:
        risk_level = 'low'
    
    return {
        'risk_score': avg_risk,
        'risk_level': risk_level,
        'high_risk_categories': high_risk_categories,
        'total_budgets': len(budgets),
        'days_remaining': days_remaining
    }


def get_spending_insights(user_id):
    """Generate AI-powered spending insights."""
    from app import db
    from app.models import Transaction, Category
    
    # Get spending by category for current month
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    results = db.session.query(
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense',
        extract('month', Transaction.date) == current_month,
        extract('year', Transaction.date) == current_year
    ).group_by(Category.name).order_by(
        func.sum(Transaction.amount).desc()
    ).limit(5).all()
    
    insights = []
    
    for category, total in results:
        # Get historical average for this category
        hist_avg = db.session.query(
            func.avg(func.sum(Transaction.amount))
        ).join(Category).filter(
            Transaction.user_id == user_id,
            Transaction.type == 'expense',
            Category.name == category
        ).group_by(
            extract('year', Transaction.date),
            extract('month', Transaction.date)
        ).scalar() or 0
        
        hist_avg = float(hist_avg)
        total = float(total)
        
        if hist_avg > 0:
            change_pct = ((total - hist_avg) / hist_avg) * 100
            
            if abs(change_pct) > 20:
                insights.append({
                    'category': category,
                    'current': total,
                    'average': hist_avg,
                    'change_pct': change_pct,
                    'trend': 'up' if change_pct > 0 else 'down'
                })
    
    return insights
