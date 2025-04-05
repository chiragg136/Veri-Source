import os
import uuid
import logging
from app.config import settings
import shutil
from typing import Optional
from flask import Blueprint, request, jsonify, render_template, abort, current_app
from werkzeug.utils import secure_filename

from app.database import db
from app.config import settings
from app.models.document import RFPDocument, VendorBid, AnalysisResult, Requirement, TechnicalSpecification
from app.models.government import GovernmentAgency, SecurityRequirement, BidSecurityCompliance
from app.services.document_processor import process_document
from app.services.rfp_analyzer import analyze_rfp
from app.services.bid_evaluator import evaluate_bid
from app.services.security_assessor import assess_security_compliance, predict_bid_risks, analyze_bid_sentiment

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for routes
main_bp = Blueprint('main', __name__)

# Web routes
@main_bp.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@main_bp.route('/upload', methods=['GET'])
def upload_form():
    return render_template('upload.html')

@main_bp.route('/dashboard', methods=['GET'])
def dashboard():
    rfps = db.session.query(RFPDocument).all()
    return render_template('dashboard.html', rfps=rfps)

@main_bp.route('/reports', methods=['GET'])
def reports():
    rfp_id = request.args.get('rfp_id', type=int)
    if rfp_id:
        rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
        if not rfp:
            abort(404, description="RFP not found")
        bids = db.session.query(VendorBid).filter(VendorBid.rfp_id == rfp_id).all()
        return render_template('reports.html', rfp=rfp, bids=bids)
    else:
        rfps = db.session.query(RFPDocument).all()
        return render_template('reports.html', rfps=rfps)

# API routes
@main_bp.route('/api/upload/rfp', methods=['POST'])
def upload_rfp():
    try:
        title = request.form['title']
        agency = request.form['agency']
        project_id = request.form['project_id']
        description = request.form['description']
        
        if 'document' not in request.files:
            return jsonify({"error": "No document part"}), 400
        
        document = request.files['document']
        if document.filename == '':
            return jsonify({"error": "No document selected"}), 400
        
        # Validate file extension
        file_ext = os.path.splitext(document.filename)[1].lower()
        if file_ext[1:] not in settings.ALLOWED_EXTENSIONS:
            return jsonify({
                "error": f"File type not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
            }), 400
        
        # Create unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_FOLDER, unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
        
        # Save file
        document.save(file_path)
        
        # Create DB record
        rfp = RFPDocument(
            title=title,
            agency=agency,
            project_id=project_id,
            description=description,
            filename=document.filename,
            file_path=file_path,
            content_type=document.content_type,
            size_bytes=os.path.getsize(file_path)
        )
        
        db.session.add(rfp)
        db.session.commit()
        
        # Process document (would use async task queue in production)
        success, message = process_document(rfp.id, db.session)
        if not success:
            logging.error(f"Error processing RFP document: {message}")
            rfp.processing_errors = message
            db.session.commit()
        
        # Analyze RFP to extract requirements and specs
        analyze_rfp(rfp.id, db.session)
        
        return jsonify({"message": "RFP uploaded successfully", "rfp_id": rfp.id})
    
    except Exception as e:
        logger.exception("Error uploading RFP")
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/upload/bid', methods=['POST'])
def upload_bid():
    try:
        rfp_id = request.form['rfp_id']
        vendor_name = request.form['vendor_name']
        
        if 'document' not in request.files:
            return jsonify({"error": "No document part"}), 400
        
        document = request.files['document']
        if document.filename == '':
            return jsonify({"error": "No document selected"}), 400
        
        # Check if RFP exists
        rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
        if not rfp:
            return jsonify({"error": "RFP not found"}), 404
        
        # Validate file extension
        file_ext = os.path.splitext(document.filename)[1].lower()
        if file_ext[1:] not in settings.ALLOWED_EXTENSIONS:
            return jsonify({
                "error": f"File type not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
            }), 400
        
        # Create unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_FOLDER, unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
        
        # Save file
        document.save(file_path)
        
        # Create DB record
        bid = VendorBid(
            rfp_id=rfp_id,
            vendor_name=vendor_name,
            filename=document.filename,
            file_path=file_path,
            content_type=document.content_type,
            size_bytes=os.path.getsize(file_path)
        )
        
        db.session.add(bid)
        db.session.commit()
        
        # Process document in background
        success, message = process_document(bid.id, db.session, is_bid=True)
        if not success:
            logging.error(f"Error processing bid document: {message}")
            bid.processing_errors = message
            db.session.commit()
        
        # Evaluate bid against RFP
        evaluate_bid(bid.id, db.session)
        
        return jsonify({"message": "Bid uploaded successfully", "bid_id": bid.id})
    
    except Exception as e:
        logger.exception("Error uploading bid")
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/rfp/<int:rfp_id>', methods=['GET'])
def get_rfp(rfp_id):
    rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
    if not rfp:
        return jsonify({"error": "RFP not found"}), 404
    
    requirements = db.session.query(Requirement).filter(Requirement.rfp_id == rfp_id).all()
    tech_specs = db.session.query(TechnicalSpecification).filter(TechnicalSpecification.rfp_id == rfp_id).all()
    
    return jsonify({
        "rfp": {
            "id": rfp.id,
            "title": rfp.title,
            "agency": rfp.agency,
            "project_id": rfp.project_id,
            "description": rfp.description,
            "upload_date": rfp.upload_date,
            "is_processed": rfp.is_processed,
            "processing_errors": rfp.processing_errors
        },
        "requirements": [
            {
                "id": req.id,
                "category": req.category,
                "description": req.description,
                "priority": req.priority,
                "section": req.section
            } for req in requirements
        ],
        "technical_specifications": [
            {
                "id": spec.id,
                "name": spec.name,
                "description": spec.description,
                "category": spec.category,
                "measurement_unit": spec.measurement_unit,
                "min_value": spec.min_value,
                "max_value": spec.max_value,
                "is_mandatory": spec.is_mandatory
            } for spec in tech_specs
        ]
    })

