import json
import os
import logging
from typing import Any, Dict, List, Optional, Union

# the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# do not change this unless explicitly requested by the user
from openai import OpenAI

from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def analyze_with_openai(prompt: str, text: str, output_format: str = None) -> Union[str, Dict, List]:
    """
    Analyze text using OpenAI's API.
    
    Args:
        prompt: Instruction prompt for the LLM
        text: Text to analyze
        output_format: Expected output format (e.g., 'json')
        
    Returns:
        Response from the LLM
    """
    try:
        logger.debug(f"Sending prompt to OpenAI with {len(text)} characters of text")
        
        # Build the full prompt
        full_prompt = f"{prompt}\n\nText to analyze:\n{text}"
        
        response_format = {"type": "json_object"} if output_format == "json" else None
        
        response = client.chat.completions.create(
            model="gpt-4o",  # Latest model as of May 13, 2024
            messages=[
                {"role": "system", "content": "You are an expert in government procurement evaluation focusing on connectivity projects."},
                {"role": "user", "content": full_prompt}
            ],
            response_format=response_format,
            temperature=0.2  # Lower temperature for more focused responses
        )
        
        result = response.choices[0].message.content
        
        # Parse JSON if expected
        if output_format == "json":
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON response: {result}")
                return {"error": "Failed to parse JSON response"}
        
        return result
            
    except Exception as e:
        logger.exception("Error analyzing text with OpenAI")
        if output_format == "json":
            return {"error": str(e)}
        else:
            return f"Error analyzing text: {str(e)}"


def extract_requirements(rfp_text: str) -> List[Dict]:
    """
    Extract requirements from RFP text using OpenAI.
    
    Args:
        rfp_text: The text of the RFP document
        
    Returns:
        List of requirements with their details
    """
    prompt = """
    Extract the key requirements from this Request for Proposal (RFP) document.
    Focus on connectivity requirements, technical specifications, operational requirements, and compliance needs.
    
    For each requirement, identify:
    1. Category (Technical, Security, Operational, Financial, etc.)
    2. Description
    3. Priority (Must-have, Should-have, or Nice-to-have)
    4. Section where it appears in the document
    
    Only extract actual requirements, not general information or background.
    
    Respond with a JSON array of requirements in this format:
    [
        {
            "category": "Technical",
            "description": "The system must provide at least 10Gbps throughput for backbone connections.",
            "priority": "Must-have",
            "section": "Network Requirements"
        },
        ...
    ]
    """
    
    try:
        return analyze_with_openai(prompt, rfp_text, "json")
    except Exception as e:
        logger.exception("Error extracting requirements")
        return []


def extract_technical_specifications(rfp_text: str) -> List[Dict]:
    """
    Extract technical specifications from RFP text using OpenAI.
    
    Args:
        rfp_text: The text of the RFP document
        
    Returns:
        List of technical specifications with their details
    """
    prompt = """
    Extract the specific technical specifications from this Request for Proposal (RFP) document.
    Focus on detailed technical requirements that include specific measurements, values, or capabilities.
    
    For each specification, identify:
    1. Name (e.g., "Backbone Throughput", "Latency", "Encryption Strength")
    2. Description
    3. Category (Network, Security, Hardware, etc.)
    4. Measurement unit (if applicable)
    5. Minimum value (if specified)
    6. Maximum value (if specified)
    7. Whether it is mandatory
    
    Respond with a JSON array of specifications in this format:
    [
        {
            "name": "Backbone Throughput",
            "description": "Minimum network throughput capacity for backbone connections",
            "category": "Network",
            "measurement_unit": "Gbps",
            "min_value": "10",
            "max_value": null,
            "is_mandatory": true
        },
        ...
    ]
    """
    
    try:
        return analyze_with_openai(prompt, rfp_text, "json")
    except Exception as e:
        logger.exception("Error extracting technical specifications")
        return []


