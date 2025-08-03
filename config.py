import os
from urllib.parse import urlparse

class Config:
    """Base configuration class."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    
    # Database settings
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL:
        # Parse the database URL
        url = urlparse(DATABASE_URL)
        
        # PostgreSQL configuration
        if url.scheme.startswith('postgres'):
            SQLALCHEMY_DATABASE_URI = DATABASE_URL
            SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_recycle': 300,
                'pool_pre_ping': True,
                'pool_size': 10,
                'max_overflow': 20
            }
        else:
            SQLALCHEMY_DATABASE_URI = DATABASE_URL
            SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        # SQLite fallback for local development
        basedir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "tasks.db")}'
        SQLALCHEMY_ENGINE_OPTIONS = {}
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    
    # Enhanced security for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 20,
        'max_overflow': 30,
        'echo': False
    }

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}