@main_bp.route('/api/bid/<int:bid_id>', methods=['GET'])
def get_bid(bid_id):
    bid = db.session.query(VendorBid).filter(VendorBid.id == bid_id).first()
    if not bid:
        return jsonify({"error": "Bid not found"}), 404
    
    analysis = db.session.query(AnalysisResult).filter(AnalysisResult.bid_id == bid_id).first()
    
    return jsonify({
        "bid": {
            "id": bid.id,
            "vendor_name": bid.vendor_name,
            "submission_date": bid.submission_date,
            "rfp_id": bid.rfp_id,
            "is_processed": bid.is_processed,
            "processing_errors": bid.processing_errors,
            "total_score": bid.total_score
        },
        "analysis": {
            "strengths": analysis.strengths if analysis else [],
            "weaknesses": analysis.weaknesses if analysis else [],
            "gap_analysis": analysis.gap_analysis if analysis else [],
            "overall_score": analysis.overall_score if analysis else None,
            "requirement_compliance": analysis.requirement_compliance if analysis else {},
            "technical_compliance": analysis.technical_compliance if analysis else {}
        } if analysis else None
    })

@main_bp.route('/api/rfp/<int:rfp_id>/bids', methods=['GET'])
def get_rfp_bids(rfp_id):
    rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
    if not rfp:
        return jsonify({"error": "RFP not found"}), 404
    
    bids = db.session.query(VendorBid).filter(VendorBid.rfp_id == rfp_id).all()
    
    return jsonify({
        "rfp": {
            "id": rfp.id,
            "title": rfp.title,
        },
        "bids": [
            {
                "id": bid.id,
                "vendor_name": bid.vendor_name,
                "submission_date": bid.submission_date,
                "is_processed": bid.is_processed,
                "total_score": bid.total_score
            } for bid in bids
        ]
    })

@main_bp.route('/api/reports/comparison/<int:rfp_id>', methods=['GET'])
def get_bid_comparison(rfp_id):
    rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
    if not rfp:
        return jsonify({"error": "RFP not found"}), 404
    
    bids = db.session.query(VendorBid).filter(VendorBid.rfp_id == rfp_id).all()
    if not bids:
        return jsonify({"message": "No bids found for this RFP"})
    
    requirements = db.session.query(Requirement).filter(Requirement.rfp_id == rfp_id).all()
    tech_specs = db.session.query(TechnicalSpecification).filter(TechnicalSpecification.rfp_id == rfp_id).all()
    
    comparison_data = {
        "rfp": {
            "id": rfp.id,
            "title": rfp.title,
            "agency": rfp.agency
        },
        "bids": [],
        "requirement_categories": {},
        "technical_categories": {}
    }
    
    # Group requirements and specs by category
    for req in requirements:
        if req.category not in comparison_data["requirement_categories"]:
            comparison_data["requirement_categories"][req.category] = []
        comparison_data["requirement_categories"][req.category].append({
            "id": req.id,
            "description": req.description,
            "priority": req.priority
        })
    
    for spec in tech_specs:
        if spec.category not in comparison_data["technical_categories"]:
            comparison_data["technical_categories"][spec.category] = []
        comparison_data["technical_categories"][spec.category].append({
            "id": spec.id,
            "name": spec.name,
            "description": spec.description,
            "is_mandatory": spec.is_mandatory
        })
    
    # Get bid data with analysis
    for bid in bids:
        analysis = db.session.query(AnalysisResult).filter(AnalysisResult.bid_id == bid.id).first()
        if analysis:
            bid_data = {
                "id": bid.id,
                "vendor_name": bid.vendor_name,
                "total_score": bid.total_score,
                "strengths": analysis.strengths,
                "weaknesses": analysis.weaknesses,
                "requirement_compliance": analysis.requirement_compliance,
                "technical_compliance": analysis.technical_compliance
            }
            comparison_data["bids"].append(bid_data)
    
    return jsonify(comparison_data)

