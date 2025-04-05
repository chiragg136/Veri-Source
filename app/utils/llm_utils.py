import logging
import os
import json
from typing import Any, Dict, List, Optional, Union
import requests

from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """
    Split text into chunks for processing by LLM.
    
    Args:
        text: Text to split
        chunk_size: Maximum size of each chunk
        overlap: Overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    
    while start < len(text):
        end = min(start + chunk_size, len(text))
        
        # If this is not the last chunk, try to find a good breaking point
        if end < len(text):
            # Look for line break, then space
            line_break = text.rfind('\n', start, end)
            if line_break != -1 and line_break > start + chunk_size // 2:
                end = line_break + 1
            else:
                space = text.rfind(' ', start, end)
                if space != -1 and space > start + chunk_size // 2:
                    end = space + 1
        
        chunks.append(text[start:end])
        start = end - overlap  # Include overlap
    
    return chunks

def analyze_text_with_llm(prompt: str, text: str, output_format: str = None) -> Union[str, Dict, List]:
    """
    Analyze text using an LLM.
    
    Args:
        prompt: Instruction prompt for the LLM
        text: Text to analyze
        output_format: Expected output format (e.g., 'json')
        
    Returns:
        Response from the LLM
    """
    try:
        logger.debug(f"Sending prompt to LLM with {len(text)} characters of text")
        
        # Decide which model to use
        model = settings.DEFAULT_MODEL
        
        # In a real implementation, this would integrate with the LLM API
        # For this implementation, simulate the LLM response
        if output_format == "json":
            # Generate simulated JSON response based on the prompt
            if "requirements" in prompt.lower():
                return simulate_requirements_response()
            elif "technical specification" in prompt.lower():
                return simulate_tech_specs_response()
            elif "compliance" in prompt.lower() and "score" in prompt.lower():
                return simulate_compliance_response()
            elif "strengths" in prompt.lower() and "weaknesses" in prompt.lower():
                return simulate_strengths_weaknesses_response()
            elif "gap" in prompt.lower():
                return simulate_gap_analysis_response()
            else:
                return {"result": "Generic LLM analysis result"}
        else:
            return "Simulated LLM response for text analysis"
            
    except Exception as e:
        logger.exception("Error analyzing text with LLM")
        if output_format == "json":
            return {"error": str(e)}
        else:
            return f"Error analyzing text: {str(e)}"

def simulate_requirements_response() -> List[Dict]:
    """Generate simulated requirements extracted from an RFP."""
    return [
        {
            "category": "Technical",
            "description": "The system must provide at least 10Gbps throughput for backbone connections.",
            "priority": "Must-have",
            "section": "Network Requirements"
        },
        {
            "category": "Technical",
            "description": "The solution must support IPv6 along with IPv4 dual-stack configuration.",
            "priority": "Must-have",
            "section": "Network Requirements"
        },
        {
            "category": "Technical",
            "description": "All network equipment must be manageable through SNMP v3.",
            "priority": "Must-have",
            "section": "Network Management"
        },
        {
            "category": "Security",
            "description": "The solution must implement 256-bit encryption for all data in transit.",
            "priority": "Must-have",
            "section": "Security Requirements"
        },
        {
            "category": "Security",
            "description": "The vendor must provide documentation of compliance with NIST 800-53 controls.",
            "priority": "Must-have",
            "section": "Compliance Requirements"
        },
        {
            "category": "Operational",
            "description": "The vendor must provide 24/7 technical support with a 4-hour response time for critical issues.",
            "priority": "Must-have",
            "section": "Support Requirements"
        },
        {
            "category": "Operational",
            "description": "The solution should include a web-based dashboard for monitoring network performance.",
            "priority": "Should-have",
            "section": "Monitoring Requirements"
        },
        {
            "category": "Financial",
            "description": "The proposal must include a detailed breakdown of all costs, including hardware, software, and ongoing maintenance.",
            "priority": "Must-have",
            "section": "Cost Requirements"
        }
    ]

def simulate_tech_specs_response() -> List[Dict]:
    """Generate simulated technical specifications extracted from an RFP."""
    return [
        {
            "name": "Backbone Throughput",
            "description": "Minimum network throughput capacity for backbone connections",
            "category": "Network",
            "measurement_unit": "Gbps",
            "min_value": "10",
            "max_value": None,
            "is_mandatory": True
        },
        {
            "name": "Edge Throughput",
            "description": "Minimum network throughput capacity for edge connections",
            "category": "Network",
            "measurement_unit": "Gbps",
            "min_value": "1",
            "max_value": None,
            "is_mandatory": True
        },
        {
            "name": "Latency",
            "description": "Maximum end-to-end latency across the network",
            "category": "Network",
            "measurement_unit": "ms",
            "min_value": None,
            "max_value": "50",
            "is_mandatory": True
        },
        {
            "name": "IPv6 Support",
            "description": "Support for IPv6 addressing and routing",
            "category": "Network",
            "measurement_unit": None,
            "min_value": None,
            "max_value": None,
            "is_mandatory": True
        },
        {
            "name": "Encryption Strength",
            "description": "Encryption bit strength for data in transit",
            "category": "Security",
            "measurement_unit": "bits",
            "min_value": "256",
            "max_value": None,
            "is_mandatory": True
        },
        {
            "name": "Critical Issue Response",
            "description": "Maximum response time for critical support issues",
            "category": "Support",
            "measurement_unit": "hours",
            "min_value": None,
            "max_value": "4",
            "is_mandatory": True
        },
        {
            "name": "Uptime Guarantee",
            "description": "Minimum guaranteed network availability",
            "category": "SLA",
            "measurement_unit": "percent",
            "min_value": "99.9",
            "max_value": None,
            "is_mandatory": True
        },
        {
            "name": "Equipment Mean Time Between Failures",
            "description": "Expected MTBF for network equipment",
            "category": "Hardware",
            "measurement_unit": "hours",
            "min_value": "50000",
            "max_value": None,
            "is_mandatory": False
        }
    ]

def simulate_compliance_response() -> Dict:
    """Generate simulated compliance analysis."""
    import random
    
    score = random.randint(50, 100)
    explanations = [
        "The vendor fully addresses this requirement with specific implementation details.",
        "The vendor partially addresses this requirement but lacks some implementation details.",
        "The vendor meets this specification with their proposed equipment which exceeds the minimum requirements.",
        "The vendor addresses this requirement but doesn't provide sufficient evidence of past performance.",
        "The vendor fully complies with this specification based on the detailed documentation provided."
    ]
    
    return {
        "score": score,
        "explanation": explanations[random.randint(0, len(explanations) - 1)]
    }

def simulate_strengths_weaknesses_response() -> Dict:
    """Generate simulated strengths and weaknesses analysis."""
    return {
        "strengths": [
            "Exceeds network throughput requirements by offering 20Gbps backbone capability",
            "Provides comprehensive security compliance with all required certifications including NIST 800-53",
            "Offers 24/7 technical support with faster-than-required 2-hour response time for critical issues",
            "Includes detailed implementation plan with clear milestones and deliverables",
            "Proposes equipment with proven reliability in government connectivity projects"
        ],
        "weaknesses": [
            "Limited details on IPv6 implementation approach",
            "Monitoring dashboard lacks some requested customization capabilities",
            "Cost breakdown doesn't clearly separate one-time and recurring expenses",
            "Training program is less comprehensive than requested in the RFP",
            "Some equipment manufacturers have limited track record in the public sector"
        ]
    }

def simulate_gap_analysis_response() -> List[Dict]:
    """Generate simulated gap analysis."""
    return [
        {
            "item": "IPv6 Support",
            "requirement": "Full IPv6 dual-stack configuration",
            "gap": "Vendor proposal only mentions IPv6 support without implementation details",
            "impact": "Medium - May require additional clarification and implementation planning"
        },
        {
            "item": "Monitoring Dashboard",
            "requirement": "Web-based dashboard with customizable metrics",
            "gap": "Proposed dashboard has limited customization options",
            "impact": "Low - Functional limitation but core requirements are met"
        },
        {
            "item": "Cost Breakdown",
            "requirement": "Detailed breakdown of all costs including hardware, software, and maintenance",
            "gap": "Cost categories are combined in some areas making evaluation difficult",
            "impact": "Medium - Affects procurement evaluation and budgeting"
        },
        {
            "item": "Training Program",
            "requirement": "Comprehensive training for IT staff including hands-on workshops",
            "gap": "Only basic training is included with limited hands-on components",
            "impact": "Medium - May require additional budget for supplemental training"
        }
    ]
