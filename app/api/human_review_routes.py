"""
API routes for human-in-the-loop review functionality.
These routes handle the dashboard, review tasks, and review submissions.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask import current_app as app
from sqlalchemy.orm import Session

from app.database import db
from app.models.review import HumanReview, ReviewStatus, ReviewPriority, ReviewType
from app.services.human_review import (
    get_pending_reviews, get_review_details, 
    submit_review, get_review_statistics
)
from app.utils.review_utils import build_assessment_comparison

# Set up logging
logger = logging.getLogger(__name__)

# Create blueprint
human_review_bp = Blueprint("human_review", __name__)


@human_review_bp.route("/human-review-dashboard")
def human_review_dashboard():
    """
    Human review dashboard showing pending and completed reviews.
    """
    # Get filter parameters
    review_type = request.args.get("type")
    priority = request.args.get("priority")
    assigned_to = request.args.get("assigned_to")
    
    # Convert string parameters to enum values if needed
    review_type_enum = None
    if review_type:
        try:
            review_type_enum = ReviewType(review_type)
        except ValueError:
            pass
    
    priority_enum = None
    if priority:
        try:
            priority_enum = ReviewPriority(priority)
        except ValueError:
            pass
    
    # Get pending reviews
    pending_reviews = get_pending_reviews(
        assigned_to=assigned_to,
        priority=priority_enum,
        review_type=review_type_enum
    )
    
    # Get completed reviews
    session = db.session
    completed_query = session.query(HumanReview).filter(
        HumanReview.status != ReviewStatus.PENDING
    ).order_by(HumanReview.completed_at.desc())
    
    if review_type_enum:
        completed_query = completed_query.filter(HumanReview.review_type == review_type_enum)
    
    if assigned_to:
        completed_query = completed_query.filter(HumanReview.completed_by == assigned_to)
    
    completed_reviews = completed_query.limit(10).all()
    
    # Get review statistics
    stats = get_review_statistics()
    
    return render_template(
        "human_review_dashboard.html",
        pending_reviews=pending_reviews,
        completed_reviews=completed_reviews,
        stats=stats,
        review_types=list(ReviewType),
        review_priorities=list(ReviewPriority),
        request=request
    )


@human_review_bp.route("/human-review-task/<int:review_id>")
def human_review_task(review_id: int):
    """
    Page for reviewing a specific task.
    
    Args:
        review_id: ID of the review to display
    """
    # Get review details
    review_data = get_review_details(review_id)
    
    if "error" in review_data:
        flash(f"Error: {review_data['error']}", "danger")
        return redirect(url_for("human_review.human_review_dashboard"))
    
    # Extract document content if available
    document_content = None
    
    return render_template(
        "human_review_task.html",
        review=review_data["review"],
        related_document=review_data.get("rfp") or review_data.get("bid"),
        document_content=document_content
    )


@human_review_bp.route("/human-review-details/<int:review_id>")
def human_review_details(review_id: int):
    """
    Page for viewing details of a completed review.
    
    Args:
        review_id: ID of the review to display
    """
    # Get review details
    review_data = get_review_details(review_id)
    
    if "error" in review_data:
        flash(f"Error: {review_data['error']}", "danger")
        return redirect(url_for("human_review.human_review_dashboard"))
    
    # Build comparison data if the review was modified
    comparison_data = None
    if review_data["review"]["status"] == "modified" and review_data["human_assessment"]:
        comparison_data = build_assessment_comparison(
            review_data["ai_assessment"],
            review_data["human_assessment"]
        )
    
    # Determine related document URL if available
    related_document_url = None
    if "rfp" in review_data:
        related_document_url = url_for("get_rfp", rfp_id=review_data["rfp"]["id"])
    elif "bid" in review_data:
        related_document_url = url_for("get_bid", bid_id=review_data["bid"]["id"])
    
    return render_template(
        "human_review_details.html",
        review=review_data["review"],
        comparison_data=comparison_data,
        related_document_url=related_document_url
    )


@human_review_bp.route("/submit-human-review/<int:review_id>", methods=["POST"])
def submit_human_review(review_id: int):
    """
    Handle submission of a human review.
    
    Args:
        review_id: ID of the review being submitted
    """
    # Get form data
    status_str = request.form.get("status")
    notes = request.form.get("notes", "")
    rationale = request.form.get("rationale", "")
    agreement_level = float(request.form.get("agreement_level", 0)) / 100  # Convert from 0-100 to 0-1
    confidence_score = float(request.form.get("confidence_score", 0)) / 100  # Convert from 0-100 to 0-1
    
    # Convert status string to enum
    try:
        status = ReviewStatus(status_str)
    except ValueError:
        flash(f"Error: Invalid status '{status_str}'", "danger")
        return redirect(url_for("human_review.human_review_task", review_id=review_id))
    
    # Get the original review to determine its type
    session = db.session
    review = session.query(HumanReview).filter(HumanReview.id == review_id).first()
    
    if not review:
        flash("Error: Review not found", "danger")
        return redirect(url_for("human_review.human_review_dashboard"))
    
    # Build human assessment data based on review type if status is 'modified'
    human_assessment = None
    if status == ReviewStatus.MODIFIED:
        if review.review_type == ReviewType.BID_EVALUATION:
            human_assessment = _build_bid_evaluation_assessment(request.form)
        elif review.review_type == ReviewType.SECURITY_ASSESSMENT:
            human_assessment = _build_security_assessment(request.form)
        elif review.review_type == ReviewType.RISK_ASSESSMENT:
            human_assessment = _build_risk_assessment(request.form)
        elif review.review_type == ReviewType.SENTIMENT_ANALYSIS:
            human_assessment = _build_sentiment_analysis(request.form)
        else:
            # Generic JSON handling
            try:
                assessment_data = request.form.get("assessment_data", "{}")
                human_assessment = json.loads(assessment_data)
            except json.JSONDecodeError:
                flash("Error: Invalid JSON in assessment data", "danger")
                return redirect(url_for("human_review.human_review_task", review_id=review_id))
    
    # Submit the review
    result = submit_review(
        review_id=review_id,
        reviewer="Admin",  # In a real app, this would be the current user
        status=status,
        human_assessment=human_assessment,
        notes=notes,
        rationale=rationale,
        agreement_level=agreement_level,
        confidence_score=confidence_score
    )
    
    success, response = result
    
    if success:
        flash("Review submitted successfully", "success")
        return redirect(url_for("human_review.human_review_details", review_id=review_id))
    else:
        flash(f"Error submitting review: {response}", "danger")
        return redirect(url_for("human_review.human_review_task", review_id=review_id))


def _build_bid_evaluation_assessment(form_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Build a bid evaluation assessment from form data.
    
    Args:
        form_data: Form data from request
        
    Returns:
        Formatted assessment data
    """
    # Get overall score and normalize to 0-1
    overall_score = float(form_data.get("overall_score", 0)) / 100
    
    # Get strengths, weaknesses, and gaps as lists (split by newlines)
    strengths = [s.strip() for s in form_data.get("strengths", "").splitlines() if s.strip()]
    weaknesses = [w.strip() for w in form_data.get("weaknesses", "").splitlines() if w.strip()]
    gaps = [g.strip() for g in form_data.get("gaps", "").splitlines() if g.strip()]
    
    # Build the assessment
    assessment = {
        "overall_score": overall_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "gap_analysis": gaps,
    }
    
    return assessment


