"""
Centralny serwis zarządzania marżą
==================================

Ten serwis zapewnia jednolitą logikę obliczania marży w całym systemie POS.

Definicje:
- MARŻA = (Cena sprzedaży - Cena zakupu) / Cena sprzedaży × 100%
- NARZUT = (Cena sprzedaży - Cena zakupu) / Cena zakupu × 100%

System używa MARŻY jako standardu dla spójności obliczeń.
"""

from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
from datetime import datetime, timedelta
from utils.database import get_db_connection
import logging

@dataclass
class MarginCalculation:
    """Wynik kalkulacji marży"""
    margin_percent: float
    margin_amount: float
    markup_percent: float  # Narzut dla porównania
    sell_price_net: float
    buy_price_net: float
    profit_amount: float
    calculation_method: str  # 'standard', 'weighted_average', 'latest_purchase'
    
@dataclass
class PurchasePriceStrategy:
    """Strategia wyboru ceny zakupu"""
    method: str  # 'latest', 'weighted_average', 'specific'
    timeframe_days: int = 90  # Okres do analizy cen zakupu
    min_transactions: int = 1  # Minimalna liczba transakcji do średniej ważonej

class MarginService:
    """Centralny serwis zarządzania marżą"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Domyślna strategia wyboru ceny zakupu
        self.default_purchase_strategy = PurchasePriceStrategy(
            method='latest',  # Domyślnie najnowsza cena zakupu
            timeframe_days=90,
            min_transactions=3
        )

    def get_connection(self):
        """Pobierz połączenie z bazą danych"""
        return get_db_connection()

    def calculate_margin(self, 
                        sell_price_net: float, 
                        buy_price_net: float,
                        calculation_method: str = "standard") -> MarginCalculation:
        """
        Oblicza marżę według standardowego wzoru
        
        Args:
            sell_price_net: Cena sprzedaży netto
            buy_price_net: Cena zakupu netto
            calculation_method: Metoda obliczenia
            
        Returns:
            MarginCalculation: Wynik obliczeń
        """
        
        if sell_price_net <= 0 or buy_price_net <= 0:
            return MarginCalculation(
                margin_percent=0.0,
                margin_amount=0.0,
                markup_percent=0.0,
                sell_price_net=sell_price_net,
                buy_price_net=buy_price_net,
                profit_amount=0.0,
                calculation_method=calculation_method
            )
        
        # Obliczenia
        profit_amount = sell_price_net - buy_price_net
        
        # MARŻA = (sprzedaż - zakup) / sprzedaż × 100%
        margin_percent = (profit_amount / sell_price_net) * 100
        
        # NARZUT = (sprzedaż - zakup) / zakup × 100%
        markup_percent = (profit_amount / buy_price_net) * 100
        
        return MarginCalculation(
            margin_percent=round(margin_percent, 2),
            margin_amount=round(profit_amount, 2),
            markup_percent=round(markup_percent, 2),
            sell_price_net=sell_price_net,
            buy_price_net=buy_price_net,
            profit_amount=round(profit_amount, 2),
            calculation_method=calculation_method
        )

    def get_product_purchase_price(self, 
                                  product_id: int,
                                  warehouse_id: Optional[int] = None,
                                  strategy: Optional[PurchasePriceStrategy] = None) -> Tuple[float, str]:
        """
        Pobiera cenę zakupu produktu według wybranej strategii
        
        Args:
            product_id: ID produktu
            warehouse_id: ID magazynu (opcjonalnie)
            strategy: Strategia wyboru ceny
            
        Returns:
            Tuple[float, str]: (cena_zakupu_netto, opis_metody)
        """
        
        if strategy is None:
            strategy = self.default_purchase_strategy
            
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if strategy.method == 'latest':
                return self._get_latest_purchase_price(cursor, product_id, warehouse_id)
                
            elif strategy.method == 'weighted_average':
                return self._get_weighted_average_purchase_price(
                    cursor, product_id, warehouse_id, strategy
                )
                
            elif strategy.method == 'specific':
                return self._get_specific_purchase_price(cursor, product_id, warehouse_id)
                
            else:
                # Fallback na cenę z tabeli produktów
                return self._get_default_purchase_price(cursor, product_id)
                
        except Exception as e:
            self.logger.error(f"Błąd pobierania ceny zakupu produktu {product_id}: {str(e)}")
            return 0.0, f"Błąd: {str(e)}"
            
        finally:
            if conn:
                conn.close()

    def _get_latest_purchase_price(self, cursor, product_id: int, warehouse_id: Optional[int]) -> Tuple[float, str]:
        """Pobiera najnowszą cenę zakupu"""
        
        # Sprawdź w fakturach zakupowych (najnowsze)
        query = """
            SELECT fzp.cena_netto, fz.data_faktury
            FROM faktury_zakupowe_pozycje fzp
            JOIN faktury_zakupowe fz ON fzp.faktura_id = fz.id
            WHERE fzp.produkt_id = ?
            ORDER BY fz.data_faktury DESC, fz.id DESC
            LIMIT 1
        """
        
        cursor.execute(query, (product_id,))
        result = cursor.fetchone()
        
        if result and result[0] and result[0] > 0:
            return float(result[0]), f"Najnowsza z faktury ({result[1]})"
        
        # Fallback na cenę z produktu
        cursor.execute("SELECT cena_zakupu_netto FROM produkty WHERE id = ?", (product_id,))
        result = cursor.fetchone()
        
        if result and result[0] and result[0] > 0:
            return float(result[0]), "Domyślna cena zakupu"
            
        return 0.0, "Brak ceny zakupu"

    def _get_weighted_average_purchase_price(self, cursor, product_id: int, 
                                           warehouse_id: Optional[int],
                                           strategy: PurchasePriceStrategy) -> Tuple[float, str]:
        """Pobiera średnią ważoną cenę zakupu z ostatnich transakcji"""
        
        cutoff_date = (datetime.now() - timedelta(days=strategy.timeframe_days)).strftime('%Y-%m-%d')
        
        query = """
            SELECT fzp.cena_netto, fzp.ilosc, fz.data_faktury
            FROM faktury_zakupowe_pozycje fzp
            JOIN faktury_zakupowe fz ON fzp.faktura_id = fz.id
            WHERE fzp.produkt_id = ?
            AND fz.data_faktury >= ?
            AND fzp.cena_netto > 0
            AND fzp.ilosc > 0
            ORDER BY fz.data_faktury DESC
        """
        
        cursor.execute(query, (product_id, cutoff_date))
        transactions = cursor.fetchall()
        
        if len(transactions) >= strategy.min_transactions:
            # Oblicz średnią ważoną
            total_value = 0.0
            total_quantity = 0.0
            
            for price_net, quantity, _ in transactions:
                total_value += float(price_net) * float(quantity)
                total_quantity += float(quantity)
            
            if total_quantity > 0:
                weighted_avg = total_value / total_quantity
                return weighted_avg, f"Średnia ważona z {len(transactions)} transakcji ({strategy.timeframe_days} dni)"
        
        # Fallback na najnowszą cenę
        return self._get_latest_purchase_price(cursor, product_id, warehouse_id)

    def _get_specific_purchase_price(self, cursor, product_id: int, warehouse_id: Optional[int]) -> Tuple[float, str]:
        """Pobiera cenę zakupu specyficzną dla magazynu (jeśli istnieje)"""
        
        if warehouse_id:
            # Sprawdź czy istnieje specyficzna cena zakupu dla magazynu
            query = """
                SELECT purchase_price_net 
                FROM warehouse_product_prices 
                WHERE product_id = ? AND warehouse_id = ?
                AND aktywny = 1
                ORDER BY data_od DESC
                LIMIT 1
            """
            
            cursor.execute(query, (product_id, warehouse_id))
            result = cursor.fetchone()
            
            if result and result[0] and result[0] > 0:
                return float(result[0]), f"Specyficzna dla magazynu {warehouse_id}"
        
        # Fallback na najnowszą cenę ogólną
        return self._get_latest_purchase_price(cursor, product_id, warehouse_id)

    def _get_default_purchase_price(self, cursor, product_id: int) -> Tuple[float, str]:
        """Pobiera domyślną cenę zakupu z tabeli produktów"""
        
        cursor.execute("""
            SELECT cena_zakupu_netto, cena_zakupu_brutto, cena_zakupu
            FROM produkty 
            WHERE id = ?
        """, (product_id,))
        
        result = cursor.fetchone()
        
        if result:
            # Preferuj cena_zakupu_netto
            if result[0] and result[0] > 0:
                return float(result[0]), "Domyślna netto"
            # Potem cena_zakupu_brutto przeliczona na netto (zakładając 23% VAT)
            elif result[1] and result[1] > 0:
                price_net = float(result[1]) / 1.23
                return price_net, "Domyślna brutto->netto"
            # Na końcu stara cena_zakupu
            elif result[2] and result[2] > 0:
                return float(result[2]), "Domyślna stara"
                
        return 0.0, "Brak ceny zakupu"

    def calculate_product_margin(self, 
                               product_id: int,
                               sell_price_net: float,
                               warehouse_id: Optional[int] = None,
                               purchase_strategy: Optional[PurchasePriceStrategy] = None) -> MarginCalculation:
        """
        Oblicza marżę dla konkretnego produktu
        
        Args:
            product_id: ID produktu
            sell_price_net: Cena sprzedaży netto
            warehouse_id: ID magazynu
            purchase_strategy: Strategia wyboru ceny zakupu
            
        Returns:
            MarginCalculation: Wynik obliczeń marży
        """
        
        # Pobierz cenę zakupu według strategii
        buy_price_net, method_desc = self.get_product_purchase_price(
            product_id, warehouse_id, purchase_strategy
        )
        
        # Oblicz marżę
        calculation = self.calculate_margin(
            sell_price_net=sell_price_net,
            buy_price_net=buy_price_net,
            calculation_method=method_desc
        )
        
        return calculation

    def get_margin_for_products_list(self, 
                                   products: List[Dict[str, Any]],
                                   warehouse_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Dodaje obliczenia marży do listy produktów
        
        Args:
            products: Lista produktów z cenami sprzedaży
            warehouse_id: ID magazynu
            
        Returns:
            List[Dict]: Produkty z dodanymi obliczeniami marży
        """
        
        results = []
        
        for product in products:
            # Pobierz cenę sprzedaży netto
            sell_price_net = product.get('cena_sprzedazy_netto', 0) or product.get('price_net', 0)
            
            if sell_price_net > 0:
                margin_calc = self.calculate_product_margin(
                    product_id=product.get('id') or product.get('product_id'),
                    sell_price_net=float(sell_price_net),
                    warehouse_id=warehouse_id
                )
                
                # Dodaj obliczenia do produktu
                enhanced_product = product.copy()
                enhanced_product.update({
                    'margin_percent': margin_calc.margin_percent,
                    'margin_amount': margin_calc.margin_amount,
                    'markup_percent': margin_calc.markup_percent,
                    'profit_amount': margin_calc.profit_amount,
                    'calculated_buy_price_net': margin_calc.buy_price_net,
                    'margin_calculation_method': margin_calc.calculation_method
                })
                
                results.append(enhanced_product)
            else:
                # Produkt bez ceny sprzedaży
                enhanced_product = product.copy()
                enhanced_product.update({
                    'margin_percent': 0.0,
                    'margin_amount': 0.0,
                    'markup_percent': 0.0,
                    'profit_amount': 0.0,
                    'calculated_buy_price_net': 0.0,
                    'margin_calculation_method': 'Brak ceny sprzedaży'
                })
                results.append(enhanced_product)
        
        return results

    def set_target_margin(self, 
                         product_id: int,
                         target_margin_percent: float,
                         warehouse_id: Optional[int] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Oblicza cenę sprzedaży dla zadanej marży
        
        Args:
            product_id: ID produktu
            target_margin_percent: Docelowa marża w %
            warehouse_id: ID magazynu
            
        Returns:
            Tuple[bool, Dict]: (sukces, wyniki_obliczeń)
        """
        
        try:
            # Pobierz cenę zakupu
            buy_price_net, method_desc = self.get_product_purchase_price(product_id, warehouse_id)
            
            if buy_price_net <= 0:
                return False, {"error": "Brak prawidłowej ceny zakupu"}
            
            # Oblicz cenę sprzedaży dla zadanej marży
            # Marża = (sprzedaż - zakup) / sprzedaż
            # sprzedaż = zakup / (1 - marża/100)
            sell_price_net = buy_price_net / (1 - target_margin_percent / 100)
            
            # Sprawdź obliczenia
            verification = self.calculate_margin(sell_price_net, buy_price_net, "target_margin")
            
            result = {
                "product_id": product_id,
                "buy_price_net": buy_price_net,
                "buy_price_method": method_desc,
                "target_margin_percent": target_margin_percent,
                "calculated_sell_price_net": round(sell_price_net, 2),
                "calculated_sell_price_gross_23": round(sell_price_net * 1.23, 2),
                "calculated_sell_price_gross_8": round(sell_price_net * 1.08, 2),
                "verification": {
                    "actual_margin_percent": verification.margin_percent,
                    "margin_amount": verification.margin_amount,
                    "markup_percent": verification.markup_percent
                }
            }
            
            return True, result
            
        except Exception as e:
            self.logger.error(f"Błąd obliczania ceny dla marży {target_margin_percent}% produktu {product_id}: {str(e)}")
            return False, {"error": str(e)}

# Singleton instance
margin_service = MarginService()
