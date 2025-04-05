"""
Enhanced Chatbot Service for the UniSphere application.
This module provides AI-powered chatbot functionality with multiple LLM providers
and fallback options for reliability and flexibility.
"""

import json
import logging
import os
from typing import Dict, List, Optional, Union

import openai
import requests
from app.config import Settings
from app.database import get_db
from app.models.document import RFPDocument, VendorBid
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

settings = Settings()


class ChatbotService:
    """
    Service class for handling chatbot interactions with multiple LLM providers.
    Supports OpenAI and Perplexity with automatic fallback.
    """

    def __init__(self, db: Session):
        """
        Initialize the chatbot service with available API keys and database session.
        
        Args:
            db: Database session
        """
        self.db = db
        self.openai_key = settings.OPENAI_API_KEY
        self.perplexity_key = settings.PERPLEXITY_API_KEY
        
        # Set up OpenAI client if key is available
        if self.openai_key:
            self.openai_client = openai.OpenAI(api_key=self.openai_key)
        else:
            self.openai_client = None
            logger.warning("OpenAI API key not available. Will use alternate providers.")
        
        if not self.perplexity_key and not self.openai_key:
            logger.warning("No LLM API keys available. Chatbot will use simulated responses.")

    def get_response(self, 
                    user_query: str, 
                    rfp_id: Optional[int] = None, 
                    bid_id: Optional[int] = None, 
                    chat_history: Optional[List[Dict]] = None) -> Dict:
        """
        Get a chatbot response to the user's query with context from selected documents.
        
        Args:
            user_query: User's question or query
            rfp_id: Optional ID of an RFP for context
            bid_id: Optional ID of a bid for context
            chat_history: Optional list of previous chat messages
            
        Returns:
            Response dict with message and provider info
        """
        # Initialize chat history if not provided
        if chat_history is None:
            chat_history = []
        
        # Get document context if IDs are provided
        context = self._get_document_context(rfp_id, bid_id)
        
        # Build the messages array with system instructions and context
        messages = self._build_messages(user_query, context, chat_history)
        
        # Try multiple providers with fallback
        try:
            if self.openai_client:
                logger.info("Attempting to use OpenAI for chatbot response")
                response = self._get_openai_response(messages)
                return {
                    "message": response,
                    "provider": "openai",
                    "success": True
                }
        except Exception as e:
            logger.warning(f"OpenAI request failed: {str(e)}")
            
        try:
            if self.perplexity_key:
                logger.info("Attempting to use Perplexity for chatbot response")
                response = self._get_perplexity_response(messages)
                return {
                    "message": response,
                    "provider": "perplexity",
                    "success": True
                }
        except Exception as e:
            logger.warning(f"Perplexity request failed: {str(e)}")
        
        # Fallback to simulated response if both providers fail
        logger.warning("All LLM providers failed. Using simulated response.")
        return {
            "message": self._get_simulated_response(user_query, context),
            "provider": "simulated",
            "success": False
        }

    def _get_document_context(self, rfp_id: Optional[int], bid_id: Optional[int]) -> str:
        """
        Extract relevant context from the specified documents.
        
        Args:
            rfp_id: Optional ID of an RFP for context
            bid_id: Optional ID of a bid for context
            
        Returns:
            Formatted document context as a string
        """
        context_parts = []
        
        if rfp_id:
            rfp = self.db.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
            if rfp:
                context_parts.append(f"RFP Title: {rfp.title}")
                context_parts.append(f"RFP Agency: {rfp.agency}")
                context_parts.append(f"RFP Description: {rfp.description}")
                
                # Add requirements if available
                requirements = rfp.requirements
                if requirements:
                    req_context = "Key Requirements:\n"
                    for req in requirements[:5]:  # Limit to 5 requirements for context
                        req_context += f"- {req.description} (Priority: {req.priority})\n"
                    context_parts.append(req_context)
        
        if bid_id:
            bid = self.db.query(VendorBid).filter(VendorBid.id == bid_id).first()
            if bid:
                context_parts.append(f"Vendor Bid: {bid.vendor_name}")
                
                # Add analysis results if available
                if bid.analysis_results and len(bid.analysis_results) > 0:
                    analysis = bid.analysis_results[0]
                    if analysis.strengths:
                        strengths = json.loads(analysis.strengths) if isinstance(analysis.strengths, str) else analysis.strengths
                        if strengths and len(strengths) > 0:
                            strength_context = "Bid Strengths:\n"
                            for strength in strengths[:3]:  # Limit to 3 strengths
                                strength_context += f"- {strength}\n"
                            context_parts.append(strength_context)
                    
                    if analysis.weaknesses:
                        weaknesses = json.loads(analysis.weaknesses) if isinstance(analysis.weaknesses, str) else analysis.weaknesses
                        if weaknesses and len(weaknesses) > 0:
                            weakness_context = "Bid Weaknesses:\n"
                            for weakness in weaknesses[:3]:  # Limit to 3 weaknesses
                                weakness_context += f"- {weakness}\n"
                            context_parts.append(weakness_context)
        
        return "\n\n".join(context_parts)

    def _build_messages(self, 
                       user_query: str, 
                       context: str, 
                       chat_history: List[Dict]) -> List[Dict]:
        """
        Build the messages array for LLM API requests.
        
        Args:
            user_query: User's question or query
            context: Document context string
            chat_history: Previous chat messages
            
        Returns:
            Formatted messages list for LLM API
        """
        system_message = """You are UniSphere AI, an assistant specialized in government procurement and RFPs.
You provide clear, concise, and accurate information about RFPs, vendor bids, and procurement processes.
Your answers should be helpful for procurement officers and vendors. Do not make up information."""
        
        # Add context to system message if available
        if context:
            system_message += "\n\nHere is information about the current document(s):\n" + context
        
        messages = [{"role": "system", "content": system_message}]
        
        # Add chat history, ensuring alternating user/assistant pattern
        for i, message in enumerate(chat_history):
            if i % 2 == 0 and message.get("role") != "user":
                # Skip if not following proper pattern
                continue
            if i % 2 == 1 and message.get("role") != "assistant":
                # Skip if not following proper pattern
                continue
            messages.append(message)
        
        # Add the current user query
        messages.append({"role": "user", "content": user_query})
        
        return messages

    def _get_openai_response(self, messages: List[Dict]) -> str:
        """
        Get a response from OpenAI API.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            Text response from the API
        """
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        return response.choices[0].message.content

    def _get_perplexity_response(self, messages: List[Dict]) -> str:
        """
        Get a response from Perplexity API.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            Text response from the API
        """
        if not self.perplexity_key:
            raise ValueError("Perplexity API key not available")
        
        headers = {
            "Authorization": f"Bearer {self.perplexity_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1000,
            "stream": False
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code != 200:
            raise Exception(f"Perplexity API returned status code {response.status_code}: {response.text}")
        
        response_data = response.json()
        return response_data["choices"][0]["message"]["content"]

    def _get_simulated_response(self, query: str, context: str) -> str:
        """
        Generate a simulated response when no API is available.
        
        Args:
            query: User's question or query
            context: Document context string
            
        Returns:
            Simulated response text
        """
        # Map common questions to pre-defined answers
        common_responses = {
            "RFP": "An RFP (Request for Proposal) is a document issued by an organization to solicit proposals from potential vendors for products or services.",
            "requirement": "Requirements in an RFP define the specific needs, features, or functionality that vendors must address in their proposals.",
            "compliance": "Compliance in government procurement refers to adherence to rules, regulations, and standards mandated by law or the RFP itself.",
            "vendor": "A vendor, in the context of procurement, is a company or individual that supplies goods or services in response to an RFP or other solicitation.",
            "bid": "A bid is a vendor's formal offer or proposal in response to an RFP, detailing how they will meet requirements and at what cost.",
            "procurement": "Procurement is the process of sourcing and acquiring goods or services from external sources, typically through a formal bidding process.",
            "score": "Bid scoring is the evaluation method used to assess vendor proposals against RFP requirements, typically using a numerical rating system.",
            "FISMA": "FISMA (Federal Information Security Management Act) establishes information security standards for federal agencies and their contractors.",
            "FedRAMP": "FedRAMP (Federal Risk and Authorization Management Program) is a government-wide program providing standardized security assessment for cloud services.",
            "security": "Security requirements in government RFPs ensure vendors meet necessary safeguards to protect sensitive government information and systems."
        }
        
        # Check if query contains any keywords from common responses
        for keyword, response in common_responses.items():
            if keyword.lower() in query.lower():
                return response
        
        # If no matches, return a generic response
        return "I don't have specific information about that in my current dataset. Please try asking about RFPs, requirements, vendor bids, compliance, or procurement processes."


# Factory function to create a chatbot service instance
def get_chatbot_service() -> ChatbotService:
    """
    Factory function to create a chatbot service with database session.
    
    Returns:
        Initialized chatbot service
    """
    db = next(get_db())
    return ChatbotService(db)