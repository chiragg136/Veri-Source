"""
Perplexity API utilities for UniSphere.
This module provides functions to interact with the Perplexity API for LLM analysis.
"""

import json
import logging
import os
import requests
from typing import Dict, List, Union, Optional

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_with_perplexity(
    prompt: str, 
    text: str, 
    output_format: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 500
) -> Union[str, Dict, List]:
    """
    Analyze text using Perplexity's API.
    
    Args:
        prompt: Instruction prompt for the LLM
        text: Text to analyze
        output_format: Expected output format (e.g., 'json')
        temperature: Controls randomness (lower is more deterministic)
        max_tokens: Maximum tokens to generate in response
        
    Returns:
        Response from the LLM (string, dict, or list depending on output_format)
    """
    api_key = os.environ.get("PERPLEXITY_API_KEY", settings.PERPLEXITY_API_KEY)
    
    if not api_key:
        logger.warning("No Perplexity API key found. Using fallback analysis.")
        return "API key not available. Please configure the PERPLEXITY_API_KEY environment variable."
    
    # Prepare the messages
    messages = [
        {"role": "system", "content": "You are an expert in government procurement and RFP analysis."},
        {"role": "user", "content": f"{prompt}\n\nText to analyze:\n{text}"}
    ]
    
    # Add output format instruction if needed
    if output_format == 'json':
        messages[0]["content"] += " Provide your response as valid JSON."
    
    url = "https://api.perplexity.ai/chat/completions"
    
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",  # Use the latest Perplexity model
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": 0.9,
        "stream": False
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise exception for bad status codes
        
        # Extract the response content
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Process response based on expected output format
        if output_format == 'json':
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                logger.error("Failed to parse JSON response from Perplexity")
                return {"error": "Invalid JSON response", "raw_response": content}
        
        return content
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Perplexity API request failed: {str(e)}")
        return f"API request failed: {str(e)}"
    except Exception as e:
        logger.error(f"Error in Perplexity analysis: {str(e)}")
        return f"Analysis error: {str(e)}"

def analyze_bid_with_perplexity(bid_text: str, rfp_requirements: str) -> Dict:
    """
    Analyze a bid document against RFP requirements using Perplexity.
    
    Args:
        bid_text: Text from the bid document
        rfp_requirements: Text of the RFP requirements
        
    Returns:
        Analysis results including compliance, strengths, weaknesses, and score
    """
    prompt = """
    Analyze this vendor bid against the RFP requirements.
    Provide a detailed analysis with the following sections:
    1. Overall compliance score (0-100)
    2. Key strengths (list at least 3)
    3. Key weaknesses (list at least 3)
    4. Recommendation (accept, conditionally accept, or reject)
    
    Format your response as valid JSON with the following structure:
    {
        "compliance_score": number,
        "strengths": [string, string, ...],
        "weaknesses": [string, string, ...],
        "recommendation": string,
        "rationale": string
    }
    """
    
    combined_text = f"RFP REQUIREMENTS:\n{rfp_requirements}\n\nBID DOCUMENT:\n{bid_text}"
    
    result = analyze_with_perplexity(prompt, combined_text, 'json')
    
    # Handle case where result is not a dict
    if not isinstance(result, dict):
        return {
            "compliance_score": 0,
            "strengths": ["Analysis failed"],
            "weaknesses": ["Could not process bid"],
            "recommendation": "Error",
            "rationale": f"Analysis error: {result}"
        }
    
    return result

def generate_intelligence_brief(rfp_text: str) -> str:
    """
    Generate an intelligence brief about an RFP using Perplexity.
    Provides market context and strategic insights.
    
    Args:
        rfp_text: Text from the RFP document
        
    Returns:
        Intelligence brief as a string
    """
    prompt = """
    Based on this RFP, create a concise intelligence brief that includes:
    1. Market context (industry trends relevant to this procurement)
    2. Competitive landscape (likely bidders and their strengths)
    3. Strategic recommendations for potential bidders
    4. Key success factors for winning this contract
    
    Keep your response concise and focused on actionable intelligence.
    """
    
    # Truncate RFP text if too long
    max_length = 8000  # Approximate token limit considering prompt
    if len(rfp_text) > max_length:
        rfp_text = rfp_text[:max_length] + "... [text truncated]"
    
    return analyze_with_perplexity(prompt, rfp_text)