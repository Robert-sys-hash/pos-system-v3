import { useState, useCallback, useMemo } from 'react';

// Konfiguracja API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Flaga debug - ustaw na false aby wyłączyć logi
const DEBUG_MARGIN = false;

const debugLog = (...args) => {
    if (DEBUG_MARGIN) console.log(...args);
};

/**
 * Klasa MarginService - klient JavaScript dla API marży
 * FIXED VERSION 2025-12-02 21:00 - używa poprawnych endpointów
 */
class MarginService {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        debugLog('🔗 MarginService initialized with baseURL:', baseURL);
        debugLog('🔗 Will use endpoint: /api/margins/calculate');
    }

    /**
     * Oblicza marżę dla podanych cen
     */
    async calculateMargin(sellPriceNet, buyPriceNet) {
        debugLog('🔍 MarginService.calculateMargin called with:', { sellPriceNet, buyPriceNet });
        try {
            const url = `${this.baseURL}/margins/calculate`;
            debugLog('🔗 Making POST request to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sell_price_net: sellPriceNet,
                    buy_price_net: buyPriceNet
                })
            });

            debugLog('📡 Response status:', response.status);
            
            if (!response.ok) {
                console.error('❌ HTTP error:', response.status, response.statusText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            debugLog('✅ Margin calculation result:', result);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd obliczania marży');
            }
        } catch (error) {
            console.error('❌ Błąd w calculateMargin:', error);
            throw error;
        }
    }

    /**
     * Pobiera marżę dla konkretnego produktu
     */
    async getProductMargin(productId, sellPrice, warehouseId = null) {
        try {
            let url = `${this.baseURL}/margins/product/${productId}?sell_price_net=${sellPrice}`;
            if (warehouseId) {
                url += `&warehouse_id=${warehouseId}`;
            }
            
            const response = await fetch(url);
            
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
     * Pobiera konfigurację marży
     */
    async getMarginConfig() {
        try {
            const response = await fetch(`${this.baseURL}/margins/config`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Błąd pobierania konfiguracji marży');
            }
        } catch (error) {
            console.error('Błąd w getMarginConfig:', error);
            throw error;
        }
    }
}

/**
 * Hook do obliczania marży w czasie rzeczywistym
 */
export const useMarginCalculation = () => {
    // Używamy useMemo aby uniknąć tworzenia nowej instancji przy każdym renderze
    const marginService = useMemo(() => new MarginService(), []);

    const calculateMargin = useCallback(async (sellPrice, buyPrice) => {
        debugLog('🔄 useMarginCalculation.calculateMargin called:', { sellPrice, buyPrice });
        
        if (!sellPrice || !buyPrice || sellPrice <= 0 || buyPrice <= 0) {
            debugLog('⚠️ Invalid prices, returning zero margin');
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0
            };
        }

        try {
            const result = await marginService.calculateMargin(parseFloat(sellPrice), parseFloat(buyPrice));
            debugLog('✅ calculateMargin success:', result);
            return result;
        } catch (error) {
            console.error('❌ Błąd obliczania marży:', error);
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0,
                error: error.message
            };
        }
    }, [marginService]);

    const calculateProductMargin = useCallback(async (productId, sellPrice, warehouseId = null) => {
        if (!productId || !sellPrice || sellPrice <= 0) {
            return {
                margin_percent: 0,
                margin_amount: 0,
                markup_percent: 0,
                profit_amount: 0
            };
        }

        try {
            return await marginService.getProductMargin(parseInt(productId), parseFloat(sellPrice), warehouseId);
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
    }, [marginService]);

    return {
        calculateMargin,
        calculateProductMargin,
        marginService
    };
};

/**
 * Funkcja pomocnicza do obliczania marży lokalnie (bez API)
 */
export const calculateMarginSync = (sellPriceNet, buyPriceNet) => {
    if (!sellPriceNet || !buyPriceNet || sellPriceNet <= 0 || buyPriceNet <= 0) {
        return {
            margin_percent: 0,
            margin_amount: 0,
            markup_percent: 0,
            profit_amount: 0
        };
    }

    const sellPrice = parseFloat(sellPriceNet);
    const buyPrice = parseFloat(buyPriceNet);
    
    const profit = sellPrice - buyPrice;
    const margin_percent = (profit / sellPrice) * 100;
    const markup_percent = (profit / buyPrice) * 100;

    return {
        margin_percent: Math.round(margin_percent * 100) / 100,
        margin_amount: Math.round(profit * 100) / 100,
        markup_percent: Math.round(markup_percent * 100) / 100,
        profit_amount: Math.round(profit * 100) / 100,
        sell_price_net: sellPrice,
        buy_price_net: buyPrice
    };
};

// Funkcje formatujące
export const formatMargin = (margin) => {
    if (typeof margin === 'number') {
        return `${margin.toFixed(1)}%`;
    }
    
    if (margin && typeof margin.margin_percent === 'number') {
        return `${margin.margin_percent.toFixed(1)}%`;
    }
    
    return '0.0%';
};

export const formatMarginAmount = (margin) => {
    if (typeof margin === 'number') {
        return `${margin.toFixed(2)} zł`;
    }
    
    if (margin && typeof margin.margin_amount === 'number') {
        return `${margin.margin_amount.toFixed(2)} zł`;
    }
    
    return '0.00 zł';
};

export const getMarginColor = (margin) => {
    let marginPercent = 0;
    
    if (typeof margin === 'number') {
        marginPercent = margin;
    } else if (margin && typeof margin.margin_percent === 'number') {
        marginPercent = margin.margin_percent;
    }
    
    if (marginPercent >= 30) return '#28a745'; // zielony
    if (marginPercent >= 20) return '#ffc107'; // żółty
    if (marginPercent >= 10) return '#fd7e14'; // pomarańczowy
    return '#dc3545'; // czerwony
};

export default MarginService;
