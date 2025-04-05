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
    from app.services.chatbot import get_chatbot_service
    
    data = request.json
    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400
    
    user_message = data.get("message", "")
    rfp_id = data.get("rfp_id")
    bid_id = data.get("bid_id")
    chat_history = data.get("chat_history", [])
    
    # Get chatbot service
    chatbot_service = get_chatbot_service()
    
    # Get response from chatbot service
    response = chatbot_service.get_response(
        user_query=user_message,
        rfp_id=rfp_id,
        bid_id=bid_id,
        chat_history=chat_history
    )
    
    # Create diagnostic info for troubleshooting
    provider_info = {
        "provider": response.get("provider", "unknown"),
        "success": response.get("success", False)
    }
    
    # Return response with provider info
    return jsonify({
        "response": response.get("message", "Sorry, I'm having trouble answering that right now."),
        "provider_info": provider_info
    })

# Security Assessment API
@main_bp.route('/api/security/assessment/<int:bid_id>', methods=['GET'])
def security_assessment(bid_id):
    """
    Assess a vendor bid against security requirements from the RFP.
    This endpoint evaluates compliance with security frameworks and requirements.
    """
    try:
        bid = db.session.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            return jsonify({"error": "Bid not found"}), 404
        
        rfp = db.session.query(RFPDocument).filter(RFPDocument.id == bid.rfp_id).first()
        if not rfp:
            return jsonify({"error": "Associated RFP not found"}), 404
        
        # Get security compliance data
        compliance_results = assess_security_compliance(bid_id, db.session)
        
        return jsonify({
            "bid_id": bid_id,
            "vendor_name": bid.vendor_name,
            "rfp_id": bid.rfp_id,
            "rfp_title": rfp.title,
            "assessment_date": compliance_results.get("assessment_date"),
            "overall_compliance": compliance_results.get("overall_compliance"),
            "framework_compliance": compliance_results.get("framework_compliance"),
            "security_requirements": compliance_results.get("security_requirements"),
            "recommendations": compliance_results.get("recommendations")
        })
        
    except Exception as e:
        logger.exception("Error performing security assessment")
        return jsonify({"error": str(e)}), 500

# Bid Risk Assessment API
@main_bp.route('/api/risk/assessment/<int:bid_id>', methods=['GET'])
def get_bid_risks(bid_id):
    """
    Get risk assessment for a specific vendor bid.
    This endpoint analyzes potential risks associated with a vendor bid.
    """
    try:
        bid = db.session.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            return jsonify({"error": "Bid not found"}), 404
        
        # Get risk prediction data
        risk_assessment = predict_bid_risks(bid_id, db.session)
        
        return jsonify({
            "bid_id": bid_id,
            "vendor_name": bid.vendor_name,
            "assessment_date": risk_assessment.get("assessment_date"),
            "overall_risk_score": risk_assessment.get("overall_risk_score"),
            "risk_categories": risk_assessment.get("risk_categories"),
            "high_risk_areas": risk_assessment.get("high_risk_areas"),
            "medium_risk_areas": risk_assessment.get("medium_risk_areas"),
            "low_risk_areas": risk_assessment.get("low_risk_areas"),
            "recommendations": risk_assessment.get("recommendations")
        })
        
    except Exception as e:
        logger.exception("Error performing risk assessment")
        return jsonify({"error": str(e)}), 500