# Chatbot API
@main_bp.route('/api/chatbot', methods=['POST'])
def chatbot():
    """
    Chatbot API for user questions about RFPs and bids.
    Supports multi-LLM analysis with fallback options.
    """
    from app.utils.openai_utils import analyze_with_openai
    from app.utils.perplexity_utils import analyze_with_perplexity
    import random
    
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        user_message = data['message']
        
        # Create a system prompt
        system_prompt = """
        You are UniSphere Assistant, an AI expert in government procurement, RFPs (Request for Proposals), 
        and bid analysis. Your purpose is to help users understand procurement processes, interpret 
        requirements, and evaluate competitive bids. Keep responses concise and focused on procurement topics.
        
        You can help with:
        - Explaining procurement terms and processes
        - Interpreting RFP requirements
        - Understanding bid evaluation criteria
        - Clarifying compliance issues 
        - Suggesting procurement best practices
        - Providing guidance on government bidding processes
        - Security and compliance requirements for government contracts
        - Risk assessment and prediction in procurement
        - Sentiment analysis of vendor proposals
        - Human-in-the-loop accountability measures
        
        If asked about information outside your scope, politely redirect to procurement-related topics.
        """
        
        # Enhanced prompt with additional capabilities
        prompt = f"""
        {system_prompt}
        
        NEW CAPABILITIES:
        - Government bidding: You can provide detailed information about government bidding processes, 
          requirements for becoming a government vendor, and compliance with federal/state regulations.
        - Security features: You can explain security through secure self-hosting options, data protection
          mechanisms, and compliance with security standards like FISMA, FedRAMP, etc.
        - Risk prediction: You can analyze potential risks associated with vendors or bids,
          including financial stability, past performance issues, and delivery capacity.
        - Sentiment analysis: You can detect and interpret sentiment in vendor proposals to
          identify potential issues such as lack of confidence, overcommitment, or hidden risks.
        - Human-in-the-loop accountability: You can explain how UniSphere maintains human oversight
          while automating procurement processes to ensure fairness and accuracy.
        
        User question: {user_message}
        
        Provide a helpful, concise, and informative response that demonstrates expertise in procurement
        and the enhanced capabilities listed above when relevant to the question.
        """
        
        # Try multiple LLM providers with fallback strategy
        response_text = None
        
        # First try OpenAI if available
        if settings.OPENAI_API_KEY:
            try:
                response_text = analyze_with_openai(prompt, "", None)
                logging.info("Using OpenAI for chatbot response")
            except Exception as e:
                logging.error(f"OpenAI chatbot error: {str(e)}")
                response_text = None
        
        # Then try Perplexity if OpenAI failed or is not available
        if response_text is None and settings.PERPLEXITY_API_KEY:
            try:
                response_text = analyze_with_perplexity(prompt, "")
                logging.info("Using Perplexity for chatbot response")
            except Exception as e:
                logging.error(f"Perplexity chatbot error: {str(e)}")
                response_text = None
        
        # If both API calls failed or no API keys are available, use enhanced fallback responses
        if response_text is None:
            enhanced_fallback_responses = [
                # Basic procurement advice
                "As your procurement assistant, I'd recommend carefully evaluating vendor compliance with all technical specifications listed in the RFP, particularly focusing on security requirements for government connectivity projects.",
                
                # Government bidding
                "Government bidding requires adherence to strict regulations. For federal contracts, vendors must register in SAM.gov and comply with FAR (Federal Acquisition Regulation). UniSphere can help streamline compliance verification across multiple requirements.",
                
                # Security features
                "UniSphere supports secure self-hosting options where government agencies can deploy the solution within their own infrastructure, ensuring data never leaves their secure environment. This complies with FISMA and FedRAMP requirements.",
                
                # Risk prediction
                "When evaluating vendors, it's important to assess both technical compliance and risk factors. UniSphere's risk prediction analyzes vendor financial stability, past performance, and delivery capacity to identify potential issues before they impact your project.",
                
                # Sentiment analysis
                "Beyond technical compliance, UniSphere's sentiment analysis examines language patterns in vendor proposals to detect potential issues like uncertainty, overcommitment, or ambiguity that might indicate hidden risks.",
                
                # Human-in-the-loop
                "While UniSphere automates procurement analysis, we maintain human-in-the-loop accountability through verification checkpoints and confidence scores that highlight when human review is recommended.",
                
                # Combined features
                "For government connectivity projects, I recommend implementing a dual-evaluation approach: first assess technical compliance with requirements, then evaluate security capabilities and risk factors. UniSphere can assist with both aspects while allowing your team to make the final decisions.",
                
                # Practical application
                "When comparing government vendor bids, look beyond the price to evaluate total cost of ownership, compliance with security standards like NIST 800-53, and the vendor's past performance on similar government contracts.",
                
                # Strategic advice
                "To improve procurement outcomes, establish clear evaluation criteria with weighted scores for technical compliance, security features, past performance, and risk assessment. UniSphere can help implement and automate this scoring system."
            ]
            
            response_text = random.choice(enhanced_fallback_responses)
            logging.info("Using fallback response for chatbot")
            
        # Ensure we have a string response
        if not isinstance(response_text, str):
            response_text = str(response_text)
        
        return jsonify({'response': response_text})
            
    except Exception as e:
        logging.error(f"Chatbot error: {str(e)}")
        return jsonify({'error': 'An error occurred processing your request'}), 500
        
