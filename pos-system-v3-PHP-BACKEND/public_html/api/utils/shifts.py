from utils.database import execute_query

def get_current_shift(cashier=None):
    """
    Pobiera aktualnie otwartą zmianę dla danego kasjera
    """
    try:
        if cashier:
            shifts_sql = """
                SELECT * FROM shifts 
                WHERE cashier = ? AND end_time IS NULL
                ORDER BY start_time DESC 
                LIMIT 1
            """
            shifts = execute_query(shifts_sql, (cashier,))
        else:
            shifts_sql = """
                SELECT * FROM shifts 
                WHERE end_time IS NULL
                ORDER BY start_time DESC 
                LIMIT 1
            """
            shifts = execute_query(shifts_sql)
        
        return shifts[0] if shifts else None
        
    except Exception as e:
        print(f"Błąd sprawdzania zmiany: {e}")
        return None
