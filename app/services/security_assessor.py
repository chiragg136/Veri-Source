"""
Security assessment service for the UniSphere application.
This module handles security requirement assessment and risk prediction for vendor bids.
"""

import logging
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import VendorBid, RFPDocument
from app.models.government import (
    SecurityRequirement, 
    BidSecurityCompliance,
    GovernmentAgency, 
    SecurityFramework,
    ComplianceLevel
)
from app.utils.llm_utils import chunk_text
from app.utils.openai_utils import analyze_with_openai
from app.utils.perplexity_utils import analyze_with_perplexity, analyze_bid_sentiment as perplexity_analyze_sentiment

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def assess_security_compliance(bid_id: int, db: Session) -> bool:
    """
    Assess a vendor bid against security requirements from the RFP.
    
    Args:
        bid_id: ID of the bid to assess
        db: Database session
        
    Returns:
        Success status
    """
    try:
        # Get bid details
        bid = db.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            logger.error(f"Bid with ID {bid_id} not found")
            return False
            
        # Get associated RFP
        rfp = db.query(RFPDocument).filter(RFPDocument.id == bid.rfp_id).first()
        if not rfp:
            logger.error(f"RFP with ID {bid.rfp_id} not found")
            return False
            
        # Check for government agency details
        agency_details = None
        if rfp.agency_id:
            agency_details = db.query(GovernmentAgency).filter(GovernmentAgency.id == rfp.agency_id).first()
        
        # Get security requirements
        security_requirements = []
        if agency_details:
            # Get requirements from associated agency
            security_requirements = (
                db.query(SecurityRequirement)
                .filter(SecurityRequirement.agency_id == agency_details.id)
                .all()
            )
        
        # If no specific security requirements found, use default ones or analyze RFP to extract them
        if not security_requirements:
            # Extract security requirements from RFP using LLM
            extracted_requirements = extract_security_requirements(bid.rfp_document, db)
            security_requirements.extend(extracted_requirements)
            
        # Assess bid against each security requirement
        for requirement in security_requirements:
            # Check if assessment already exists
            existing = (
                db.query(BidSecurityCompliance)
                .filter(
                    BidSecurityCompliance.bid_id == bid.id,
                    BidSecurityCompliance.requirement_id == requirement.id
                )
                .first()
            )
            
            if existing:
                continue  # Skip if already assessed
                
            # Evaluate compliance
            compliance_result = evaluate_security_compliance(requirement, bid, db)
            
            # Record compliance result
            compliance = BidSecurityCompliance(
                bid_id=bid.id,
                requirement_id=requirement.id,
                compliance_score=compliance_result["score"],
                compliance_notes=compliance_result["explanation"],
                is_compliant=compliance_result["score"] >= 70,  # Threshold for compliance
                verification_status="pending"
            )
            
            db.add(compliance)
        
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error in security assessment: {str(e)}")
        db.rollback()
        return False

def evaluate_security_compliance(requirement: SecurityRequirement, bid: VendorBid, db: Session) -> Dict:
    """
    Evaluate how well a bid complies with a specific security requirement.
    
    Args:
        requirement: Security requirement details
        bid: Vendor bid to evaluate
        db: Database session
        
    Returns:
        Compliance score, explanation, and status
    """
    try:
        # Extract text from bid document for analysis
        # This would typically use a utils function to read the file
        # For now, we'll assume we have the text content
        bid_text = "Sample bid text"  # Replace with actual bid text extraction
        
        # Create prompt for LLM
        prompt = f"""
        Analyze this bid's compliance with the following security requirement:
        
        Requirement: {requirement.title}
        Description: {requirement.description}
        Framework: {requirement.framework.value}
        ID: {requirement.requirement_id}
        
        Provide a compliance score from 0-100, where:
        - 0-39: Non-compliant, does not address the requirement
        - 40-69: Partially compliant, addresses some aspects but has gaps
        - 70-89: Mostly compliant, addresses most aspects with minor gaps
        - 90-100: Fully compliant, comprehensively addresses all aspects
        
        Also provide a detailed explanation of your assessment and any evidence found in the bid.
        
        Format your response as valid JSON with the following structure:
        {{
            "score": number,
            "explanation": string,
            "evidence": string,
            "status": string
        }}
        """
        
        # Analyze using LLM
        response = analyze_with_openai(prompt, bid_text, 'json')
        
        # Validate response format
        if isinstance(response, dict) and "score" in response:
            return response
            
        # Fallback to basic assessment if LLM fails
        return {
            "score": 50,
            "explanation": "Automated assessment failed, manual review required",
            "evidence": "None",
            "status": "error"
        }
        
    except Exception as e:
        logger.error(f"Error evaluating security compliance: {str(e)}")
        return {
            "score": 0,
            "explanation": f"Error: {str(e)}",
            "evidence": "None",
            "status": "error"
        }

