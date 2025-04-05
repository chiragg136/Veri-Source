import logging
import os
from app import create_app

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = create_app()

if __name__ == "__main__":
    logger.info("Starting UniSphere Procurement Analysis System")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
