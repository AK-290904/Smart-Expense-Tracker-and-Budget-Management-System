"""Goals blueprint."""
from flask import Blueprint

goals_bp = Blueprint('goals', __name__)

from app.goals import routes