# Bid Sentiment Analysis API
@main_bp.route('/api/sentiment/analysis/<int:bid_id>', methods=['GET'])
def get_bid_sentiment(bid_id):
    """
    Get sentiment analysis for a specific vendor bid.
    This endpoint analyzes the sentiment and language patterns in the bid.
    """
    try:
        bid = db.session.query(VendorBid).filter(VendorBid.id == bid_id).first()
        if not bid:
            return jsonify({"error": "Bid not found"}), 404
        
        # Get sentiment analysis data
        sentiment_analysis = analyze_bid_sentiment(bid_id, db.session)
        
        return jsonify({
            "bid_id": bid_id,
            "vendor_name": bid.vendor_name,
            "analysis_date": sentiment_analysis.get("analysis_date"),
            "overall_sentiment": sentiment_analysis.get("overall_sentiment"),
            "confidence_score": sentiment_analysis.get("confidence_score"),
            "sentiment_categories": sentiment_analysis.get("sentiment_categories"),
            "language_patterns": sentiment_analysis.get("language_patterns"),
            "key_phrases": sentiment_analysis.get("key_phrases"),
            "commitment_indicators": sentiment_analysis.get("commitment_indicators")
        })
        
    except Exception as e:
        logger.exception("Error performing sentiment analysis")
        return jsonify({"error": str(e)}), 500

