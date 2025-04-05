import logging
import json
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.document import VendorBid, RFPDocument, Requirement, TechnicalSpecification, AnalysisResult
from app.utils.pdf_utils import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt
from app.utils.llm_utils import analyze_text_with_llm, chunk_text
from app.utils.openai_utils import (
    evaluate_requirement_compliance, 
    evaluate_technical_compliance,
    identify_strengths_weaknesses,
    perform_gap_analysis
)
from app.services.security_assessor import assess_security_compliance
from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

def evaluate_bid(bid_id: int, db: Session) -> bool:
    """
    Evaluate a vendor bid against RFP requirements and technical specifications.
    
    Args:
        bid_id: ID of the bid to evaluate
        db: Database session
        
    Returns:
        Success status
    """
    try:
        bid = db.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            logger.error(f"Bid with ID {bid_id} not found")
            return False
        
        rfp = db.query(RFPDocument).filter(RFPDocument.id == bid.rfp_id).first()
        if not rfp:
            logger.error(f"RFP with ID {bid.rfp_id} not found")
            return False
        
        if not bid.is_processed:
            logger.error(f"Bid {bid_id} has not been processed yet")
            return False
        
        # Get requirements and technical specifications
        requirements = db.query(Requirement).filter(Requirement.rfp_id == rfp.id).all()
        tech_specs = db.query(TechnicalSpecification).filter(TechnicalSpecification.rfp_id == rfp.id).all()
        
        if not requirements and not tech_specs:
            logger.error(f"No requirements or technical specifications found for RFP {rfp.id}")
            return False
        
        # Extract text from the bid file
        file_path = bid.file_path
        file_ext = file_path.split('.')[-1].lower()
        
        extracted_text = ""
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(file_path)
        elif file_ext == 'docx':
            extracted_text = extract_text_from_docx(file_path)
        elif file_ext == 'txt':
            extracted_text = extract_text_from_txt(file_path)
        else:
            logger.error(f"Unsupported file format: {file_ext}")
            return False
        
        # Chunk the text for processing
        text_chunks = chunk_text(extracted_text)
        
        # Create a consolidated text for requirements and tech specs
        requirements_text = "\n".join([
            f"Requirement {i+1} ({req.category}, {req.priority}): {req.description}" 
            for i, req in enumerate(requirements)
        ])
        
        tech_specs_text = "\n".join([
            f"Technical Specification {i+1} ({spec.category}): {spec.name} - {spec.description}" +
            (f" (Min: {spec.min_value} {spec.measurement_unit})" if spec.min_value else "") +
            (f" (Max: {spec.max_value} {spec.measurement_unit})" if spec.max_value else "") +
            (f" (Mandatory)" if spec.is_mandatory else " (Optional)")
            for i, spec in enumerate(tech_specs)
        ])
        
        # Combine chunks for analysis
        bid_text = " ".join(text_chunks)
        
        # Check if OpenAI API key is available for enhanced analysis
        use_openai = settings.OPENAI_API_KEY != ""
        
        # Evaluate requirement compliance
        requirement_compliance = {}
        
        if use_openai:
            logger.info("Using OpenAI for bid evaluation")
            for req in requirements:
                try:
                    # Use OpenAI-powered evaluation
                    req_dict = {
                        "category": req.category,
                        "description": req.description,
                        "priority": req.priority
                    }
                    
                    # Limit text length to avoid token limits
                    limited_text = bid_text[:5000]  
                    
                    compliance_result = evaluate_requirement_compliance(req_dict, limited_text)
                    requirement_compliance[str(req.id)] = compliance_result
                except Exception as e:
                    logger.error(f"Error evaluating requirement {req.id} with OpenAI: {str(e)}")
                    requirement_compliance[str(req.id)] = {"score": 0, "explanation": f"Error analyzing compliance: {str(e)}"}
        else:
            # Fallback to simulated evaluation
            logger.warning("Using simulated LLM responses for bid evaluation")
            for req in requirements:
                requirement_prompt = f"""
                You are an expert in government procurement evaluation. Analyze how well the vendor's bid complies with the following requirement:
                
                Requirement ID: {req.id}
                Category: {req.category}
                Priority: {req.priority}
                Description: {req.description}
                
                Based on the following bid text, evaluate compliance on a scale of 0-100, where:
                0 = Not addressed at all
                25 = Poorly addressed
                50 = Partially addressed
                75 = Mostly addressed
                100 = Fully addressed
                
                Also provide a brief explanation for your score.
                
                Respond with a JSON object in the following format:
                {{
                    "score": 75,
                    "explanation": "The vendor addresses this requirement by..."
                }}
                """
                
                compliance_result = analyze_text_with_llm(
                    prompt=requirement_prompt,
                    text=bid_text[:10000],  # Limit text length for API
                    output_format="json"
                )
                
                try:
                    if isinstance(compliance_result, str):
                        compliance_result = json.loads(compliance_result)
                    requirement_compliance[str(req.id)] = compliance_result
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Error parsing requirement compliance JSON: {e}")
                    requirement_compliance[str(req.id)] = {"score": 0, "explanation": "Error analyzing compliance"}
        
        # Evaluate technical specification compliance
        technical_compliance = {}
        
        if use_openai:
            for spec in tech_specs:
                try:
                    # Use OpenAI-powered evaluation
                    spec_dict = {
                        "name": spec.name,
                        "category": spec.category,
                        "description": spec.description,
                        "measurement_unit": spec.measurement_unit,
                        "min_value": spec.min_value,
                        "max_value": spec.max_value,
                        "is_mandatory": spec.is_mandatory
                    }
                    
                    # Limit text length to avoid token limits
                    limited_text = bid_text[:5000]
                    
                    compliance_result = evaluate_technical_compliance(spec_dict, limited_text)
                    technical_compliance[str(spec.id)] = compliance_result
                except Exception as e:
                    logger.error(f"Error evaluating technical spec {spec.id} with OpenAI: {str(e)}")
                    technical_compliance[str(spec.id)] = {"score": 0, "explanation": f"Error analyzing compliance: {str(e)}"}
        else:
            # Fallback to simulated evaluation
            for spec in tech_specs:
                spec_prompt = f"""
                You are an expert in technical evaluation for government connectivity projects. Analyze how well the vendor's bid complies with the following technical specification:
                
                Specification ID: {spec.id}
                Name: {spec.name}
                Category: {spec.category}
                Description: {spec.description}
                {"Measurement Unit: " + spec.measurement_unit if spec.measurement_unit else ""}
                {"Minimum Value: " + spec.min_value if spec.min_value else ""}
                {"Maximum Value: " + spec.max_value if spec.max_value else ""}
                Mandatory: {"Yes" if spec.is_mandatory else "No"}
                
                Based on the following bid text, evaluate compliance on a scale of 0-100, where:
                0 = Not addressed at all
                25 = Poorly addressed
                50 = Partially addressed
                75 = Mostly addressed
                100 = Fully addressed
                
                Also provide a brief explanation for your score.
                
                Respond with a JSON object in the following format:
                {{
                    "score": 75,
                    "explanation": "The vendor addresses this specification by..."
                }}
                """
                
                compliance_result = analyze_text_with_llm(
                    prompt=spec_prompt,
                    text=bid_text[:10000],  # Limit text length for API
                    output_format="json"
                )
                
                try:
                    if isinstance(compliance_result, str):
                        compliance_result = json.loads(compliance_result)
                    technical_compliance[str(spec.id)] = compliance_result
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Error parsing technical compliance JSON: {e}")
                    technical_compliance[str(spec.id)] = {"score": 0, "explanation": "Error analyzing compliance"}
        
        # Identify strengths and weaknesses
        strengths_weaknesses_result = {"strengths": [], "weaknesses": []}
        gap_analysis_result = []
        
        if use_openai:
            try:
                # Use OpenAI-powered analysis for strengths and weaknesses
                limited_text = bid_text[:7000]  # Limit text length to avoid token limits
                
                strengths_weaknesses_result = identify_strengths_weaknesses(
                    requirements_text, 
                    tech_specs_text, 
                    limited_text
                )
                
                logger.info("Successfully identified strengths and weaknesses using OpenAI")
                
                # Use OpenAI for gap analysis
                gap_analysis_result = perform_gap_analysis(
                    requirements_text,
                    tech_specs_text,
                    limited_text
                )
                
                logger.info(f"Successfully performed gap analysis using OpenAI, found {len(gap_analysis_result)} gaps")
                
            except Exception as e:
                logger.error(f"Error performing strengths/weaknesses and gap analysis with OpenAI: {str(e)}")
                use_openai = False  # Fall back to simulated mode
        
        # If OpenAI failed or isn't available, use simulated mode
        if not use_openai:
            logger.warning("Using simulated LLM responses for strengths/weaknesses and gap analysis")
            
            # Strengths and weaknesses analysis
            strengths_weaknesses_prompt = f"""
            You are an expert in government procurement evaluation. Based on the vendor's bid, identify the top strengths and weaknesses compared to the RFP requirements and technical specifications.
    
            RFP Requirements:
            {requirements_text}
    
            Technical Specifications:
            {tech_specs_text}
    
            Analyze the bid and provide:
            1. Top 5 strengths of the proposal
            2. Top 5 weaknesses or gaps in the proposal
    
            Respond with a JSON object in the following format:
            {{
                "strengths": [
                    "The vendor exceeds network throughput requirements by offering 20Gbps capability",
                    "Strong security compliance with all required certifications",
                    ...
                ],
                "weaknesses": [
                    "Limited experience with similar government projects",
                    "Maintenance response time does not meet the required SLA",
                    ...
                ]
            }}
            """
            
            strengths_weaknesses_result = analyze_text_with_llm(
                prompt=strengths_weaknesses_prompt,
                text=bid_text[:10000],  # Limit text length for API
                output_format="json"
            )
            
            try:
                if isinstance(strengths_weaknesses_result, str):
                    strengths_weaknesses_result = json.loads(strengths_weaknesses_result)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Error parsing strengths/weaknesses JSON: {e}")
                strengths_weaknesses_result = {"strengths": [], "weaknesses": []}
            
            # Gap analysis
            gap_analysis_prompt = f"""
            You are an expert in government procurement evaluation. Identify specific gaps between the RFP requirements and the vendor's bid.
    
            RFP Requirements:
            {requirements_text}
    
            Technical Specifications:
            {tech_specs_text}
    
            Provide a list of specific requirements or specifications that are not fully addressed in the bid, explaining what is missing.
    
            Respond with a JSON array in the following format:
            [
                {{
                    "item": "Network throughput requirement",
                    "requirement": "10Gbps minimum throughput",
                    "gap": "Vendor only offers 5Gbps throughput",
                    "impact": "Critical - would not meet basic connectivity needs"
                }},
                ...
            ]
            """
            
            gap_analysis_result = analyze_text_with_llm(
                prompt=gap_analysis_prompt,
                text=bid_text[:10000],  # Limit text length for API
                output_format="json"
            )
            
            try:
                if isinstance(gap_analysis_result, str):
                    gap_analysis_result = json.loads(gap_analysis_result)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Error parsing gap analysis JSON: {e}")
                gap_analysis_result = []
        
        # Calculate overall score
        req_scores = [item.get("score", 0) for req_id, item in requirement_compliance.items()]
        tech_scores = [item.get("score", 0) for spec_id, item in technical_compliance.items()]
        
        # Weight mandatory specs higher
        mandatory_spec_ids = [str(spec.id) for spec in tech_specs if spec.is_mandatory]
        mandatory_scores = [technical_compliance.get(spec_id, {}).get("score", 0) for spec_id in mandatory_spec_ids]
        
        # Calculate weighted average
        all_scores = req_scores + tech_scores
        if all_scores:
            base_score = sum(all_scores) / len(all_scores)
        else:
            base_score = 0
            
        # Apply penalty for missing mandatory specs
        mandatory_penalty = 0
        if mandatory_scores:
            # Calculate average of mandatory specs
            mandatory_avg = sum(mandatory_scores) / len(mandatory_scores)
            # If below threshold, apply penalty
            if mandatory_avg < 50:
                mandatory_penalty = (50 - mandatory_avg) / 100
                
        overall_score = base_score * (1 - mandatory_penalty)
        
        # Save analysis results
        analysis = AnalysisResult(
            bid_id=bid_id,
            requirement_compliance=requirement_compliance,
            technical_compliance=technical_compliance,
            strengths=strengths_weaknesses_result.get("strengths", []),
            weaknesses=strengths_weaknesses_result.get("weaknesses", []),
            gap_analysis=gap_analysis_result,
            overall_score=overall_score
        )
        
        db.add(analysis)
        
        # Update bid with total score
        bid.total_score = overall_score
        
        db.commit()
        
        logger.info(f"Successfully evaluated bid {bid_id} with overall score {overall_score:.2f}")
        
        # Perform security assessment as part of the evaluation process
        try:
            # Run the security assessment
            security_success = assess_security_compliance(bid_id, db)
            if security_success:
                logger.info(f"Successfully performed security assessment for bid {bid_id}")
            else:
                logger.warning(f"Security assessment for bid {bid_id} did not complete successfully")
        except Exception as e:
            logger.error(f"Error during security assessment: {str(e)}")
            # Don't fail the entire evaluation if security assessment fails
        
        return True
        
    except Exception as e:
        logger.exception(f"Error evaluating bid {bid_id}")
        db.rollback()
        return False
