import os
import logging
from flask import Flask
from flask_cors import CORS

from app.database import db, init_db
from app.config import settings

def create_app():
    app = Flask(__name__)
    
    # Configure the app
    app.config['SECRET_KEY'] = settings.SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = settings.DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = settings.UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = settings.MAX_CONTENT_LENGTH
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Configure CORS
    CORS(app)
    
    # Initialize database
    db.init_app(app)
    with app.app_context():
        init_db()
    
    # Register template filters
    from app.utils.template_filters import register_filters
    register_filters(app)
    
    # Import and register blueprints
    from app.api.routes import main_bp, router
    from app.api.human_review_routes import human_review_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(router)
    app.register_blueprint(human_review_bp, url_prefix='/review')
    
    return app
