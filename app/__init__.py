import os
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
    
    # Configure CORS
    CORS(app)
    
    # Initialize database
    db.init_app(app)
    with app.app_context():
        init_db()
    
    # Import and register blueprints
    from app.api.routes import main_bp
    app.register_blueprint(main_bp)
    
    return app
