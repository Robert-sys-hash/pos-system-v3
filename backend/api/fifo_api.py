"""
API dla zarządzania systemem FIFO
=================================

Endpointy do:
1. Zarządzania partiami produktów
2. Alokacji FIFO/FEFO 
3. Monitorowania stanów i dat ważności
4. Raportowania partii wygasających
"""

from flask import Blueprint, request, jsonify
from api.fifo_service import fifo_service, ProductBatch, AllocationRequest
from utils.response_helpers import success_response, error_response
from datetime import datetime, date
import traceback
import logging

fifo_bp = Blueprint('fifo', __name__)

@fifo_bp.route('/fifo/batches', methods=['GET'])
def get_batches():
    """Pobiera listę partii z opcjonalnymi filtrami"""
    try:
        product_id = request.args.get('product_id', type=int)
        warehouse_id = request.args.get('warehouse_id', type=int)
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        if not product_id or not warehouse_id:
            return error_response("Wymagane parametry: product_id, warehouse_id", 400)
        
        batches = fifo_service.get_product_batches(
            product_id=product_id,
            warehouse_id=warehouse_id, 
            active_only=active_only
        )
        
        return success_response(batches, f"Pobrano {len(batches)} partii")
        
    except Exception as e:
        logging.error(f"Błąd pobierania partii: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/batches', methods=['POST'])
def create_batch():
    """Tworzy nową partię produktu"""
    try:
        data = request.get_json()
        
        # Walidacja wymaganych pól
        required_fields = ['product_id', 'warehouse_id', 'initial_quantity', 'purchase_price_net']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brakuje wymaganego pola: {field}", 400)
        
        # Parsowanie daty ważności jeśli podana
        expiry_date = None
        if 'expiry_date' in data and data['expiry_date']:
            try:
                expiry_date = data['expiry_date']
                # Sprawdź format daty
                datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
            except ValueError:
                return error_response("Nieprawidłowy format daty ważności (użyj ISO format)", 400)
        
        # Utwórz obiekt partii
        batch = ProductBatch(
            product_id=data['product_id'],
            warehouse_id=data['warehouse_id'],
            received_date=data.get('received_date', datetime.now().isoformat()),
            expiry_date=expiry_date,
            supplier_id=data.get('supplier_id'),
            purchase_invoice_id=data.get('purchase_invoice_id'),
            initial_quantity=float(data['initial_quantity']),
            current_quantity=float(data.get('current_quantity', data['initial_quantity'])),
            reserved_quantity=float(data.get('reserved_quantity', 0)),
            purchase_price_net=float(data['purchase_price_net']),
            purchase_price_gross=float(data.get('purchase_price_gross', data['purchase_price_net'] * 1.23)),
            location_in_warehouse=data.get('location_in_warehouse'),
            notes=data.get('notes'),
            created_by=data.get('created_by', 'api')
        )
        
        success, message = fifo_service.create_batch(batch)
        
        if success:
            return success_response({"message": message}, "Partia została utworzona")
        else:
            return error_response(message, 400)
            
    except Exception as e:
        logging.error(f"Błąd tworzenia partii: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/allocate', methods=['POST'])
def allocate_fifo():
    """Alokuje towar według strategii FIFO/FEFO"""
    try:
        data = request.get_json()
        
        # Walidacja wymaganych pól
        required_fields = ['product_id', 'warehouse_id', 'requested_quantity']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brakuje wymaganego pola: {field}", 400)
        
        # Utwórz żądanie alokacji
        allocation_request = AllocationRequest(
            product_id=data['product_id'],
            warehouse_id=data['warehouse_id'],
            requested_quantity=float(data['requested_quantity']),
            strategy=data.get('strategy', 'fifo'),  # 'fifo' lub 'fefo'
            document_type=data.get('document_type', 'sale'),
            document_id=data.get('document_id'),
            created_by=data.get('created_by', 'api')
        )
        
        # Wykonaj alokację
        result = fifo_service.allocate_fifo(allocation_request)
        
        response_data = {
            "allocation_id": result.allocation_id,
            "requested_quantity": result.requested_quantity,
            "allocated_quantity": result.allocated_quantity,
            "success": result.success,
            "message": result.message,
            "allocations": result.allocations
        }
        
        if result.success:
            return success_response(response_data, "Alokacja zakończona pomyślnie")
        else:
            return success_response(response_data, result.message)  # Częściowa alokacja też jest sukcesem
            
    except Exception as e:
        logging.error(f"Błąd alokacji FIFO: {str(e)}")
        logging.error(traceback.format_exc())
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/allocations/<int:allocation_id>/consume', methods=['POST'])
def consume_allocation(allocation_id):
    """Potwierdza użycie alokacji (finalizuje sprzedaż)"""
    try:
        data = request.get_json() or {}
        
        consumed_quantity = None
        if 'consumed_quantity' in data:
            consumed_quantity = float(data['consumed_quantity'])
        
        created_by = data.get('created_by', 'api')
        
        success, message = fifo_service.consume_allocation(
            allocation_id=allocation_id,
            consumed_quantity=consumed_quantity,
            created_by=created_by
        )
        
        if success:
            return success_response({"message": message}, "Alokacja została skonsumowana")
        else:
            return error_response(message, 400)
            
    except Exception as e:
        logging.error(f"Błąd konsumpcji alokacji: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/allocations/<int:allocation_id>/cancel', methods=['POST'])
def cancel_allocation(allocation_id):
    """Anuluje alokację"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Anulowane przez użytkownika')
        
        success, message = fifo_service.cancel_allocation(
            allocation_id=allocation_id,
            reason=reason
        )
        
        if success:
            return success_response({"message": message}, "Alokacja została anulowana")
        else:
            return error_response(message, 400)
            
    except Exception as e:
        logging.error(f"Błąd anulowania alokacji: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/expiring', methods=['GET'])
def get_expiring_batches():
    """Pobiera partie wkrótce wygasające"""
    try:
        warehouse_id = request.args.get('warehouse_id', type=int)
        days_ahead = request.args.get('days_ahead', 30, type=int)
        
        expiring_batches = fifo_service.get_expiring_batches(
            warehouse_id=warehouse_id,
            days_ahead=days_ahead
        )
        
        return success_response(expiring_batches, f"Pobrano {len(expiring_batches)} wygasających partii")
        
    except Exception as e:
        logging.error(f"Błąd pobierania wygasających partii: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/stock-summary', methods=['GET'])
def get_stock_summary():
    """Pobiera podsumowanie stanów magazynowych z informacjami FIFO"""
    try:
        warehouse_id = request.args.get('warehouse_id', type=int)
        
        summary = fifo_service.get_stock_summary(warehouse_id=warehouse_id)
        
        return success_response(summary, f"Pobrano podsumowanie dla {len(summary)} produktów")
        
    except Exception as e:
        logging.error(f"Błąd pobierania podsumowania: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/product/<int:product_id>/warehouse/<int:warehouse_id>/available', methods=['GET'])
def get_available_quantity(product_id, warehouse_id):
    """Pobiera dostępną ilość produktu w magazynie (uwzględniając rezerwacje)"""
    try:
        batches = fifo_service.get_product_batches(
            product_id=product_id,
            warehouse_id=warehouse_id,
            active_only=True
        )
        
        total_available = sum(
            batch.get('available_quantity', 0) for batch in batches
        )
        
        total_current = sum(
            batch.get('current_quantity', 0) for batch in batches  
        )
        
        total_reserved = sum(
            batch.get('reserved_quantity', 0) for batch in batches
        )
        
        response_data = {
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "total_current_quantity": total_current,
            "total_reserved_quantity": total_reserved,
            "total_available_quantity": total_available,
            "batches_count": len(batches),
            "batches": batches
        }
        
        return success_response(response_data, "Informacje o dostępności pobrane")
        
    except Exception as e:
        logging.error(f"Błąd pobierania dostępności: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/batch/<int:batch_id>/adjust', methods=['POST'])
def adjust_batch_quantity(batch_id):
    """Ręczna korekta ilości w partii (np. inwentaryzacja, uszkodzenia)"""
    try:
        data = request.get_json()
        
        if 'new_quantity' not in data:
            return error_response("Brakuje pola 'new_quantity'", 400)
            
        new_quantity = float(data['new_quantity'])
        reason = data.get('reason', 'Ręczna korekta')
        created_by = data.get('created_by', 'api')
        
        # Pobierz aktualną ilość
        from utils.database import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT current_quantity, batch_number FROM product_batches 
            WHERE id = ? AND status = 'active'
        """, (batch_id,))
        
        batch_info = cursor.fetchone()
        if not batch_info:
            return error_response("Partia nie istnieje lub nie jest aktywna", 404)
        
        old_quantity, batch_number = batch_info
        quantity_change = new_quantity - old_quantity
        
        # Aktualizuj ilość
        cursor.execute("""
            UPDATE product_batches 
            SET current_quantity = ?, updated_at = datetime('now')
            WHERE id = ?
        """, (new_quantity, batch_id))
        
        # Zapisz ruch korekty
        cursor.execute("""
            INSERT INTO batch_movements (
                batch_id, movement_type, quantity, quantity_before, quantity_after,
                document_type, reason, created_by
            ) VALUES (?, 'adjustment', ?, ?, ?, 'manual', ?, ?)
        """, (batch_id, abs(quantity_change), old_quantity, new_quantity, reason, created_by))
        
        conn.commit()
        conn.close()
        
        message = f"Skorygowano ilość w partii {batch_number} z {old_quantity} na {new_quantity} ({quantity_change:+.2f})"
        
        return success_response({
            "batch_id": batch_id,
            "batch_number": batch_number,
            "old_quantity": old_quantity,
            "new_quantity": new_quantity,
            "quantity_change": quantity_change,
            "message": message
        }, "Korekta ilości wykonana")
        
    except Exception as e:
        logging.error(f"Błąd korekty partii: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)

@fifo_bp.route('/fifo/reports/expiry-alert', methods=['GET'])
def expiry_alert_report():
    """Raport alertów o datach ważności"""
    try:
        warehouse_id = request.args.get('warehouse_id', type=int)
        
        # Pobierz partie wygasające w różnych przedziałach
        alerts = {
            "expired": fifo_service.get_expiring_batches(warehouse_id, -1),  # Już przeterminowane
            "expiring_7_days": fifo_service.get_expiring_batches(warehouse_id, 7),
            "expiring_30_days": fifo_service.get_expiring_batches(warehouse_id, 30),
            "expiring_90_days": fifo_service.get_expiring_batches(warehouse_id, 90)
        }
        
        # Statystyki
        stats = {
            "total_expired": len(alerts["expired"]),
            "total_expiring_7_days": len(alerts["expiring_7_days"]),
            "total_expiring_30_days": len(alerts["expiring_30_days"]),
            "total_expiring_90_days": len(alerts["expiring_90_days"])
        }
        
        response_data = {
            "warehouse_id": warehouse_id,
            "alerts": alerts,
            "statistics": stats,
            "generated_at": datetime.now().isoformat()
        }
        
        return success_response(response_data, "Raport alertów wygenerowany")
        
    except Exception as e:
        logging.error(f"Błąd raportu alertów: {str(e)}")
        return error_response(f"Błąd serwera: {str(e)}", 500)
