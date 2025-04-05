import os
import logging
from typing import Tuple, Optional, List, Dict
from sqlalchemy.orm import Session

from app.models.document import RFPDocument, VendorBid
from app.utils.pdf_utils import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt

# Configure logging
logger = logging.getLogger(__name__)

def process_document(document_id: int, db: Session, is_bid: bool = False) -> Tuple[bool, str]:
    """
    Process an uploaded document (RFP or bid).
    
    Args:
        document_id: ID of the document to process
        db: Database session
        is_bid: Whether the document is a bid (True) or an RFP (False)
        
    Returns:
        Tuple of (success, message)
    """
    try:
        if is_bid:
            document = db.query(VendorBid).filter(VendorBid.id == document_id).first()
        else:
            document = db.query(RFPDocument).filter(RFPDocument.id == document_id).first()
            
        if not document:
            return False, "Document not found"
        
        # Extract text based on file type
        file_path = document.file_path
        file_ext = os.path.splitext(file_path)[1].lower()
        
        extracted_text = ""
        
        if file_ext == '.pdf':
            extracted_text = extract_text_from_pdf(file_path)
        elif file_ext == '.docx':
            extracted_text = extract_text_from_docx(file_path)
        elif file_ext == '.txt':
            extracted_text = extract_text_from_txt(file_path)
        else:
            return False, f"Unsupported file format: {file_ext}"
        
        # Store the extracted text in a variable for later use
        # In a real app, you might store this in the database or in a vector database for retrieval
        # Here we'll just log some stats
        
        if not extracted_text:
            return False, "Failed to extract text from document"
        
        logger.info(f"Successfully processed document {document_id}. Extracted {len(extracted_text)} characters.")
        
        # Mark as processed
        document.is_processed = True
        db.commit()
        
        return True, "Document processed successfully"
        
    except Exception as e:
        logger.exception(f"Error processing document {document_id}")
        return False, str(e)
