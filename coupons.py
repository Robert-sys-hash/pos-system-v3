
@coupons_bp.route('/coupons/historia', methods=['GET'])
def get_all_coupons_history():
    \"\"\"Pobierz historię wszystkich kuponów\"\"\"
    try:
        query = \"\"\"
        SELECT id, kod, wartosc, data_waznosci, status,
               data_utworzenia, data_wykorzystania, numer_telefonu, location_id
        FROM kupony
        ORDER BY data_utworzenia DESC
        \"\"\"
        
        result = execute_query(query)
        if result is None:
            return error_response('Błąd pobierania historii kuponów', 500)
        
        return success_response(result, f'Historia kuponów pobrana pomyślnie. Znaleziono {len(result)} kuponów.')
        
    except Exception as e:
        print(f'Błąd pobierania historii kuponów: {str(e)}')
        return error_response('Błąd pobierania historii kuponów', 500)
