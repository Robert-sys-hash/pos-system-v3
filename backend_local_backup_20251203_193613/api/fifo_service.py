"""
FIFO Service - Zarządzanie systemem First In, First Out w magazynie
==================================================================

Ten serwis obsługuje:
1. Automatyczne tworzenie partii przy przyjęciach towaru
2. Alokację najstarszych partii podczas sprzedaży (FIFO)
3. Opcjonalnie FEFO (First Expired, First Out) dla produktów z datą ważności
4. Monitorowanie stanów magazynowych per partia
5. Zarządzanie rezerwacjami
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from utils.database import get_db_connection, execute_query
import logging

@dataclass
class ProductBatch:
    """Klasa reprezentująca partię produktu"""
    id: Optional[int] = None
    batch_number: Optional[str] = None
    product_id: int = 0
    warehouse_id: int = 0
    received_date: str = ""
    expiry_date: Optional[str] = None
    supplier_id: Optional[int] = None
    purchase_invoice_id: Optional[int] = None
    initial_quantity: float = 0.0
    current_quantity: float = 0.0
    reserved_quantity: float = 0.0
    purchase_price_net: float = 0.0
    purchase_price_gross: float = 0.0
    status: str = "active"
    location_in_warehouse: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = "system"

@dataclass 
class AllocationRequest:
    """Żądanie alokacji towaru"""
    product_id: int
    warehouse_id: int
    requested_quantity: float
    strategy: str = "fifo"  # 'fifo', 'fefo', 'manual'
    document_type: str = "sale"  # 'sale', 'transfer', 'reservation'
    document_id: Optional[int] = None
    created_by: str = "system"

@dataclass
class AllocationResult:
    """Wynik alokacji"""
    allocation_id: int
    requested_quantity: float
    allocated_quantity: float
    allocations: List[Dict[str, Any]]  # Lista szczegółów alokacji per partia
    success: bool = True
    message: str = ""

class FIFOService:
    """Główny serwis zarządzający systemem FIFO"""
    
    def __init__(self, db_path: str = "kupony.db"):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)

    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection(self.db_path)

    def create_batch(self, batch: ProductBatch) -> Tuple[bool, str]:
        """
        Tworzy nową partię produktu
        
        Args:
            batch: Obiekt ProductBatch z danymi partii
            
        Returns:
            Tuple[bool, str]: (sukces, komunikat/błąd)
        """
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Jeśli nie podano daty przyjęcia, użyj bieżącej
            if not batch.received_date:
                batch.received_date = datetime.now().isoformat()
            
            # Ustaw current_quantity na initial_quantity jeśli nie podano
            if batch.current_quantity == 0:
                batch.current_quantity = batch.initial_quantity
                
            cursor.execute("""
                INSERT INTO product_batches (
                    product_id, warehouse_id, received_date, expiry_date,
                    supplier_id, purchase_invoice_id, initial_quantity, 
                    current_quantity, reserved_quantity, purchase_price_net,
                    purchase_price_gross, status, location_in_warehouse,
                    notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                batch.product_id, batch.warehouse_id, batch.received_date,
                batch.expiry_date, batch.supplier_id, batch.purchase_invoice_id,
                batch.initial_quantity, batch.current_quantity, batch.reserved_quantity,
                batch.purchase_price_net, batch.purchase_price_gross, batch.status,
                batch.location_in_warehouse, batch.notes, batch.created_by
            ))
            
            batch_id = cursor.lastrowid
            conn.commit()
            
            # Pobierz wygenerowany numer partii
            cursor.execute("SELECT batch_number FROM product_batches WHERE id = ?", (batch_id,))
            batch_number = cursor.fetchone()[0]
            
            self.logger.info(f"Utworzono partię {batch_number} dla produktu {batch.product_id}")
            return True, f"Partia {batch_number} została utworzona (ID: {batch_id})"
            
        except Exception as e:
            self.logger.error(f"Błąd tworzenia partii: {str(e)}")
            return False, f"Błąd tworzenia partii: {str(e)}"
        finally:
            if conn:
                conn.close()

    def allocate_fifo(self, request: AllocationRequest) -> AllocationResult:
        """
        Alokuje towar według strategii FIFO/FEFO
        
        Args:
            request: Żądanie alokacji
            
        Returns:
            AllocationResult: Wynik alokacji
        """
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Utwórz główny wpis alokacji
            cursor.execute("""
                INSERT INTO fifo_allocations (
                    product_id, warehouse_id, requested_quantity,
                    allocation_strategy, document_type, document_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                request.product_id, request.warehouse_id, request.requested_quantity,
                request.strategy, request.document_type, request.document_id, request.created_by
            ))
            
            allocation_id = cursor.lastrowid
            
            # Wybierz dostępne partie według strategii
            if request.strategy == "fefo":
                # First Expired, First Out - dla produktów z datą ważności
                order_clause = """
                    ORDER BY 
                        CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
                        expiry_date ASC,
                        received_date ASC
                """
            else:
                # FIFO - standardowo po dacie przyjęcia
                order_clause = "ORDER BY received_date ASC, id ASC"
            
            cursor.execute(f"""
                SELECT 
                    id, batch_number, current_quantity, reserved_quantity,
                    received_date, expiry_date, purchase_price_net
                FROM product_batches 
                WHERE product_id = ? AND warehouse_id = ? 
                AND status = 'active' 
                AND (current_quantity - reserved_quantity) > 0
                {order_clause}
            """, (request.product_id, request.warehouse_id))
            
            available_batches = cursor.fetchall()
            
            if not available_batches:
                return AllocationResult(
                    allocation_id=allocation_id,
                    requested_quantity=request.requested_quantity,
                    allocated_quantity=0,
                    allocations=[],
                    success=False,
                    message="Brak dostępnych partii produktu"
                )
            
            # Alokuj z dostępnych partii
            remaining_quantity = request.requested_quantity
            allocations = []
            total_allocated = 0
            
            for batch in available_batches:
                if remaining_quantity <= 0:
                    break
                    
                batch_id, batch_number, current_qty, reserved_qty = batch[:4]
                available_in_batch = current_qty - reserved_qty
                
                # Ile możemy zabrać z tej partii
                quantity_from_batch = min(remaining_quantity, available_in_batch)
                
                if quantity_from_batch > 0:
                    # Zapisz szczegółową alokację
                    cursor.execute("""
                        INSERT INTO fifo_allocation_details (
                            allocation_id, batch_id, allocated_quantity
                        ) VALUES (?, ?, ?)
                    """, (allocation_id, batch_id, quantity_from_batch))
                    
                    # Zarezerwuj ilość w partii
                    cursor.execute("""
                        UPDATE product_batches 
                        SET reserved_quantity = reserved_quantity + ?
                        WHERE id = ?
                    """, (quantity_from_batch, batch_id))
                    
                    allocations.append({
                        'batch_id': batch_id,
                        'batch_number': batch_number,
                        'allocated_quantity': quantity_from_batch,
                        'received_date': batch[4],
                        'expiry_date': batch[5],
                        'purchase_price_net': batch[6]
                    })
                    
                    remaining_quantity -= quantity_from_batch
                    total_allocated += quantity_from_batch
            
            # Aktualizuj główną alokację
            cursor.execute("""
                UPDATE fifo_allocations 
                SET allocated_quantity = ?, status = 'allocated'
                WHERE id = ?
            """, (total_allocated, allocation_id))
            
            conn.commit()
            
            success = total_allocated >= request.requested_quantity
            message = "Alokacja zakończona pomyślnie" if success else f"Częściowa alokacja: {total_allocated}/{request.requested_quantity}"
            
            self.logger.info(f"Alokacja FIFO: produkt {request.product_id}, zażądano {request.requested_quantity}, alokowano {total_allocated}")
            
            return AllocationResult(
                allocation_id=allocation_id,
                requested_quantity=request.requested_quantity,
                allocated_quantity=total_allocated,
                allocations=allocations,
                success=success,
                message=message
            )
            
        except Exception as e:
            self.logger.error(f"Błąd alokacji FIFO: {str(e)}")
            return AllocationResult(
                allocation_id=0,
                requested_quantity=request.requested_quantity,
                allocated_quantity=0,
                allocations=[],
                success=False,
                message=f"Błąd alokacji: {str(e)}"
            )
        finally:
            if conn:
                conn.close()

    def consume_allocation(self, allocation_id: int, consumed_quantity: float = None, 
                          created_by: str = "system") -> Tuple[bool, str]:
        """
        Potwierdza użycie alokacji (np. przy finalizacji sprzedaży)
        
        Args:
            allocation_id: ID alokacji
            consumed_quantity: Ile faktycznie zużyto (None = całą alokację)
            created_by: Kto potwierdził
            
        Returns:
            Tuple[bool, str]: (sukces, komunikat)
        """
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Pobierz detale alokacji
            cursor.execute("""
                SELECT id, product_id, warehouse_id, allocated_quantity, status
                FROM fifo_allocations 
                WHERE id = ?
            """, (allocation_id,))
            
            allocation = cursor.fetchone()
            if not allocation:
                return False, "Alokacja nie istnieje"
                
            if allocation[4] != 'allocated':
                return False, f"Alokacja ma nieprawidłowy status: {allocation[4]}"
            
            # Jeśli nie podano ile zużyto, użyj całej alokacji
            if consumed_quantity is None:
                consumed_quantity = allocation[3]
                
            # Pobierz szczegóły alokacji
            cursor.execute("""
                SELECT ad.batch_id, ad.allocated_quantity, pb.batch_number
                FROM fifo_allocation_details ad
                JOIN product_batches pb ON ad.batch_id = pb.id
                WHERE ad.allocation_id = ? AND ad.status = 'allocated'
                ORDER BY ad.id
            """, (allocation_id,))
            
            allocation_details = cursor.fetchall()
            
            # Konsumuj z partii
            remaining_to_consume = consumed_quantity
            
            for detail in allocation_details:
                if remaining_to_consume <= 0:
                    break
                    
                batch_id, allocated_qty, batch_number = detail
                consume_from_batch = min(remaining_to_consume, allocated_qty)
                
                # Aktualizuj partię - zmniejsz reserved i current
                cursor.execute("""
                    UPDATE product_batches 
                    SET 
                        reserved_quantity = reserved_quantity - ?,
                        current_quantity = current_quantity - ?
                    WHERE id = ?
                """, (consume_from_batch, consume_from_batch, batch_id))
                
                # Zapisz ruch w batch_movements
                cursor.execute("""
                    INSERT INTO batch_movements (
                        batch_id, movement_type, quantity, document_type,
                        document_number, reason, created_by
                    ) VALUES (?, 'out', ?, 'sale', ?, 'Sprzedaż przez alokację FIFO', ?)
                """, (batch_id, consume_from_batch, f"ALLOC-{allocation_id}", created_by))
                
                # Oznacz szczegółową alokację jako użytą
                if consume_from_batch == allocated_qty:
                    cursor.execute("""
                        UPDATE fifo_allocation_details 
                        SET status = 'used', used_at = datetime('now')
                        WHERE allocation_id = ? AND batch_id = ?
                    """, (allocation_id, batch_id))
                
                remaining_to_consume -= consume_from_batch
                self.logger.info(f"Skonsumowano {consume_from_batch} z partii {batch_number}")
            
            # Aktualizuj główną alokację
            cursor.execute("""
                UPDATE fifo_allocations 
                SET status = 'completed', completed_at = datetime('now')
                WHERE id = ?
            """, (allocation_id,))
            
            conn.commit()
            
            message = f"Skonsumowano {consumed_quantity} jednostek z alokacji {allocation_id}"
            self.logger.info(message)
            return True, message
            
        except Exception as e:
            self.logger.error(f"Błąd konsumpcji alokacji: {str(e)}")
            return False, f"Błąd konsumpcji: {str(e)}"
        finally:
            if conn:
                conn.close()

    def cancel_allocation(self, allocation_id: int, reason: str = "Anulowane przez użytkownika") -> Tuple[bool, str]:
        """
        Anuluje alokację i zwalnia zarezerwowane ilości
        
        Args:
            allocation_id: ID alokacji
            reason: Powód anulowania
            
        Returns:
            Tuple[bool, str]: (sukces, komunikat)
        """
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Pobierz szczegóły alokacji do anulowania
            cursor.execute("""
                SELECT ad.batch_id, ad.allocated_quantity
                FROM fifo_allocation_details ad
                WHERE ad.allocation_id = ? AND ad.status = 'allocated'
            """, (allocation_id,))
            
            details = cursor.fetchall()
            
            # Zwolnij zarezerwowane ilości
            for batch_id, allocated_qty in details:
                cursor.execute("""
                    UPDATE product_batches 
                    SET reserved_quantity = reserved_quantity - ?
                    WHERE id = ?
                """, (allocated_qty, batch_id))
                
                # Zapisz ruch anulowania
                cursor.execute("""
                    INSERT INTO batch_movements (
                        batch_id, movement_type, quantity, document_type,
                        reason, created_by
                    ) VALUES (?, 'unreserve', ?, 'cancellation', ?, 'system')
                """, (batch_id, allocated_qty, reason))
            
            # Oznacz alokację jako anulowaną
            cursor.execute("""
                UPDATE fifo_allocations 
                SET status = 'cancelled' 
                WHERE id = ?
            """, (allocation_id,))
            
            cursor.execute("""
                UPDATE fifo_allocation_details 
                SET status = 'cancelled' 
                WHERE allocation_id = ?
            """, (allocation_id,))
            
            conn.commit()
            
            message = f"Anulowano alokację {allocation_id}"
            self.logger.info(message)
            return True, message
            
        except Exception as e:
            self.logger.error(f"Błąd anulowania alokacji: {str(e)}")
            return False, f"Błąd anulowania: {str(e)}"
        finally:
            if conn:
                conn.close()

    def get_product_batches(self, product_id: int, warehouse_id: int, 
                           active_only: bool = True) -> List[Dict[str, Any]]:
        """
        Pobiera listę partii dla produktu
        
        Args:
            product_id: ID produktu
            warehouse_id: ID magazynu
            active_only: Czy tylko aktywne partie
            
        Returns:
            List[Dict]: Lista partii
        """
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            where_clause = "WHERE product_id = ? AND warehouse_id = ?"
            params = [product_id, warehouse_id]
            
            if active_only:
                where_clause += " AND status = 'active' AND current_quantity > 0"
            
            cursor.execute(f"""
                SELECT * FROM v_active_batches 
                {where_clause}
                ORDER BY received_date ASC
            """, params)
            
            columns = [description[0] for description in cursor.description]
            batches = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return batches
            
        except Exception as e:
            self.logger.error(f"Błąd pobierania partii: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()

    def get_expiring_batches(self, warehouse_id: int = None, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """
        Pobiera partie wkrótce wygasające
        
        Args:
            warehouse_id: ID magazynu (None = wszystkie)
            days_ahead: Ile dni do przodu sprawdzać
            
        Returns:
            List[Dict]: Lista wygasających partii
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            where_clause = """
                WHERE expiry_date IS NOT NULL 
                AND expiry_date <= date('now', '+{} days')
                AND status = 'active' 
                AND current_quantity > 0
            """.format(days_ahead)
            
            params = []
            if warehouse_id:
                where_clause += " AND warehouse_id = ?"
                params.append(warehouse_id)
            
            cursor.execute(f"""
                SELECT * FROM v_active_batches 
                {where_clause}
                ORDER BY expiry_date ASC, received_date ASC
            """, params)
            
            columns = [description[0] for description in cursor.description]
            batches = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return batches
            
        except Exception as e:
            self.logger.error(f"Błąd pobierania wygasających partii: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()

    def get_stock_summary(self, warehouse_id: int = None) -> List[Dict[str, Any]]:
        """
        Pobiera podsumowanie stanów magazynowych
        
        Args:
            warehouse_id: ID magazynu (None = wszystkie)
            
        Returns:
            List[Dict]: Podsumowanie stanów
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            where_clause = ""
            params = []
            
            if warehouse_id:
                where_clause = "WHERE warehouse_id = ?"
                params.append(warehouse_id)
            
            cursor.execute(f"""
                SELECT * FROM v_product_stock_summary 
                {where_clause}
                ORDER BY product_name
            """, params)
            
            columns = [description[0] for description in cursor.description]
            summary = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Błąd pobierania podsumowania: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()

# Singleton instance
fifo_service = FIFOService()
