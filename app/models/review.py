"""
Human-in-the-loop review models for the VeriSource application.
This module contains database models for tracking human reviews of AI-generated assessments,
providing accountability and oversight for automated decisions.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
import enum

from app.database import db


class ReviewStatus(str, enum.Enum):
    """Status options for human reviews."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


class ReviewPriority(str, enum.Enum):
    """Priority levels for human reviews."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReviewType(str, enum.Enum):
    """Types of reviews that can be conducted."""
    SECURITY_ASSESSMENT = "security_assessment"
    RISK_ASSESSMENT = "risk_assessment"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    BID_EVALUATION = "bid_evaluation"
    REQUIREMENT_EXTRACTION = "requirement_extraction"
    INFOGRAPHIC_REPORT = "infographic_report"


class HumanReview(db.Model):
    """Model for tracking human reviews of AI-generated assessments."""
    __tablename__ = "human_reviews"

    id = Column(Integer, primary_key=True, index=True)
    bid_id = Column(Integer, ForeignKey("vendor_bids.id", ondelete="CASCADE"), nullable=True)
    rfp_id = Column(Integer, ForeignKey("rfp_documents.id", ondelete="CASCADE"), nullable=True)
    
    # Review metadata
    review_type = Column(Enum(ReviewType), nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    priority = Column(Enum(ReviewPriority), default=ReviewPriority.MEDIUM)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Review assignment and completion
    assigned_to = Column(String(255), nullable=True)
    completed_by = Column(String(255), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    time_to_complete = Column(Float, nullable=True)  # in minutes
    
    # Review content
    ai_assessment = Column(JSON, nullable=True)  # The original AI-generated assessment
    human_assessment = Column(JSON, nullable=True)  # Human modifications or annotations
    review_notes = Column(Text, nullable=True)
    decision_rationale = Column(Text, nullable=True)
    
    # Review quality metrics
    agreement_level = Column(Float, nullable=True)  # 0-1 scale of how much human agreed with AI
    confidence_score = Column(Float, nullable=True)  # 0-1 scale of reviewer confidence
    
    # Relationships
    rfp_document = relationship("RFPDocument", back_populates="human_reviews")
    vendor_bid = relationship("VendorBid", back_populates="human_reviews")


# Add relationships to existing models
from app.models.document import RFPDocument, VendorBid

# Add back-reference relationships
RFPDocument.human_reviews = relationship("HumanReview", back_populates="rfp_document")
VendorBid.human_reviews = relationship("HumanReview", back_populates="vendor_bid")