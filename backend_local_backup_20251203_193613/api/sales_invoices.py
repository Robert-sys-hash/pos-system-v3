"""
API modułu Faktur Sprzedaży
Zarządzanie fakturami sprzedaży, korektami i konwersją paragonów na faktury
"""

from flask import Blueprint, request, jsonify, Response
from datetime import datetime, date, timedelta
import sqlite3
import os
import sys

# Dodaj ścieżki do modułów
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.database import execute_query, execute_insert, get_db_connection
from utils.response_helpers import success_response, error_response

# Importy dla systemu szablonów faktur
try:
    from utils.invoice_templates import TemplateManager
    from utils.template_config import get_template_config, get_all_templates
    TEMPLATES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Nie można załadować systemu szablonów: {e}")
    TEMPLATES_AVAILABLE = False

sales_invoices_api_bp = Blueprint('sales_invoices_api', __name__)

class SalesInvoiceManager:
    def __init__(self, db_path=None):
        if db_path:
            self.db_path = db_path
        else:
            # Ścieżka do głównej bazy danych w katalogu głównym projektu
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, '..', '..', 'kupony.db')
    
    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection()

    def generate_invoice_number(self, location_id, typ_faktury='faktura_sprzedazy'):
        """Wygeneruj numer faktury używając nowego systemu prefiksów"""
        try:
            # Importuj nowy manager prefiksów
            from api.document_prefixes import prefix_manager
            
            # Wygeneruj numer używając nowego systemu
            number, error = prefix_manager.generate_document_number(location_id, typ_faktury)
            
            if number:
                return number
            else:
                print(f"Błąd generowania numeru faktury: {error}")
                # Fallback do starego systemu
                return self._generate_legacy_invoice_number(location_id, typ_faktury)
                
        except Exception as e:
            print(f"Błąd w nowym systemie numeracji, używam starego: {e}")
            return self._generate_legacy_invoice_number(location_id, typ_faktury)

    def _generate_legacy_invoice_number(self, location_id, typ_faktury='sprzedaz'):
        """Legacy metoda generowania numerów (stary system)"""
    def _generate_legacy_invoice_number(self, location_id, typ_faktury='sprzedaz'):
        """Legacy metoda generowania numerów (stary system)"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            current_year = date.today().year
            current_month = date.today().month
            
            # Pobierz lub utwórz wpis numeracji
            cursor.execute("""
                SELECT ostatni_numer, format_numeru FROM faktury_numeracja 
                WHERE rok = ? AND location_id = ? AND typ_faktury = ?
            """, (current_year, location_id, typ_faktury))
            
            result = cursor.fetchone()
            
            if result:
                ostatni_numer = result['ostatni_numer'] + 1
                format_numeru = result['format_numeru']
                
                # Aktualizuj licznik
                cursor.execute("""
                    UPDATE faktury_numeracja 
                    SET ostatni_numer = ? 
                    WHERE rok = ? AND location_id = ? AND typ_faktury = ?
                """, (ostatni_numer, current_year, location_id, typ_faktury))
            else:
                # Utwórz nowy wpis
                ostatni_numer = 1
                format_numeru = 'FS/{numer}/{rok}'
                cursor.execute("""
                    INSERT INTO faktury_numeracja (rok, location_id, typ_faktury, ostatni_numer, format_numeru)
                    VALUES (?, ?, ?, ?, ?)
                """, (current_year, location_id, typ_faktury, ostatni_numer, format_numeru))
            
            conn.commit()
            
            # Wygeneruj numer faktury
            numer_faktury = format_numeru.format(
                numer=str(ostatni_numer).zfill(4),
                rok=current_year,
                miesiac=str(current_month).zfill(2)
            )
            
            return numer_faktury
            
        except Exception as e:
            print(f"Błąd generowania numeru faktury: {e}")
            conn.rollback()
            return None
        finally:
            conn.close()

    def get_company_data(self):
        """Pobierz dane firmy ze sprzedawcy"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM firma LIMIT 1")
            result = cursor.fetchone()
            return dict(result) if result else None
        except Exception as e:
            print(f"Błąd pobierania danych firmy: {e}")
            return None
        finally:
            conn.close()

    def create_invoice(self, data):
        """Utwórz nową fakturę sprzedaży"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Wygeneruj numer faktury
            numer_faktury = self.generate_invoice_number(data['location_id'])
            if not numer_faktury:
                return None, "Błąd generowania numeru faktury"
            
            # Pobierz dane firmy
            company_data = self.get_company_data()
            if not company_data:
                return None, "Brak danych firmy"
            
            # Domyślne daty
            data_wystawienia = data.get('data_wystawienia')
            if not data_wystawienia:
                data_wystawienia = date.today().isoformat()
            
            data_sprzedazy = data.get('data_sprzedazy')
            if not data_sprzedazy:
                data_sprzedazy = data_wystawienia
                
            termin_platnosci = data.get('termin_platnosci')
            if not termin_platnosci:
                try:
                    termin_platnosci = (datetime.strptime(data_wystawienia, '%Y-%m-%d') + timedelta(days=14)).date().isoformat()
                except (ValueError, TypeError):
                    termin_platnosci = (date.today() + timedelta(days=14)).isoformat()
            
            # Wstaw fakturę
            faktura_data = {
                'numer_faktury': numer_faktury,
                'data_wystawienia': data_wystawienia,
                'data_sprzedazy': data_sprzedazy,
                'termin_platnosci': termin_platnosci,
                'paragon_id': data.get('paragon_id'),
                'klient_id': data.get('klient_id'),
                'location_id': data['location_id'],
                
                # Dane sprzedawcy
                'sprzedawca_nazwa': company_data.get('nazwa', ''),
                'sprzedawca_nip': company_data.get('nip', ''),
                'sprzedawca_regon': company_data.get('regon', ''),
                'sprzedawca_adres': f"{company_data.get('adres_ulica', '')}, {company_data.get('adres_kod', '')} {company_data.get('adres_miasto', '')}".strip(', '),
                'sprzedawca_miasto': company_data.get('adres_miasto', ''),
                'sprzedawca_kod_pocztowy': company_data.get('adres_kod', ''),
                'sprzedawca_telefon': company_data.get('telefon', ''),
                'sprzedawca_email': company_data.get('email', ''),
                'sprzedawca_numer_konta': company_data.get('bank_numer_konta', ''),
                
                # Dane nabywcy
                'nabywca_nazwa': data['nabywca_nazwa'],
                'nabywca_nip': data.get('nabywca_nip', ''),
                'nabywca_regon': data.get('nabywca_regon', ''),
                'nabywca_adres': data.get('nabywca_adres', ''),
                'nabywca_miasto': data.get('nabywca_miasto', ''),
                'nabywca_kod_pocztowy': data.get('nabywca_kod_pocztowy', ''),
                'nabywca_telefon': data.get('nabywca_telefon', ''),
                'nabywca_email': data.get('nabywca_email', ''),
                
                'forma_platnosci': data.get('forma_platnosci', '') or 'gotowka',
                'kwota_zaplacona': data.get('kwota_zaplacona', 0.0),
                'uwagi': data.get('uwagi', ''),
                'created_by': data.get('created_by', 'admin')
            }
            
            cursor.execute("""
                INSERT INTO faktury_sprzedazy (
                    numer_faktury, data_wystawienia, data_sprzedazy, termin_platnosci,
                    paragon_id, klient_id, location_id,
                    sprzedawca_nazwa, sprzedawca_nip, sprzedawca_regon, sprzedawca_adres,
                    sprzedawca_miasto, sprzedawca_kod_pocztowy, sprzedawca_telefon, sprzedawca_email,
                    nabywca_nazwa, nabywca_nip, nabywca_regon, nabywca_adres,
                    nabywca_miasto, nabywca_kod_pocztowy, nabywca_telefon, nabywca_email,
                    suma_netto, suma_vat, suma_brutto,
                    forma_platnosci, kwota_zaplacona, uwagi, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                faktura_data['numer_faktury'], faktura_data['data_wystawienia'], faktura_data['data_sprzedazy'],
                faktura_data['termin_platnosci'], faktura_data['paragon_id'], faktura_data['klient_id'],
                faktura_data['location_id'], faktura_data['sprzedawca_nazwa'], faktura_data['sprzedawca_nip'],
                faktura_data['sprzedawca_regon'], faktura_data['sprzedawca_adres'], faktura_data['sprzedawca_miasto'],
                faktura_data['sprzedawca_kod_pocztowy'], faktura_data['sprzedawca_telefon'], faktura_data['sprzedawca_email'],
                faktura_data['nabywca_nazwa'], faktura_data['nabywca_nip'], faktura_data['nabywca_regon'],
                faktura_data['nabywca_adres'], faktura_data['nabywca_miasto'], faktura_data['nabywca_kod_pocztowy'],
                faktura_data['nabywca_telefon'], faktura_data['nabywca_email'], 
                0.0, 0.0, 0.0,  # suma_netto, suma_vat, suma_brutto - będą aktualizowane przez trigger
                faktura_data['forma_platnosci'], faktura_data['kwota_zaplacona'], faktura_data['uwagi'], faktura_data['created_by']
            ])
            
            faktura_id = cursor.lastrowid
            
            # Dodaj pozycje faktury
            if 'pozycje' in data:
                for i, pozycja in enumerate(data['pozycje']):
                    self.add_invoice_item(cursor, faktura_id, pozycja, i + 1)
            
            conn.commit()
            return faktura_id, numer_faktury
            
        except Exception as e:
            print(f"Błąd tworzenia faktury: {e}")
            conn.rollback()
            return None, str(e)
        finally:
            conn.close()

    def add_invoice_item(self, cursor, faktura_id, pozycja_data, kolejnosc=1):
        """Dodaj pozycję do faktury"""
        # Pobierz dane produktu
        cursor.execute("SELECT nazwa, kod_produktu, jednostka FROM produkty WHERE id = ?", [pozycja_data['product_id']])
        product = cursor.fetchone()
        
        if not product:
            raise Exception(f"Produkt {pozycja_data['product_id']} nie istnieje")
        
        # Oblicz kwoty
        ilosc = float(pozycja_data['ilosc'])
        cena_netto = float(pozycja_data['cena_jednostkowa_netto'])
        stawka_vat = float(pozycja_data.get('stawka_vat', 23))
        
        cena_brutto = round(cena_netto * (1 + stawka_vat / 100), 2)
        wartosc_netto = round(ilosc * cena_netto, 2)
        wartosc_vat = round(wartosc_netto * stawka_vat / 100, 2)
        wartosc_brutto = round(wartosc_netto + wartosc_vat, 2)
        
        cursor.execute("""
            INSERT INTO faktury_sprzedazy_pozycje (
                faktura_id, product_id, nazwa_produktu, kod_produktu, jednostka,
                ilosc, cena_jednostkowa_netto, cena_jednostkowa_brutto, stawka_vat,
                wartosc_netto, wartosc_vat, wartosc_brutto, kolejnosc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            faktura_id, pozycja_data['product_id'], product['nazwa'], product['kod_produktu'], 
            product['jednostka'], ilosc, cena_netto, cena_brutto, stawka_vat,
            wartosc_netto, wartosc_vat, wartosc_brutto, kolejnosc
        ])

    def create_invoice_from_receipt(self, paragon_id, nabywca_data, created_by='admin'):
        """Utwórz fakturę na podstawie paragonu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz dane paragonu
            cursor.execute("""
                SELECT * FROM pos_transakcje WHERE id = ? AND status = 'zakonczony'
            """, [paragon_id])
            paragon = cursor.fetchone()
            
            if not paragon:
                return None, "Paragon nie istnieje lub nie jest zakończony"
            
            paragon = dict(paragon)  # Konwertuj na słownik
            
            # Sprawdź czy faktura już nie istnieje
            cursor.execute("""
                SELECT id FROM faktury_sprzedazy WHERE paragon_id = ?
            """, [paragon_id])
            existing = cursor.fetchone()
            
            if existing:
                return None, "Faktura dla tego paragonu już istnieje"
            
            # Pobierz pozycje paragonu
            cursor.execute("""
                SELECT p.*, pr.nazwa, pr.kod_produktu, pr.jednostka 
                FROM pos_pozycje p
                JOIN produkty pr ON p.produkt_id = pr.id
                WHERE p.transakcja_id = ?
                ORDER BY p.lp
            """, [paragon_id])
            pozycje_paragonu = cursor.fetchall()
            pozycje_paragonu = [dict(row) for row in pozycje_paragonu]  # Konwertuj na słowniki
            
            if not pozycje_paragonu:
                return None, "Paragon nie ma pozycji produktowych. Nie można utworzyć faktury z pustego paragonu."
            
            # Przygotuj dane faktury
            faktura_data = {
                'location_id': nabywca_data.get('location_id', 1),
                'paragon_id': paragon_id,
                'nabywca_nazwa': nabywca_data.get('nabywca_nazwa', ''),
                'nabywca_nip': nabywca_data.get('nabywca_nip', ''),
                'nabywca_adres': nabywca_data.get('nabywca_adres', ''),
                'nabywca_miasto': nabywca_data.get('nabywca_miasto', ''),
                'nabywca_kod_pocztowy': nabywca_data.get('nabywca_kod_pocztowy', ''),
                'nabywca_telefon': nabywca_data.get('nabywca_telefon', ''),
                'nabywca_email': nabywca_data.get('nabywca_email', ''),
                'forma_platnosci': paragon.get('forma_platnosci', '') or 'gotowka',
                'kwota_zaplacona': paragon.get('kwota_gotowka', 0.0) if paragon.get('forma_platnosci') == 'gotowka' else paragon.get('kwota_karta', 0.0),
                'data_wystawienia': nabywca_data.get('data_wystawienia'),
                'termin_platnosci': nabywca_data.get('termin_platnosci'),
                'created_by': created_by,
                'pozycje': []
            }
            
            # Konwertuj pozycje paragonu na pozycje faktury
            for pozycja in pozycje_paragonu:
                faktura_data['pozycje'].append({
                    'product_id': pozycja['produkt_id'],
                    'ilosc': pozycja['ilosc'],
                    'cena_jednostkowa_netto': pozycja['wartosc_netto'] / pozycja['ilosc'] if pozycja['ilosc'] > 0 else 0,
                    'stawka_vat': pozycja['stawka_vat']
                })
            
            # Utwórz fakturę
            return self.create_invoice(faktura_data)
            
        except Exception as e:
            print(f"Błąd tworzenia faktury z paragonu: {e}")
            return None, str(e)
        finally:
            conn.close()

    def create_correction_invoice(self, original_invoice_id, correction_data, created_by='admin'):
        """Utwórz korektę faktury"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz oryginalną fakturę
            cursor.execute("""
                SELECT * FROM faktury_sprzedazy WHERE id = ?
            """, [original_invoice_id])
            original = cursor.fetchone()
            
            if not original:
                return None, "Oryginalna faktura nie istnieje"
            
            if original['status'] == 'anulowana':
                return None, "Nie można korygować anulowanej faktury"
            
            # Przygotuj dane korekty
            correction_invoice_data = dict(original)
            correction_invoice_data.update({
                'typ_faktury': 'korekta',
                'faktura_oryginalna_id': original_invoice_id,
                'created_by': created_by,
                'pozycje': correction_data.get('pozycje', [])
            })
            
            # Usuń pola, które mają być wygenerowane na nowo
            del correction_invoice_data['id']
            del correction_invoice_data['numer_faktury']
            del correction_invoice_data['created_at']
            del correction_invoice_data['updated_at']
            
            # Utwórz korektę
            korekta_id, numer_korekty = self.create_invoice(correction_invoice_data)
            
            if korekta_id:
                # Oznacz oryginalną fakturę jako skorygowaną
                cursor.execute("""
                    UPDATE faktury_sprzedazy 
                    SET status = 'skorygowana', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, [original_invoice_id])
                conn.commit()
            
            return korekta_id, numer_korekty
            
        except Exception as e:
            print(f"Błąd tworzenia korekty: {e}")
            conn.rollback()
            return None, str(e)
        finally:
            conn.close()

    def get_invoices(self, limit=50, offset=0, filters=None):
        """Pobierz listę faktur z filtrami"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT * FROM v_faktury_sprzedazy 
                WHERE 1=1
            """
            params = []
            
            if filters:
                if 'status' in filters:
                    query += " AND status = ?"
                    params.append(filters['status'])
                
                if 'data_od' in filters:
                    query += " AND data_wystawienia >= ?"
                    params.append(filters['data_od'])
                
                if 'data_do' in filters:
                    query += " AND data_wystawienia <= ?"
                    params.append(filters['data_do'])
                
                if 'klient_id' in filters:
                    query += " AND klient_id = ?"
                    params.append(filters['klient_id'])
                
                if 'numer_faktury' in filters:
                    query += " AND numer_faktury LIKE ?"
                    params.append(f"%{filters['numer_faktury']}%")
                
                if 'location_id' in filters:
                    query += " AND location_id = ?"
                    params.append(filters['location_id'])
            
            query += " ORDER BY data_wystawienia DESC, id DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            result = cursor.fetchall()
            return [dict(row) for row in result]
            
        except Exception as e:
            print(f"Błąd pobierania faktur: {e}")
            return []
        finally:
            conn.close()

    def get_invoice_by_id(self, invoice_id):
        """Pobierz fakturę po ID z pozycjami"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz fakturę
            cursor.execute("SELECT * FROM v_faktury_sprzedazy WHERE id = ?", [invoice_id])
            invoice = cursor.fetchone()
            
            if not invoice:
                return None
            
            invoice_dict = dict(invoice)
            
            # Pobierz pozycje
            cursor.execute("""
                SELECT p.*, pr.nazwa as produkt_nazwa_aktualna
                FROM faktury_sprzedazy_pozycje p
                LEFT JOIN produkty pr ON p.product_id = pr.id
                WHERE p.faktura_id = ?
                ORDER BY p.kolejnosc
            """, [invoice_id])
            pozycje = cursor.fetchall()
            invoice_dict['pozycje'] = [dict(row) for row in pozycje]
            
            # Pobierz podsumowanie VAT
            cursor.execute("""
                SELECT * FROM faktury_sprzedazy_vat 
                WHERE faktura_id = ?
                ORDER BY stawka_vat
            """, [invoice_id])
            vat_summary = cursor.fetchall()
            invoice_dict['vat_summary'] = [dict(row) for row in vat_summary]
            
            return invoice_dict
            
        except Exception as e:
            print(f"Błąd pobierania faktury: {e}")
            return None
        finally:
            conn.close()

    def get_receipt_details(self, paragon_id):
        """Pobierz szczegóły paragonu wraz z pozycjami"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        try:
            cursor = conn.cursor()
            
            # Pobierz dane paragonu
            cursor.execute("""
                SELECT t.*, 
                       CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as ma_fakture,
                       f.numer_faktury
                FROM pos_transakcje t
                LEFT JOIN faktury_sprzedazy f ON t.id = f.paragon_id
                WHERE t.id = ?
            """, [paragon_id])
            
            paragon = cursor.fetchone()
            
            if not paragon:
                return None
                
            paragon_dict = dict(paragon)
            
            # Pobierz pozycje paragonu
            cursor.execute("""
                SELECT p.*, pr.nazwa as nazwa_produktu, pr.kod_produktu as kod_produktu,
                       pr.stawka_vat as vat_produktu
                FROM pos_transakcje_pozycje p
                LEFT JOIN produkty pr ON p.product_id = pr.id
                WHERE p.transakcja_id = ?
                ORDER BY p.id
            """, [paragon_id])
            
            pozycje = [dict(row) for row in cursor.fetchall()]
            paragon_dict['pozycje'] = pozycje
            
            return paragon_dict
            
        except Exception as e:
            print(f"Błąd pobierania szczegółów paragonu: {e}")
            return None
        finally:
            conn.close()

    def get_receipts_for_invoicing(self, limit=25, offset=0, date_filter=None, month_filter=None, location_id=None):
        """Pobierz paragony gotowe do fakturowania"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Buduj warunki WHERE
            where_conditions = [
                "t.status = 'zakonczony'",
                "t.typ_transakcji IN ('sprzedaz', 'sale')",  # Obsługa obu typów dla kompatybilności
                "t.suma_brutto > 0",
                "t.klient_id IS NOT NULL",  # Tylko paragony z przypisanym klientem
                "EXISTS (SELECT 1 FROM pos_pozycje p WHERE p.transakcja_id = t.id)"  # Tylko paragony z pozycjami
            ]
            params = []
            
            if date_filter:
                where_conditions.append("t.data_transakcji = ?")
                params.append(date_filter)
            elif month_filter:
                where_conditions.append("strftime('%Y-%m', t.data_transakcji) = ?")
                params.append(month_filter)
            
            if location_id:
                where_conditions.append("t.location_id = ?")
                params.append(location_id)
            
            where_clause = " AND ".join(where_conditions)
            params.extend([limit, offset])
            
            cursor.execute(f"""
                SELECT t.*, 
                       CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as ma_fakture,
                       f.numer_faktury
                FROM pos_transakcje t
                LEFT JOIN faktury_sprzedazy f ON t.id = f.paragon_id
                WHERE {where_clause}
                ORDER BY t.data_transakcji DESC, t.czas_transakcji DESC
                LIMIT ? OFFSET ?
            """, params)
            
            result = cursor.fetchall()
            return [dict(row) for row in result]
            
        except Exception as e:
            print(f"Błąd pobierania paragonów: {e}")
            return []
        finally:
            conn.close()

    def count_receipts_for_invoicing(self, date_filter=None, month_filter=None, location_id=None):
        """Zlicz wszystkie paragony gotowe do fakturowania"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Buduj warunki WHERE
            where_conditions = [
                "t.status = 'zakonczony'",
                "t.typ_transakcji IN ('sprzedaz', 'sale')",  # Obsługa obu typów dla kompatybilności
                "t.suma_brutto > 0",
                "t.klient_id IS NOT NULL",  # Tylko paragony z przypisanym klientem
                "EXISTS (SELECT 1 FROM pos_pozycje p WHERE p.transakcja_id = t.id)"  # Tylko paragony z pozycjami
            ]
            params = []
            
            if date_filter:
                where_conditions.append("t.data_transakcji = ?")
                params.append(date_filter)
            elif month_filter:
                where_conditions.append("strftime('%Y-%m', t.data_transakcji) = ?")
                params.append(month_filter)
            
            if location_id:
                where_conditions.append("t.location_id = ?")
                params.append(location_id)
            
            where_clause = " AND ".join(where_conditions)
            
            cursor.execute(f"""
                SELECT COUNT(*) as total
                FROM pos_transakcje t
                WHERE {where_clause}
            """, params)
            
            result = cursor.fetchone()
            return result['total'] if result else 0
            
        except Exception as e:
            print(f"Błąd zliczania paragonów: {e}")
            return 0
        finally:
            conn.close()

    def get_receipt_details(self, paragon_id):
        """Pobierz szczegóły paragonu z pozycjami"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Pobierz paragon
            cursor.execute("""
                SELECT t.*, 
                       k.nip as klient_nip, 
                       k.nazwa_firmy, 
                       k.imie, 
                       k.nazwisko,
                       k.ulica,
                       k.numer_domu,
                       k.miasto,
                       k.kod_pocztowy,
                       k.telefon,
                       k.email
                FROM pos_transakcje t
                LEFT JOIN pos_klienci k ON t.klient_id = k.id
                WHERE t.id = ?
            """, [paragon_id])
            
            paragon = cursor.fetchone()
            if not paragon:
                return None
                
            paragon_dict = dict(paragon)
            
            # Pobierz pozycje paragonu
            cursor.execute("""
                SELECT p.*, pr.nazwa as produkt_nazwa, pr.kod_produktu
                FROM pos_pozycje p
                LEFT JOIN produkty pr ON p.produkt_id = pr.id
                WHERE p.transakcja_id = ?
                ORDER BY p.id
            """, [paragon_id])
            
            pozycje = cursor.fetchall()
            paragon_dict['pozycje'] = [dict(row) for row in pozycje]
            
            return paragon_dict
            
        except Exception as e:
            print(f"Błąd pobierania szczegółów paragonu: {e}")
            return None
        finally:
            conn.close()

    def generate_invoice_pdf_with_template(self, invoice_id, template_name=None):
        """Generuj PDF faktury używając custom templates"""
        try:
            # Import custom templates manager
            from api.custom_templates import custom_template_manager
            
            # Pobierz dane faktury
            invoice_data = self.get_invoice_by_id(invoice_id)
            if not invoice_data:
                return None
                
            # Pobierz pozycje faktury
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM faktury_sprzedazy_pozycje 
                WHERE faktura_id = ? 
                ORDER BY id
            """, [invoice_id])
            
            positions = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            # Znajdź szablon po nazwie lub ID
            templates = custom_template_manager.get_templates()
            selected_template = None
            
            for template in templates:
                if template['name'] == template_name or str(template['id']) == str(template_name):
                    selected_template = template
                    break
            
            if not selected_template:
                print(f"⚠️ Szablon '{template_name}' nie znaleziony, używam pierwszego dostępnego")
                if templates:
                    selected_template = templates[0]
                else:
                    print("❌ Brak dostępnych custom templates, używam standardowej metody")
                    return self.generate_invoice_pdf(invoice_id)
            
            # Użyj custom template managera do generowania PDF
            pdf_content = custom_template_manager.generate_pdf_with_fields_template(
                invoice_data=invoice_data,
                positions=positions,
                template_config=selected_template['config']
            )
            
            print(f"✅ PDF faktury {invoice_id} wygenerowany używając custom template: {selected_template['name']}")
            return pdf_content
            
        except Exception as e:
            print(f"❌ Błąd generowania PDF z custom template: {e}")
            # Fallback na standardową metodę
            return self.generate_invoice_pdf(invoice_id)

    def generate_invoice_pdf(self, invoice_id):
        """Generuj profesjonalny PDF faktury z tabelami i formatowaniem używając ReportLab"""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from io import BytesIO
            
            # Rejestruj fontę obsługującą polskie znaki
            font_name = 'Helvetica'
            try:
                from reportlab.pdfbase.pdfmetrics import registerFont, registerFontFamily
                from reportlab.pdfbase.ttfonts import TTFont
                # Spróbuj różnych ścieżek do fontów systemowych
                font_paths = [
                    '/System/Library/Fonts/Helvetica.ttc',
                    '/System/Library/Fonts/Arial.ttf', 
                    '/System/Library/Fonts/Arial Unicode.ttf',
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
                ]
                
                for font_path in font_paths:
                    try:
                        import os
                        if os.path.exists(font_path):
                            pdfmetrics.registerFont(TTFont('PolishFont', font_path))
                            font_name = 'PolishFont'
                            print(f"✅ Załadowano fontę z: {font_path}")
                            break
                    except Exception as fe:
                        print(f"⚠️ Nie można załadować fonty z {font_path}: {fe}")
                        continue
            except Exception as e:
                print(f"⚠️ Fallback - używam standardowej fonty: {e}")
                pass
            
            # Pobierz dane faktury z pozycjami
            invoice = self.get_invoice_by_id(invoice_id)
            if not invoice:
                return None
            
            # Pobierz pozycje faktury
            positions = self.get_invoice_positions(invoice_id)
            
            # Pobierz podsumowanie VAT
            vat_summary = self.get_invoice_vat_summary(invoice_id)
            
            # Utwórz bufor w pamięci dla PDF
            buffer = BytesIO()
            
            # Utwórz dokument PDF z obsługą UTF-8
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, 
                                  topMargin=2*cm, bottomMargin=2*cm, encoding='utf-8')
            
            # Style z obsługą polskich znaków
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=6,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.darkblue,
                fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name
            )
            
            section_style = ParagraphStyle(
                'SectionHeader',
                parent=styles['Heading2'],
                fontSize=6,
                spaceBefore=20,
                spaceAfter=10,
                textColor=colors.darkblue,
                fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontName=font_name
            )
            
            # Lista elementów do dodania do PDF
            elements = []
            
            # Nagłówek z logo i informacjami o fakturze (jak w szablonie)
            header_data = [
                [
                    "🏢 Twoje logo",  # Placeholder na logo
                    f"Faktura nr FV {invoice.get('numer_faktury', '')}\n" +
                    f"Data wystawienia: {invoice.get('data_wystawienia', '')}\n" +
                    f"Data sprzedaży: {invoice.get('data_sprzedazy', '')}\n" +
                    f"Termin płatności: {invoice.get('termin_platnosci', '')}\n" +
                    f"Metoda płatności: {invoice.get('forma_platnosci', 'gotówka')}"
                ]
            ]
            
            header_table = Table(header_data, colWidths=[8*cm, 8*cm])
            header_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (0, 0), font_name + '-Bold' if font_name == 'Helvetica' else font_name),
                ('FONTNAME', (1, 0), (1, 0), font_name),
                ('FONTSIZE', (0, 0), (0, 0), 6),
                ('FONTSIZE', (1, 0), (1, 0), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 20)
            ]))
            
            elements.append(header_table)
            
            # Dane sprzedawcy i nabywcy w dwóch kolumnach
            seller_buyer_data = [
                ["SPRZEDAWCA", "NABYWCA"],
                [
                    f"{invoice.get('sprzedawca_nazwa', '')}\n" +
                    f"NIP: {invoice.get('sprzedawca_nip', '')}\n" +
                    f"REGON: {invoice.get('sprzedawca_regon', '')}\n" +
                    f"{invoice.get('sprzedawca_adres', '')}\n" +
                    f"{invoice.get('sprzedawca_kod_pocztowy', '')} {invoice.get('sprzedawca_miasto', '')}\n" +
                    f"Tel: {invoice.get('sprzedawca_telefon', '')}\n" +
                    f"Email: {invoice.get('sprzedawca_email', '')}",
                    
                    f"{invoice.get('nabywca_nazwa', '')}\n" +
                    f"NIP: {invoice.get('nabywca_nip', '') or 'Brak'}\n" +
                    f"REGON: {invoice.get('nabywca_regon', '') or 'Brak'}\n" +
                    f"{invoice.get('nabywca_adres', '')}\n" +
                    f"{invoice.get('nabywca_kod_pocztowy', '')} {invoice.get('nabywca_miasto', '')}\n" +
                    f"Tel: {invoice.get('nabywca_telefon', '') or 'Brak'}\n" +
                    f"Email: {invoice.get('nabywca_email', '') or 'Brak'}"
                ]
            ]
            
            seller_buyer_table = Table(seller_buyer_data, colWidths=[8*cm, 8*cm])
            seller_buyer_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), font_name + '-Bold' if font_name == 'Helvetica' else font_name),
                ('FONTNAME', (0, 1), (-1, 1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey)
            ]))
            
            elements.append(seller_buyer_table)
            elements.append(Spacer(1, 30))
            
            # Tabela pozycji faktury (jak w szablonie)
            if positions:
                # Nagłówki tabeli pozycji
                positions_data = [
                    ["Lp.", "Nazwa", "Ilość", "Jedn.", "Cena netto", "Stawka", "Wartość netto", "Wartość VAT", "Wartość brutto"]
                ]
                
                # Dodaj pozycje - każda pozycja w jednym wierszu
                for i, pos in enumerate(positions, 1):
                    nazwa = pos.get('nazwa_produktu', '')
                    
                    positions_data.append([
                        str(i),
                        nazwa,  # Pełna nazwa bez skracania
                        f"{pos.get('ilosc', 0):.0f}",  # Bez miejsc po przecinku jak w szablonie
                        pos.get('jednostka', 'szt'),
                        f"{pos.get('cena_jednostkowa_netto', 0):.2f}",
                        f"{pos.get('stawka_vat', 0)}%",
                        f"{pos.get('wartosc_netto', 0):.2f}",
                        f"{pos.get('wartosc_vat', 0):.2f}",
                        f"{pos.get('wartosc_brutto', 0):.2f}"
                    ])
                
                # Automatyczne szerokości kolumn - dodałem None żeby się dopasowało do zawartości
                positions_table = Table(positions_data, colWidths=None)
                positions_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # Nazwy produktów do lewej
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('FONTNAME', (0, 0), (-1, 0), font_name + '-Bold' if font_name == 'Helvetica' else font_name),
                    ('FONTNAME', (0, 1), (-1, -1), font_name),
                    ('FONTSIZE', (0, 0), (-1, 0), 6),  # Nagłówki 6pt
                    ('FONTSIZE', (0, 1), (0, -1), 5),  # Nazwy produktów 5pt
                    ('FONTSIZE', (1, 1), (-1, -1), 6),  # Reszta 6pt
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),  # Mniejszy padding
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOX', (0, 0), (-1, -1), 1, colors.black),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('WORDWRAP', (1, 0), (1, -1), True)  # Zawijanie tekstu w kolumnie nazwy
                ]))
                
                elements.append(positions_table)
                elements.append(Spacer(1, 20))
            
            # Podsumowanie końcowe w prawym dolnym rogu (jak w szablonie)
            summary_data = [
                ["Razem", f"{invoice.get('suma_brutto', 0):.2f} PLN"],
                ["Do zapłaty", f"{invoice.get('suma_brutto', 0):.2f} PLN"]
            ]
            
            summary_table = Table(summary_data, colWidths=[4*cm, 4*cm])
            summary_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOX', (0, 0), (-1, -1), 1, colors.black),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black)
            ]))
            
            elements.append(Spacer(1, 20))
            elements.append(summary_table)
            
            # Kwota słownie jako osobny element (opcjonalnie)
            kwota_brutto = float(invoice.get('suma_brutto', 0))
            if kwota_brutto > 0:
                def kwota_slownie_func(amount):
                    """Konwertuje kwotę na słownie"""
                    if amount == 0:
                        return "zero złotych zero groszy"
                    
                    # Tablice słów
                    jednosci = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"]
                    nascie = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", 
                             "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"]
                    dziesiatki = ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", 
                                 "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"]
                    setki = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", 
                            "sześćset", "siedemset", "osiemset", "dziewięćset"]
                    
                    def liczba_slownie(n):
                        if n == 0:
                            return ""
                        elif n < 10:
                            return jednosci[n]
                        elif n < 20:
                            return nascie[n-10]
                        elif n < 100:
                            return dziesiatki[n//10] + (" " + jednosci[n%10] if n%10 != 0 else "")
                        elif n < 1000:
                            return setki[n//100] + (" " + liczba_slownie(n%100) if n%100 != 0 else "")
                        else:
                            return str(n)  # dla liczb większych niż 999
                    
                    grosze = int(round((amount - int(amount)) * 100))
                    zlote = int(amount)
                    
                    # Złote
                    if zlote == 0:
                        zlote_str = "zero złotych"
                    elif zlote == 1:
                        zlote_str = "jeden złoty"
                    elif 2 <= zlote <= 4:
                        zlote_str = f"{liczba_slownie(zlote)} złote"
                    else:
                        zlote_str = f"{liczba_slownie(zlote)} złotych"
                    
                    # Grosze
                    if grosze == 0:
                        grosze_str = "zero groszy"
                    elif grosze == 1:
                        grosze_str = "jeden grosz"
                    elif 2 <= grosze <= 4:
                        grosze_str = f"{liczba_slownie(grosze)} grosze"
                    else:
                        grosze_str = f"{liczba_slownie(grosze)} groszy"
                    
                    return f"{zlote_str} {grosze_str}"
                
                kwota_slownie_text = kwota_slownie_func(kwota_brutto)
                kwota_slownie = Paragraph(f"Słownie: {kwota_slownie_text}", ParagraphStyle('Normal', fontSize=6, fontName='DejaVuSans'))
                elements.append(Spacer(1, 10))
                elements.append(kwota_slownie)
            
            # Dodaj przestrzeń przed stopką
            elements.append(Spacer(1, 40))
            
            # Stopka z podpisami (jak w szablonie)
            footer_data = [
                ["", ""],
                ["Janusz Nowak", ""],
                ["osoba upoważniona do wystawiania faktury", "osoba upoważniona do odbioru faktury"]
            ]
            
            footer_table = Table(footer_data, colWidths=[8*cm, 8*cm])
            footer_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 6),
                ('LINEABOVE', (0, 0), (0, 0), 1, colors.black),
                ('LINEABOVE', (1, 0), (1, 0), 1, colors.black),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4)
            ]))
            
            elements.append(footer_table)
            
            # Uwagi (jeśli istnieją)
            if invoice.get('uwagi'):
                elements.append(Spacer(1, 20))
                uwagi_content = Paragraph(f"Uwagi: {invoice.get('uwagi', '')}", normal_style)
                elements.append(uwagi_content)
            
            # Zbuduj PDF
            doc.build(elements)
            
            # Zwróć zawartość bufora
            buffer.seek(0)
            return buffer.getvalue()
            
        except Exception as e:
            print(f"Błąd generowania PDF: {e}")
            return None

    def get_invoice_positions(self, invoice_id):
        """Pobierz pozycje faktury"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    nazwa_produktu, kod_produktu, jednostka,
                    ilosc, cena_jednostkowa_netto, cena_jednostkowa_brutto,
                    stawka_vat, wartosc_netto, wartosc_vat, wartosc_brutto,
                    rabat_kwota, rabat_procent, kolejnosc
                FROM faktury_sprzedazy_pozycje 
                WHERE faktura_id = ?
                ORDER BY kolejnosc ASC, id ASC
            """, (invoice_id,))
            
            return [dict(row) for row in cursor.fetchall()]
            
        except Exception as e:
            print(f"Błąd pobierania pozycji faktury: {e}")
            return []
        finally:
            conn.close()

    def get_invoice_vat_summary(self, invoice_id):
        """Pobierz podsumowanie VAT faktury"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT stawka_vat, podstawa_netto, kwota_vat, wartosc_brutto
                FROM faktury_sprzedazy_vat 
                WHERE faktura_id = ?
                ORDER BY stawka_vat ASC
            """, (invoice_id,))
            
            return [dict(row) for row in cursor.fetchall()]
            
        except Exception as e:
            print(f"Błąd pobierania podsumowania VAT: {e}")
            return []
        finally:
            conn.close()

    def get_customers_list(self, limit=100):
        """Pobierz listę klientów"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, numer_klienta, typ_klienta, imie, nazwisko, 
                       nazwa_firmy, nip, telefon, email, aktywny
                FROM pos_klienci 
                WHERE aktywny = 1
                ORDER BY COALESCE(nazwa_firmy, nazwisko, imie)
                LIMIT ?
            """, [limit])
            
            result = cursor.fetchall()
            return [dict(row) for row in result]
            
        except Exception as e:
            print(f"Błąd pobierania klientów: {e}")
            return []
        finally:
            conn.close()

    def get_customer_by_id(self, customer_id):
        """Pobierz szczegóły klienta"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM pos_klienci WHERE id = ?", [customer_id])
            result = cursor.fetchone()
            
            if result:
                return dict(result)
            return None
            
        except Exception as e:
            print(f"Błąd pobierania klienta: {e}")
            return None
        finally:
            conn.close()

    def can_issue_company_invoice(self, paragon_id):
        """Sprawdź czy można wystawić fakturę na firmę dla danego paragonu"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Sprawdź czy paragon ma przypisany NIP klienta
            cursor.execute("""
                SELECT t.klient_id, k.nip
                FROM pos_transakcje t
                LEFT JOIN pos_klienci k ON t.klient_id = k.id
                WHERE t.id = ? AND k.nip IS NOT NULL AND k.nip != ''
            """, [paragon_id])
            
            result = cursor.fetchone()
            return result is not None
            
        except Exception as e:
            print(f"Błąd sprawdzania możliwości wystawienia faktury firmowej: {e}")
            return False
        finally:
            conn.close()

