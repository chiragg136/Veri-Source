import logging
import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.document import RFPDocument, Requirement, TechnicalSpecification
from app.utils.pdf_utils import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt
from app.utils.llm_utils import analyze_text_with_llm, chunk_text

# Configure logging
logger = logging.getLogger(__name__)

def analyze_rfp(rfp_id: int, db: Session) -> bool:
    """
    Analyze an RFP document to extract requirements and technical specifications.
    
    Args:
        rfp_id: ID of the RFP to analyze
        db: Database session
        
    Returns:
        Success status
    """
    try:
        rfp = db.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
        if not rfp:
            logger.error(f"RFP with ID {rfp_id} not found")
            return False
        
        if not rfp.is_processed:
            logger.error(f"RFP {rfp_id} has not been processed yet")
            return False
        
        # Extract text from the file
        file_path = rfp.file_path
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
        
        # Extract requirements
        requirements_prompt = """
        You are an expert in government procurement. Analyze this RFP document section and identify all requirements. For each requirement, provide:
        1. Category (Technical, Financial, Compliance, etc.)
        2. Description (the actual requirement text)
        3. Priority (Must-have, Should-have, or Nice-to-have)
        4. Section (which part of the RFP this was found in)
        
        Respond with a JSON array of requirements in the following format:
        [
            {
                "category": "Technical",
                "description": "The system must support 10Gbps throughput",
                "priority": "Must-have",
                "section": "Network Requirements"
            }
        ]
        """
        
        all_requirements = []
        
        for chunk in text_chunks:
            chunk_requirements = analyze_text_with_llm(
                prompt=requirements_prompt,
                text=chunk,
                output_format="json"
            )
            
            try:
                if isinstance(chunk_requirements, str):
                    chunk_requirements = json.loads(chunk_requirements)
                if isinstance(chunk_requirements, list):
                    all_requirements.extend(chunk_requirements)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Error parsing requirements JSON: {e}")
                continue
        
        # Extract technical specifications
        tech_specs_prompt = """
        You are an expert in technology procurement for government connectivity projects. Analyze this RFP document section and identify all technical specifications. For each specification, provide:
        1. Name (short identifier)
        2. Description (detailed specification)
        3. Category (Network, Hardware, Software, Security, etc.)
        4. Measurement unit (if applicable)
        5. Minimum value (if applicable)
        6. Maximum value (if applicable)
        7. Is mandatory (true/false)
        
        Respond with a JSON array of technical specifications in the following format:
        [
            {
                "name": "Network Throughput",
                "description": "Minimum network throughput for backbone connections",
                "category": "Network",
                "measurement_unit": "Gbps",
                "min_value": "10",
                "max_value": null,
                "is_mandatory": true
            }
        ]
        """
        
        all_tech_specs = []
        
        for chunk in text_chunks:
            chunk_specs = analyze_text_with_llm(
                prompt=tech_specs_prompt,
                text=chunk,
                output_format="json"
            )
            
            try:
                if isinstance(chunk_specs, str):
                    chunk_specs = json.loads(chunk_specs)
                if isinstance(chunk_specs, list):
                    all_tech_specs.extend(chunk_specs)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Error parsing technical specifications JSON: {e}")
                continue
        
        # Save requirements to database
        for req_data in all_requirements:
            requirement = Requirement(
                rfp_id=rfp_id,
                category=req_data.get("category", "Uncategorized"),
                description=req_data.get("description", ""),
                priority=req_data.get("priority", "Should-have"),
                section=req_data.get("section", "General")
            )
            db.add(requirement)
        
        # Save technical specifications to database
        for spec_data in all_tech_specs:
            tech_spec = TechnicalSpecification(
                rfp_id=rfp_id,
                name=spec_data.get("name", ""),
                description=spec_data.get("description", ""),
                category=spec_data.get("category", "Uncategorized"),
                measurement_unit=spec_data.get("measurement_unit"),
                min_value=spec_data.get("min_value"),
                max_value=spec_data.get("max_value"),
                is_mandatory=spec_data.get("is_mandatory", True)
            )
            db.add(tech_spec)
        
        db.commit()
        
        logger.info(f"Successfully analyzed RFP {rfp_id}. Found {len(all_requirements)} requirements and {len(all_tech_specs)} technical specifications.")
        return True
        
    except Exception as e:
        logger.exception(f"Error analyzing RFP {rfp_id}")
        db.rollback()
        return False
