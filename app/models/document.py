from datetime import datetime
import enum
from typing import List
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship

from app.database import db

class DocumentType(enum.Enum):
    RFP = "rfp"
    BID = "bid"
    OTHER = "other"

class RFPDocument(db.Model):
    __tablename__ = "rfp_documents"
    
    id = db.Column(Integer, primary_key=True, index=True)
    title = db.Column(String(255), nullable=False)
    agency = db.Column(String(255))
    project_id = db.Column(String(100))
    description = db.Column(Text)
    upload_date = db.Column(DateTime, default=datetime.utcnow)
    filename = db.Column(String(255), nullable=False)
    file_path = db.Column(String(512), nullable=False)
    content_type = db.Column(String(100))
    size_bytes = db.Column(Integer)
    is_processed = db.Column(Boolean, default=False)
    processing_errors = db.Column(Text, nullable=True)
    
    # Relationships
    requirements = db.relationship("Requirement", back_populates="rfp_document", cascade="all, delete")
    tech_specs = db.relationship("TechnicalSpecification", back_populates="rfp_document", cascade="all, delete")
    vendor_bids = db.relationship("VendorBid", back_populates="rfp_document", cascade="all, delete")

class Requirement(db.Model):
    __tablename__ = "requirements"
    
    id = db.Column(Integer, primary_key=True, index=True)
    rfp_id = db.Column(Integer, ForeignKey("rfp_documents.id", ondelete="CASCADE"))
    category = db.Column(String(100))  # E.g., Technical, Financial, Compliance
    description = db.Column(Text, nullable=False)
    priority = db.Column(String(50))  # E.g., Must-have, Should-have, Nice-to-have
    section = db.Column(String(255))  # Section in the RFP document
    
    # Relationships
    rfp_document = db.relationship("RFPDocument", back_populates="requirements")

class TechnicalSpecification(db.Model):
    __tablename__ = "technical_specifications"
    
    id = db.Column(Integer, primary_key=True, index=True)
    rfp_id = db.Column(Integer, ForeignKey("rfp_documents.id", ondelete="CASCADE"))
    name = db.Column(String(255), nullable=False)
    description = db.Column(Text)
    category = db.Column(String(100))  # E.g., Network, Hardware, Software
    measurement_unit = db.Column(String(50), nullable=True)
    min_value = db.Column(String(50), nullable=True)
    max_value = db.Column(String(50), nullable=True)
    is_mandatory = db.Column(Boolean, default=True)
    
    # Relationships
    rfp_document = db.relationship("RFPDocument", back_populates="tech_specs")

class VendorBid(db.Model):
    __tablename__ = "vendor_bids"
    
    id = db.Column(Integer, primary_key=True, index=True)
    rfp_id = db.Column(Integer, ForeignKey("rfp_documents.id", ondelete="CASCADE"))
    vendor_name = db.Column(String(255), nullable=False)
    submission_date = db.Column(DateTime, default=datetime.utcnow)
    filename = db.Column(String(255), nullable=False)
    file_path = db.Column(String(512), nullable=False)
    content_type = db.Column(String(100))
    size_bytes = db.Column(Integer)
    is_processed = db.Column(Boolean, default=False)
    processing_errors = db.Column(Text, nullable=True)
    total_score = db.Column(Float, nullable=True)
    
    # Relationships
    rfp_document = db.relationship("RFPDocument", back_populates="vendor_bids")
    analysis_results = db.relationship("AnalysisResult", back_populates="vendor_bid", cascade="all, delete")

class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"
    
    id = db.Column(Integer, primary_key=True, index=True)
    bid_id = db.Column(Integer, ForeignKey("vendor_bids.id", ondelete="CASCADE"))
    analysis_date = db.Column(DateTime, default=datetime.utcnow)
    requirement_compliance = db.Column(JSON)  # Dict mapping requirement IDs to compliance scores
    technical_compliance = db.Column(JSON)  # Dict mapping tech spec IDs to compliance scores
    strengths = db.Column(JSON)  # List of strengths identified
    weaknesses = db.Column(JSON)  # List of weaknesses identified
    gap_analysis = db.Column(JSON)  # List of identified gaps
    overall_score = db.Column(Float)
    
    # Relationships
    vendor_bid = db.relationship("VendorBid", back_populates="analysis_results")
