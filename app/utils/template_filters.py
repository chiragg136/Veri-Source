"""
Custom template filters for the VeriSource application.
These filters are used in Jinja2 templates to format and style data.
"""

import jinja2
from markupsafe import Markup


def register_filters(app):
    """Register all custom template filters with the Flask app."""
    app.jinja_env.filters["priority_badge"] = priority_badge
    app.jinja_env.filters["status_badge"] = status_badge
    app.jinja_env.filters["review_type_badge"] = review_type_badge
    app.jinja_env.filters["score_color"] = score_color
    app.jinja_env.filters["risk_badge"] = risk_badge
    app.jinja_env.filters["sentiment_badge"] = sentiment_badge
    app.jinja_env.filters["sentiment_color"] = sentiment_color
    app.jinja_env.filters["agreement_color"] = agreement_color
    app.jinja_env.filters["status_color"] = status_color
    app.jinja_env.filters["nl2br"] = nl2br


def priority_badge(priority):
    """Return a Bootstrap badge class for priority levels."""
    priority_classes = {
        "low": "bg-success",
        "medium": "bg-info",
        "high": "bg-warning",
        "critical": "bg-danger"
    }
    return priority_classes.get(priority, "bg-secondary")


def status_badge(status):
    """Return a Bootstrap badge class for review status."""
    status_classes = {
        "pending": "bg-warning",
        "approved": "bg-success",
        "rejected": "bg-danger",
        "modified": "bg-info"
    }
    return status_classes.get(status, "bg-secondary")


def review_type_badge(review_type):
    """Return a Bootstrap badge class for review types."""
    type_classes = {
        "security_assessment": "bg-danger",
        "risk_assessment": "bg-warning",
        "sentiment_analysis": "bg-info",
        "bid_evaluation": "bg-primary",
        "requirement_extraction": "bg-secondary",
        "infographic_report": "bg-success"
    }
    return type_classes.get(review_type, "bg-secondary")


def score_color(score):
    """Return a Bootstrap color class based on score (0-1 or 0-100)."""
    # Normalize score to 0-1
    if isinstance(score, str):
        try:
            score = float(score)
        except (ValueError, TypeError):
            return "bg-secondary"
    
    if score > 1:  # If score is 0-100
        score = score / 100
    
    if score >= 0.8:
        return "bg-success"
    elif score >= 0.6:
        return "bg-info"
    elif score >= 0.4:
        return "bg-warning"
    else:
        return "bg-danger"


def risk_badge(risk_level):
    """Return a Bootstrap badge class for risk levels."""
    risk_classes = {
        "low": "bg-success",
        "medium": "bg-warning",
        "high": "bg-danger",
        "critical": "bg-dark"
    }
    return risk_classes.get(risk_level.lower(), "bg-secondary")


def sentiment_badge(sentiment):
    """Return a Bootstrap badge class for sentiment categories."""
    sentiment_classes = {
        "positive": "bg-success",
        "neutral": "bg-info",
        "negative": "bg-danger",
        "mixed": "bg-warning"
    }
    return sentiment_classes.get(sentiment.lower(), "bg-secondary")


def sentiment_color(score):
    """Return a Bootstrap color class based on sentiment score (0-1)."""
    # Normalize score to 0-1
    if isinstance(score, str):
        try:
            score = float(score)
        except (ValueError, TypeError):
            return "bg-secondary"
    
    if score > 1:  # If score is 0-100
        score = score / 100
    
    if score >= 0.7:
        return "bg-success"
    elif score >= 0.4:
        return "bg-info"
    else:
        return "bg-danger"


def agreement_color(agreement_level):
    """Return a Bootstrap color class based on agreement level (0-1)."""
    # Normalize to 0-1
    if isinstance(agreement_level, str):
        try:
            agreement_level = float(agreement_level)
        except (ValueError, TypeError):
            return "bg-secondary"
    
    if agreement_level > 1:  # If level is 0-100
        agreement_level = agreement_level / 100
    
    if agreement_level >= 0.8:
        return "bg-success"
    elif agreement_level >= 0.5:
        return "bg-warning"
    else:
        return "bg-danger"


def status_color(status):
    """Return a Bootstrap contextual class for alert styling based on status."""
    status_colors = {
        "pending": "warning",
        "approved": "success",
        "rejected": "danger",
        "modified": "info"
    }
    return status_colors.get(status, "secondary")


def nl2br(value):
    """Convert newlines to HTML line breaks."""
    if not value:
        return ""
    value = jinja2.escape(value)
    return Markup(value.replace('\n', '<br>\n'))