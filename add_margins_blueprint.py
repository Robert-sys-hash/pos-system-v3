#!/usr/bin/env python3
"""
Skrypt do dodania margins_bp blueprint do app.py na produkcji
"""

# Fragment kodu do dodania po fiscal_bp blueprint
margins_blueprint_code = """
    # Dodaj blueprint marży
    try:
        from api.margins import margins_bp
        app.register_blueprint(margins_bp, url_prefix='/api')
        print("✅ Margins blueprint OK")
    except Exception as e:
        print(f"❌ Błąd margins blueprint: {e}")
"""

print("Fragment kodu margins_bp do dodania:")
print(margins_blueprint_code)
