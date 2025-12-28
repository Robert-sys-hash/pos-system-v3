"""
Manager konfiguracji drukarki fiskalnej
Umożliwia zapisywanie i ładowanie konfiguracji do pliku
"""

import json
import os
from typing import Dict, Any

# Ścieżka do pliku konfiguracji
CONFIG_FILE_PATH = os.path.join(os.path.dirname(__file__), 'runtime_config.json')

def load_runtime_config() -> Dict[str, Any]:
    """
    Ładuje konfigurację runtime z pliku
    
    Returns:
        Dict: Konfiguracja runtime
    """
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Błąd ładowania konfiguracji runtime: {e}")
    
    # Domyślna konfiguracja
    return {
        'test_mode': False,
        'last_updated': None
    }

def save_runtime_config(config: Dict[str, Any]) -> bool:
    """
    Zapisuje konfigurację runtime do pliku
    
    Args:
        config: Konfiguracja do zapisania
        
    Returns:
        bool: True jeśli zapis udany
    """
    try:
        from datetime import datetime
        config['last_updated'] = datetime.now().isoformat()
        
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Błąd zapisywania konfiguracji runtime: {e}")
        return False

def update_test_mode(enabled: bool) -> bool:
    """
    Aktualizuje status trybu testowego
    
    Args:
        enabled: Czy tryb testowy ma być włączony
        
    Returns:
        bool: True jeśli aktualizacja udana
    """
    config = load_runtime_config()
    config['test_mode'] = enabled
    return save_runtime_config(config)

def get_test_mode_status() -> bool:
    """
    Pobiera status trybu testowego
    
    Returns:
        bool: True jeśli tryb testowy włączony
    """
    config = load_runtime_config()
    return config.get('test_mode', False)
