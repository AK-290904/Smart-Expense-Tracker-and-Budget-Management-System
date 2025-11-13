"""Marshmallow schemas for validation and serialization."""

from datetime import datetime

from marshmallow import Schema, ValidationError, fields, post_load, validate, validates


class UserSchema(Schema):
    """User schema."""

    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(
        load_only=True, required=True, validate=validate.Length(min=6)
    )
    theme_preference = fields.Str(validate=validate.OneOf(["light", "dark"]))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class LoginSchema(Schema):
    """Login schema."""

    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)


class CategorySchema(Schema):
    """Category schema."""

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Str(required=True, validate=validate.OneOf(["income", "expense"]))
    icon = fields.Str(validate=validate.Length(max=50))
    color = fields.Str(validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"))
    created_at = fields.DateTime(dump_only=True)


class TransactionSchema(Schema):
    """Transaction schema."""

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    category_id = fields.Int(required=True)
    group_id = fields.Int(allow_none=True)
    amount = fields.Decimal(required=True, as_string=True, places=2)
    type = fields.Str(required=True, validate=validate.OneOf(["income", "expense"]))
    description = fields.Str(allow_none=True)
    date = fields.Date(required=True)
    is_recurring = fields.Bool()
    recurring_frequency = fields.Str(
        validate=validate.OneOf(["daily", "weekly", "monthly", "yearly"])
    )
    recurring_end_date = fields.Date(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested fields
    category = fields.Nested(CategorySchema, dump_only=True)

    @validates("amount")
    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise ValidationError("Amount must be greater than 0")

    @validates("date")
    def validate_date(self, value):
        """Validate date is not in future."""
        from datetime import date as date_type

        today = date_type.today()
        if value > today:
            raise ValidationError("Transaction date cannot be in the future")


class BudgetSchema(Schema):
    """Budget schema."""

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    category_id = fields.Int(required=True)
    amount = fields.Decimal(required=True, as_string=True, places=2)
    period = fields.Str(validate=validate.OneOf(["weekly", "monthly"]))
    month = fields.Int(validate=validate.Range(min=1, max=12))
    year = fields.Int(validate=validate.Range(min=2000, max=2100))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested fields
    category = fields.Nested(CategorySchema, dump_only=True)
    spent = fields.Decimal(dump_only=True, as_string=True, places=2)
    remaining = fields.Decimal(dump_only=True, as_string=True, places=2)
    percentage = fields.Float(dump_only=True)

    @validates("amount")
    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise ValidationError("Budget amount must be greater than 0")


class SavingsGoalSchema(Schema):
    """Savings goal schema."""

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    target_amount = fields.Decimal(required=True, as_string=True, places=2)
    current_amount = fields.Decimal(as_string=True, places=2)
    target_date = fields.Date(allow_none=True)
    icon = fields.Str(validate=validate.Length(max=50))
    color = fields.Str(validate=validate.Regexp(r"^#[0-9A-Fa-f]{6}$"))
    status = fields.Str(validate=validate.OneOf(["active", "completed", "cancelled"]))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Computed fields
    progress_percentage = fields.Float(dump_only=True)
    remaining_amount = fields.Decimal(dump_only=True, as_string=True, places=2)

    @validates("target_amount")
    def validate_target_amount(self, value):
        """Validate target amount is positive."""
        if value <= 0:
            raise ValidationError("Target amount must be greater than 0")


class GroupSchema(Schema):
    """Group schema."""

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    owner_id = fields.Int(dump_only=True)
    description = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested fields
    members = fields.List(fields.Nested("GroupMemberSchema"), dump_only=True)
    member_count = fields.Int(dump_only=True)


class GroupMemberSchema(Schema):
    """Group member schema."""

    id = fields.Int(dump_only=True)
    group_id = fields.Int(required=True)
    user_id = fields.Int(required=True)
    role = fields.Str(validate=validate.OneOf(["admin", "member"]))
    joined_at = fields.DateTime(dump_only=True)

    # Nested fields
    user = fields.Nested(UserSchema(only=("id", "username", "email")), dump_only=True)


class AnalyticsSummarySchema(Schema):
    """Analytics summary schema."""

    total_income = fields.Decimal(as_string=True, places=2)
    total_expenses = fields.Decimal(as_string=True, places=2)
    net_balance = fields.Decimal(as_string=True, places=2)
    savings_rate = fields.Float()
    transaction_count = fields.Int()
    income_count = fields.Int()
    expense_count = fields.Int()
    period = fields.Str()


class CategorySpendingSchema(Schema):
    """Category spending schema."""

    category_id = fields.Int()
    category_name = fields.Str()
    category_icon = fields.Str()
    category_color = fields.Str()
    total_amount = fields.Decimal(as_string=True, places=2)
    transaction_count = fields.Int()
    percentage = fields.Float()


class TrendDataSchema(Schema):
    """Trend data schema."""

    date = fields.Str()
    income = fields.Decimal(as_string=True, places=2)
    expense = fields.Decimal(as_string=True, places=2)
    net = fields.Decimal(as_string=True, places=2)


class InsightSchema(Schema):
    """Insight schema."""

    type = fields.Str()
    title = fields.Str()
    message = fields.Str()
    severity = fields.Str(
        validate=validate.OneOf(["info", "warning", "success", "error"])
    )
    data = fields.Dict()