# Security assessment API routes
@main_bp.route('/api/security/assess/<int:bid_id>', methods=['POST'])
def security_assessment(bid_id):
    """
    Assess a vendor bid against security requirements from the RFP.
    This endpoint evaluates compliance with security frameworks and requirements.
    """
    try:
        # Get bid details
        bid = db.session.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            return jsonify({"error": f"Bid with ID {bid_id} not found"}), 404
            
        # Perform security assessment
        success = assess_security_compliance(bid_id, db.session)
        
        if not success:
            return jsonify({"error": "Failed to complete security assessment"}), 500
            
        # Get compliance results
        compliance_results = (
            db.session.query(BidSecurityCompliance)
            .filter(BidSecurityCompliance.bid_id == bid_id)
            .all()
        )
        
        # Format results
        formatted_results = []
        for result in compliance_results:
            requirement = db.session.query(SecurityRequirement).filter(
                SecurityRequirement.id == result.requirement_id
            ).first()
            
            if requirement:
                formatted_results.append({
                    "id": result.id,
                    "requirement_id": result.requirement_id,
                    "requirement_title": requirement.title,
                    "framework": requirement.framework.value,
                    "compliance_score": result.compliance_score,
                    "is_compliant": result.is_compliant,
                    "compliance_notes": result.compliance_notes,
                    "verification_status": result.verification_status
                })
        
        return jsonify({
            "success": True,
            "message": "Security assessment completed",
            "bid_id": bid_id,
            "vendor_name": bid.vendor_name,
            "compliance_results": formatted_results
        })
        
    except Exception as e:
        logger.error(f"Error in security assessment: {str(e)}")
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/security/risks/<int:bid_id>', methods=['GET'])
def get_bid_risks(bid_id):
    """
    Get risk assessment for a specific vendor bid.
    This endpoint analyzes potential risks associated with a vendor bid.
    """
    try:
        # Run risk prediction
        risk_assessment = predict_bid_risks(bid_id, db.session)
        
        if not risk_assessment.get("success", False):
            return jsonify({"error": risk_assessment.get("message", "Unknown error")}), 500
            
        return jsonify(risk_assessment)
        
    except Exception as e:
        logger.error(f"Error in risk assessment: {str(e)}")
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/security/sentiment/<int:bid_id>', methods=['GET'])
def get_bid_sentiment(bid_id):
    """
    Get sentiment analysis for a specific vendor bid.
    This endpoint analyzes the sentiment and language patterns in the bid.
    """
    try:
        # Run sentiment analysis
        sentiment_results = analyze_bid_sentiment(bid_id, db.session)
        
        if not sentiment_results.get("success", False):
            return jsonify({"error": sentiment_results.get("message", "Unknown error")}), 500
            
        return jsonify(sentiment_results)
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500
