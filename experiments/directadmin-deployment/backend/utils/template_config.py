"""
Konfiguracja szablonów faktur
Pozwala na łatwe dostosowanie wyglądu bez edytowania kodu
"""

TEMPLATES_CONFIG = {
    'classic': {
        'name': 'Klasyczny',
        'description': 'Tradycyjny szablon faktury z prostym układem',
        'settings': {
            'font_name': 'Helvetica',
            'font_sizes': {
                'title': 20,
                'section': 14,
                'normal': 10,
                'small': 8,
                'table': 9
            },
            'colors': {
                'header_bg': '#f0f0f0',
                'border': '#000000',
                'text': '#000000',
                'accent': '#000080'
            },
            'margins': {
                'top': 20,  # mm
                'bottom': 20,
                'left': 20,
                'right': 20
            },
            'table_column_widths': {
                'lp': 5,      # mm
                'nazwa': 85,   # mm
                'ilosc': 7,
                'jednostka': 7,
                'cena': 12,
                'stawka': 7,
                'netto': 12,
                'vat': 12,
                'brutto': 15
            }
        }
    },
    
    'modern': {
        'name': 'Nowoczesny',
        'description': 'Stylowy szablon z kolorowym nagłówkiem',
        'settings': {
            'font_name': 'Helvetica',
            'font_sizes': {
                'title': 18,
                'section': 12,
                'normal': 9,
                'small': 8,
                'table': 9
            },
            'colors': {
                'header_bg': '#e6f3ff',
                'border': '#cccccc',
                'text': '#333333',
                'accent': '#006400'
            },
            'margins': {
                'top': 15,
                'bottom': 15,
                'left': 15,
                'right': 15
            },
            'table_column_widths': {
                'lp': 10,
                'nazwa': 80,
                'ilosc': 20,
                'cena': 25,
                'stawka': 15,
                'wartosc': 20
            }
        }
    },
    
    'minimal': {
        'name': 'Minimalistyczny',
        'description': 'Czysty, nowoczesny design bez zbędnych elementów',
        'settings': {
            'font_name': 'Helvetica',
            'font_sizes': {
                'title': 16,
                'section': 11,
                'normal': 9,
                'small': 7,
                'table': 8
            },
            'colors': {
                'header_bg': '#ffffff',
                'border': '#dddddd',
                'text': '#444444',
                'accent': '#2c3e50'
            },
            'margins': {
                'top': 25,
                'bottom': 25,
                'left': 25,
                'right': 25
            }
        }
    }
}

# Domyślny szablon
DEFAULT_TEMPLATE = 'classic'

# Ustawienia specyficzne dla firmy
COMPANY_SETTINGS = {
    'logo_path': None,  # Ścieżka do logo firmy
    'show_logo': False,
    'signature_line': True,
    'footer_text': None,
    'custom_fields': [],  # Dodatkowe pola na fakturze
    'date_format': '%d.%m.%Y',
    'currency': 'PLN',
    'language': 'pl'
}

# Ustawienia eksportu
EXPORT_SETTINGS = {
    'default_filename': 'faktura_{numer}_{data}',
    'compress_pdf': False,
    'embed_fonts': True,
    'pdf_version': '1.4'
}

def get_template_config(template_name):
    """Pobiera konfigurację szablonu"""
    return TEMPLATES_CONFIG.get(template_name, TEMPLATES_CONFIG[DEFAULT_TEMPLATE])

def get_all_templates():
    """Zwraca listę wszystkich dostępnych szablonów"""
    return {
        name: config['name'] 
        for name, config in TEMPLATES_CONFIG.items()
    }

def validate_template_config(config):
    """Waliduje konfigurację szablonu"""
    required_keys = ['name', 'settings']
    return all(key in config for key in required_keys)
