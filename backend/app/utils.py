"""Utility functions for the application."""


def get_user_id_from_jwt(jwt_identity):
    """
    Convert JWT identity to integer user ID.

    JWT requires string identities, but our database uses integer IDs.
    This helper converts the string back to int for database queries.

    Args:
        jwt_identity: The identity value from get_jwt_identity()

    Returns:
        int: The user ID as an integer

    Raises:
        ValueError: If the identity cannot be converted to int
    """
    try:
        return int(jwt_identity)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid JWT identity: {jwt_identity}") from e
