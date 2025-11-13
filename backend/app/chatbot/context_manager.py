"""Context-based conversation management for chatbot."""
import json
from datetime import datetime, timedelta
from collections import deque


class ConversationContext:
    """Manages conversation context and history for a user."""
    
    def __init__(self, user_id, max_history=10):
        """
        Initialize conversation context.
        
        Args:
            user_id: User ID
            max_history: Maximum number of messages to keep in context
        """
        self.user_id = user_id
        self.max_history = max_history
        self.messages = deque(maxlen=max_history)
        self.context_data = {}
        self.last_intent = None
        self.last_entities = {}
        self.session_start = datetime.utcnow()
    
    def add_message(self, role, content, intent=None, entities=None):
        """
        Add a message to conversation history.
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
            intent: Detected intent (optional)
            entities: Extracted entities (optional)
        """
        message = {
            'role': role,
            'content': content,
            'timestamp': datetime.utcnow().isoformat(),
            'intent': intent,
            'entities': entities or {}
        }
        self.messages.append(message)
        
        if role == 'user' and intent:
            self.last_intent = intent
            self.last_entities = entities or {}
    
    def get_history(self, limit=None):
        """Get conversation history."""
        if limit:
            return list(self.messages)[-limit:]
        return list(self.messages)
    
    def get_context_summary(self):
        """Get a summary of the conversation context."""
        return {
            'user_id': self.user_id,
            'message_count': len(self.messages),
            'last_intent': self.last_intent,
            'last_entities': self.last_entities,
            'session_duration': (datetime.utcnow() - self.session_start).seconds,
            'context_data': self.context_data
        }
    
    def set_context(self, key, value):
        """Set a context variable."""
        self.context_data[key] = value
    
    def get_context(self, key, default=None):
        """Get a context variable."""
        return self.context_data.get(key, default)
    
    def clear_context(self):
        """Clear all context data."""
        self.context_data = {}
        self.last_intent = None
        self.last_entities = {}
    
    def is_follow_up(self, current_intent):
        """Check if current message is a follow-up to previous intent."""
        follow_up_patterns = {
            'add_transaction': ['add_transaction', 'get_summary'],
            'get_summary': ['add_transaction', 'get_details'],
            'check_budget': ['predict_budget', 'add_transaction'],
            'forecast': ['get_summary', 'advice'],
            'nlp_query': ['nlp_query', 'get_details']
        }
        
        if not self.last_intent:
            return False
        
        return current_intent in follow_up_patterns.get(self.last_intent, [])
    
    def extract_reference(self, user_input):
        """
        Extract references to previous context.
        
        Examples:
        - "that category" -> refers to last mentioned category
        - "more details" -> refers to last query
        - "same amount" -> refers to last amount
        """
        references = {}
        user_input_lower = user_input.lower()
        
        # Pronoun references
        if any(word in user_input_lower for word in ['that', 'this', 'it', 'same']):
            if 'category' in self.last_entities:
                references['category'] = self.last_entities['category']
            if 'amount' in self.last_entities:
                references['amount'] = self.last_entities['amount']
        
        # "More" or "details" suggests expanding on last response
        if any(word in user_input_lower for word in ['more', 'details', 'elaborate', 'explain']):
            references['expand_last'] = True
            references['last_intent'] = self.last_intent
        
        return references
    
    def to_dict(self):
        """Convert context to dictionary for storage."""
        return {
            'user_id': self.user_id,
            'messages': list(self.messages),
            'context_data': self.context_data,
            'last_intent': self.last_intent,
            'last_entities': self.last_entities,
            'session_start': self.session_start.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create context from dictionary."""
        context = cls(data['user_id'])
        context.messages = deque(data.get('messages', []), maxlen=context.max_history)
        context.context_data = data.get('context_data', {})
        context.last_intent = data.get('last_intent')
        context.last_entities = data.get('last_entities', {})
        if 'session_start' in data:
            context.session_start = datetime.fromisoformat(data['session_start'])
        return context


# Global context storage (in-memory for now, can be moved to Redis/DB)
_context_store = {}


def get_user_context(user_id):
    """Get or create conversation context for a user."""
    if user_id not in _context_store:
        _context_store[user_id] = ConversationContext(user_id)
    
    # Clean up old contexts (older than 1 hour)
    context = _context_store[user_id]
    if (datetime.utcnow() - context.session_start).seconds > 3600:
        context.clear_context()
        context.session_start = datetime.utcnow()
    
    return context


def clear_user_context(user_id):
    """Clear context for a user."""
    if user_id in _context_store:
        del _context_store[user_id]


def get_all_contexts():
    """Get all active contexts (for debugging)."""
    return {uid: ctx.get_context_summary() for uid, ctx in _context_store.items()}


def build_context_aware_prompt(user_input, context, additional_data=None):
    """
    Build a context-aware prompt for the AI.
    
    Args:
        user_input: Current user message
        context: ConversationContext object
        additional_data: Additional data to include in prompt
    
    Returns:
        Enhanced prompt with context
    """
    history = context.get_history(limit=5)
    
    prompt_parts = []
    
    # Add conversation history
    if history:
        prompt_parts.append("**Conversation History:**")
        for msg in history[-3:]:  # Last 3 messages
            role = msg['role'].capitalize()
            content = msg['content'][:100]  # Truncate long messages
            prompt_parts.append(f"{role}: {content}")
        prompt_parts.append("")
    
    # Add context data
    if context.context_data:
        prompt_parts.append("**Context:**")
        for key, value in context.context_data.items():
            prompt_parts.append(f"- {key}: {value}")
        prompt_parts.append("")
    
    # Add last intent
    if context.last_intent:
        prompt_parts.append(f"**Last Intent:** {context.last_intent}")
        prompt_parts.append("")
    
    # Add additional data
    if additional_data:
        prompt_parts.append("**Additional Context:**")
        for key, value in additional_data.items():
            prompt_parts.append(f"- {key}: {value}")
        prompt_parts.append("")
    
    # Add current message
    prompt_parts.append("**Current Message:**")
    prompt_parts.append(user_input)
    
    return "\n".join(prompt_parts)


def detect_intent_with_context(user_input, context):
    """
    Detect intent considering conversation context.
    
    Returns enhanced intent with context awareness.
    """
    # Check for references to previous context
    references = context.extract_reference(user_input)
    
    # Check if this is a follow-up
    is_follow_up = False
    if context.last_intent:
        is_follow_up = context.is_follow_up(context.last_intent)
    
    return {
        'is_follow_up': is_follow_up,
        'references': references,
        'last_intent': context.last_intent,
        'context_data': context.context_data
    }
