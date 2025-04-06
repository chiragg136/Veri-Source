"""
Human-in-the-loop review service for the VeriSource application.
This service handles the creation, assignment, and management of human reviews
for AI-generated assessments.
"""

import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union, Any

from sqlalchemy.orm import Session

from app.database import db
from app.models.review import HumanReview, ReviewStatus, ReviewPriority, ReviewType
from app.models.document import VendorBid, RFPDocument, AnalysisResult

# Configure logging
logger = logging.getLogger(__name__)


def create_review_request(
    review_type: ReviewType,
    ai_assessment: Dict[str, Any],
    rfp_id: Optional[int] = None,
    bid_id: Optional[int] = None,
    priority: ReviewPriority = ReviewPriority.MEDIUM,
    assigned_to: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Tuple[bool, Union[HumanReview, str]]:
    """
    Create a new human review request for an AI-generated assessment.
    
    Args:
        review_type: Type of review needed
        ai_assessment: The AI-generated assessment data
        rfp_id: Optional ID of the related RFP
        bid_id: Optional ID of the related vendor bid
        priority: Priority level for the review
        assigned_to: Optional username to assign the review to
        db_session: Optional database session
        
    Returns:
        Tuple of (success, result) where result is either the created review
        or an error message
    """
    session = db_session or db.session
    
    try:
        # Validate that at least one ID is provided
        if not rfp_id and not bid_id:
            return False, "Either rfp_id or bid_id must be provided"
        
        # Create new review request
        review = HumanReview(
            review_type=review_type,
            rfp_id=rfp_id,
            bid_id=bid_id,
            priority=priority,
            assigned_to=assigned_to,
            status=ReviewStatus.PENDING,
            ai_assessment=ai_assessment,
            created_at=datetime.utcnow()
        )
        
        session.add(review)
        session.commit()
        
        logger.info(f"Created new human review request: {review.id}")
        return True, review
    
    except Exception as e:
        logger.exception("Error creating human review request")
        session.rollback()
        return False, str(e)


def get_pending_reviews(
    assigned_to: Optional[str] = None,
    priority: Optional[ReviewPriority] = None,
    review_type: Optional[ReviewType] = None,
    db_session: Optional[Session] = None
) -> List[HumanReview]:
    """
    Get pending reviews, optionally filtered by assignee, priority, or type.
    
    Args:
        assigned_to: Optional username to filter by
        priority: Optional priority level to filter by
        review_type: Optional review type to filter by
        db_session: Optional database session
        
    Returns:
        List of pending human reviews
    """
    session = db_session or db.session
    
    query = session.query(HumanReview).filter(HumanReview.status == ReviewStatus.PENDING)
    
    if assigned_to:
        query = query.filter(HumanReview.assigned_to == assigned_to)
    
    if priority:
        query = query.filter(HumanReview.priority == priority)
    
    if review_type:
        query = query.filter(HumanReview.review_type == review_type)
    
    # Order by priority and creation date
    query = query.order_by(HumanReview.priority.desc(), HumanReview.created_at.asc())
    
    return query.all()


def get_review_details(review_id: int, db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    Get detailed information about a review, including related document info.
    
    Args:
        review_id: ID of the review to get details for
        db_session: Optional database session
        
    Returns:
        Dictionary with review details and related information
    """
    session = db_session or db.session
    
    review = session.query(HumanReview).filter(HumanReview.id == review_id).first()
    if not review:
        return {"error": "Review not found"}
    
    result = {
        "review": {
            "id": review.id,
            "type": review.review_type.value,
            "status": review.status.value,
            "priority": review.priority.value,
            "created_at": review.created_at,
            "updated_at": review.updated_at,
            "assigned_to": review.assigned_to,
            "completed_by": review.completed_by,
            "completed_at": review.completed_at,
            "time_to_complete": review.time_to_complete,
            "review_notes": review.review_notes,
            "decision_rationale": review.decision_rationale,
            "agreement_level": review.agreement_level,
            "confidence_score": review.confidence_score,
        },
        "ai_assessment": review.ai_assessment,
        "human_assessment": review.human_assessment
    }
    
    # Add RFP information if available
    if review.rfp_id:
        rfp = session.query(RFPDocument).filter(RFPDocument.id == review.rfp_id).first()
        if rfp:
            result["rfp"] = {
                "id": rfp.id,
                "title": rfp.title,
                "agency": rfp.agency,
                "project_id": rfp.project_id,
                "upload_date": rfp.upload_date
            }
    
    # Add bid information if available
    if review.bid_id:
        bid = session.query(VendorBid).filter(VendorBid.id == review.bid_id).first()
        if bid:
            result["bid"] = {
                "id": bid.id,
                "vendor_name": bid.vendor_name,
                "submission_date": bid.submission_date,
                "rfp_id": bid.rfp_id,
                "total_score": bid.total_score
            }
            
            # Add related RFP info for the bid
            if bid.rfp_id:
                rfp = session.query(RFPDocument).filter(RFPDocument.id == bid.rfp_id).first()
                if rfp:
                    result["bid"]["rfp_title"] = rfp.title
    
    return result


def submit_review(
    review_id: int,
    reviewer: str,
    status: ReviewStatus,
    human_assessment: Optional[Dict[str, Any]] = None,
    notes: Optional[str] = None,
    rationale: Optional[str] = None,
    agreement_level: Optional[float] = None,
    confidence_score: Optional[float] = None,
    db_session: Optional[Session] = None
) -> Tuple[bool, Union[HumanReview, str]]:
    """
    Submit a completed human review of an AI assessment.
    
    Args:
        review_id: ID of the review to submit
        reviewer: Username of the person completing the review
        status: New status for the review
        human_assessment: Optional modified assessment data
        notes: Optional notes about the review
        rationale: Optional explanation of the decision
        agreement_level: Optional 0-1 scale of how much human agreed with AI
        confidence_score: Optional 0-1 scale of reviewer confidence
        db_session: Optional database session
        
    Returns:
        Tuple of (success, result) where result is either the updated review
        or an error message
    """
    session = db_session or db.session
    
    try:
        review = session.query(HumanReview).filter(HumanReview.id == review_id).first()
        if not review:
            return False, "Review not found"
        
        # Calculate time to complete
        now = datetime.utcnow()
        if not review.completed_at:  # Only calculate if not already completed
            time_diff = now - review.created_at
            time_to_complete = time_diff.total_seconds() / 60  # Convert to minutes
        else:
            time_to_complete = review.time_to_complete
        
        # Update review with submission data
        review.status = status
        review.completed_by = reviewer
        review.completed_at = now
        review.time_to_complete = time_to_complete
        review.human_assessment = human_assessment
        review.review_notes = notes
        review.decision_rationale = rationale
        review.agreement_level = agreement_level
        review.confidence_score = confidence_score
        
        # Update the related bid's analysis with the human-reviewed assessment if applicable
        if review.bid_id and status in [ReviewStatus.APPROVED, ReviewStatus.MODIFIED]:
            if review.review_type == ReviewType.BID_EVALUATION:
                _update_bid_evaluation(review.bid_id, human_assessment or review.ai_assessment, session)
            elif review.review_type == ReviewType.SECURITY_ASSESSMENT:
                _update_bid_security(review.bid_id, human_assessment or review.ai_assessment, session)
            elif review.review_type == ReviewType.RISK_ASSESSMENT:
                _update_bid_risks(review.bid_id, human_assessment or review.ai_assessment, session)
            elif review.review_type == ReviewType.SENTIMENT_ANALYSIS:
                _update_bid_sentiment(review.bid_id, human_assessment or review.ai_assessment, session)
        
        session.commit()
        
        logger.info(f"Review {review_id} completed by {reviewer} with status {status.value}")
        return True, review
    
    except Exception as e:
        logger.exception(f"Error submitting review {review_id}")
        session.rollback()
        return False, str(e)


def _update_bid_evaluation(bid_id: int, assessment: Dict[str, Any], session: Session) -> None:
    """Helper function to update bid evaluation with human-reviewed assessment."""
    # Implementation depends on specific data structure of assessment
    # This is a simplified example
    bid = session.query(VendorBid).filter(VendorBid.id == bid_id).first()
    if not bid:
        return
    
    # Update total score if provided
    if "overall_score" in assessment:
        bid.total_score = assessment["overall_score"]
    
    # Get or create analysis result
    analysis = session.query(AnalysisResult).filter(AnalysisResult.bid_id == bid_id).first()
    if not analysis:
        analysis = AnalysisResult(bid_id=bid_id)
        session.add(analysis)
    
    # Update analysis fields with assessment data
    if "requirement_compliance" in assessment:
        analysis.requirement_compliance = assessment["requirement_compliance"]
    
    if "technical_compliance" in assessment:
        analysis.technical_compliance = assessment["technical_compliance"]
    
    if "strengths" in assessment:
        analysis.strengths = assessment["strengths"]
    
    if "weaknesses" in assessment:
        analysis.weaknesses = assessment["weaknesses"]
    
    if "gap_analysis" in assessment:
        analysis.gap_analysis = assessment["gap_analysis"]
    
    if "overall_score" in assessment:
        analysis.overall_score = assessment["overall_score"]


def _update_bid_security(bid_id: int, assessment: Dict[str, Any], session: Session) -> None:
    """Helper function to update bid security assessment with human-reviewed assessment."""
    # Implementation would update security compliance records
    # This is a placeholder for future implementation
    pass


def _update_bid_risks(bid_id: int, assessment: Dict[str, Any], session: Session) -> None:
    """Helper function to update bid risk assessment with human-reviewed assessment."""
    # Implementation would update risk assessment records
    # This is a placeholder for future implementation
    pass


def _update_bid_sentiment(bid_id: int, assessment: Dict[str, Any], session: Session) -> None:
    """Helper function to update bid sentiment analysis with human-reviewed assessment."""
    # Implementation would update sentiment analysis records
    # This is a placeholder for future implementation
    pass


def get_review_statistics(db_session: Optional[Session] = None) -> Dict[str, Any]:
    """
    Get statistics about human reviews.
    
    Args:
        db_session: Optional database session
        
    Returns:
        Dictionary with review statistics
    """
    session = db_session or db.session
    
    total_reviews = session.query(HumanReview).count()
    pending_reviews = session.query(HumanReview).filter(HumanReview.status == ReviewStatus.PENDING).count()
    approved_reviews = session.query(HumanReview).filter(HumanReview.status == ReviewStatus.APPROVED).count()
    rejected_reviews = session.query(HumanReview).filter(HumanReview.status == ReviewStatus.REJECTED).count()
    modified_reviews = session.query(HumanReview).filter(HumanReview.status == ReviewStatus.MODIFIED).count()
    
    # Average time to complete (in minutes)
    avg_time_query = session.query(
        db.func.avg(HumanReview.time_to_complete)
    ).filter(HumanReview.completed_at != None)
    avg_time = avg_time_query.scalar() or 0
    
    # Average agreement level
    avg_agreement_query = session.query(
        db.func.avg(HumanReview.agreement_level)
    ).filter(HumanReview.agreement_level != None)
    avg_agreement = avg_agreement_query.scalar() or 0
    
    # Reviews by type
    type_counts = {}
    for review_type in ReviewType:
        count = session.query(HumanReview).filter(HumanReview.review_type == review_type).count()
        type_counts[review_type.value] = count
    
    # Reviews by priority
    priority_counts = {}
    for priority in ReviewPriority:
        count = session.query(HumanReview).filter(HumanReview.priority == priority).count()
        priority_counts[priority.value] = count
    
    return {
        "total_reviews": total_reviews,
        "pending_reviews": pending_reviews,
        "approved_reviews": approved_reviews,
        "rejected_reviews": rejected_reviews,
        "modified_reviews": modified_reviews,
        "completion_rate": (approved_reviews + rejected_reviews + modified_reviews) / total_reviews if total_reviews > 0 else 0,
        "average_completion_time": avg_time,
        "average_agreement_level": avg_agreement,
        "reviews_by_type": type_counts,
        "reviews_by_priority": priority_counts
    }