def evaluate_requirement_compliance(requirement: Dict, bid_text: str) -> Dict:
    """
    Evaluate how well a bid complies with a specific requirement.
    
    Args:
        requirement: Requirement details
        bid_text: Text from the bid
        
    Returns:
        Compliance score and explanation
    """
    prompt = f"""
    You are an expert in government procurement evaluation. Analyze how well the vendor's bid complies with the following requirement:
    
    Requirement Category: {requirement['category']}
    Priority: {requirement['priority']}
    Description: {requirement['description']}
    
    Based on the bid text, evaluate compliance on a scale of 0-100, where:
    0 = Not addressed at all
    25 = Poorly addressed
    50 = Partially addressed
    75 = Mostly addressed
    100 = Fully addressed
    
    Provide a detailed explanation for your score, referencing specific parts of the bid.
    
    Respond with a JSON object in the following format:
    {{
        "score": 75,
        "explanation": "The vendor addresses this requirement by..."
    }}
    """
    
    try:
        return analyze_with_openai(prompt, bid_text, "json")
    except Exception as e:
        logger.exception("Error evaluating requirement compliance")
        return {"score": 0, "explanation": f"Error: {str(e)}"}


def evaluate_technical_compliance(specification: Dict, bid_text: str) -> Dict:
    """
    Evaluate how well a bid complies with a specific technical specification.
    
    Args:
        specification: Technical specification details
        bid_text: Text from the bid
        
    Returns:
        Compliance score and explanation
    """
    min_value = f"Minimum Value: {specification['min_value']} {specification['measurement_unit']}" if specification.get('min_value') else ""
    max_value = f"Maximum Value: {specification['max_value']} {specification['measurement_unit']}" if specification.get('max_value') else ""
    
    prompt = f"""
    You are an expert in technical evaluation for government connectivity projects. Analyze how well the vendor's bid complies with the following technical specification:
    
    Specification Name: {specification['name']}
    Category: {specification['category']}
    Description: {specification['description']}
    {min_value}
    {max_value}
    Mandatory: {"Yes" if specification.get('is_mandatory') else "No"}
    
    Based on the bid text, evaluate compliance on a scale of 0-100, where:
    0 = Not addressed at all
    25 = Poorly addressed
    50 = Partially addressed
    75 = Mostly addressed
    100 = Fully addressed
    
    Provide specific evidence from the bid text that justifies your score.
    
    Respond with a JSON object in the following format:
    {{
        "score": 75,
        "explanation": "The vendor addresses this specification by..."
    }}
    """
    
    try:
        return analyze_with_openai(prompt, bid_text, "json")
    except Exception as e:
        logger.exception("Error evaluating technical compliance")
        return {"score": 0, "explanation": f"Error: {str(e)}"}


def identify_strengths_weaknesses(requirements_text: str, specs_text: str, bid_text: str) -> Dict:
    """
    Identify strengths and weaknesses in a bid compared to RFP requirements.
    
    Args:
        requirements_text: Concatenated text of requirements
        specs_text: Concatenated text of technical specifications
        bid_text: Text from the bid
        
    Returns:
        Dictionary with strengths and weaknesses lists
    """
    prompt = f"""
    You are an expert in government procurement evaluation. Based on the vendor's bid, identify the top strengths and weaknesses compared to the RFP requirements and technical specifications.
    
    RFP Requirements:
    {requirements_text}
    
    Technical Specifications:
    {specs_text}
    
    Analyze the bid and provide:
    1. Top 5 strengths of the proposal
    2. Top 5 weaknesses or gaps in the proposal
    
    Be specific and reference exact requirements or specifications where possible.
    
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
    
    try:
        return analyze_with_openai(prompt, bid_text, "json")
    except Exception as e:
        logger.exception("Error identifying strengths and weaknesses")
        return {"strengths": [], "weaknesses": []}


def perform_gap_analysis(requirements_text: str, specs_text: str, bid_text: str) -> List[Dict]:
    """
    Perform a detailed gap analysis between RFP requirements and a bid.
    
    Args:
        requirements_text: Concatenated text of requirements
        specs_text: Concatenated text of technical specifications
        bid_text: Text from the bid
        
    Returns:
        List of identified gaps with details
    """
    prompt = f"""
    You are an expert in government procurement evaluation. Identify specific gaps between the RFP requirements and the vendor's bid.
    
    RFP Requirements:
    {requirements_text}
    
    Technical Specifications:
    {specs_text}
    
    Provide a detailed analysis of requirements or specifications that are not fully addressed in the bid.
    For each gap, include:
    1. What requirement/specification item has the gap
    2. What the RFP specifically requires
    3. What is missing or inadequate in the bid
    4. The potential impact of this gap (Critical, Medium, or Low)
    
    Focus on substantive gaps that would affect evaluation or implementation, not minor wording differences.
    
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
    
    try:
        return analyze_with_openai(prompt, bid_text, "json")
    except Exception as e:
        logger.exception("Error performing gap analysis")
        return []