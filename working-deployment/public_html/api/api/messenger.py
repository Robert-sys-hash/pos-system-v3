"""
API endpoint dla komunikatora pracowników (czat)
Obsługuje wiadomości między pracownikami, ogłoszenia, użytkowników online
"""

from flask import Blueprint, request, jsonify, session
from utils.database import execute_query, execute_insert, success_response, error_response, not_found_response
from datetime import datetime, timedelta
import json

messenger_bp = Blueprint('messenger', __name__)

@messenger_bp.route('/messages', methods=['GET'])
def get_messages():
    """
    Pobierz wiadomości czatu
    GET /api/messenger/messages?limit=50&offset=0&user_id=123
    """
    try:
        print(f"🔍 MESSENGER API: GET /messages - Request args: {dict(request.args)}")
        
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        user_login = request.args.get('user_login')  # Filtr dla prywatnych wiadomości
        debug = request.args.get('debug', 'unknown')
        
        print(f"📊 MESSENGER API: Params - limit: {limit}, offset: {offset}, user: {user_login}, debug: {debug}")
        
        # Buduj zapytanie SQL dla istniejącej struktury tabeli
        conditions = ["1=1"]
        params = []
        
        # Jeśli podano user_login, pokaż wiadomości dla tego użytkownika
        if user_login:
            conditions.append("(recipient_login = ? OR recipient_login IS NULL OR sender_login = ?)")
            params.extend([user_login, user_login])
        
        sql = f"""
        SELECT 
            id, sender_login as sender_id, sender_name, 
            recipient_login as recipient_id, recipient_name,
            message, is_urgent, is_broadcast, is_read,
            created_at, read_at
        FROM pos_messages 
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        
        print(f"🗄️  MESSENGER API: SQL: {sql}")
        print(f"🗄️  MESSENGER API: Params: {params}")
        
        messages = execute_query(sql, params)
        
        if messages is None:
            print("❌ MESSENGER API: Database query returned None")
            return error_response("Błąd pobierania wiadomości", 500)
        
        print(f"📦 MESSENGER API: Found {len(messages)} messages for {debug}")
        if messages:
            print(f"📝 MESSENGER API: Last message ID: {messages[-1]['id']}, Text: {messages[-1]['message'][:50]}")
        
        return success_response({
            'messages': messages or [],
            'total': len(messages or []),
            'limit': limit,
            'offset': offset
        }, f"Pobrano {len(messages or [])} wiadomości")
        
    except Exception as e:
        print(f"Błąd pobierania wiadomości: {e}")
        return error_response("Wystąpił błąd podczas pobierania wiadomości", 500)

@messenger_bp.route('/messages', methods=['POST'])
def send_message():
    """
    Wyślij wiadomość
    POST /api/messenger/messages
    """
    try:
        print("🔍 MESSENGER API: Sending message...")
        data = request.get_json()
        print(f"📦 MESSENGER API: Received data: {data}")
        
        if not data:
            return error_response("Brak danych JSON", 400)
        
        message = data.get('message', '').strip()
        recipient_login = data.get('recipient_login')
        recipient_name = data.get('recipient_name', '')
        is_urgent = data.get('is_urgent', False)
        is_broadcast = data.get('is_broadcast', False)
        
        print(f"📝 MESSENGER API: Parsed - message: '{message}', recipient: {recipient_login}, broadcast: {is_broadcast}")
        
        if not message:
            return error_response("Wiadomość nie może być pusta", 400)
        
        if len(message) > 1000:
            return error_response("Wiadomość jest za długa (max 1000 znaków)", 400)
        
        # Pobierz dane nadawcy z sesji lub ustaw domyślne
        sender_login = session.get('user_login', 'pos_user')
        sender_name = session.get('user_name', 'Pracownik POS')
        
        print(f"👤 MESSENGER API: Sender - login: {sender_login}, name: {sender_name}")
        
        # Jeśli to broadcast, wyczyść recipient
        if is_broadcast:
            recipient_login = None
            recipient_name = None
        
        # Wstaw wiadomość do bazy używając istniejącej struktury
        insert_sql = """
        INSERT INTO pos_messages 
        (sender_login, sender_name, recipient_login, recipient_name, message, 
         is_urgent, is_broadcast, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
        """
        
        params = (
            sender_login, sender_name, recipient_login, recipient_name,
            message, int(is_urgent), int(is_broadcast)
        )
        print(f"💾 MESSENGER API: Inserting with params: {params}")
        
        success = execute_insert(insert_sql, params)
        print(f"💾 MESSENGER API: Insert result: {success}")
        
        if success:
            print("✅ MESSENGER API: Message sent successfully")
            return success_response({
                'sender_login': sender_login,
                'sender_name': sender_name,
                'recipient_login': recipient_login,
                'recipient_name': recipient_name,
                'message': message,
                'is_urgent': is_urgent,
                'is_broadcast': is_broadcast,
                'created_at': datetime.now().isoformat()
            }, "Wiadomość wysłana pomyślnie")
        else:
            return error_response("Błąd wysyłania wiadomości", 500)
            
    except Exception as e:
        print(f"Błąd wysyłania wiadomości: {e}")
        return error_response("Wystąpił błąd podczas wysyłania wiadomości", 500)

@messenger_bp.route('/messages/<int:message_id>/read', methods=['PUT'])
def mark_message_read(message_id):
    """
    Oznacz wiadomość jako przeczytaną
    PUT /api/messenger/messages/123/read
    """
    try:
        user_login = session.get('user_login', 'pos_user')
        user_name = session.get('user_name', 'Pracownik POS')
        
        # Sprawdź czy wiadomość istnieje
        check_sql = "SELECT id, is_read FROM pos_messages WHERE id = ?"
        message = execute_query(check_sql, (message_id,))
        
        if not message:
            return not_found_response(f"Wiadomość o ID {message_id} nie została znaleziona")
        
        # Aktualizuj status przeczytania (używamy prostej boolean kolumny)
        update_sql = """
        UPDATE pos_messages 
        SET is_read = 1, read_at = datetime('now')
        WHERE id = ?
        """
        
        success = execute_insert(update_sql, (message_id,))
        
        if success:
            return success_response({
                'message_id': message_id,
                'marked_read_by': user_name,
                'read_at': datetime.now().isoformat()
            }, "Wiadomość oznaczona jako przeczytana")
        else:
            return error_response("Błąd oznaczania wiadomości", 500)
            
    except Exception as e:
        print(f"Błąd oznaczania wiadomości: {e}")
        return error_response("Wystąpił błąd podczas oznaczania wiadomości", 500)

@messenger_bp.route('/users/online', methods=['GET'])
def get_online_users():
    """
    Pobierz listę użytkowników online
    GET /api/messenger/users/online
    """
    try:
        # Usuń starych użytkowników (offline dłużej niż 5 minut)
        cleanup_sql = "DELETE FROM pos_users_online WHERE datetime(last_seen) < datetime('now', '-5 minutes')"
        execute_insert(cleanup_sql, ())
        
        # Pobierz aktualnych użytkowników online
        sql = """
        SELECT user_id, user_name, last_seen, status
        FROM pos_users_online
        ORDER BY user_name
        """
        
        users = execute_query(sql, ())
        
        if users is None:
            return error_response("Błąd pobierania użytkowników online", 500)
        
        return success_response({
            'users': users or [],
            'total': len(users or [])
        }, f"Znaleziono {len(users or [])} użytkowników online")
        
    except Exception as e:
        print(f"Błąd pobierania użytkowników online: {e}")
        return error_response("Wystąpił błąd podczas pobierania użytkowników", 500)

@messenger_bp.route('/users/online', methods=['POST'])
def update_user_status():
    """
    Aktualizuj status użytkownika (heartbeat)
    POST /api/messenger/users/online
    Body: {"status": "online|away|busy"}
    """
    try:
        data = request.get_json()
        status = data.get('status', 'online') if data else 'online'
        
        user_id = session.get('user_id', 1)
        user_name = session.get('user_name', 'Pracownik POS')
        
        # Wstaw lub aktualizuj status użytkownika
        upsert_sql = """
        INSERT OR REPLACE INTO pos_users_online 
        (user_id, user_name, last_seen, status)
        VALUES (?, ?, datetime('now'), ?)
        """
        
        success = execute_insert(upsert_sql, (user_id, user_name, status))
        
        if success:
            return success_response({
                'user_id': user_id,
                'user_name': user_name,
                'status': status,
                'last_seen': datetime.now().isoformat()
            }, "Status użytkownika zaktualizowany")
        else:
            return error_response("Błąd aktualizacji statusu", 500)
            
    except Exception as e:
        print(f"Błąd aktualizacji statusu: {e}")
        return error_response("Wystąpił błąd podczas aktualizacji statusu", 500)

@messenger_bp.route('/broadcast', methods=['POST'])
def send_broadcast():
    """
    Wyślij ogłoszenie do wszystkich
    POST /api/messenger/broadcast
    Body: {"message": "Treść ogłoszenia", "is_urgent": true}
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("Brak danych JSON", 400)
        
        message = data.get('message', '').strip()
        is_urgent = data.get('is_urgent', False)
        
        if not message:
            return error_response("Ogłoszenie nie może być puste", 400)
        
        if len(message) > 1000:
            return error_response("Ogłoszenie jest za długie (max 1000 znaków)", 400)
        
        sender_login = session.get('user_login', 'pos_admin')
        sender_name = session.get('user_name', 'Kierownik POS')
        
        # Wstaw ogłoszenie jako broadcast
        insert_sql = """
        INSERT INTO pos_messages 
        (sender_login, sender_name, recipient_login, recipient_name, message, 
         is_urgent, is_broadcast, is_read, created_at)
        VALUES (?, ?, NULL, NULL, ?, ?, 1, 0, datetime('now'))
        """
        
        success = execute_insert(insert_sql, (
            sender_login, sender_name, message, int(is_urgent)
        ))
        
        if success:
            return success_response({
                'sender_login': sender_login,
                'sender_name': sender_name,
                'message': message,
                'is_urgent': is_urgent,
                'is_broadcast': True,
                'created_at': datetime.now().isoformat()
            }, "Ogłoszenie wysłane do wszystkich")
        else:
            return error_response("Błąd wysyłania ogłoszenia", 500)
            
    except Exception as e:
        print(f"Błąd wysyłania ogłoszenia: {e}")
        return error_response("Wystąpił błąd podczas wysyłania ogłoszenia", 500)

@messenger_bp.route('/stats', methods=['GET'])
def get_messenger_stats():
    """
    Pobierz statystyki komunikatora
    GET /api/messenger/stats
    """
    try:
        # Statystyki wiadomości
        stats = {}
        
        # Liczba wiadomości dzisiaj
        today_sql = """
        SELECT COUNT(*) as count 
        FROM pos_messages 
        WHERE date(created_at) = date('now')
        """
        today_result = execute_query(today_sql, ())
        stats['messages_today'] = today_result[0]['count'] if today_result else 0
        
        # Liczba nieprzeczytanych wiadomości
        user_login = session.get('user_login', 'pos_user')
        unread_sql = """
        SELECT COUNT(*) as count 
        FROM pos_messages 
        WHERE (recipient_login = ? OR recipient_login IS NULL)
        AND is_read = 0
        """
        unread_result = execute_query(unread_sql, (user_login,))
        stats['unread_messages'] = unread_result[0]['count'] if unread_result else 0
        
        # Liczba użytkowników online
        online_sql = """
        SELECT COUNT(*) as count 
        FROM pos_users_online 
        WHERE datetime(last_seen) > datetime('now', '-5 minutes')
        """
        online_result = execute_query(online_sql, ())
        stats['users_online'] = online_result[0]['count'] if online_result else 0
        
        # Ostatnie ogłoszenia (3 najnowsze)
        broadcasts_sql = """
        SELECT sender_name, message, created_at, is_urgent
        FROM pos_messages 
        WHERE is_broadcast = 1
        ORDER BY created_at DESC
        LIMIT 3
        """
        broadcasts = execute_query(broadcasts_sql, ())
        stats['recent_broadcasts'] = broadcasts or []
        
        return success_response(stats, "Statystyki komunikatora")
        
    except Exception as e:
        print(f"Błąd pobierania statystyk: {e}")
        return error_response("Wystąpił błąd podczas pobierania statystyk", 500)

@messenger_bp.route('/cleanup', methods=['POST'])
def cleanup_old_messages():
    """
    Wyczyść stare wiadomości
    POST /api/messenger/cleanup
    Body: {"days": 30}
    """
    try:
        data = request.get_json()
        days = data.get('days', 30) if data else 30
        
        if days < 1:
            return error_response("Liczba dni musi być większa od 0", 400)
        
        # Usuń wiadomości starsze niż X dni
        cleanup_sql = f"""
        DELETE FROM pos_messages 
        WHERE datetime(created_at) < datetime('now', '-{days} days')
        """
        
        success = execute_insert(cleanup_sql, ())
        
        if success:
            # Policz ile zostało wiadomości
            count_sql = "SELECT COUNT(*) as count FROM pos_messages"
            count_result = execute_query(count_sql, ())
            remaining = count_result[0]['count'] if count_result else 0
            
            return success_response({
                'cleaned_days': days,
                'remaining_messages': remaining
            }, f"Wyczyszczono wiadomości starsze niż {days} dni")
        else:
            return error_response("Błąd czyszczenia wiadomości", 500)
            
    except Exception as e:
        print(f"Błąd czyszczenia wiadomości: {e}")
        return error_response("Wystąpił błąd podczas czyszczenia", 500)

@messenger_bp.route('/messages/mark-all-read', methods=['PUT'])
def mark_all_messages_read():
    """
    Oznacz wszystkie wiadomości jako przeczytane dla bieżącego użytkownika
    PUT /api/messenger/messages/mark-all-read
    """
    try:
        user_login = session.get('user_login', 'pos_user')
        user_name = session.get('user_name', 'Pracownik POS')
        
        print(f"🔄 MESSENGER API: Marking all messages as read for user: {user_login}")
        
        # Oznacz wszystkie nieprzeczytane wiadomości jako przeczytane
        # (wiadomości adresowane do użytkownika lub broadcasta)
        update_sql = """
        UPDATE pos_messages 
        SET is_read = 1, read_at = datetime('now')
        WHERE (recipient_login = ? OR recipient_login IS NULL)
        AND is_read = 0
        """
        
        success = execute_insert(update_sql, (user_login,))
        
        if success:
            # Sprawdź ile wiadomości zostało oznaczonych
            count_sql = """
            SELECT COUNT(*) as count 
            FROM pos_messages 
            WHERE (recipient_login = ? OR recipient_login IS NULL)
            AND is_read = 0
            """
            remaining_result = execute_query(count_sql, (user_login,))
            remaining_unread = remaining_result[0]['count'] if remaining_result else 0
            
            print(f"✅ MESSENGER API: All messages marked as read for {user_login}")
            
            return success_response({
                'marked_read_by': user_name,
                'user_login': user_login,
                'remaining_unread': remaining_unread,
                'read_at': datetime.now().isoformat()
            }, "Wszystkie wiadomości oznaczone jako przeczytane")
        else:
            return error_response("Błąd oznaczania wiadomości", 500)
            
    except Exception as e:
        print(f"Błąd oznaczania wszystkich wiadomości: {e}")
        return error_response("Wystąpił błąd podczas oznaczania wiadomości", 500)