def extract_security_requirements(rfp: RFPDocument, db: Session) -> List[SecurityRequirement]:
    """
    Extract security requirements from RFP document using LLM analysis.
    
    Args:
        rfp: RFP document
        db: Database session
        
    Returns:
        List of security requirements
    """
    try:
        # Get RFP text for analysis
        # This would typically use a utils function to read the file
        # For now, we'll assume we have the text content
        rfp_text = "Sample RFP text"  # Replace with actual RFP text extraction
        
        # Create prompt for LLM
        prompt = """
        Extract all security requirements from this RFP.
        For each requirement, identify:
        1. The security framework it belongs to (e.g., NIST, FedRAMP, CMMC, etc.)
        2. The requirement ID if available (e.g., AC-2, IA-4)
        3. The requirement title
        4. The detailed description
        5. The compliance level (required, recommended, or optional)
        
        Format your response as a JSON array of objects with the following structure:
        [
            {
                "framework": string,
                "requirement_id": string,
                "title": string,
                "description": string,
                "compliance_level": string
            }
        ]
        """
        
        # Analyze using LLM
        response = analyze_with_openai(prompt, rfp_text, 'json')
        
        # Create SecurityRequirement objects
        requirements = []
        
        if isinstance(response, list):
            # Create agency if not exists
            agency = None
            if not rfp.agency_id:
                # Create a new agency based on RFP details
                agency = GovernmentAgency(
                    name=rfp.agency or "Unknown Agency",
                    description=f"Auto-created from RFP: {rfp.title}"
                )
                db.add(agency)
                db.flush()  # Get ID without committing
                
                # Update RFP with agency ID
                rfp.agency_id = agency.id
            else:
                agency = db.query(GovernmentAgency).filter(GovernmentAgency.id == rfp.agency_id).first()
            
            # Process each extracted requirement
            for req_data in response:
                try:
                    # Map framework string to enum
                    framework = SecurityFramework.OTHER
                    for enum_value in SecurityFramework:
                        if enum_value.value.lower() in req_data.get("framework", "").lower():
                            framework = enum_value
                            break
                    
                    # Map compliance level string to enum
                    compliance_level = ComplianceLevel.REQUIRED
                    if "recommend" in req_data.get("compliance_level", "").lower():
                        compliance_level = ComplianceLevel.RECOMMENDED
                    elif "option" in req_data.get("compliance_level", "").lower():
                        compliance_level = ComplianceLevel.OPTIONAL
                    
                    # Create requirement
                    requirement = SecurityRequirement(
                        agency_id=agency.id if agency else None,
                        framework=framework,
                        requirement_id=req_data.get("requirement_id", ""),
                        title=req_data.get("title", "Unknown Requirement"),
                        description=req_data.get("description", ""),
                        compliance_level=compliance_level
                    )
                    
                    db.add(requirement)
                    requirements.append(requirement)
                    
                except Exception as e:
                    logger.error(f"Error processing requirement: {str(e)}")
                    continue
            
            db.flush()  # Get IDs without committing
        
        return requirements
        
    except Exception as e:
        logger.error(f"Error extracting security requirements: {str(e)}")
        return []