# Inicjalizacja managera
sales_invoice_manager = SalesInvoiceManager()

# Force restart marker

# === ENDPOINTY API ===

@sales_invoices_api_bp.route('/sales-invoices', methods=['GET'])
def get_sales_invoices():
    """Pobierz listę faktur sprzedaży z filtrowaniem według lokalizacji"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        filters = {}
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('data_od'):
            filters['data_od'] = request.args.get('data_od')
        if request.args.get('data_do'):
            filters['data_do'] = request.args.get('data_do')
        if request.args.get('klient_id'):
            filters['klient_id'] = int(request.args.get('klient_id'))
        if request.args.get('numer_faktury'):
            filters['numer_faktury'] = request.args.get('numer_faktury')
        if request.args.get('location_id'):
            filters['location_id'] = int(request.args.get('location_id'))
        
        invoices = sales_invoice_manager.get_invoices(limit, offset, filters)
        
        return success_response({
            'faktury': invoices,
            'count': len(invoices),
            'limit': limit,
            'offset': offset
        }, "Lista faktur sprzedaży")
        
    except Exception as e:
        return error_response(f"Błąd pobierania faktur: {str(e)}", 500)

@sales_invoices_api_bp.route('/sales-invoices', methods=['POST'])
def create_sales_invoice():
    """Utwórz nową fakturę sprzedaży"""
    try:
        data = request.get_json()
        
        required_fields = ['nabywca_nazwa', 'location_id', 'pozycje']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brak wymaganego pola: {field}", 400)
        
        if not data['pozycje']:
            return error_response("Faktura musi mieć co najmniej jedną pozycję", 400)
        
        invoice_id, numer_faktury = sales_invoice_manager.create_invoice(data)
        
        if invoice_id:
            return success_response({
                'id': invoice_id,
                'numer_faktury': numer_faktury
            }, "Faktura utworzona pomyślnie")
        else:
            return error_response(numer_faktury, 500)
            
    except Exception as e:
        return error_response(f"Błąd tworzenia faktury: {str(e)}", 500)

@sales_invoices_api_bp.route('/sales-invoices/<int:invoice_id>', methods=['GET'])
def get_sales_invoice(invoice_id):
    """Pobierz fakturę po ID"""
    try:
        invoice = sales_invoice_manager.get_invoice_by_id(invoice_id)
        
        if invoice:
            return success_response(invoice, "Faktura znaleziona")
        else:
            return error_response("Faktura nie znaleziona", 404)
            
    except Exception as e:
        return error_response(f"Błąd pobierania faktury: {str(e)}", 500)

@sales_invoices_api_bp.route('/sales-invoices/from-receipt/<int:paragon_id>', methods=['POST'])
def create_invoice_from_receipt(paragon_id):
    """Utwórz fakturę na podstawie paragonu"""
    try:
        data = request.get_json()
        
        required_fields = ['nabywca_nazwa']
        for field in required_fields:
            if field not in data:
                return error_response(f"Brak wymaganego pola: {field}", 400)
        
        invoice_id, numer_faktury = sales_invoice_manager.create_invoice_from_receipt(
            paragon_id, data, data.get('created_by', 'admin')
        )
        
        if invoice_id:
            return success_response({
                'id': invoice_id,
                'numer_faktury': numer_faktury
            }, "Faktura utworzona z paragonu")
        else:
            return error_response(numer_faktury, 400)
            
    except Exception as e:
        return error_response(f"Błąd tworzenia faktury z paragonu: {str(e)}", 500)

@sales_invoices_api_bp.route('/sales-invoices/<int:invoice_id>/correction', methods=['POST'])
def create_correction_invoice(invoice_id):
    """Utwórz korektę faktury"""
    try:
        data = request.get_json()
        
        if 'pozycje' not in data:
            return error_response("Korekta musi zawierać pozycje", 400)
        
        korekta_id, numer_korekty = sales_invoice_manager.create_correction_invoice(
            invoice_id, data, data.get('created_by', 'admin')
        )
        
        if korekta_id:
            return success_response({
                'id': korekta_id,
                'numer_faktury': numer_korekty
            }, "Korekta utworzona pomyślnie")
        else:
            return error_response(numer_korekty, 400)
            
    except Exception as e:
        return error_response(f"Błąd tworzenia korekty: {str(e)}", 500)

@sales_invoices_api_bp.route('/receipts-for-invoicing', methods=['GET'])
def get_receipts_for_invoicing():
    """Pobierz listę paragonów do fakturowania"""
    try:
        limit = int(request.args.get('limit', 25))
        offset = int(request.args.get('offset', 0))
        date_filter = request.args.get('date')
        month_filter = request.args.get('month')
        location_id = request.args.get('location_id')
        
        # Konwertuj location_id na int jeśli istnieje
        if location_id:
            location_id = int(location_id)
        
        # Jeśli limit = -1, pobierz wszystkie
        if limit == -1:
            limit = 10000  # duża liczba
            offset = 0
        
        receipts = sales_invoice_manager.get_receipts_for_invoicing(limit, offset, date_filter, month_filter, location_id)
        total_count = sales_invoice_manager.count_receipts_for_invoicing(date_filter, month_filter, location_id)
        
        return success_response({
            'paragony': receipts,
            'count': len(receipts),
            'total': total_count,
            'limit': limit,
            'offset': offset
        }, "Lista paragonów do fakturowania")
        
    except Exception as e:
        return error_response(f"Błąd pobierania paragonów: {str(e)}", 500)

@sales_invoices_api_bp.route('/receipt-details/<int:paragon_id>', methods=['GET'])
def get_receipt_details(paragon_id):
    """Pobierz szczegóły paragonu wraz z pozycjami"""
    try:
        details = sales_invoice_manager.get_receipt_details(paragon_id)
        
        if not details:
            return error_response("Paragon nie znaleziony", 404)
            
        return success_response(details, "Szczegóły paragonu")
        
    except Exception as e:
        return error_response(f"Błąd pobierania szczegółów paragonu: {str(e)}", 500)

@sales_invoices_api_bp.route('/sales-invoices/<int:invoice_id>/pdf', methods=['GET'])
def generate_invoice_pdf(invoice_id):
    """Generuj PDF faktury używając custom template"""
    try:
        # Użyj custom template managera z domyślnym szablonem
        from api.custom_templates import custom_template_manager
        
        # Pobierz domyślny szablon
        templates = custom_template_manager.get_templates()
        default_template = None
        
        # Znajdź szablon oznaczony jako anchored (domyślny)
        for template in templates:
            if template.get('anchored', False):
                default_template = template
                break
        
        # Jeśli nie ma anchored, użyj pierwszego dostępnego
        if not default_template and templates:
            default_template = templates[0]
        
        if default_template:
            # Użyj custom template
            pdf_content = sales_invoice_manager.generate_invoice_pdf_with_template(
                invoice_id, str(default_template['id'])
            )
        else:
            # Fallback do starej metody (nie powinno się wydarzyć)
            pdf_content = sales_invoice_manager.generate_invoice_pdf(invoice_id)
        
        if not pdf_content:
            return error_response("Nie udało się wygenerować PDF", 500)
            
        # Zwróć PDF jako binary response
        response = Response(pdf_content, mimetype='application/pdf')
        response.headers['Content-Disposition'] = f'attachment; filename="faktura_{invoice_id}.pdf"'
        return response
        
    except Exception as e:
        return error_response(f"Błąd generowania PDF: {str(e)}", 500)

@sales_invoices_api_bp.route('/customers', methods=['GET'])
def get_customers():
    """Pobierz listę klientów"""
    try:
        customers = sales_invoice_manager.get_customers_list()
        return success_response({'klienci': customers}, "Lista klientów")
        
    except Exception as e:
        return error_response(f"Błąd pobierania klientów: {str(e)}", 500)

@sales_invoices_api_bp.route('/customers/<customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    """Pobierz szczegóły klienta"""
    try:
        customer = sales_invoice_manager.get_customer_by_id(customer_id)
        
        if not customer:
            return error_response("Klient nie znaleziony", 404)
            
        return success_response(customer, "Szczegóły klienta")
        
    except Exception as e:
        return error_response(f"Błąd pobierania klienta: {str(e)}", 500)

@sales_invoices_api_bp.route('/receipt-invoice-eligibility/<int:paragon_id>', methods=['GET'])
def check_receipt_invoice_eligibility(paragon_id):
    """Sprawdź możliwość wystawienia faktury dla paragonu"""
    try:
        can_issue_company = sales_invoice_manager.can_issue_company_invoice(paragon_id)
        
        return success_response({
            'paragon_id': paragon_id,
            'mozna_fakture_firmowa': can_issue_company,
            'mozna_fakture_imiennia': True  # Zawsze można wystawić fakturę imienną
        }, "Status możliwości wystawienia faktury")
        
    except Exception as e:
        return error_response(f"Błąd sprawdzania uprawnień: {str(e)}", 500)

# ===============================
# ENDPOINTY ZARZĄDZANIA SZABLONAMI
# ===============================

@sales_invoices_api_bp.route('/templates', methods=['GET'])
def get_invoice_templates():
    """Pobierz listę dostępnych szablonów faktur z edytora custom templates"""
    try:
        # Import custom templates manager
        from api.custom_templates import custom_template_manager
        
        # Pobierz szablony z edytora
        custom_templates = custom_template_manager.get_templates()
        
        # Przekształć do formatu oczekiwanego przez frontend
        templates = []
        default_template_id = None
        
        for template in custom_templates:
            template_data = {
                'id': template['id'],
                'name': template['name'],
                'description': template.get('description', ''),
                'type': 'custom',
                'config': template['config'],
                'anchored': template.get('anchored', False),
                'created_at': template.get('created_at', ''),
                'updated_at': template.get('updated_at', '')
            }
            templates.append(template_data)
            
            # Pierwszy szablon jako domyślny (używaj ID)
            if not default_template_id:
                default_template_id = template['id']
        
        return success_response({
            'templates': templates,
            'default': default_template_id or 'classic'
        }, "Lista szablonów faktur z edytora")
        
    except Exception as e:
        return error_response(f"Błąd pobierania szablonów: {str(e)}", 500)

@sales_invoices_api_bp.route('/template-preview/<template_name>', methods=['GET'])
def preview_template(template_name):
    """Podgląd szablonu faktury z przykładowymi danymi - używa custom templates"""
    try:
        # Import custom templates manager
        from api.custom_templates import custom_template_manager
        
        # Znajdź szablon po nazwie lub ID
        templates = custom_template_manager.get_templates()
        selected_template = None
        
        for template in templates:
            if template['name'] == template_name or str(template['id']) == str(template_name):
                selected_template = template
                break
        
        if not selected_template:
            return error_response(f"Szablon '{template_name}' nie znaleziony", 404)
        
        # Przykładowe dane faktury
        sample_invoice = {
            'numer_faktury': 'FV/001/2025',
            'data_wystawienia': '2025-01-01',
            'data_sprzedazy': '2025-01-01',
            'termin_platnosci': '2025-01-15',
            'forma_platnosci': 'gotówka',
            'sprzedawca_nazwa': 'Przykładowa Firma Sp. z o.o.',
            'sprzedawca_adres': 'ul. Handlowa 123',
            'sprzedawca_kod_pocztowy': '00-001',
            'sprzedawca_miasto': 'Warszawa',
            'sprzedawca_nip': '1234567890',
            'nabywca_nazwa': 'Firma Klienta Sp. z o.o.',
            'nabywca_adres': 'ul. Biznesowa 456',
            'nabywca_kod_pocztowy': '00-002',
            'nabywca_miasto': 'Kraków',
            'nabywca_nip': '0987654321',
            'suma_netto': 1000.00,
            'suma_vat': 230.00,
            'suma_brutto': 1230.00
        }
        
        sample_positions = [
            {
                'nazwa_produktu': 'Przykładowy produkt z bardzo długą nazwą która może się nie zmieścić w kolumnie',
                'ilosc': 2,
                'jednostka': 'szt',
                'cena_jednostkowa_netto': 250.00,
                'stawka_vat': 23,
                'wartosc_netto': 500.00,
                'wartosc_vat': 115.00,
                'wartosc_brutto': 615.00
            },
            {
                'nazwa_produktu': 'Usługa konsultingowa',
                'ilosc': 1,
                'jednostka': 'godz',
                'cena_jednostkowa_netto': 500.00,
                'stawka_vat': 23,
                'wartosc_netto': 500.00,
                'wartosc_vat': 115.00,
                'wartosc_brutto': 615.00
            }
        ]
        
        # Użyj custom template managera do generowania PDF
        pdf_content = custom_template_manager.generate_pdf_with_fields_template(
            invoice_data=sample_invoice,
            positions=sample_positions,
            template_config=selected_template['config']
        )
        
        if pdf_content:
            return Response(
                pdf_content,
                mimetype='application/pdf',
                headers={
                    'Content-Disposition': f'inline; filename=podglad_{selected_template["name"]}.pdf'
                }
            )
        else:
            return error_response("Nie można wygenerować podglądu", 500)
            
    except Exception as e:
        return error_response(f"Błąd generowania podglądu: {str(e)}", 500)

@sales_invoices_api_bp.route('/invoice/<int:invoice_id>/pdf/<template_name>', methods=['GET'])
def generate_invoice_pdf_with_template_endpoint(invoice_id, template_name):
    """Generuj PDF faktury używając custom template"""
    try:
        pdf_content = sales_invoice_manager.generate_invoice_pdf_with_template(
            invoice_id, template_name
        )
        
        if pdf_content:
            return Response(
                pdf_content,
                mimetype='application/pdf',
                headers={
                    'Content-Disposition': f'attachment; filename=faktura_{invoice_id}_{template_name}.pdf'
                }
            )
        else:
            return error_response("Nie można wygenerować PDF", 500)
            
    except Exception as e:
        return error_response(f"Błąd generowania PDF: {str(e)}", 500)
