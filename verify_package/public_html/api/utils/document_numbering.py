"""
Helper funkcje do generowania numerów dokumentów
"""

from utils.database import execute_query, execute_insert
from datetime import datetime


def generate_document_number(document_type, warehouse_id='M001'):
    """
    Generuje następny numer dokumentu według zdefiniowanego formatu
    
    Args:
        document_type (str): Typ dokumentu (np. 'paragon', 'faktura')
        warehouse_id (str): ID magazynu (domyślnie 'M001')
    
    Returns:
        str: Wygenerowany numer dokumentu lub None w przypadku błędu
    """
    try:
        # Pobierz definicję dokumentu
        query = """
        SELECT id, symbol, current_number, format_template
        FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(query, (document_type,))
        
        if not definition:
            print(f"⚠️ Nie znaleziono definicji dla typu dokumentu: {document_type}")
            return None
        
        definition = definition[0]
        
        # Pobierz aktualną datę
        now = datetime.now()
        month = f"{now.month:02d}"
        year = str(now.year)
        
        # Wygeneruj numer dokumentu
        current_number = definition['current_number']
        format_template = definition['format_template']
        
        # Zamień placeholdery na rzeczywiste wartości
        document_number = format_template.format(
            number=current_number,
            month=month,
            year=year,
            warehouse=warehouse_id
        )
        
        # Zaktualizuj licznik w bazie danych
        update_query = """
        UPDATE document_definitions 
        SET current_number = current_number + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """
        execute_insert(update_query, (definition['id'],))
        
        print(f"✅ Wygenerowany numer dokumentu: {document_number}")
        return document_number
        
    except Exception as e:
        print(f"❌ Błąd generowania numeru dokumentu: {e}")
        return None


def preview_document_number(document_type, warehouse_id='M001', test_number=None):
    """
    Podgląd numeru dokumentu bez aktualizacji licznika
    
    Args:
        document_type (str): Typ dokumentu
        warehouse_id (str): ID magazynu
        test_number (int): Opcjonalny numer do testowania
    
    Returns:
        dict: Informacje o podglądzie numeru
    """
    try:
        # Pobierz definicję dokumentu
        query = """
        SELECT symbol, current_number, format_template
        FROM document_definitions 
        WHERE document_type = ? AND active = 1
        LIMIT 1
        """
        
        definition = execute_query(query, (document_type,))
        
        if not definition:
            return None
        
        definition = definition[0]
        
        # Pobierz aktualną datę
        now = datetime.now()
        month = f"{now.month:02d}"
        year = str(now.year)
        
        # Użyj numeru testowego lub aktualnego
        number_to_use = test_number if test_number is not None else definition['current_number']
        format_template = definition['format_template']
        
        # Wygeneruj podgląd numeru dokumentu
        preview_number = format_template.format(
            number=number_to_use,
            month=month,
            year=year,
            warehouse=warehouse_id
        )
        
        return {
            'preview_number': preview_number,
            'format_template': format_template,
            'current_number': definition['current_number'],
            'month': month,
            'year': year,
            'warehouse': warehouse_id
        }
        
    except Exception as e:
        print(f"❌ Błąd podglądu numeru dokumentu: {e}")
        return None


def reset_document_counter(document_type, new_number=1):
    """
    Resetuje licznik dla danego typu dokumentu
    
    Args:
        document_type (str): Typ dokumentu
        new_number (int): Nowy numer początkowy (domyślnie 1)
    
    Returns:
        bool: True jeśli operacja się powiodła
    """
    try:
        update_query = """
        UPDATE document_definitions 
        SET current_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE document_type = ? AND active = 1
        """
        
        result = execute_insert(update_query, (new_number, document_type))
        
        print(f"✅ Zresetowano licznik dla {document_type} na {new_number}")
        return True
        
    except Exception as e:
        print(f"❌ Błąd resetowania licznika: {e}")
        return False