def predict_bid_risks(bid_id: int, db: Session) -> Dict:
    """
    Predict potential risks associated with a vendor bid.
    
    Args:
        bid_id: ID of the bid to analyze
        db: Database session
        
    Returns:
        Risk assessment results
    """
    try:
        # Get bid details
        bid = db.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            logger.error(f"Bid with ID {bid_id} not found")
            return {
                "success": False,
                "message": f"Bid with ID {bid_id} not found",
                "risks": []
            }
            
        # Get associated RFP
        rfp = db.query(RFPDocument).filter(RFPDocument.id == bid.rfp_id).first()
        if not rfp:
            logger.error(f"RFP with ID {bid.rfp_id} not found")
            return {
                "success": False,
                "message": f"RFP with ID {bid.rfp_id} not found",
                "risks": []
            }
        
        # Extract text from bid document for analysis
        # This would typically use a utils function to read the file
        # For now, we'll assume we have the text content
        bid_text = "Sample bid text"  # Replace with actual bid text extraction
        rfp_text = "Sample RFP text"  # Replace with actual RFP text extraction
        
        # Create prompt for risk prediction using LLM
        prompt = f"""
        Analyze this vendor bid for the following risk categories:
        1. Financial stability risks (e.g., insufficient resources, pricing inconsistencies)
        2. Technical capability risks (e.g., unproven technology, insufficient expertise)
        3. Delivery timeline risks (e.g., unrealistic deadlines, resource constraints)
        4. Compliance risks (e.g., regulatory issues, certification gaps)
        5. Security risks (e.g., data protection vulnerabilities, access control issues)
        
        For each risk identified:
        - Provide a clear title
        - Rate the severity (High, Medium, Low)
        - Provide a detailed explanation
        - Suggest mitigation strategies
        
        Format your response as valid JSON with the following structure:
        {{
            "overall_risk_score": number,  // 0-100 where 0 is lowest risk
            "risks": [
                {{
                    "category": string,
                    "title": string,
                    "severity": string,
                    "explanation": string,
                    "mitigation": string
                }}
            ]
        }}
        """
        
        # Try to use Perplexity API first (if available) as it's better for longer context
        try:
            response = analyze_with_perplexity(prompt, bid_text, 'json')
            logger.info("Used Perplexity API for risk prediction")
        except Exception:
            # Fall back to OpenAI
            response = analyze_with_openai(prompt, bid_text, 'json')
            logger.info("Used OpenAI API for risk prediction")
        
        # Validate response
        if isinstance(response, dict) and "risks" in response:
            return {
                "success": True,
                "message": "Risk analysis completed successfully",
                "bid_id": bid_id,
                "vendor_name": bid.vendor_name,
                "analysis_date": datetime.utcnow().isoformat(),
                "overall_risk_score": response.get("overall_risk_score", 50),
                "risks": response.get("risks", [])
            }
        
        # Handle invalid response
        return {
            "success": False,
            "message": "Failed to analyze risks",
            "risks": []
        }
        
    except Exception as e:
        logger.error(f"Error in risk prediction: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "risks": []
        }

def analyze_bid_sentiment(bid_id: int, db: Session) -> Dict:
    """
    Analyze the sentiment in a vendor bid to identify potential issues.
    
    Args:
        bid_id: ID of the bid to analyze
        db: Database session
        
    Returns:
        Sentiment analysis results
    """
    try:
        # Get bid details
        bid = db.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            logger.error(f"Bid with ID {bid_id} not found")
            return {
                "success": False,
                "message": f"Bid with ID {bid_id} not found"
            }
        
        # Extract text from bid document for analysis
        # This would typically use a utils function to read the file
        # For now, we'll assume we have the text content
        bid_text = "Sample bid text"  # Replace with actual bid text extraction
        
        # Create prompt for sentiment analysis using LLM
        prompt = """
        Analyze the sentiment and language patterns in this vendor bid. 
        Identify potential issues such as:
        
        1. Uncertainty or lack of confidence (e.g., hedging language, excessive qualifiers)
        2. Overcommitment (e.g., unrealistic promises, lack of specificity in delivery)
        3. Ambiguity (e.g., vague terms, undefined scope)
        4. Reluctance (e.g., excessive caveats, limitations)
        5. Negative sentiment (e.g., complaints about requirements, defensive tone)
        
        For each section of the bid, identify the overall sentiment and confidence level.
        Also identify any concerning patterns or red flags.
        
        Format your response as valid JSON with the following structure:
        {
            "overall_sentiment": string,  // "positive", "neutral", or "negative"
            "confidence_score": number,   // 0-100 where 100 is highest confidence
            "key_findings": [
                {
                    "finding": string,
                    "evidence": string,
                    "significance": string,
                    "recommendation": string
                }
            ],
            "section_analysis": [
                {
                    "section": string,
                    "sentiment": string,
                    "confidence": number,
                    "notable_patterns": string
                }
            ]
        }
        """
        
        # Use our dedicated Perplexity sentiment analysis function
        try:
            # Use the specialized perplexity sentiment analysis function
            response = perplexity_analyze_sentiment(bid_text)
            logger.info("Used Perplexity API for sentiment analysis")
        except Exception as e:
            logger.warning(f"Perplexity sentiment analysis failed: {str(e)}, falling back to OpenAI")
            # Fall back to OpenAI
            response = analyze_with_openai(prompt, bid_text, 'json')
            logger.info("Used OpenAI API for sentiment analysis")
        
        # Validate response
        if isinstance(response, dict) and "overall_sentiment" in response:
            return {
                "success": True,
                "message": "Sentiment analysis completed successfully",
                "bid_id": bid_id,
                "vendor_name": bid.vendor_name,
                "analysis_date": datetime.utcnow().isoformat(),
                "analysis_results": response
            }
        
        # Handle invalid response
        return {
            "success": False,
            "message": "Failed to analyze sentiment",
            "analysis": {}
        }
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "analysis": {}
        }