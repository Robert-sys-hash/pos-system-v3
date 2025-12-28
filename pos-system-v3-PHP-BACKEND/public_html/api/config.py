"""
Konfiguracja dla różnych środowisk aplikacji
"""
import os

class Config:
    """Bazowa konfiguracja"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-2024'
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'kupony.db'))

class DevelopmentConfig(Config):
    """Konfiguracja dla środowiska deweloperskiego"""
    DEBUG = True
    CORS_ORIGINS = [
        'http://localhost:3002', 
        'http://localhost:5002', 
        'http://127.0.0.1:3002', 
        'http://127.0.0.1:5002'
    ]

class ProductionConfig(Config):
    """Konfiguracja dla środowiska produkcyjnego"""
    DEBUG = False
    CORS_ORIGINS = []  # Zostanie ustawione dynamicznie na podstawie domeny
    
    def __init__(self, domain=None):
        super().__init__()
        if domain:
            self.CORS_ORIGINS = [
                f'https://{domain}',
                f'http://{domain}',
                f'https://www.{domain}',
                f'http://www.{domain}'
            ]

class DirectAdminConfig(Config):
    """Konfiguracja dla DirectAdmin"""
    DEBUG = False
    CORS_ORIGINS = [
        'http://panelv3.pl',
        'https://panelv3.pl',
        'http://www.panelv3.pl',
        'https://www.panelv3.pl'
    ]

# Mapa konfiguracji
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'directadmin': DirectAdminConfig,
    'default': DevelopmentConfig
}
