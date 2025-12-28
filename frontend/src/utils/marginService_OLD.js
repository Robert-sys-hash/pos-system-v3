/**
 * Funkcje pomocnicze dla zarządzania marżą w komponentach React
 * 
 * JavaScript utilities do integracji z centralnym serwisem marży
 */

// Konfiguracja API endpoint - bezpośrednie połączenie z backendem
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://195.2.222.164:8000';

/**
 * Klasa MarginService - klient JavaScript dla API marży
 * Updated: 2025-12-02 20:45
 */
class MarginService {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Oblicza marżę dla podanych cen
     */
    async calculateMargin(sellPriceNet, buyPriceNet) {
        try {
            const response = await fetch(`${this.baseURL}/api/margins/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sell_price_net: sellPriceNet,
                    buy_price_net: buyPriceNet
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd obliczania marży');
            }
        } catch (error) {
            console.error('Błąd w calculateMargin:', error);
            throw error;
        }
    }

    /**
     * Pobiera marżę dla konkretnego produktu
     */
    async getProductMargin(productId, sellPriceNet, warehouseId = null, purchaseStrategy = 'latest') {
        try {
            const params = new URLSearchParams({
                sell_price_net: sellPriceNet,
                purchase_strategy: purchaseStrategy
            });

            if (warehouseId) {
                params.append('warehouse_id', warehouseId);
            }

            const response = await fetch(`${this.baseURL}/api/margins/product/${productId}?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd pobierania marży produktu');
            }
        } catch (error) {
            console.error('Błąd w getProductMargin:', error);
            throw error;
        }
    }

    /**
     * Pobiera cenę zakupu produktu
     */
    async getProductPurchasePrice(productId, warehouseId = null, strategy = 'latest', timeframeDays = 90) {
        try {
            const params = new URLSearchParams({
                strategy: strategy,
                timeframe_days: timeframeDays
            });

            if (warehouseId) {
                params.append('warehouse_id', warehouseId);
            }

            const response = await fetch(`${this.baseURL}/api/margins/product/${productId}/purchase-price?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd pobierania ceny zakupu');
            }
        } catch (error) {
            console.error('Błąd w getProductPurchasePrice:', error);
            throw error;
        }
    }

    /**
     * Oblicza cenę sprzedaży dla zadanej marży
     */
    async calculateTargetPrice(productId, targetMarginPercent, warehouseId = null) {
        try {
            const response = await fetch(`${this.baseURL}/api/margins/target-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    target_margin_percent: targetMarginPercent,
                    warehouse_id: warehouseId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd obliczania ceny dla marży');
            }
        } catch (error) {
            console.error('Błąd w calculateTargetPrice:', error);
            throw error;
        }
    }

    /**
     * Oblicza marże dla listy produktów (batch)
     */
    async calculateMarginsForProducts(products, warehouseId = null) {
        try {
            const response = await fetch(`${this.baseURL}/api/margins/products/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    products: products,
                    warehouse_id: warehouseId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd obliczania marż batch');
            }
        } catch (error) {
            console.error('Błąd w calculateMarginsForProducts:', error);
            throw error;
        }
    }

    /**
     * Pobiera konfigurację serwisu marży
     */
    async getConfig() {
        try {
            const response = await fetch(`${this.baseURL}/api/margins/config`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd pobierania konfiguracji');
            }
        } catch (error) {
            console.error('Błąd w getConfig:', error);
            throw error;
        }
    }

    /**
     * Waliduje obliczenia marży - porównuje różne metody
     */
    async validateMarginCalculation(productId, sellPriceNet) {
        try {
            const response = await fetch(`${this.baseURL}/api/margins/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_id: productId,
                    sell_price_net: sellPriceNet
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd walidacji marży');
            }
        } catch (error) {
            console.error('Błąd w validateMarginCalculation:', error);
            throw error;
        }
    }
}

/**
 * Funkcje pomocnicze dla komponentów React
 */

/**
 * Hook do obliczania marży w czasie rzeczywistym
 */
