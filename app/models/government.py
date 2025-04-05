"""
Government-specific models for the UniSphere application.
This module contains database models for government-specific entities like regulatory
requirements, compliance checklists, and security frameworks.
"""

from datetime import datetime
from enum import Enum
from typing import List, Dict

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship

from app.database import db

class GovernmentType(str, Enum):
    """Government types for different levels and regions."""
    FEDERAL = "federal"
    STATE = "state"
    LOCAL = "local"
    MILITARY = "military"
    INTERNATIONAL = "international"
    OTHER = "other"

class SecurityFramework(str, Enum):
    """Common security frameworks for government compliance."""
    FISMA = "fisma"
    FEDRAMP = "fedramp"
    NIST800_53 = "nist800_53"
    NIST800_171 = "nist800_171"
    CMMC = "cmmc"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    ISO_27001 = "iso_27001"
    SOC2 = "soc2"
    OTHER = "other"

class ComplianceLevel(str, Enum):
    """Compliance levels for security requirements."""
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

class GovernmentAgency(db.Model):
    """Model for government agencies that issue RFPs."""
    __tablename__ = "government_agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    agency_type = Column(SQLAlchemyEnum(GovernmentType), default=GovernmentType.FEDERAL)
    description = Column(Text)
    website = Column(String(255))
    contact_email = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    rfp_documents = relationship("RFPDocument", back_populates="agency_details")
    security_requirements = relationship("SecurityRequirement", back_populates="agency")

class SecurityRequirement(db.Model):
    """Model for security requirements specific to government agencies."""
    __tablename__ = "security_requirements"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("government_agencies.id"))
    framework = Column(SQLAlchemyEnum(SecurityFramework), default=SecurityFramework.NIST800_53)
    requirement_id = Column(String(100))  # E.g., AC-2, IA-4, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    compliance_level = Column(SQLAlchemyEnum(ComplianceLevel), default=ComplianceLevel.REQUIRED)
    
    # Implementation guidance and verification methods
    implementation_guidance = Column(Text)
    verification_method = Column(Text)
    
    # Relationships
    agency = relationship("GovernmentAgency", back_populates="security_requirements")
    bid_compliance = relationship("BidSecurityCompliance", back_populates="security_requirement")

class BidSecurityCompliance(db.Model):
    """Model for tracking how vendor bids comply with security requirements."""
    __tablename__ = "bid_security_compliance"
    
    id = Column(Integer, primary_key=True, index=True)
    bid_id = Column(Integer, ForeignKey("vendor_bids.id", ondelete="CASCADE"))
    requirement_id = Column(Integer, ForeignKey("security_requirements.id"))
    compliance_score = Column(Float)  # 0-100
    compliance_notes = Column(Text)
    is_compliant = Column(Boolean, default=False)
    verification_status = Column(String(50))  # "pending", "verified", "non-compliant"
    
    # Relationships
    security_requirement = relationship("SecurityRequirement", back_populates="bid_compliance")
    vendor_bid = relationship("VendorBid", back_populates="security_compliance")

# Add relationships to VendorBid model in document.py
# This would normally be in document.py, but we add it here for reference
# VendorBid.security_compliance = relationship("BidSecurityCompliance", back_populates="vendor_bid")

# Add relationships to RFPDocument model in document.py 
# This would normally be in document.py, but we add it here for reference
# RFPDocument.agency_details = relationship("GovernmentAgency", back_populates="rfp_documents")