def _build_security_assessment(form_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Build a security assessment from form data.
    
    Args:
        form_data: Form data from request
        
    Returns:
        Formatted assessment data
    """
    # Get security score and normalize to 0-1
    security_score = float(form_data.get("security_score", 0)) / 100
    
    # Parse security findings from JSON
    try:
        findings = json.loads(form_data.get("security_findings", "[]"))
    except json.JSONDecodeError:
        findings = []
    
    # Build the assessment
    assessment = {
        "overall_score": security_score,
        "findings": findings
    }
    
    return assessment


def _build_risk_assessment(form_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Build a risk assessment from form data.
    
    Args:
        form_data: Form data from request
        
    Returns:
        Formatted assessment data
    """
    # Parse risk data from JSON
    try:
        risk_data = json.loads(form_data.get("risk_data", "{}"))
        return risk_data
    except json.JSONDecodeError:
        return {}


def _build_sentiment_analysis(form_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Build a sentiment analysis from form data.
    
    Args:
        form_data: Form data from request
        
    Returns:
        Formatted assessment data
    """
    # Get sentiment score and normalize to 0-1
    sentiment_score = float(form_data.get("sentiment_score", 0)) / 100
    
    # Get sentiment category
    category = form_data.get("sentiment_category", "neutral")
    
    # Parse key phrases from JSON
    try:
        key_phrases = json.loads(form_data.get("key_phrases", "[]"))
    except json.JSONDecodeError:
        key_phrases = []
    
    # Build the assessment
    assessment = {
        "score": sentiment_score,
        "category": category,
        "confidence": 0.9,  # Default confidence
        "key_phrases": key_phrases
    }
    
    return assessment