export const useMarginCalculation = () => {
    const marginService = new MarginService();

    const calculateMargin = async (sellPrice, buyPrice) => {
        if (!sellPrice || !buyPrice || sellPrice <= 0 || buyPrice <= 0) {
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0
            };
        }

        try {
            return await marginService.calculateMargin(parseFloat(sellPrice), parseFloat(buyPrice));
        } catch (error) {
            console.error('Błąd obliczania marży:', error);
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0,
                error: error.message
            };
        }
    };

    const calculateProductMargin = async (productId, sellPrice, warehouseId = null) => {
        if (!productId || !sellPrice || sellPrice <= 0) {
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0
            };
        }

        try {
            return await marginService.getProductMargin(productId, parseFloat(sellPrice), warehouseId);
        } catch (error) {
            console.error('Błąd obliczania marży produktu:', error);
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0,
                error: error.message
            };
        }
    };

    // Synchroniczna wersja dla UI
    const calculateMarginSync = (sellPrice, buyPrice) => {
        if (!sellPrice || !buyPrice || sellPrice <= 0 || buyPrice <= 0) {
            return {
                percent: 0,
                amount: 0,
                markup_percent: 0,
                profit_amount: 0
            };
        }

        const sell = parseFloat(sellPrice);
        const buy = parseFloat(buyPrice);
        
        const profit = sell - buy;
        const marginPercent = (profit / sell) * 100;
        const markupPercent = (profit / buy) * 100;

        return {
            percent: marginPercent,
            amount: profit,
            markup_percent: markupPercent,
            profit_amount: profit
        };
    };

    return {
        calculateMargin,
        calculateMarginSync,
        calculateProductMargin,
        marginService
    };
};

/**
 * Formatuje marżę do wyświetlenia
 */
export const formatMargin = (marginPercent, showSign = true) => {
    if (marginPercent === null || marginPercent === undefined) {
        return '0%';
    }
    
    const formatted = parseFloat(marginPercent).toFixed(1);
    return showSign ? `${formatted}%` : formatted;
};

/**
 * Formatuje kwotę marży do wyświetlenia
 */
export const formatMarginAmount = (marginAmount, currency = 'PLN') => {
    if (marginAmount === null || marginAmount === undefined) {
        return '0.00 PLN';
    }
    
    const formatted = parseFloat(marginAmount).toFixed(2);
    return `${formatted} ${currency}`;
};

/**
 * Określa kolor marży na podstawie wartości
 */
export const getMarginColor = (marginPercent) => {
    if (marginPercent === null || marginPercent === undefined || marginPercent === 0) {
        return '#666666'; // szary
    }
    
    if (marginPercent < 10) {
        return '#dc3545'; // czerwony - niska marża
    } else if (marginPercent < 20) {
        return '#ffc107'; // żółty - średnia marża
    } else if (marginPercent < 30) {
        return '#28a745'; // zielony - dobra marża
    } else {
        return '#007bff'; // niebieski - wysoka marża
    }
};

/**
 * Sprawdza czy marża jest wystarczająca
 */
export const isMarginAcceptable = (marginPercent, minimumMargin = 5) => {
    return marginPercent !== null && marginPercent !== undefined && marginPercent >= minimumMargin;
};

/**
 * Oblicza różnicę między marżą a narzutem dla edukacji użytkownika
 */
export const explainMarginVsMarkup = (sellPrice, buyPrice) => {
    if (!sellPrice || !buyPrice || sellPrice <= 0 || buyPrice <= 0) {
        return null;
    }

    const profit = sellPrice - buyPrice;
    const margin = (profit / sellPrice) * 100;
    const markup = (profit / buyPrice) * 100;

    return {
        profit: profit.toFixed(2),
        margin: margin.toFixed(2),
        markup: markup.toFixed(2),
        explanation: `Zysk: ${profit.toFixed(2)} PLN. Marża: ${margin.toFixed(1)}% (zysk/sprzedaż). Narzut: ${markup.toFixed(1)}% (zysk/zakup).`
    };
};

/**
 * Synchroniczna funkcja do obliczania marży (dla komponentów UI)
 */
export const calculateMarginSync = (sellPriceNet, buyPriceNet) => {
    if (!sellPriceNet || !buyPriceNet || sellPriceNet <= 0 || buyPriceNet <= 0) {
        return {
            percent: 0,
            amount: 0,
            markup_percent: 0,
            profit_amount: 0
        };
    }

    const sell = parseFloat(sellPriceNet);
    const buy = parseFloat(buyPriceNet);
    
    const profit = sell - buy;
    const marginPercent = (profit / sell) * 100;
    const markupPercent = (profit / buy) * 100;

    return {
        percent: marginPercent,
        amount: profit,
        markup_percent: markupPercent,
        profit_amount: profit
    };
};

// Singleton instance
export const marginService = new MarginService();

export default MarginService;
// Force rebuild $(date)
