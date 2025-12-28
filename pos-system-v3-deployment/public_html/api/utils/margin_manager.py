"""
Inteligentny system zarządzania marżami z uwzględnieniem:
- Cen specjalnych per lokalizacja
- Promocji i przecen
- Automatycznej korekty marż
- Raportowania zmian marż
"""

from utils.database import get_db_connection
from datetime import datetime
import json

class SmartMarginManager:
    
    def __init__(self):
        self.MIN_MARGIN_THRESHOLD = 0  # Próg marży poniżej którego następuje korekta
        self.DEFAULT_MARGIN = 30  # Domyślna marża do ustawienia (30%)
        self.PROMOTION_MARGIN_THRESHOLD = 10  # Minimalna marża dla promocji
    
    def update_product_prices_with_margin_control(self, product_id, new_purchase_netto, new_purchase_brutto, created_by='system'):
        """
        Główna funkcja aktualizacji cen z kontrolą marż
        """
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            
            # 1. Pobierz obecne dane produktu
            current_data = self._get_current_product_data(cursor, product_id)
            if not current_data:
                return {'success': False, 'error': f'Produkt {product_id} nie istnieje'}
            
            # 2. Aktualizuj ceny zakupu
            self._update_purchase_prices(cursor, product_id, new_purchase_netto, new_purchase_brutto)
            
            # 3. Analizuj marże we wszystkich lokalizacjach
            margin_analysis = self._analyze_margins_all_locations(cursor, product_id, new_purchase_brutto, current_data)
            
            # 4. Automatyczne korekty (tylko dla cen domyślnych, NIE dla specjalnych)
            corrections = self._apply_automatic_corrections(cursor, product_id, new_purchase_brutto, current_data, margin_analysis)
            
            # 5. Zapisz raport zmian
            report_id = self._save_margin_report(cursor, product_id, margin_analysis, corrections, created_by)
            
            conn.commit()
            
            return {
                'success': True,
                'product_id': product_id,
                'margin_analysis': margin_analysis,
                'corrections_applied': corrections,
                'report_id': report_id,
                'warnings': self._generate_warnings(margin_analysis)
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _get_current_product_data(self, cursor, product_id):
        """Pobierz obecne dane produktu"""
        cursor.execute("""
            SELECT 
                id, nazwa, stawka_vat,
                cena_zakupu_netto, cena_zakupu_brutto,
                cena_sprzedazy_netto, cena_sprzedazy_brutto,
                marza_procent
            FROM produkty 
            WHERE id = ?
        """, (product_id,))
        return cursor.fetchone()
    
    def _update_purchase_prices(self, cursor, product_id, new_netto, new_brutto):
        """Aktualizuj ceny zakupu"""
        cursor.execute("""
            UPDATE produkty 
            SET 
                cena_zakupu_netto = ?,
                cena_zakupu_brutto = ?,
                cena_zakupu = ?,  -- stara kolumna dla kompatybilności
                updated_at = ?
            WHERE id = ?
        """, (new_netto, new_brutto, new_netto, datetime.now().isoformat(), product_id))
    
    def _analyze_margins_all_locations(self, cursor, product_id, new_purchase_brutto, current_data):
        """
        Analizuj marże we wszystkich lokalizacjach gdzie produkt ma cenę
        """
        analysis = {
            'default_price': {},
            'location_prices': [],
            'problematic_locations': []
        }
        
        # 1. Marża dla ceny domyślnej
        default_sale_price = current_data['cena_sprzedazy_brutto'] or 0
        default_margin = self._calculate_margin(new_purchase_brutto, default_sale_price)
        
        analysis['default_price'] = {
            'sale_price_brutto': default_sale_price,
            'purchase_price_brutto': new_purchase_brutto,
            'margin_percent': default_margin,
            'needs_correction': default_margin <= self.MIN_MARGIN_THRESHOLD,
            'price_type': 'default'
        }
        
        # 2. Marże dla cen specjalnych per lokalizacja
        cursor.execute("""
            SELECT 
                lpp.id as price_id,
                lpp.location_id,
                l.nazwa as location_name,
                l.kod_lokalizacji,
                lpp.cena_sprzedazy_brutto,
                lpp.cena_sprzedazy_netto,
                lpp.data_od,
                lpp.data_do,
                lpp.uwagi,
                lpp.created_by
            FROM location_product_prices lpp
            JOIN locations l ON lpp.location_id = l.id
            WHERE lpp.product_id = ? 
                AND lpp.aktywny = 1
                AND (lpp.data_do IS NULL OR lpp.data_do >= date('now'))
            ORDER BY l.nazwa
        """, (product_id,))
        
        location_prices = cursor.fetchall()
        
        for row in location_prices:
            # Konwertuj Row na dict
            price_data = dict(row)
            location_margin = self._calculate_margin(new_purchase_brutto, price_data['cena_sprzedazy_brutto'])
            
            location_analysis = {
                'price_id': price_data['price_id'],
                'location_id': price_data['location_id'],
                'location_name': price_data['location_name'],
                'location_code': price_data['kod_lokalizacji'],
                'sale_price_brutto': price_data['cena_sprzedazy_brutto'],
                'purchase_price_brutto': new_purchase_brutto,
                'margin_percent': location_margin,
                'needs_attention': location_margin <= self.MIN_MARGIN_THRESHOLD,
                'is_promotion': location_margin < self.PROMOTION_MARGIN_THRESHOLD,
                'price_type': 'location_special',
                'valid_from': price_data['data_od'],
                'valid_to': price_data['data_do'],
                'notes': price_data['uwagi'],
                'created_by': price_data['created_by']
            }
            
            analysis['location_prices'].append(location_analysis)
            
            # Oznacz problematyczne lokalizacje
            if location_margin <= self.MIN_MARGIN_THRESHOLD:
                analysis['problematic_locations'].append({
                    'location_name': price_data['location_name'],
                    'margin': location_margin,
                    'is_likely_promotion': 'promocja' in (price_data['uwagi'] or '').lower() or 'przecena' in (price_data['uwagi'] or '').lower()
                })
        
        return analysis
    
    def _calculate_margin(self, purchase_price, sale_price):
        """Oblicz marżę procentową"""
        if not purchase_price or purchase_price == 0:
            return 0
        if not sale_price or sale_price == 0:
            return -100  # Brak ceny sprzedaży = -100% marży
        
        return round(((sale_price - purchase_price) / purchase_price) * 100, 2)
    
    def _apply_automatic_corrections(self, cursor, product_id, new_purchase_brutto, current_data, margin_analysis):
        """
        Automatyczne korekty - TYLKO dla ceny domyślnej, NIE dla cen specjalnych
        """
        corrections = []
        
        # Korekta tylko dla ceny domyślnej jeśli marża <= 0%
        default_analysis = margin_analysis['default_price']
        
        if default_analysis['needs_correction']:
            # Oblicz nową cenę z marżą DEFAULT_MARGIN%
            new_sale_price_netto = round(new_purchase_brutto / (1 + current_data['stawka_vat'] / 100) * (1 + self.DEFAULT_MARGIN / 100), 2)
            new_sale_price_brutto = round(new_sale_price_netto * (1 + current_data['stawka_vat'] / 100), 2)
            
            # Aktualizuj cenę domyślną
            cursor.execute("""
                UPDATE produkty 
                SET 
                    cena_sprzedazy_netto = ?,
                    cena_sprzedazy_brutto = ?,
                    cena = ?,  -- stara kolumna
                    marza_procent = ?,
                    updated_at = ?
                WHERE id = ?
            """, (
                new_sale_price_netto,
                new_sale_price_brutto, 
                new_sale_price_brutto,
                self.DEFAULT_MARGIN,
                datetime.now().isoformat(),
                product_id
            ))
            
            corrections.append({
                'type': 'default_price_correction',
                'old_price_brutto': default_analysis['sale_price_brutto'],
                'new_price_brutto': new_sale_price_brutto,
                'old_margin': default_analysis['margin_percent'],
                'new_margin': self.DEFAULT_MARGIN,
                'reason': f'Marża była {default_analysis["margin_percent"]}%, skorygowano na {self.DEFAULT_MARGIN}%'
            })
        
        return corrections
    
    def _save_margin_report(self, cursor, product_id, analysis, corrections, created_by):
        """Zapisz raport zmian marż do tabeli logów"""
        try:
            # Utwórz tabelę raportów jeśli nie istnieje
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS margin_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    report_data TEXT NOT NULL,
                    corrections_applied TEXT,
                    created_by TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES produkty(id)
                )
            """)
            
            # Zapisz raport
            cursor.execute("""
                INSERT INTO margin_reports (product_id, report_data, corrections_applied, created_by)
                VALUES (?, ?, ?, ?)
            """, (
                product_id,
                json.dumps(analysis, default=str),
                json.dumps(corrections, default=str),
                created_by
            ))
            
            return cursor.lastrowid
        except Exception as e:
            print(f"Błąd zapisu raportu marż: {e}")
            return None
    
    def _generate_warnings(self, analysis):
        """Generuj ostrzeżenia dla problematycznych marż"""
        warnings = []
        
        # Ostrzeżenie dla ceny domyślnej
        if analysis['default_price']['needs_correction']:
            warnings.append({
                'type': 'low_default_margin',
                'message': f"Cena domyślna ma marżę {analysis['default_price']['margin_percent']}% - została skorygowana",
                'severity': 'corrected'
            })
        
        # Ostrzeżenia dla cen specjalnych
        for location in analysis['problematic_locations']:
            if location['is_likely_promotion']:
                warnings.append({
                    'type': 'promotion_detected',
                    'message': f"Lokalizacja '{location['location_name']}' prawdopodobnie ma promocję (marża: {location['margin']}%)",
                    'severity': 'info'
                })
            else:
                warnings.append({
                    'type': 'low_location_margin',
                    'message': f"Lokalizacja '{location['location_name']}' ma niską marżę: {location['margin']}% - wymaga sprawdzenia",
                    'severity': 'warning'
                })
        
        return warnings
    
    def get_margin_report(self, product_id, limit=10):
        """Pobierz historię raportów marż dla produktu"""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    id, product_id, report_data, corrections_applied, 
                    created_by, created_at
                FROM margin_reports 
                WHERE product_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (product_id, limit))
            
            reports = []
            for row in cursor.fetchall():
                reports.append({
                    'id': row[0],
                    'product_id': row[1],
                    'report_data': json.loads(row[2]) if row[2] else {},
                    'corrections_applied': json.loads(row[3]) if row[3] else [],
                    'created_by': row[4],
                    'created_at': row[5]
                })
            
            return reports
        finally:
            conn.close()
