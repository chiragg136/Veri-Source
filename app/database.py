import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Create a Base class
class Base(DeclarativeBase):
    pass

# Create the SQLAlchemy extension
db = SQLAlchemy(model_class=Base)

def get_db():
    """Get database session."""
    return db.session

def init_db():
    """Initialize the database by creating all tables."""
    # Import models to register them with SQLAlchemy
    from app.models import document, government
    
    # Import human review models
    from app.models import review
    
    # In a Flask application context (will be done when app is created)
    if db.engine is not None:
        Base.metadata.create_all(bind=db.engine)