# Comprehensive Report Generation API
@main_bp.route('/api/reports/infographic/<int:rfp_id>', methods=['GET'])
def generate_infographic_report(rfp_id):
    """
    Generate a comprehensive infographic-style summary report for an RFP and its bids.
    This endpoint consolidates data from multiple sources to create a one-click report.
    """
    try:
        rfp = db.session.query(RFPDocument).filter(RFPDocument.id == rfp_id).first()
        if not rfp:
            return jsonify({"error": "RFP not found"}), 404
        
        # Get all bids for the RFP
        bids = db.session.query(VendorBid).filter(VendorBid.rfp_id == rfp_id).all()
        if not bids:
            return jsonify({"message": "No bids found for this RFP"}), 404
        
        # Get requirements and specs
        requirements = db.session.query(Requirement).filter(Requirement.rfp_id == rfp_id).all()
        tech_specs = db.session.query(TechnicalSpecification).filter(TechnicalSpecification.rfp_id == rfp_id).all()
        
        # Analyze bids and compile report data
        bid_data = []
        for bid in bids:
            # Get analysis results
            analysis = db.session.query(AnalysisResult).filter(AnalysisResult.bid_id == bid.id).first()
            
            # Get security compliance
            security_compliances = db.session.query(BidSecurityCompliance).filter(BidSecurityCompliance.bid_id == bid.id).all()
            security_score = sum([c.compliance_score for c in security_compliances]) / len(security_compliances) if security_compliances else 0
            
            # Get sentiment analysis data
            sentiment_analysis = analyze_bid_sentiment(bid.id, db.session)
            
            # Get risk assessment data
            risk_assessment = predict_bid_risks(bid.id, db.session)
            
            # Compile bid data for report
            bid_report_data = {
                "id": bid.id,
                "vendor_name": bid.vendor_name,
                "submission_date": bid.submission_date,
                "total_score": bid.total_score,
                "requirement_compliance": analysis.requirement_compliance if analysis else {},
                "technical_compliance": analysis.technical_compliance if analysis else {},
                "strengths": analysis.strengths if analysis else [],
                "weaknesses": analysis.weaknesses if analysis else [],
                "gap_analysis": analysis.gap_analysis if analysis else [],
                "security_score": security_score,
                "sentiment_score": sentiment_analysis.get("overall_sentiment", 0),
                "risk_score": risk_assessment.get("overall_risk_score", 0)
            }
            
            bid_data.append(bid_report_data)
        
        # Generate report sections
        report_sections = {
            "overview": {
                "rfp_title": rfp.title,
                "agency": rfp.agency,
                "project_id": rfp.project_id,
                "total_bids": len(bids),
                "requirement_count": len(requirements),
                "tech_spec_count": len(tech_specs)
            },
            "requirements_summary": {
                "categories": {},
                "priority_breakdown": {
                    "high": 0,
                    "medium": 0,
                    "low": 0
                }
            },
            "vendor_comparison": {
                "scores": [],
                "compliance_by_category": {}
            },
            "security_compliance": {
                "vendors": [],
                "frameworks": {}
            },
            "risk_assessment": {
                "vendors": [],
                "risk_categories": {}
            },
            "sentiment_analysis": {
                "vendors": [],
                "categories": {}
            },
            "recommendation": {
                "top_vendors": [],
                "key_considerations": []
            }
        }
        
        # Process requirements data
        for req in requirements:
            # Add category if not exists
            if req.category not in report_sections["requirements_summary"]["categories"]:
                report_sections["requirements_summary"]["categories"][req.category] = 0
            
            # Increment category count
            report_sections["requirements_summary"]["categories"][req.category] += 1
            
            # Update priority breakdown
            if req.priority and "high" in req.priority.lower():
                report_sections["requirements_summary"]["priority_breakdown"]["high"] += 1
            elif req.priority and "medium" in req.priority.lower():
                report_sections["requirements_summary"]["priority_breakdown"]["medium"] += 1
            else:
                report_sections["requirements_summary"]["priority_breakdown"]["low"] += 1
        
        # Process vendor data for comparison
        for bid in bid_data:
            # Add vendor score
            report_sections["vendor_comparison"]["scores"].append({
                "vendor": bid["vendor_name"],
                "score": bid["total_score"] or 0
            })
            
            # Add vendor to security compliance
            report_sections["security_compliance"]["vendors"].append({
                "vendor": bid["vendor_name"],
                "score": bid["security_score"]
            })
            
            # Add vendor to risk assessment
            report_sections["risk_assessment"]["vendors"].append({
                "vendor": bid["vendor_name"],
                "score": bid["risk_score"]
            })
            
            # Add vendor to sentiment analysis
            report_sections["sentiment_analysis"]["vendors"].append({
                "vendor": bid["vendor_name"],
                "score": bid["sentiment_score"]
            })
        
        # Sort vendors by score for recommendation
        sorted_vendors = sorted(bid_data, key=lambda x: (x["total_score"] or 0) * 0.5 + (x["security_score"] or 0) * 0.3 - (x["risk_score"] or 0) * 0.2, reverse=True)
        
        for vendor in sorted_vendors[:3]:  # Top 3 vendors
            key_strengths = vendor["strengths"][:3] if vendor["strengths"] and isinstance(vendor["strengths"], list) else []
            
            report_sections["recommendation"]["top_vendors"].append({
                "vendor": vendor["vendor_name"],
                "overall_score": vendor["total_score"],
                "security_score": vendor["security_score"],
                "risk_score": vendor["risk_score"],
                "key_strengths": key_strengths
            })
        
        # Generate key considerations
        report_sections["recommendation"]["key_considerations"] = [
            "Ensure all mandatory requirements are fully met by the selected vendor",
            "Verify security compliance with agency-specific frameworks",
            "Consider risk factors in addition to overall scores",
            "Evaluate vendor track record with similar projects"
        ]
        
        return jsonify({"report": report_sections}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create router for API endpoints
router = Blueprint('api', __name__, url_prefix='/api')

# Register API routes
router.route('/chatbot', methods=['POST'])(chatbot)
router.route('/security/assessment/<int:bid_id>', methods=['GET'])(security_assessment)
router.route('/risk/assessment/<int:bid_id>', methods=['GET'])(get_bid_risks)
router.route('/sentiment/analysis/<int:bid_id>', methods=['GET'])(get_bid_sentiment)
router.route('/reports/infographic/<int:rfp_id>', methods=['GET'])(generate_infographic_report)

# Register other API routes from main_bp to router
router.route('/upload/rfp', methods=['POST'])(upload_rfp)
router.route('/upload/bid', methods=['POST'])(upload_bid)
router.route('/rfp/<int:rfp_id>', methods=['GET'])(get_rfp)
router.route('/bid/<int:bid_id>', methods=['GET'])(get_bid)
router.route('/rfp/<int:rfp_id>/bids', methods=['GET'])(get_rfp_bids)
router.route('/reports/comparison/<int:rfp_id>', methods=['GET'])(get_bid_comparison)
